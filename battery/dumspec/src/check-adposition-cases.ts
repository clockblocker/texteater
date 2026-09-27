import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";
import { germanAdpositionAllows } from "./inventories/de/adposition-cases.js";

/** A case the ADP Case Table does not allow, at a path inside the checked unit. */
export type AdpositionCaseIssue = {
	readonly path: string;
	readonly message: string;
};

type AdpositionLemma = Parameters<typeof germanAdpositionAllows>[0];
type Complement =
	| { readonly kind: "Case"; readonly case: string }
	| {
			readonly kind: "Preposition";
			readonly preposition: AdpositionLemma;
			readonly case?: string;
	  }
	| { readonly kind: string };

const isPreposition = (
	complement: Complement,
): complement is Extract<Complement, { kind: "Preposition" }> =>
	complement.kind === "Preposition";

function prepositionIssue(
	complement: Complement,
	path: string,
): AdpositionCaseIssue[] {
	if (!isPreposition(complement) || complement.case === undefined) return [];
	const { preposition, case: grammaticalCase } = complement;
	return germanAdpositionAllows(preposition, grammaticalCase)
		? []
		: [
				{
					path: `${path}.case`,
					message: `${preposition.canonicalForm} does not take ${grammaticalCase}`,
				},
			];
}

/**
 * Where a German Attestation takes a case the ADP Case Table does not allow:
 * a governor's Preposition slot (`für` + Dat) or an ADP occurrence's realized
 * case (`auf` + Gen). Dumling checks only the evidence's shape (ADR 0041).
 * Hebrew and English mark no case.
 */
export function attestationAdpositionCaseIssues(
	attestation: Dumling.Attestation,
): AdpositionCaseIssue[] {
	if (
		attestation.surface.language !== "de" ||
		!("valencyEvidence" in attestation)
	)
		return [];
	const { lemma } = attestation.surface;
	const slots = attestation.valencyEvidence as readonly {
		readonly complement: Complement;
		readonly realizedCase: string;
	}[];
	return slots.flatMap(({ complement, realizedCase }, index) => {
		const path = `valencyEvidence.${index}`;
		if (lemma.kind === "ADP" && complement.kind === "Case")
			return germanAdpositionAllows(
				lemma as AdpositionLemma,
				realizedCase,
			)
				? []
				: [
						{
							path: `${path}.realizedCase`,
							message: `${lemma.canonicalForm} does not take ${realizedCase}`,
						},
					];
		return prepositionIssue(complement, `${path}.complement`);
	});
}

/**
 * Where a German Reading's Valency Frame gives a governed preposition a case
 * the ADP Case Table does not allow: `warten` `auf` + Acc and `bestehen`
 * `auf` + Dat pass, `für` + Dat fails. Dumrel checks only the frame's shape.
 */
export function frameAdpositionCaseIssues(
	frame: Dumrel.ValencyFrame,
): AdpositionCaseIssue[] {
	return frame.flatMap((slot, index) =>
		prepositionIssue(slot.complement as Complement, `${index}.complement`),
	);
}
