import type * as Dumling from "dumling/types";
import { DE_REL_MAP } from "./selection-policy-de.js";
import type { KnowledgeRequestMask } from "./types.js";

/** One language's Knowledge Policy: the aspects each source route requests, by Family and Kind. */
type KnowledgePolicy = Readonly<
	Record<string, Readonly<Record<string, KnowledgeRequestMask>>>
>;

/**
 * Each language's Knowledge Policy. A language missing here has none, so
 * selecting Knowledge for any of its routes yields
 * `KnowledgePolicyUnavailable`.
 */
const knowledgePolicies: {
	readonly [L in Dumling.Language]?: KnowledgePolicy;
} = { de: DE_REL_MAP };

/** The aspects the Knowledge Policy applies to a source route, or undefined where no policy covers it. */
export function knowledgePolicyMask(route: {
	language: string;
	family: string;
	kind: string;
}): KnowledgeRequestMask | undefined {
	const policies: Readonly<Record<string, KnowledgePolicy | undefined>> =
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
	lemma: Pick<Dumling.Lemma, "language" | "family" | "kind">,
	aspect: keyof KnowledgeRequestMask,
): boolean {
	return knowledgePolicyMask(lemma)?.[aspect] !== undefined;
}
