import type * as Dumling from "dumling/types";
import { lookupRoute, type RoutePolicy } from "./route-policy.js";
import { DE_REL_MAP } from "./selection-policy-de.js";
import { HE_REL_MAP } from "./selection-policy-he.js";
import type { KnowledgeRequestMask } from "./types.js";

/**
 * One language's Knowledge Policy: the aspects each source route requests,
 * keyed by its Families and Kinds, so a key that names no route fails to
 * type-check.
 */
export type KnowledgePolicy<L extends Dumling.Language> = RoutePolicy<
	L,
	KnowledgeRequestMask
>;

/**
 * Each language's Knowledge Policy. A language missing here has none, so
 * selecting Knowledge for any of its routes yields
 * `KnowledgePolicyUnavailable`.
 */
const knowledgePolicies: {
	readonly [L in Dumling.Language]?: KnowledgePolicy<L>;
} = { de: DE_REL_MAP, he: HE_REL_MAP };

/** The aspects the Knowledge Policy applies to a source route, or undefined where no policy covers it. */
export function knowledgePolicyMask(
	route: Dumling.LemmaRoute,
): KnowledgeRequestMask | undefined {
	return lookupRoute(knowledgePolicies, route);
}
