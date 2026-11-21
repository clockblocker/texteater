import type { Language } from "../types.js";
import { languageNormalizations } from "./languages/normalizations.js";

type ValencySlot = {
	member: number | null;
	complement:
		| {
				kind:
					| "Case"
					| "Subject"
					| "DirectObject"
					| "IndirectObject"
					| "Reflexive";
		  }
		| { kind: "Preposition"; preposition: { canonicalForm: string } };
};

function exactPrepositionMatch(word: string, preposition: string): boolean {
	return word === preposition;
}

/**
 * Each slot names a distinct owned member, or none. A Preposition slot's
 * member spells its preposition, compared through the language's normalization
 * hook and optional matcher, unless it is a Typo.
 */
export function namesMarkerMembers(
	evidence: readonly ValencySlot[],
	members: readonly { attested: string; orthography: string }[],
	language: Language,
	matchesPreposition: (
		word: string,
		preposition: string,
	) => boolean = exactPrepositionMatch,
): boolean {
	const named = evidence.flatMap((slot) =>
		slot.member === null ? [] : [slot.member],
	);
	if (new Set(named).size !== named.length) return false;
	const normalization = languageNormalizations[language];
	return evidence.every(({ member: index, complement }) => {
		if (index === null || complement.kind !== "Preposition") return true;
		const member = members[index];
		return (
			member !== undefined &&
			(member.orthography === "Typo" ||
				matchesPreposition(
					normalization.canonicalFormKey(member.attested),
					normalization.foldCase(
						complement.preposition.canonicalForm,
					),
				))
		);
	});
}

/**
 * A caseless governor Attestation (such as Hebrew or English VERB, ADJ, NOUN)
 * may name the valency slots it realizes, with no case (ADR 0034): `on` of
 * `depend on`, spelled in any case, or `על` of `סמך על`. A Fused member spells
 * its Fusion component, so `ב` of `בבית` in `בחר בבית` counts. A Subject,
 * DirectObject or IndirectObject slot has no marker member. The language comes
 * from the Attestation's Surface.
 */
export function isCaselessValencyAttestation(value: {
	surface: { language: Language };
	valencyEvidence?: ValencySlot[];
	members: { attested: string; orthography: string }[];
}): boolean {
	const evidence = value.valencyEvidence ?? [];
	return (
		namesMarkerMembers(evidence, value.members, value.surface.language) &&
		evidence.every(
			({ member, complement }) =>
				member === null || complement.kind === "Preposition",
		)
	);
}
export function caselessValencyAttestationError(): string {
	return "Valency evidence must name distinct owned members spelling its preposition; a Subject, DirectObject or IndirectObject slot names no member";
}
