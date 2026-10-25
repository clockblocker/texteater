import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";
import {
	germanAdpositionAllowedCases,
	germanAdpositionEntry,
} from "../inventories/de/adposition-cases.js";

/**
 * An adposition the ADP Case Table does not list, or a case it does not
 * allow, at a path inside the checked unit.
 */
export type AdpositionCaseIssue = {
	readonly path: string;
	readonly message: string;
};

type AdpositionLemma = Parameters<typeof germanAdpositionEntry>[0];
type Complement =
	| { readonly kind: "Case"; readonly governedCase: string }
	| {
			readonly kind: "Preposition" | "Reflexive";
			readonly preposition?: AdpositionLemma;
			readonly governedCase?: string;
	  }
	| { readonly kind: string };

/**
 * A complement with a preposition and the case it governs: a Preposition, or
 * a Reflexive that is the object of a fixed phrase's preposition (`außer sich
 * sein`: `außer` + Dat, ADR 0052).
 */
const hasPreposition = (
	complement: Complement,
): complement is Complement & {
	readonly preposition: AdpositionLemma;
	readonly governedCase: string;
} =>
	"preposition" in complement &&
	complement.preposition !== undefined &&
	"governedCase" in complement &&
	complement.governedCase !== undefined;

/**
 * The issue for an ADP the table lacks, at `lemmaPath`, or for a case none
 * of its positions takes, at `casePath`. Position is never checked: the
 * table states what German allows, and no record states where an adposition
 * stood (ADR 0032).
 */
function caseIssue(
	lemma: AdpositionLemma,
	grammaticalCase: string | undefined,
	paths: { lemma: string; case: string },
): AdpositionCaseIssue[] {
	const entry = germanAdpositionEntry(lemma);
	if (!entry)
		return [
			{
				path: paths.lemma,
				message: `The ADP Case Table does not list ${lemma.canonicalForm}`,
			},
		];
	if (
		grammaticalCase === undefined ||
		germanAdpositionAllowedCases(entry).some(
			(allowed) => allowed === grammaticalCase,
		)
	)
		return [];
	return [
		{
			path: paths.case,
			message: `${lemma.canonicalForm} does not take ${grammaticalCase}`,
		},
	];
}

/**
 * A preposition's issue, or a caseless Reflexive's after a preposition that
 * leaves the reflexive one case and so shows it (`außer sich`: Dat; `in
 * sich` may be either). Only an occurrence's Reflexive is ever caseless
 * (ADR 0052).
 */
function prepositionIssue(
	complement: Complement,
	path: string,
): AdpositionCaseIssue[] {
	if (hasPreposition(complement))
		return caseIssue(complement.preposition, complement.governedCase, {
			lemma: `${path}.preposition`,
			case: `${path}.governedCase`,
		});
	if (
		complement.kind !== "Reflexive" ||
		!("preposition" in complement) ||
		complement.preposition === undefined
	)
		return [];
	const { preposition } = complement;
	const unlisted = caseIssue(preposition, undefined, {
		lemma: `${path}.preposition`,
		case: "",
	});
	if (unlisted.length > 0) return unlisted;
	const entry = germanAdpositionEntry(preposition);
	const shown = (entry ? germanAdpositionAllowedCases(entry) : []).filter(
		(allowed) => allowed === "Acc" || allowed === "Dat",
	);
	return shown.length === 1
		? [
				{
					path: `${path}.governedCase`,
					message: `${preposition.canonicalForm} shows the reflexive's ${shown[0]}, and the evidence names no case`,
				},
			]
		: [];
}

/**
 * Where a German Attestation relies on what the ADP Case Table lacks. An ADP
 * occurrence, Lexeme or Locution, fails when the table doesn't list it, and
 * when its realized case is one none of its positions takes (`auf` + Gen). A
 * governor's Preposition evidence, and Reflexive evidence after a fixed
 * phrase's preposition, fails when the table doesn't list its preposition or
 * the preposition doesn't take its governed case (`für` + Dat), or names no
 * case where the preposition shows it (`außer sich`: Dat). Dumling checks
 * only the evidence's shape (ADR 0041).
 */
export function attestationAdpositionCaseIssues(
	attestation: Dumling.Attestation<"de">,
): AdpositionCaseIssue[] {
	const { lemma } = attestation.surface;
	// A Kind never implies its Family (ADR 0039), and both ADP Families record
	// their complement's case.
	const adposition =
		lemma.kind === "ADP" &&
		(lemma.family === "Lexeme" || lemma.family === "Locution");
	const slots: readonly {
		readonly complement: Complement;
		readonly realizedCase?: string;
	}[] = "valencyEvidence" in attestation ? attestation.valencyEvidence : [];
	if (adposition) {
		const unlisted = caseIssue(lemma, undefined, {
			lemma: "surface.lemma",
			case: "",
		});
		if (unlisted.length > 0) return unlisted;
	}
	return slots.flatMap(({ complement, realizedCase }, index) => {
		const path = `valencyEvidence.${index}`;
		if (adposition && complement.kind === "Case")
			return caseIssue(lemma, realizedCase, {
				lemma: "surface.lemma",
				case: `${path}.realizedCase`,
			});
		return prepositionIssue(complement, `${path}.complement`);
	});
}

/**
 * Where a German Reading's Valency Frame relies on what the ADP Case Table
 * lacks, checking every Preposition complement, alternatives included, and
 * every Reflexive's preposition: `warten` `auf` + Acc, `bestehen` `auf` + Dat
 * and `außer sich sein` `außer` + Dat pass, `für` + Dat fails, and so does a
 * preposition the table doesn't list. Dumrel checks only the frame's shape.
 */
export function frameAdpositionCaseIssues(
	frame: Dumrel.ValencyFrame,
): AdpositionCaseIssue[] {
	return frame.flatMap((slot, index) =>
		slot.complements.flatMap((complement, alternative) =>
			prepositionIssue(complement, `${index}.complements.${alternative}`),
		),
	);
}
