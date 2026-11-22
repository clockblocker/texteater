import { type AstNode, defineRule } from "../types.ts";
import {
	asNodeArray,
	getMemberName,
	getPropertyName,
	isAstNode,
	isIdentifier,
	unwrapExpression,
} from "../utils.ts";

const TEST_FILE_PATTERN = /\.(?:test|spec)\.[cm]?[jt]sx?$/u;
const TEST_CLOCK_DRIVERS = new Set(["adjust", "setTime"]);
const TIMER_PROMISES_MODULES = new Set([
	"node:timers/promises",
	"timers/promises",
]);
const TIMER_FUNCTIONS = new Set(["setTimeout", "setInterval", "setImmediate"]);
const SCHEDULE_WAITS = new Set(["spaced", "fixed", "exponential"]);
const TESTER_ROOTS = new Set(["it", "test", "testEffect", "testLive"]);
const FUNCTIONS = new Set([
	"ArrowFunctionExpression",
	"FunctionExpression",
	"FunctionDeclaration",
]);
const LOOPS = new Set([
	"DoWhileStatement",
	"ForInStatement",
	"ForOfStatement",
	"ForStatement",
	"WhileStatement",
]);

const REAL_CLOCK_MESSAGE =
	"Real-clock wait in a test. Await the `Deferred`/`Latch`/`Queue`/event that marks the milestone, or run under `testEffect` and `TestClock.adjust`. `testLive` is for subprocess/network fixtures, not for sleeping.";
const UNDRIVEN_TEST_CLOCK_MESSAGE =
	"Sleeps on the TestClock never fire without `TestClock.adjust`; this test can only time out.";
const MIXED_CLOCK_MESSAGE =
	"`setTimeout` is wall-clock while `Effect.sleep` here is TestClock; they never meet.";

type Tester = "effect" | "live" | "plain";

interface CalleeChain {
	readonly root: string;
	readonly members: readonly string[];
	readonly calls: readonly AstNode[];
}

function calleeChain(callee: unknown): CalleeChain | undefined {
	const members: string[] = [];
	const calls: AstNode[] = [];
	let current = unwrapExpression(callee);
	while (current !== undefined) {
		if (current.type === "Identifier" && typeof current.name === "string") {
			return { root: current.name, members: members.toReversed(), calls };
		}
		if (current.type === "CallExpression") {
			calls.push(current);
			current = unwrapExpression(current.callee);
			continue;
		}
		if (current.type === "MemberExpression") {
			const name = getPropertyName(current.property);
			if (name === undefined) return undefined;
			members.push(name);
			current = unwrapExpression(current.object);
			continue;
		}
		return undefined;
	}
	return undefined;
}

function isLayerBlock(chain: CalleeChain): boolean {
	return (
		chain.root === "layer" ||
		(TESTER_ROOTS.has(chain.root) && chain.members.includes("layer"))
	);
}

function testerKind(chain: CalleeChain): Tester | undefined {
	if (!TESTER_ROOTS.has(chain.root) || chain.members.includes("layer")) {
		return undefined;
	}
	if (chain.root === "testLive") return "live";
	if (chain.root === "testEffect") return "effect";
	if (
		chain.members.includes("live") ||
		chain.members.includes("scopedLive")
	) {
		return "live";
	}
	if (chain.members.includes("effect") || chain.members.includes("scoped")) {
		return "effect";
	}
	return "plain";
}

function excludesTestServices(chain: CalleeChain): boolean {
	return chain.calls.some((call) =>
		asNodeArray(call.arguments).some((argument) => {
			const expression = unwrapExpression(argument);
			if (
				expression === undefined ||
				expression.type !== "ObjectExpression"
			) {
				return false;
			}
			return asNodeArray(expression.properties).some((property) => {
				if (!isAstNode(property) || property.type !== "Property")
					return false;
				const key = getPropertyName(property.key);
				const value = unwrapExpression(property.value);
				return (
					key === "excludeTestServices" &&
					value?.type === "Literal" &&
					value.value === true
				);
			});
		}),
	);
}

function enclosingTester(node: AstNode): Tester | undefined {
	let child: AstNode = node;
	let current = node.parent ?? undefined;
	let tester: Tester | undefined;
	while (current !== undefined) {
		if (
			current.type === "CallExpression" &&
			asNodeArray(current.arguments).includes(child)
		) {
			const chain = calleeChain(current.callee);
			if (chain !== undefined) {
				if (tester === undefined) {
					tester = testerKind(chain);
					if (tester !== undefined && tester !== "effect")
						return tester;
				} else if (isLayerBlock(chain) && excludesTestServices(chain)) {
					return "live";
				}
			}
		}
		child = current;
		current = current.parent ?? undefined;
	}
	return tester;
}

