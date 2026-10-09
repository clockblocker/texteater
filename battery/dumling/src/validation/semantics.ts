import emojiRegex from "emoji-regex";
import type { Language } from "../types.js";

/** Shared by Zod authoring and compiled validation operations. */
export function hasMarkedFeature(bag: Record<string, unknown>): boolean {
	return Object.values(bag).some((value) => value !== null);
}
export function nonEmptyFeatureBagError(): string {
	return "Feature Bag must contain a marked feature";
}
/**
 * Trims, NFC-normalizes and writes a discontinuous form's open slot as `…`
 * (U+2026): `um ... willen` is stored as `um … willen`. NFC keeps ASCII `...`
 * and NFKC would turn `…` into it, so the slot is replaced explicitly. This
 * is the one text normalizer: Dumrel's and Dumdict's normalized strings use
 * it too, so a Unit Shadow's form and a Lemma's agree.
 */
export function normalizeForm(value: string): string {
	return value.trim().normalize("NFC").replaceAll("...", "…");
}
/**
 * Folds letter case by the language's own rules, so spellings that differ
 * only in case compare equal: `LOL` and `lol` both fold to `lol`. Lemma
 * identity compares Canonical Forms this way (system ADR 0002). Hebrew has no
 * case and folds to itself.
 */
export function foldCase(value: string, language: Language): string {
	return value.toLocaleLowerCase(language);
}
const finalPunctuation = /[.!?,;:…‽]$/u;
/**
 * A Saying's Canonical Form is written as a sentence, with its internal
 * punctuation and no final punctuation: `Wer rastet, der rostet` (ADR 0039).
 */
export function isSayingCanonicalForm(value: string): boolean {
	return !finalPunctuation.test(value);
}
export function sayingCanonicalFormError(): string {
	return "A Saying's Canonical Form has no final punctuation";
}
/**
 * A Foreign Lemma has one Surface: its Canonical Form, spelled Canonical,
 * with no Surface features (ADR 0045). A typo is a Typo member and a
 * spelling such as `colour` is the Canonical Form itself, so no other
 * Surface is needed. The form is compared exactly, display casing included:
 * the sentence's casing stays on the member, so the Lemma keeps one Surface.
 */
export function isForeignSurface(value: {
	lemma: { canonicalForm: string };
	normalizedSurface: string;
	spelling: { kind: string };
	surfaceFeatures: unknown;
}): boolean {
	return (
		value.normalizedSurface === value.lemma.canonicalForm &&
		value.spelling.kind === "Canonical" &&
		value.surfaceFeatures === null
	);
}
export function foreignSurfaceError(): string {
	return "A Foreign Surface is its Lemma's Canonical Form, spelled Canonical, with no Surface features";
}
/**
 * The Variant tags in their canonical order (ADR 0041): a Variant's tags are
 * listed in this order, so one set always serializes and compares the same.
 */
export const variantTagOrder = [
	"Licensed",
	"Historical",
	"Regional",
	"Expressive",
] as const;
type VariantSpelling = { variantTags: readonly string[] };
/** Each tag follows the one before it in canonical order, so none repeats. */
export function isVariantTagList({ variantTags }: VariantSpelling): boolean {
	const order: readonly string[] = variantTagOrder;
	const ranks = variantTags.map((tag) => order.indexOf(tag));
	return ranks.every((rank, index) => rank > (ranks[index - 1] ?? -1));
}
export function variantTagListError(): string {
	return "Variant tags must be distinct and in the order Licensed, Historical, Regional, Expressive";
}
/**
 * Licensed means a current standard accepts the spelling, Historical that only
 * an earlier standard did, so one spelling is never both.
 */
export function isVariantTagCombination({
	variantTags,
}: VariantSpelling): boolean {
	return !(
		variantTags.includes("Licensed") && variantTags.includes("Historical")
	);
}
export function variantTagCombinationError(): string {
	return "A Variant is never both Licensed and Historical";
}
const presentationMarks = /[\uFE0E\uFE0F]|\p{Emoji_Modifier}/gu;
/**
 * An Emoji Description compares without variation selectors or skin-tone
 * modifiers (ADR 0031), so `🖱️` is `🖱` and `🫳🏽` is `🫳`. Order and ZWJ
 * sequences stay.
 */
