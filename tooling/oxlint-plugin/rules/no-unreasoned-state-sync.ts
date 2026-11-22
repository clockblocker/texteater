import { type AstNode, defineRule } from "../types.ts";
import { getPropertyName, unwrapExpression } from "../utils.ts";

const EFFECT_HOOKS = new Set([
	"useEffect",
	"useLayoutEffect",
	"useInsertionEffect",
]);
const EFFECT_HOOK_TEXT = /use(?:Layout|Insertion)?Effect/;
const TEST_FILE =
	/\.(?:test|spec)\.[cm]?[jt]sx?$|[\\/](?:tests?|__tests__)[\\/]/;

function isEffectHookCall(node: AstNode): boolean {
	const callee = unwrapExpression(node.callee);
	if (callee === undefined) return false;
	if (callee.type === "Identifier" && typeof callee.name === "string") {
		return EFFECT_HOOKS.has(callee.name);
	}
	if (callee.type === "MemberExpression" && callee.computed !== true) {
		const name = getPropertyName(callee.property);
		return name !== undefined && EFFECT_HOOKS.has(name);
	}
	return false;
}

const MESSAGE =
	"Stop and reconsider before keeping this effect. " +
	"Is it computable from props or state? Compute it during render. " +
	"Does it respond to a user action? Do it in that handler. " +
	"Does it reset state when a prop changes? Key the component on that prop. " +
	"Does it read a value from outside React? Use an atom or useSyncExternalStore. " +
	"An effect is right only when it keeps something outside React in step with this component while mounted " +
	"(a DOM node, listener, timer, AbortController, connection, router, or resource held until unmount). " +
	"If the effect does that, name what it keeps in step on the line above: " +
	"`// oxlint-disable-next-line textfresser/no-unreasoned-state-sync -- <what it syncs with and why>`.";

export default defineRule({
	meta: {
		type: "suggestion",
		docs: {
			description:
				"Report every React effect hook, the usual way state gets synchronized; one that stays says why.",
		},
	},
	create(context) {
		if (
			TEST_FILE.test(context.filename) ||
			!EFFECT_HOOK_TEXT.test(context.sourceCode.text)
		) {
			return {};
		}
		return {
			CallExpression(node) {
				if (!isEffectHookCall(node)) return;
				context.report({ node, message: MESSAGE });
			},
		};
	},
});
