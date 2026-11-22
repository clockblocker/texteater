import { type AstNode, defineRule } from "../types.ts";
import {
	asNodeArray,
	getPropertyName,
	isIdentifier,
	unwrapExpression,
} from "../utils.ts";

const COMPILER_METHODS = new Set([
	"is",
	"asserts",
	"decodeEffect",
	"decodeExit",
	"decodeOption",
	"decodePromise",
	"decodeResult",
	"decodeSync",
	"decodeUnknownExit",
	"decodeUnknownEffect",
	"decodeUnknownOption",
	"decodeUnknownPromise",
	"decodeUnknownResult",
	"decodeUnknownSync",
	"encodeExit",
	"encodeEffect",
	"encodeOption",
	"encodePromise",
	"encodeResult",
	"encodeSync",
	"encodeUnknownExit",
	"encodeUnknownEffect",
	"encodeUnknownOption",
	"encodeUnknownPromise",
	"encodeUnknownResult",
	"encodeUnknownSync",
]);

function getSchemaCompilerMethod(callee: unknown): string | undefined {
	const expression = unwrapExpression(callee);
	if (expression === undefined || expression.type !== "MemberExpression") {
		return undefined;
	}
	if (!isIdentifier(unwrapExpression(expression.object), "Schema")) {
		return undefined;
	}
	const method = getPropertyName(expression.property);
	return method !== undefined && COMPILER_METHODS.has(method)
		? method
		: undefined;
}

function isStaticSchemaReference(node: unknown): boolean {
	const expression = unwrapExpression(node);
	if (expression === undefined) return false;
	if (
		expression.type === "Identifier" &&
		typeof expression.name === "string"
	) {
		const [firstChar] = expression.name;
		return firstChar !== undefined && firstChar.toUpperCase() === firstChar;
	}
	return expression.type === "MemberExpression";
}

function isNestedStaticSchemaCall(node: unknown): boolean {
	const expression = unwrapExpression(node);
	if (expression === undefined || expression.type !== "CallExpression") {
		return false;
	}
	const callee = unwrapExpression(expression.callee);
	if (callee === undefined || callee.type !== "MemberExpression")
		return false;
	if (!isIdentifier(unwrapExpression(callee.object), "Schema")) return false;
	const method = getPropertyName(callee.property);
	if (method === "fromJsonString") {
		const firstArg = asNodeArray(expression.arguments)[0];
		return (
			isStaticSchemaReference(firstArg) ||
			isNestedStaticSchemaCall(firstArg)
		);
	}
	return true;
}

function isImmediatelyInvoked(node: AstNode): boolean {
	const expression = unwrapExpression(node);
	if (expression === undefined) return false;
	const parent = unwrapExpression(expression.parent);
	return (
		parent !== undefined &&
		parent.type === "CallExpression" &&
		unwrapExpression(parent.callee) === expression
	);
}

const messageHigh = (method: string) =>
	`Hoist Schema.${method}(...) to module scope: both the inline schema literal and the compiled function are rebuilt on every call. Move the compiled function to a module-level const.`;

const messageMedium = (method: string) =>
	`Hoist Schema.${method}(...) to module scope: the compiled function is rebuilt on every call. Move it to a module-level const.`;

export default defineRule({
	meta: {
		type: "problem",
		docs: {
			description:
				"Disallow Schema decoder/encoder compiler calls inside function bodies; hoist them to module scope.",
		},
	},
	createOnce(context) {
		let functionDepth = 0;

		const reset = () => {
			functionDepth = 0;
		};
		const enter = () => {
			functionDepth++;
		};
		const exit = () => {
			functionDepth--;
		};

		return {
			before: reset,
			FunctionDeclaration: enter,
			"FunctionDeclaration:exit": exit,
			FunctionExpression: enter,
			"FunctionExpression:exit": exit,
			ArrowFunctionExpression: enter,
			"ArrowFunctionExpression:exit": exit,
			CallExpression(node) {
				if (functionDepth === 0) return;
				const method = getSchemaCompilerMethod(node.callee);
				if (method === undefined) return;
				if (!isImmediatelyInvoked(node)) return;

				const firstArg = asNodeArray(node.arguments)[0];
				const high =
					firstArg !== undefined &&
					isNestedStaticSchemaCall(firstArg);
				if (!high && !isStaticSchemaReference(firstArg)) return;

				const callee = unwrapExpression(node.callee) ?? node;
				context.report({
					node: callee,
					message: high ? messageHigh(method) : messageMedium(method),
				});
			},
		};
	},
});