export function normalizeEmojiDescription(value: string): string {
	return normalizeForm(value).replace(presentationMarks, "");
}
const emojiPattern = new RegExp(`^(?:${emojiRegex().source})$`);
const modifierPattern = /^\p{Emoji_Modifier}$/u;
let segmenter: Intl.Segmenter | undefined;
export function isEmojiDescription(value: string): boolean {
	segmenter ??= new Intl.Segmenter(undefined, { granularity: "grapheme" });
	const segments = [...segmenter.segment(value)];
	return (
		segments.length >= 1 &&
		segments.length <= 4 &&
		segments.every(
			({ segment }) =>
				emojiPattern.test(segment) && !modifierPattern.test(segment),
		)
	);
}
export function emojiDescriptionError(): string {
	return "Emoji Description must contain one to four emoji graphemes";
}

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
 * A feature value set as `featureValueTupleSchema` stores it: two or more
 * distinct values in their catalog order, so one set has one spelling and
 * Core values still compare literally (system ADR 0032): `["Fem", "Masc"]`,
 * never `["Masc", "Fem"]`, `["Fem", "Fem"]` or `["Fem"]`. A German noun's
 * `mixed` gender is such a set. The schema accepts only catalogs whose values
 * are already in code-point order, so ordering by code point is ordering by
 * catalog.
 */
export function isFeatureValueSet(values: readonly string[]): boolean {
	return (
		values.length >= 2 &&
		values.every((value, index) => {
			const previous = values[index - 1];
			return previous === undefined || previous < value;
		})
	);
}
export function featureValueSetError(): string {
	return "A feature value set names two or more distinct values in catalog order; one value is written alone";
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

type Fusion = { spelling: string; components: { span: string }[] };
/** The components' spans spell the fused word, in order. */
export function isFusion(value: Fusion): boolean {
	return (
		value.components.map((component) => component.span).join("") ===
		value.spelling
	);
}
export function fusionError(): string {
	return "Fusion component spans must spell the fused word in order";
}
/** A Fused member spells the Fusion component it realizes. */
export function isFusedMember(value: {
	attested: string;
	fusion: Fusion;
	component: number;
}): boolean {
	return value.fusion.components[value.component]?.span === value.attested;
}
export function fusedMemberError(): string {
	return "A Fused member must spell the Fusion component it realizes";
}

/**
 * The Head of a phrase owns the article that opens it (ADR 0040): a noun, or
 * the ADJ, NUM or PRON standing in for an elided noun (`[den, roten]`,
 * `[the, rich]`), or a proper noun, cited bare or with its article
 * (`[das, Berlin]`, `[die, Schweiz]`). A Head without an article has no
 * article evidence and Full coverage; an owned article keeps Full coverage; a
 * shared article or a hidden Fusion component leaves the Head Partial.
 * Hebrew adds its own condition, `isHebrewArticleAttestation`. A NOUN
 * Locution owns its article the same way (`[a, walk, in, the, park]`), but
 * its other fixed words decide its coverage too (ADR 0039), so only a shared
 * or hidden article ties it to Partial. Whether the article agrees with its Head is a
 * fact about the language, checked in dumcorpus (ADR 0041).
 */
export function isArticleAttestation(value: {
	surface: { lemma: { family: string } };
	articleEvidence?:
		| { kind: "Owned"; member: number }
		| { kind: "Shared" }
		| { kind: "Hidden"; fusion: Fusion; component: number }
		| null;
	realizationCoverage: string;
	members: unknown[];
}): boolean {
	const evidence = value.articleEvidence;
	const { surface } = value;
	// A Head whose article is its own or absent is Full; a Locution may still
	// be Partial for a missing fixed word.
	const coverageWithOwnArticle =
		surface.lemma.family === "Locution" ||
		value.realizationCoverage === "Full";
	if (!evidence) return coverageWithOwnArticle;
	if (evidence.kind === "Owned")
		return coverageWithOwnArticle && evidence.member < value.members.length;
	if (evidence.kind === "Hidden")
		return (
			value.realizationCoverage === "Partial" &&
			evidence.fusion.components[evidence.component]?.span === ""
		);
	return value.realizationCoverage === "Partial";
}
export function articleAttestationError(): string {
	return "A Head's article is an owned member with Full coverage, or a shared article or hidden Fusion component with Partial coverage; a Head without an article has no article evidence and Full coverage; a NOUN Locution's other fixed words may leave it Partial";
}

/**
 * Hebrew marks its article with `definite: Def` on the noun or adjective it
 * prefixes, and only such a form, or a proper noun cited with its article,
 * names article evidence; a `Def` form may name none (ADR 0040).
 */
export function isHebrewArticleAttestation(value: {
	surface: {
		inflectionalFeatures: { definite?: string | null } | null;
		lemma: { kind: string; coreFeatures: { article?: string | null } };
	};
	articleEvidence?: unknown;
}): boolean {
	const { surface } = value;
	if (!value.articleEvidence) return true;
	return surface.lemma.kind === "PROPN"
		? surface.lemma.coreFeatures.article === "Definite"
		: surface.inflectionalFeatures?.definite === "Def";
}
export function hebrewArticleAttestationError(): string {
	return "A Hebrew Head names article evidence only on a Def form, or as a proper noun cited with its article";
}

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
	if (!isOwnedValencyEvidence(value.valencyEvidence, value.members))
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
	return "Subject expletive requires third-person singular agreement and owned expletive evidence in the complete verbal realization; valency evidence must name distinct owned members spelling its preposition, keeping the slot's case";
}

