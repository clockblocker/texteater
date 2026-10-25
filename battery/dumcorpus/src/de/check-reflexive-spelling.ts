import { foldCase, normalizeForm } from "dumling";
import type * as Dumling from "dumling/types";
import { REFLEXIVE } from "../inflection/de/verb-stem.js";

/** A Reflexive that does not spell its case or stays in the Surface, at a path inside the checked Attestation. */
type ReflexiveSpellingIssue = {
	readonly path: string;
	readonly message: string;
};

const fold = (value: string) => foldCase(normalizeForm(value), "de");

/**
 * Where a German Attestation's Reflexive evidence names a member that is no
 * reflexive of the case it took (`mich` and `dich` are Acc, `mir` and `dir`
 * Dat; `sich`, `uns` and `euch` are either), or where its normalized Surface
 * keeps the reflexive, which it leaves out as it leaves out a governed
 * preposition (ADR 0052): `erinnert`, not `erinnert sich`. Dumling checks
 * only that the evidence names an owned member in its case (ADR 0041). A
 * Typo is not read.
 */
export function attestationReflexiveSpellingIssues(
	attestation: Dumling.Attestation<"de">,
): ReflexiveSpellingIssue[] {
	if (!("valencyEvidence" in attestation)) return [];
	const words = new Set(
		attestation.surface.normalizedSurface.split(" ").map(fold),
	);
	return attestation.valencyEvidence.flatMap(
		({ member, complement, realizedCase }, index) => {
			if (complement.kind !== "Reflexive" || member === null) return [];
			const owned = attestation.members[member];
			if (owned === undefined || owned.orthography === "Typo") return [];
			const spelled = fold(owned.attested);
			const forms: ReadonlySet<string> = new Set(
				Object.values(REFLEXIVE[complement.governedCase]),
			);
			const path = `valencyEvidence.${index}`;
			return [
				...(forms.has(spelled)
					? []
					: [
							{
								path: `${path}.member`,
								message: `${owned.attested} is no ${realizedCase} reflexive`,
							},
						]),
				...(words.has(spelled)
					? [
							{
								path: "surface.normalizedSurface",
								message: `The normalized Surface leaves out the reflexive ${owned.attested}`,
							},
						]
					: []),
			];
		},
	);
}
