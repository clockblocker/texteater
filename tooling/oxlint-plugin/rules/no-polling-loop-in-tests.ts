import { type AstNode, defineRule } from "../types.ts";
import {
	asNodeArray,
	getMemberName,
	isAstNode,
	isIdentifier,
	unwrapExpression,
} from "../utils.ts";

const TEST_FILE_PATTERN = /\.(?:test|spec)\.[cm]?[jt]sx?$/u;
const FUNCTIONS = new Set([
	"ArrowFunctionExpression",
	"FunctionExpression",
	"FunctionDeclaration",
]);
const COUNTER_OPERATORS = new Set(["<", "<=", ">", ">="]);
const TIMERS = new Set(["setImmediate", "setTimeout"]);
const MESSAGE =
	"Polling loop in a test. Spinning on `yieldNow`/`sleep` is scheduler- and load-dependent. Await the `Deferred`, `Latch`, `Queue.take`, `Stream` element, or `drain()` that marks the milestone.";

function someDescendant(
	node: unknown,
	match: (node: AstNode) => boolean,
): boolean {
	if (Array.isArray(node)) {
		return node.some((child) => someDescendant(child, match));
	}
	if (!isAstNode(node)) return false;
	if (match(node)) return true;
	if (FUNCTIONS.has(node.type)) return false;
	for (const [key, value] of Object.entries(node)) {
		if (key === "parent") continue;
		if (someDescendant(value, match)) return true;
	}
	return false;
}

function isMember(node: unknown, object: string, property: string): boolean {
	const member = getMemberName(node);
	return (
		member !== undefined && member[0] === object && member[1] === property
	);
}

function isTimerReference(node: unknown): boolean {
	const expression = unwrapExpression(node);
	return (
		expression !== undefined &&
		expression.type === "Identifier" &&
		typeof expression.name === "string" &&
		TIMERS.has(expression.name)
	);
}

function isTickPromise(node: unknown): boolean {
	const expression = unwrapExpression(node);
	if (expression === undefined) return false;
	if (expression.type === "CallExpression") {
		return isMember(expression.callee, "Promise", "resolve");
	}
	if (
		expression.type !== "NewExpression" ||
		!isIdentifier(unwrapExpression(expression.callee), "Promise")
	) {
		return false;
	}
	const executor = asNodeArray(expression.arguments)[0];
	if (isTimerReference(executor)) return true;
	if (!isAstNode(executor) || !FUNCTIONS.has(executor.type)) return false;
	return someDescendant(
		executor.body,
		(child) =>
			child.type === "CallExpression" && isTimerReference(child.callee),
	);
}

function thunkReturnsTick(node: unknown): boolean {
	if (!isAstNode(node) || node.type !== "ArrowFunctionExpression")
		return false;
	const body = isAstNode(node.body) ? node.body : undefined;
	if (body === undefined) return false;
	if (body.type !== "BlockStatement") return isTickPromise(body);
	const statements = asNodeArray(body.body);
	const last = statements.at(-1);
	return (
		isAstNode(last) &&
		last.type === "ReturnStatement" &&
		isTickPromise(last.argument)
	);
}

function isWait(node: AstNode): boolean {
	if (node.type === "MemberExpression") {
		return isMember(node, "Effect", "yieldNow");
	}
	if (node.type === "AwaitExpression") return isTickPromise(node.argument);
	if (node.type === "NewExpression") return isTickPromise(node);
	if (node.type !== "CallExpression") return false;
	if (isMember(node.callee, "Effect", "sleep")) return true;
	if (isIdentifier(unwrapExpression(node.callee), "setImmediate"))
		return true;
	if (isMember(node.callee, "Effect", "promise")) {
		return thunkReturnsTick(asNodeArray(node.arguments)[0]);
	}
	return false;
}

function hasConditionalExit(body: unknown): boolean {
	return someDescendant(
		body,
		(node) =>
			node.type === "IfStatement" &&
			someDescendant(
				[node.consequent, node.alternate],
				(child) =>
					child.type === "ReturnStatement" ||
					child.type === "BreakStatement" ||
					child.type === "ThrowStatement",
			),
	);
}

function isNumericBound(node: unknown): boolean {
	const expression = unwrapExpression(node);
	if (expression === undefined) return false;
	return (
		expression.type === "Identifier" ||
		(expression.type === "Literal" && typeof expression.value === "number")
	);
}

function updatesCounter(node: unknown, name: string): boolean {
	return someDescendant(
		node,
		(child) =>
			(child.type === "UpdateExpression" &&
				isIdentifier(unwrapExpression(child.argument), name)) ||
			(child.type === "AssignmentExpression" &&
				(child.operator === "+=" || child.operator === "-=") &&
				isIdentifier(unwrapExpression(child.left), name)),
	);
}

function isCounterTest(loop: AstNode): boolean {
	if (loop.test == null) return false;
	const expression = unwrapExpression(loop.test);
	if (
		expression === undefined ||
		expression.type !== "BinaryExpression" ||
		typeof expression.operator !== "string" ||
		!COUNTER_OPERATORS.has(expression.operator)
	) {
		return false;
	}
	const advances = [
		loop.body,
		loop.type === "ForStatement" ? loop.update : null,
	];
	return [
		[expression.left, expression.right],
		[expression.right, expression.left],
	].some(([counter, bound]) => {
		const name = unwrapExpression(counter);
		return (
			name !== undefined &&
			name.type === "Identifier" &&
			typeof name.name === "string" &&
			isNumericBound(bound) &&
			updatesCounter(advances, name.name)
		);
	});
}

function isTrueLiteral(test: unknown): boolean {
	const expression = unwrapExpression(test);
	return (
		expression !== undefined &&
		expression.type === "Literal" &&
		expression.value === true
	);
}

function hasPredicateExit(loop: AstNode): boolean {
	return (
		hasConditionalExit(loop.body) ||
		(loop.test != null && !isTrueLiteral(loop.test) && !isCounterTest(loop))
	);
}

export default defineRule({
	meta: {
		type: "problem",
		docs: {
			description:
				"Disallow loops in tests that spin on yieldNow/sleep/timer ticks until a predicate holds; await the milestone instead.",
		},
		schema: [],
	},
	create(context) {
		if (!TEST_FILE_PATTERN.test(context.filename)) return {};

		const check = (loop: AstNode) => {
			if (!someDescendant(loop.body, isWait)) return;
			if (!hasPredicateExit(loop)) return;
			context.report({ node: loop, message: MESSAGE });
		};

		return {
			ForStatement: check,
			WhileStatement: check,
			DoWhileStatement: check,
		};
	},
});
