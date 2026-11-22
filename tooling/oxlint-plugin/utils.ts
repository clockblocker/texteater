import type { AstNode } from "./types.ts";

const EXPRESSION_WRAPPERS = new Set([
	"ChainExpression",
	"ParenthesizedExpression",
	"TSNonNullExpression",
	"TSAsExpression",
	"TSTypeAssertion",
]);

export function isAstNode(value: unknown): value is AstNode {
	return (
		typeof value === "object" &&
		value !== null &&
		"type" in value &&
		typeof (value as { type?: unknown }).type === "string"
	);
}

export function unwrapExpression(value: unknown): AstNode | undefined {
	let current = isAstNode(value) ? value : undefined;
	while (current !== undefined && EXPRESSION_WRAPPERS.has(current.type)) {
		current = isAstNode(current.expression)
			? current.expression
			: undefined;
	}
	return current;
}

export function getPropertyName(value: unknown): string | undefined {
	const node = isAstNode(value) ? value : undefined;
	if (node === undefined) return undefined;
	if (
		(node.type === "Identifier" || node.type === "PrivateIdentifier") &&
		typeof node.name === "string"
	) {
		return node.name;
	}
	if (node.type === "Literal" && typeof node.value === "string") {
		return node.value;
	}
	return undefined;
}

export function isIdentifier(
	node: AstNode | undefined,
	name?: string,
): boolean {
	return (
		node !== undefined &&
		node.type === "Identifier" &&
		typeof node.name === "string" &&
		(name === undefined || node.name === name)
	);
}

export function getMemberName(
	value: unknown,
): readonly [string, string] | undefined {
	const node = unwrapExpression(value);
	if (node === undefined || node.type !== "MemberExpression")
		return undefined;
	const object = unwrapExpression(node.object);
	const property = getPropertyName(node.property);
	if (
		object === undefined ||
		object.type !== "Identifier" ||
		typeof object.name !== "string" ||
		property === undefined
	) {
		return undefined;
	}
	return [object.name, property];
}

export function asNodeArray(value: unknown): readonly unknown[] {
	return Array.isArray(value) ? value : [];
}
