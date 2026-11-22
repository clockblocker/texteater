import { type AstNode, defineRule } from "../types.ts";
import {
	asNodeArray,
	getPropertyName,
	isIdentifier,
	unwrapExpression,
} from "../utils.ts";

const TEST_FILE_PATTERN = /\.(?:test|spec)\.[cm]?[jt]sx?$/u;
const WALL_CLOCK_CALLS = new Set([
	"Date.now",
	"performance.now",
	"process.hrtime",
	"process.hrtime.bigint",
]);
const DIRECT_MOCKING_FUNCTIONS = new Set(["setSystemTime", "spyOn", "mock"]);
const MOCK_NAMESPACES = new Set(["vi", "jest"]);
const NAMESPACE_MOCKING_FUNCTIONS = new Set([
	"fn",
	"mock",
	"setSystemTime",
	"spyOn",
]);
const MOCK_METHODS = new Set([
	"mockImplementation",
	"mockImplementationOnce",
	"mockResolvedValue",
	"mockResolvedValueOnce",
	"mockReturnValue",
	"mockReturnValueOnce",
]);

const MESSAGE =
	"Wall-clock reading in a test; elapsed-time assertions pass or fail with runner load. Use TestClock/`Clock` under `testEffect`, `setSystemTime`, or a fixed epoch.";

function isStringLiteral(node: unknown): boolean {
	const expression = unwrapExpression(node);
	return (
		expression !== undefined &&
		expression.type === "Literal" &&
		typeof expression.value === "string"
	);
}

function memberPath(node: unknown): readonly string[] | undefined {
	const expression = unwrapExpression(node);
	if (expression === undefined) return undefined;
	if (
		expression.type === "Identifier" &&
		typeof expression.name === "string"
	) {
		return [expression.name];
	}
	if (expression.type !== "MemberExpression") return undefined;
	if (expression.computed === true && !isStringLiteral(expression.property)) {
		return undefined;
	}
	const property = getPropertyName(expression.property);
	if (property === undefined) return undefined;
	const prefix = memberPath(expression.object);
	return prefix === undefined ? undefined : [...prefix, property];
}

function isWallClockCall(callee: unknown): boolean {
	const path = memberPath(callee);
	return path !== undefined && WALL_CLOCK_CALLS.has(path.join("."));
}

function isMockingCall(callee: unknown): boolean {
	const expression = unwrapExpression(callee);
	if (expression === undefined) return false;
	if (
		expression.type === "Identifier" &&
		typeof expression.name === "string"
	) {
		return DIRECT_MOCKING_FUNCTIONS.has(expression.name);
	}
	if (expression.type !== "MemberExpression") return false;
	const property = getPropertyName(expression.property);
	if (property === undefined) return false;
	if (MOCK_METHODS.has(property)) return true;
	const object = unwrapExpression(expression.object);
	return (
		NAMESPACE_MOCKING_FUNCTIONS.has(property) &&
		object?.type === "Identifier" &&
		typeof object.name === "string" &&
		MOCK_NAMESPACES.has(object.name)
	);
}

function isMockArgument(node: AstNode): boolean {
	let child: AstNode = node;
	let current = node.parent ?? undefined;
	while (current !== undefined) {
		if (
			current.type === "CallExpression" &&
			current.callee !== child &&
			isMockingCall(current.callee)
		) {
			return true;
		}
		child = current;
		current = current.parent ?? undefined;
	}
	return false;
}

export default defineRule({
	meta: {
		type: "problem",
		docs: {
			description:
				"Disallow wall-clock readings (Date.now, new Date(), performance.now, process.hrtime) in tests.",
		},
	},
	create(context) {
		if (!TEST_FILE_PATTERN.test(context.filename)) return {};

		return {
			CallExpression(node) {
				if (!isWallClockCall(node.callee)) return;
				if (isMockArgument(node)) return;
				context.report({ node, message: MESSAGE });
			},
			NewExpression(node) {
				if (asNodeArray(node.arguments).length > 0) return;
				if (!isIdentifier(unwrapExpression(node.callee), "Date"))
					return;
				if (isMockArgument(node)) return;
				context.report({ node, message: MESSAGE });
			},
		};
	},
});
