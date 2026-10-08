import type * as Dumling from "dumling/types";
import { DE_REL_MAP } from "./selection-policy-de.js";
import type { KnowledgeRequestMask } from "./types.js";

/**
 * One language's Knowledge Policy: the aspects each source route requests,
 * keyed by its Families and Kinds, so a key that names no route fails to
 * type-check.
 */
export type KnowledgePolicy<L extends Dumling.Language> = {
	readonly [F in Dumling.Family<L>]?: {
		readonly [K in Dumling.Kind<L, F>]?: KnowledgeRequestMask;
	};
};
/** A policy as `knowledgePolicyMask` reads it at runtime. */
type RouteLookup = Readonly<
	Record<string, Readonly<Record<string, KnowledgeRequestMask>>>
>;

/**
 * Each language's Knowledge Policy. A language missing here has none, so
 * selecting Knowledge for any of its routes yields
 * `KnowledgePolicyUnavailable`.
 */
const knowledgePolicies: {
	readonly [L in Dumling.Language]?: KnowledgePolicy<L>;
} = { de: DE_REL_MAP };

/** The aspects the Knowledge Policy applies to a source route, or undefined where no policy covers it. */
export function knowledgePolicyMask(
	route: Dumling.LemmaRoute,
): KnowledgeRequestMask | undefined {
	const policies: Readonly<Record<string, RouteLookup | undefined>> =
		knowledgePolicies;
	const policy = Object.hasOwn(policies, route.language)
		? policies[route.language]
		: undefined;
	const kinds =
		policy && Object.hasOwn(policy, route.family)
			? policy[route.family]
			: undefined;
	return kinds && Object.hasOwn(kinds, route.kind)
		? kinds[route.kind]
		: undefined;
}

/** Whether the Knowledge Policy applies `aspect` to a Lemma's route. */
export function knowledgePolicyApplies(
	lemma: Dumling.LemmaRoute,
	aspect: keyof KnowledgeRequestMask,
): boolean {
	return knowledgePolicyMask(lemma)?.[aspect] !== undefined;
}
