import type { Language } from "../types.js";
import { foldCase, normalizeForm } from "./semantics.js";

type ExpletiveEvidence = { attested: string; orthography: string };

/**
 * A German verbal Attestation names owned valency evidence, and expletive
 * evidence exactly when its Surface has a subject expletive: an owned member
 * of a complete realization, whose finite verb agrees in third person
 * singular. Whether that member spells `es` (`es`, or a clitic `'s`) is a
 * fact about German, checked in dumcorpus (ADR 0041).
 */
export function isGermanVerbalAttestation(value: {
	surface: {
		inflectionalFeatures: {
			expletive: string | null;
			verbForm: string;
			person: string | null;
			number: string | null;
		} | null;
	};
	expletiveEvidence: ExpletiveEvidence | null;
	valencyEvidence: ValencyEvidence[];
	members: { attested: string; orthography: string }[];
	realizationCoverage: string;
}): boolean {
	if (!isOwnedValencyEvidence(value.valencyEvidence, value.members, true))
		return false;
	const bag = value.surface.inflectionalFeatures;
	if (!bag?.expletive) return value.expletiveEvidence === null;
	const evidence = value.expletiveEvidence;
	if (!evidence || value.realizationCoverage !== "Full") return false;
	if (bag.verbForm === "Fin" && (bag.person !== "3" || bag.number !== "Sing"))
		return false;
	return value.members.some(
		(member) =>
			member.attested === evidence.attested &&
			member.orthography === evidence.orthography,
	);
}
export function germanVerbalAttestationError(): string {
	return "Subject expletive requires third-person singular agreement and owned expletive evidence in the complete verbal realization; valency evidence must name distinct owned members spelling its preposition, keeping the slot's case, and at most one Reflexive, named by its owned member in its case";
}

/**
 * A German adjective or noun Attestation names the owned members realizing
 * the valency slots it attests, as a verbal one does (ADR 0034), but no
 * lexical reflexive: only a verb has one (ADR 0052).
 */
export function isGermanValencyAttestation(value: {
	valencyEvidence: ValencyEvidence[];
	members: { attested: string; orthography: string }[];
}): boolean {
	return isOwnedValencyEvidence(value.valencyEvidence, value.members, false);
}
export function germanValencyAttestationError(): string {
	return "Valency evidence must name distinct owned members spelling its preposition, keeping the slot's case, and no Reflexive";
}

type ValencyEvidence = {
	member: number | null;
	complement:
		| { kind: "Case"; governedCase: string }
		| {
				kind: "Preposition";
				preposition: { canonicalForm: string };
				governedCase: string;
		  }
		| {
				kind: "Reflexive";
				governedCase: string;
				preposition?: { canonicalForm: string };
		  };
	realizedCase: string;
};

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

/**
 * Each slot names a distinct owned member, or none. A Preposition slot's
 * member spells its preposition, compared without case, unless it is a Typo.
 */
function namesMarkerMembers(
	evidence: readonly ValencySlot[],
	members: readonly { attested: string; orthography: string }[],
	language: Language,
): boolean {
	const named = evidence.flatMap((slot) =>
		slot.member === null ? [] : [slot.member],
	);
	if (new Set(named).size !== named.length) return false;
	return evidence.every(({ member: index, complement }) => {
		if (index === null || complement.kind !== "Preposition") return true;
		const member = members[index];
		return (
			member !== undefined &&
			(member.orthography === "Typo" ||
				foldCase(normalizeForm(member.attested), language) ===
					foldCase(complement.preposition.canonicalForm, language))
		);
	});
}

/**
 * German slots also keep their case: a preposition slot's occurrence shows
 * the case the slot governs, and a bare-case slot has no marker member. A
 * Reflexive, allowed only where `reflexive` says so, names its owned member
 * and shows the case its Reading fixes, at most once; after a fixed phrase's
 * preposition (`außer sich`) that is the case the preposition governs, and
 * the member is still the reflexive (ADR 0052). Which cases
 * a preposition takes, and which forms spell a reflexive, are facts about
 * German, checked in dumcorpus (ADR 0041).
 */
function isOwnedValencyEvidence(
	evidence: readonly ValencyEvidence[],
	members: readonly { attested: string; orthography: string }[],
	reflexive: boolean,
): boolean {
	const reflexives = evidence.filter(
		({ complement }) => complement.kind === "Reflexive",
	);
	return (
		reflexives.length <= (reflexive ? 1 : 0) &&
		reflexives.every(
			({ member }) => member !== null && members[member] !== undefined,
		) &&
		namesMarkerMembers(evidence, members, "de") &&
		evidence.every(({ member, complement, realizedCase }) =>
			complement.kind === "Case"
				? member === null
				: realizedCase === complement.governedCase,
		)
	);
}

/**
 * A Hebrew or English governor Attestation (VERB, ADJ, NOUN) may name the
 * valency slots it realizes, with no case (ADR 0034): `on` of `depend on`,
 * spelled in any case, or `על` of `סמך על`. A Fused member spells its Fusion
 * component, so `ב` of `בבית` in `בחר בבית` counts. A Subject, DirectObject
 * or IndirectObject slot has no marker member. The language comes from the
 * Attestation's Surface.
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

/**
 * A German ADP Attestation, Lexeme or Locution, records at most one slot: the
 * oblique bare case its complement took (`auf dem Tisch` Dat, `um des
 * Friedens willen` Gen), marked by no member. An ADP with no case-marked
 * complement records none. Which cases the ADP takes is a fact about German,
 * checked in dumcorpus (ADR 0041); no table is consulted here.
 */
export function isGermanAdpositionAttestation(value: {
	valencyEvidence: ValencyEvidence[];
}): boolean {
	const [slot, ...rest] = value.valencyEvidence;
	if (!slot) return true;
	return (
		rest.length === 0 &&
		slot.member === null &&
		slot.complement.kind === "Case" &&
		slot.complement.governedCase === slot.realizedCase &&
		slot.realizedCase !== "Nom"
	);
}
export function germanAdpositionAttestationError(): string {
	return "ADP valency evidence is at most one oblique bare-case slot with no member, realized in its case";
}
