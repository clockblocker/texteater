import { foldCase, normalizeForm } from "dumling";
import type * as Dumling from "dumling/types";
import { REFLEXIVE } from "../inflection/de/verb-stem.js";

/** A Reflexive that does not spell its case, hides a case its form shows, or stays in the Surface, at a path inside the checked Attestation. */
type ReflexiveSpellingIssue = {
	readonly path: string;
	readonly message: string;
};

const fold = (value: string) => foldCase(normalizeForm(value), "de");

/** The cases a reflexive's spelling can show: both for sich, uns and euch. */
function casesSpelled(spelled: string): ("Acc" | "Dat")[] {
	return (["Acc", "Dat"] as const).filter((reflexiveCase) =>
		Object.values(REFLEXIVE[reflexiveCase]).includes(spelled),
	);
}

/**
 * Where a German Attestation's Reflexive evidence names a member that is no
 * reflexive of the case it took (`mich` and `dich` are Acc, `mir` and `dir`
 * Dat; `sich`, `uns` and `euch` are either), names no case where the form
 * shows one, or where its normalized Surface keeps the reflexive, which it
 * leaves out as it leaves out a governed preposition (ADR 0052):
 * `erinnert`, not `erinnert sich`. After `sich`, `uns` or `euch` the case
 * may be left out or named, as gold authors know it. Dumling checks only
 * that the evidence names an owned member, in its case where it names one
 * (ADR 0041). A Typo is not read.
 */
export function attestationReflexiveSpellingIssues(
	attestation: Dumling.Attestation<"de">,
): ReflexiveSpellingIssue[] {
	if (!("valencyEvidence" in attestation)) return [];
	const words = new Set(
		attestation.surface.normalizedSurface.split(" ").map(fold),
	);
	return attestation.valencyEvidence.flatMap(
		({ member, complement }, index) => {
			if (complement.kind !== "Reflexive" || member === null) return [];
			const owned = attestation.members[member];
			if (owned === undefined || owned.orthography === "Typo") return [];
			const spelled = fold(owned.attested);
			const cases = casesSpelled(spelled);
			const named =
				"governedCase" in complement
					? complement.governedCase
					: undefined;
			const path = `valencyEvidence.${index}`;
			const [shown] = cases;
			const spelling =
				named === undefined
					? cases.length === 0
						? `${owned.attested} is no reflexive`
						: cases.length === 1
							? `${owned.attested} shows ${shown}, and the evidence names no case`
							: undefined
					: cases.includes(named)
						? undefined
						: `${owned.attested} is no ${named} reflexive`;
			return [
				...(spelling === undefined
					? []
					: [{ path: `${path}.member`, message: spelling }]),
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
