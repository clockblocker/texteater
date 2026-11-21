import emojiRegex from "emoji-regex";

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
 * Languages may layer their own conditions on top (such as Hebrew's definite
 * article check). A NOUN Locution owns its article the same way (`[a, walk,
 * in, the, park]`), but its other fixed words decide its coverage too (ADR
 * 0039), so only a shared or hidden article ties it to Partial. Whether the
 * article agrees with its Head is a fact about the language, checked in
 * dumcorpus (ADR 0041).
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
 * Comparability decides Degree on an ADV or ADJ Surface where a language marks
 * it (ADR 0042). A comparable Lemma's Surface always marks it, `Pos` in a
 * citation (`mild`) included. A non-comparable Lemma's never does, which
 * leaves a non-comparable ADV no inflection and an ADJ only its attributive
 * agreement features (`der tote Mann`).
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
