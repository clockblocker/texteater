import type { Surface } from "../types.js";
import { type GrundformRule, inflectionalFeatures } from "./features.js";

function isComparable(surface: Surface): boolean {
	const core: Readonly<Record<string, unknown>> = surface.lemma.coreFeatures;
	return core.comparable === "Yes";
}

/**
 * A comparable ADV cites its positive. A non-comparable one marks no Degree
 * and has no inflection, so its spelling decides (ADR 0042).
 */
export function adverb(surface: Surface): GrundformRule {
	return isComparable(surface)
		? { features: { degree: ["Pos"] } }
		: { features: {} };
}

/**
 * A comparable ADJ cites its positive with unmarked case, gender and number.
 * A non-comparable one is Grundform by its spelling when it has no
 * inflection; an attributive form (`toten`) is not (ADR 0042). A language
 * whose ADJ marks only Degree passes `[]` as its agreement features.
 */
export function adjective(
	agreement: readonly string[],
): (surface: Surface) => GrundformRule {
	const unmarked = Object.fromEntries(
		agreement.map((feature) => [feature, [null]]),
	);
	return (surface) => {
		if (isComparable(surface))
			return { features: { degree: ["Pos"], ...unmarked } };
		return inflectionalFeatures(surface) === null
			? { features: {} }
			: { features: unmarked };
	};
}