/**
 * A German adjective or noun Attestation names the owned members realizing
 * the valency slots it attests, as a verbal one does (ADR 0034).
 */
export function isGermanValencyAttestation(value: {
	valencyEvidence: ValencyEvidence[];
	members: { attested: string; orthography: string }[];
}): boolean {
	return isOwnedValencyEvidence(value.valencyEvidence, value.members);
}
export function germanValencyAttestationError(): string {
	return "Valency evidence must name distinct owned members spelling its preposition, keeping the slot's case";
}

type ValencyEvidence = {
	member: number | null;
	complement:
		| { kind: "Case"; governedCase: string }
		| {
				kind: "Preposition";
				preposition: { canonicalForm: string };
				governedCase: string;
		  };
	realizedCase: string;
};

type ValencySlot = {
	member: number | null;
	complement:
		| { kind: "Case" | "Subject" | "DirectObject" | "IndirectObject" }
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
 * the case the slot governs, and a bare-case slot has no marker member. Which
 * cases a preposition takes is a fact about German, checked in dumcorpus (ADR
 * 0041).
 */
function isOwnedValencyEvidence(
	evidence: readonly ValencyEvidence[],
	members: readonly { attested: string; orthography: string }[],
): boolean {
	return (
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

/**
 * Comparability decides Degree on a German or English ADV or ADJ Surface (ADR
 * 0042). A comparable Lemma's Surface always marks it, `Pos` in a citation
 * (`mild`) included. A non-comparable Lemma's never does, which leaves a
 * non-comparable ADV no inflection and an ADJ only its attributive case,
 * gender and number (`der tote Mann`).
 */
export function isComparabilitySurface(value: {
	lemma: { coreFeatures: { comparable?: string | null } };
	inflectionalFeatures: { degree?: unknown } | null;
}): boolean {
	const degree = value.inflectionalFeatures?.degree ?? null;
	return value.lemma.coreFeatures.comparable === "Yes"
		? degree !== null
		: degree === null;
}
export function comparabilitySurfaceError(): string {
	return "A comparable ADV or ADJ Surface marks Degree, Pos in a citation included; a non-comparable one never does";
}
