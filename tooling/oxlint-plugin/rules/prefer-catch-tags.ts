import { type AstNode, defineRule, type RuleContext } from "../types.ts";
import { asNodeArray, getPropertyName, isAstNode } from "../utils.ts";

const MESSAGE =
	"Catch known tags with `Effect.catchTags({ Tag: handler })`, even for one tag.";

function isEffectImportBinding(
	context: RuleContext,
	identifier: AstNode,
): boolean {
	if (typeof identifier.name !== "string") return false;
	let scope = context.sourceCode.getScope(identifier);
	while (true) {
		const variable = scope.set.get(identifier.name);
		if (variable !== undefined) {
			return variable.defs.some((def) => {
				if (
					def.type !== "ImportBinding" ||
					def.parent?.type !== "ImportDeclaration"
				) {
					return false;
				}
				const source = isAstNode(def.parent.source)
					? def.parent.source.value
					: undefined;
				if (source === "effect/Effect") {
					return def.node.type === "ImportNamespaceSpecifier";
				}
				return (
					source === "effect" &&
					def.node.type === "ImportSpecifier" &&
					getPropertyName(def.node.imported) === "Effect"
				);
			});
		}
		if (scope.upper === null) return false;
		scope = scope.upper;
	}
}

export default defineRule({
	meta: {
		type: "suggestion",
		docs: {
			description: "Require `Effect.catchTags` over `Effect.catchTag`.",
		},
	},
	create(context) {
		return {
			ImportDeclaration(node) {
				const source = isAstNode(node.source)
					? node.source.value
					: undefined;
				if (source !== "effect/Effect") return;
				for (const specifier of asNodeArray(node.specifiers)) {
					if (
						isAstNode(specifier) &&
						specifier.type === "ImportSpecifier" &&
						getPropertyName(specifier.imported) === "catchTag"
					) {
						context.report({ node: specifier, message: MESSAGE });
					}
				}
			},
			MemberExpression(node) {
				if (node.computed === true) return;
				const object = isAstNode(node.object) ? node.object : undefined;
				if (
					object?.type === "Identifier" &&
					getPropertyName(node.property) === "catchTag" &&
					isEffectImportBinding(context, object)
				) {
					context.report({ node, message: MESSAGE });
				}
			},
		};
	},
});