function isPollingLoopStep(node: AstNode): boolean {
	let statement = node.parent ?? undefined;
	while (
		statement !== undefined &&
		statement.type !== "ExpressionStatement"
	) {
		if (FUNCTIONS.has(statement.type)) return false;
		statement = statement.parent ?? undefined;
	}
	const block = statement?.parent ?? undefined;
	if (block === undefined) return false;
	if (LOOPS.has(block.type)) return true;
	return (
		block.type === "BlockStatement" &&
		block.parent !== null &&
		block.parent !== undefined &&
		LOOPS.has(block.parent.type)
	);
}

function isPromiseExecutor(fn: AstNode): boolean {
	const parent = fn.parent ?? undefined;
	return (
		parent?.type === "NewExpression" &&
		asNodeArray(parent.arguments)[0] === fn &&
		isIdentifier(unwrapExpression(parent.callee), "Promise")
	);
}

function isInsidePromiseExecutor(node: AstNode): boolean {
	let current = node.parent ?? undefined;
	while (current !== undefined) {
		if (FUNCTIONS.has(current.type)) return isPromiseExecutor(current);
		current = current.parent ?? undefined;
	}
	return false;
}

export default defineRule({
	meta: {
		type: "problem",
		docs: {
			description:
				"Disallow real-clock waits in tests; await the milestone or drive the TestClock instead.",
		},
	},
	create(context) {
		if (!TEST_FILE_PATTERN.test(context.filename)) return {};
		let drivesTestClock = false;
		const untilDrivenReports: Array<{ node: AstNode; message: string }> =
			[];
		const timerPromiseLocals = new Set<string>();
		const timerPromiseNamespaces = new Set<string>();

		const isTimerPromiseCall = (callee: unknown): boolean => {
			const expression = unwrapExpression(callee);
			if (expression === undefined) return false;
			if (
				expression.type === "Identifier" &&
				typeof expression.name === "string"
			) {
				return timerPromiseLocals.has(expression.name);
			}
			const member = getMemberName(callee);
			return (
				member !== undefined &&
				timerPromiseNamespaces.has(member[0]) &&
				TIMER_FUNCTIONS.has(member[1])
			);
		};

		const isCallbackTimer = (callee: unknown): boolean => {
			const expression = unwrapExpression(callee);
			return (
				expression !== undefined &&
				expression.type === "Identifier" &&
				typeof expression.name === "string" &&
				TIMER_FUNCTIONS.has(expression.name) &&
				!timerPromiseLocals.has(expression.name)
			);
		};

		const reportEffectWait = (
			node: AstNode,
			target: AstNode,
			isSleep: boolean,
		) => {
			const tester = enclosingTester(node);
			if (tester === undefined) {
				if (isPollingLoopStep(node)) {
					context.report({
						node: target,
						message: REAL_CLOCK_MESSAGE,
					});
				} else {
					untilDrivenReports.push({
						node: target,
						message: REAL_CLOCK_MESSAGE,
					});
				}
				return;
			}
			if (tester !== "effect") {
				context.report({ node: target, message: REAL_CLOCK_MESSAGE });
			} else if (isSleep) {
				untilDrivenReports.push({
					node: target,
					message: UNDRIVEN_TEST_CLOCK_MESSAGE,
				});
			}
		};

		return {
			ImportDeclaration(node) {
				const source = isAstNode(node.source)
					? node.source.value
					: undefined;
				if (
					typeof source !== "string" ||
					!TIMER_PROMISES_MODULES.has(source)
				) {
					return;
				}
				for (const specifier of asNodeArray(node.specifiers)) {
					if (!isAstNode(specifier)) continue;
					const local = getPropertyName(specifier.local);
					if (local === undefined) continue;
					if (specifier.type === "ImportNamespaceSpecifier") {
						timerPromiseNamespaces.add(local);
					} else if (specifier.type === "ImportSpecifier") {
						const imported = getPropertyName(specifier.imported);
						if (
							imported !== undefined &&
							TIMER_FUNCTIONS.has(imported)
						) {
							timerPromiseLocals.add(local);
						}
					}
				}
			},
			CallExpression(node) {
				const target = unwrapExpression(node.callee) ?? node;
				if (
					isTimerPromiseCall(node.callee) ||
					(isCallbackTimer(node.callee) &&
						isInsidePromiseExecutor(node))
				) {
					const tester = enclosingTester(node);
					context.report({
						node: target,
						message:
							tester === "effect"
								? `${REAL_CLOCK_MESSAGE} ${MIXED_CLOCK_MESSAGE}`
								: REAL_CLOCK_MESSAGE,
					});
					return;
				}

				const member = getMemberName(node.callee);
				if (member === undefined) return;
				const [object, property] = member;
				if (
					object === "TestClock" &&
					TEST_CLOCK_DRIVERS.has(property)
				) {
					drivesTestClock = true;
					return;
				}
				const isSleep = object === "Effect" && property === "sleep";
				const isWait =
					isSleep ||
					(object === "Effect" && property === "delay") ||
					(object === "Schedule" && SCHEDULE_WAITS.has(property));
				if (!isWait) return;

				reportEffectWait(node, target, isSleep);
			},
			"Program:exit"() {
				if (drivesTestClock) return;
				for (const report of untilDrivenReports) context.report(report);
			},
		};
	},
});
