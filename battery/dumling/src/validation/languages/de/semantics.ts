import { namesMarkerMembers } from "../../evidence-semantics.js";
import type { ValidationOperationEntry } from "../types.js";

/** Null records no marked distinction; it never substitutes for a known gender. */
export function isGermanPronounCore(core: Record<string, unknown>): boolean {
	if ((core.gender ?? null) === null) return true;
	if (core.number === "Plur") return false;
	return (
		core.pronType !== "Prs" ||
		(core.person === "3" && core.number === "Sing")
	);
}
export function germanPronounCoreError(): string {
	return "German pronoun gender must agree with its subtype, person and number";
}

/** Plural agreement has no marked gender; a cell never guesses one. */
export function isGermanDeterminerCore(core: Record<string, unknown>): boolean {
	return core.gender === null || core.number !== "Plur";
}
export function germanDeterminerCoreError(): string {
	return "German determiner plural agreement has no marked gender";
}

/**
 * German PART is closed and typed (system ADR 0032): every Lemma names
 * exactly one type, polarity Neg for nicht, partType Inf for infinitive zu
 * or partType Mod for a modal particle.
 */
export function isGermanParticleCore(core: Record<string, unknown>): boolean {
	return (
		((core.partType ?? null) === null) !==
		((core.polarity ?? null) === null)
	);
}
export function germanParticleCoreError(): string {
	return "A German PART names exactly one type: polarity Neg, partType Inf or partType Mod";
}

const cellCoordinates = ["case", "number", "gender"] as const;
/**
 * A pillar Lemma marks its Paradigm Cell in Core; a stem Lemma marks it on
 * each Surface. A coordinate is never marked in both, and plural agreement
 * marks no gender on either. A stem whose gender is inherent rather than
 * agreement (`wer` Masc, `was` Neut) marks it in Core and its case on the
 * Surface.
 */
export function isGermanClosedClassSurface(value: {
	lemma: { coreFeatures: Record<string, unknown> };
	inflectionalFeatures: Record<string, unknown> | null;
}): boolean {
	const core = value.lemma.coreFeatures;
	const bag = value.inflectionalFeatures;
	if (!bag) return true;
	if (
		cellCoordinates.some(
			(coordinate) =>
				(core[coordinate] ?? null) !== null &&
				(bag[coordinate] ?? null) !== null,
		)
	)
		return false;
	if (
		core.poss !== "Yes" &&
		((bag["gender[psor]"] ?? null) !== null ||
			(bag["number[psor]"] ?? null) !== null)
	)
		return false;
	return !(bag.number === "Plur" && (bag.gender ?? null) !== null);
}
export function germanClosedClassSurfaceError(): string {
	return "German PRON and DET mark case, number and gender in Core or on the Surface, never both; plural agreement has no marked gender; only a possessive marks possessor features";
}

/**
 * A German common noun Surface is the noun's own form and says nothing about
 * its article (ADR 0040). A noun whose Lemma has no gender, such as an
 * adjectival noun for a person, marks on a singular Surface the gender its
 * form shows (der Reisende, ein Verletzter), so its article can agree. No
 * other Surface marks gender, and a singular with neither fails.
 */
export function isGermanNounSurface(value: {
	inflectionalFeatures: {
		gender: string | null;
		number: string | null;
	} | null;
	lemma: { coreFeatures: { gender: unknown } };
}): boolean {
	const bag = value.inflectionalFeatures;
	if (!bag) return true;
	const lemmaGender = value.lemma.coreFeatures.gender;
	if (bag.gender !== null)
		return lemmaGender === null && bag.number === "Sing";
	return bag.number !== "Sing" || lemmaGender !== null;
}
export function germanNounSurfaceError(): string {
	return "A singular noun Surface marks gender only when its Lemma has none, and then must; a plural marks none";
}

/**
 * A German proper noun Surface marks gender only where its Lemma has none, a
 * surname or coined name, and only in the singular: the gender its owned
 * article or an agreeing adjective shows (der junge Schwarzkopf). Unlike a
 * noun's, the mark is not required here; dumcorpus requires it wherever the
 * name owns an article (ADR 0040).
 */
export function isGermanProperNounSurface(value: {
	inflectionalFeatures: {
		gender: string | null;
		number: string | null;
	} | null;
	lemma: { coreFeatures: { gender: string | null } };
}): boolean {
	const bag = value.inflectionalFeatures;
	if (!bag || bag.gender === null) return true;
	return value.lemma.coreFeatures.gender === null && bag.number === "Sing";
}
export function germanProperNounSurfaceError(): string {
	return "A proper noun Surface marks gender only in the singular and only when its Lemma has none";
}

