import type * as Dumling from "dumling/types";
import { isGermanPluralOnlyNoun } from "./inventories/de/plural-only-nouns.js";

/** A plural-only noun given a gender, at a path inside the checked Attestation. */
export type PluralOnlyIssue = {
	readonly path: string;
	readonly message: string;
};

/**
 * A German Lexeme NOUN with no singular has gender null, in its Core and on
 * its Surface (Rule de/plural-only-noun-has-no-gender). Only the nouns
 * dumspec lists as Pluraletantum are checked.
 */
export function attestationPluralOnlyIssues(
	attestation: Dumling.Attestation,
): PluralOnlyIssue[] {
	const { lemma } = attestation.surface;
	if (
		lemma.language !== "de" ||
		lemma.family !== "Lexeme" ||
		lemma.kind !== "NOUN" ||
		!isGermanPluralOnlyNoun(lemma.canonicalForm)
	)
		return [];
	const core = lemma.coreFeatures as Readonly<Record<string, unknown>>;
	const inflection = (
		attestation.surface as { inflectionalFeatures?: unknown }
	).inflectionalFeatures as Readonly<Record<string, unknown>> | null;
	const issues: PluralOnlyIssue[] = [];
	if ((core.gender ?? null) !== null)
		issues.push({
			path: "surface.lemma.coreFeatures.gender",
			message: `${lemma.canonicalForm} has no singular, so its gender is null (de/plural-only-noun-has-no-gender)`,
		});
	if ((inflection?.gender ?? null) !== null)
		issues.push({
			path: "surface.inflectionalFeatures.gender",
			message: `${lemma.canonicalForm} has no singular, so its Surface marks no gender (de/plural-only-noun-has-no-gender)`,
		});
	return issues;
}
