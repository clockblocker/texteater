import { stableJson } from "promptsmith";

/**
 * Cases whose Text leaves the referent open, so any cell of the ideal Lemma's
 * case and subtype passes: a one-Sentence `Ich sehe sie.` is her or them.
 */
export const openReferentCaseIds: readonly string[] = [
	"grammar-de-pron-referent-sie-acc-alone",
];

/** An analysis without the Core coordinates only a referent decides. */
function withoutReferent(value: unknown): unknown {
	if (!value || typeof value !== "object" || !("lemma" in value))
		return value;
	const { lemma } = value as {
		lemma: { coreFeatures: Record<string, unknown> };
	};
	const {
		gender: _gender,
		number: _number,
		person: _person,
		polite: _polite,
		...core
	} = lemma.coreFeatures;
	return { ...value, lemma: { ...lemma, coreFeatures: core } };
}

/**
 * Passes any cell of the ideal Lemma's spelling, case and subtype when the
 * Text leaves the referent open; the rest of the analysis must match.
 */
export function evaluateOpenReferent(args: {
	output: unknown;
	idealOutput: unknown;
}) {
	return {
		contractPass:
			stableJson(withoutReferent(args.output)) ===
			stableJson(withoutReferent(args.idealOutput)),
	};
}