export function isGermanVerbalSurface(value: {
	normalizedSurface: string;
	inflectionalFeatures: {
		expletive: string | null;
		verbForm: string;
		person: string | null;
		number: string | null;
		mood: string | null;
	} | null;
}): boolean {
	const bag = value.inflectionalFeatures;
	if (!bag?.expletive) return true;
	return (
		value.normalizedSurface.split(" ").includes("es") &&
		(bag.verbForm !== "Fin" ||
			(bag.person === "3" && bag.number === "Sing" && bag.mood !== "Imp"))
	);
}
export function germanVerbalSurfaceError(): string {
	return "Subject-expletive Surface requires normalized es and compatible verbal agreement";
}

type ExpletiveEvidence = { attested: string; orthography: string };

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
				governedCase?: string;
				preposition?: { canonicalForm: string };
		  };
	realizedCase?: string;
};

/**
 * Whether `word`, folded, spells the preposition `preposition` or the German
 * pronominal adverb that holds it: `da`, `wo` or `hier` before it, with an `r`
 * between `da` or `wo` and a vowel (`damit`, `darauf`, `wovon`, `hiermit`).
 * The adverb stays one member and marks the slot (ADR 0029).
 */
function spellsGermanPreposition(word: string, preposition: string): boolean {
	if (word === preposition) return true;
	const linker = /^[aeiouäöü]/u.test(preposition) ? "r" : "";
	return [`da${linker}`, `wo${linker}`, "hier"].some(
		(prefix) => word === `${prefix}${preposition}`,
	);
}

/**
 * German slots also keep their case: a preposition slot's occurrence shows
 * the case the slot governs, and a bare-case slot has no marker member. A
 * Reflexive, allowed only where `reflexive` says so, names its owned member,
 * at most once, and the case its Reading fixes where it names one; after a
 * fixed phrase's preposition (`außer sich`) that is the case the preposition
 * governs, and the member is still the reflexive (ADR 0052). Which cases a
 * preposition takes, which forms spell a reflexive, and so when the
 * occurrence shows the case and must name it, are facts about German,
 * checked in dumcorpus (ADR 0041).
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
		namesMarkerMembers(evidence, members, "de", spellsGermanPreposition) &&
		evidence.every(({ member, complement, realizedCase }) =>
			complement.kind === "Case"
				? member === null
				: realizedCase === complement.governedCase,
		)
	);
}

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
	return "Subject expletive requires third-person singular agreement and owned expletive evidence in the complete verbal realization; valency evidence must name distinct owned members spelling its preposition, keeping the slot's case, and at most one Reflexive, named by its owned member, in its case where it names one";
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

/** German-specific validation operations, registered in `operationTable`. */
export const deValidationOperations = [
	{
		construct: "custom",
		implementation: isGermanVerbalSurface,
		error: germanVerbalSurfaceError,
		name: "dumling.de-verbal.surface",
		version: 1,
	},
	{
		construct: "custom",
		implementation: isGermanVerbalAttestation,
		error: germanVerbalAttestationError,
		name: "dumling.de-verbal.attestation",
		version: 6,
	},
	{
		construct: "custom",
		implementation: isGermanAdpositionAttestation,
		error: germanAdpositionAttestationError,
		name: "dumling.de-adposition.attestation",
		version: 2,
	},
	{
		construct: "custom",
		implementation: isGermanValencyAttestation,
		error: germanValencyAttestationError,
		name: "dumling.de-valency.attestation",
		version: 3,
	},
	{
		construct: "custom",
		implementation: isGermanNounSurface,
		error: germanNounSurfaceError,
		name: "dumling.de-noun.surface",
		version: 5,
	},
	{
		construct: "custom",
		implementation: isGermanProperNounSurface,
		error: germanProperNounSurfaceError,
		name: "dumling.de-proper-noun.surface",
		version: 1,
	},
	{
		construct: "custom",
		implementation: isGermanPronounCore,
		error: germanPronounCoreError,
		name: "dumling.de-pronoun.core",
		version: 1,
	},
	{
		construct: "custom",
		implementation: isGermanDeterminerCore,
		error: germanDeterminerCoreError,
		name: "dumling.de-determiner.core",
		version: 1,
	},
	{
		construct: "custom",
		implementation: isGermanParticleCore,
		error: germanParticleCoreError,
		name: "dumling.de-particle.core",
		version: 1,
	},
	{
		construct: "custom",
		implementation: isGermanClosedClassSurface,
		error: germanClosedClassSurfaceError,
		name: "dumling.de-closed-class.surface",
		version: 1,
	},
] as const satisfies readonly ValidationOperationEntry[];
