import emojiRegex from "emoji-regex";

/** Shared by Zod authoring and compiled validation operations. */
export function hasMarkedFeature(bag: Record<string, unknown>): boolean {
	return Object.values(bag).some((value) => value !== null);
}
export function nonEmptyFeatureBagError(): string {
	return "Feature Bag must contain a marked feature";
}
export function normalizeForm(value: string): string {
	return value.trim().normalize("NFC");
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
	const possessive = core.poss === "Yes";
	if (
		core["gender[psor]"] !== null &&
		(!possessive ||
			core.pronType !== "Prs" ||
			core.person !== "3" ||
			core.referenceNumber !== "Sing")
	)
		return false;
	if (core.gender !== null && core.number === "Plur") return false;
	if (
		!possessive &&
		core.pronType === "Prs" &&
		core.gender !== null &&
		(core.person !== "3" || core.referenceNumber !== "Sing")
	)
		return false;
	return true;
}
export function germanPronounCoreError(): string {
	return "German pronoun gender must agree with its subtype, person and number; possessor gender requires a third-person singular personal possessive";
}

/** Composition is reusable grammar; both component values must identify the same article. */
type NounComposition = {
	inflectionalFeatures: {
		article: string | null;
		case: string | null;
		number: string | null;
	} | null;
	articleReference: {
		surface: {
			lemma: {
				coreFeatures: {
					pronType: string | null;
					definite: string | null;
				};
			};
			inflectionalFeatures: {
				case: string | null;
				number: string | null;
				gender: string | null;
			} | null;
			normalizedSurface: string;
		};
		reading: { lemma: unknown };
	} | null;
	lemma: { coreFeatures: { gender: string | null } };
	normalizedSurface: string;
};
export function isGermanNounSurface(input: unknown): boolean {
	const value = input as NounComposition;
	const bag = value.inflectionalFeatures;
	const reference = value.articleReference;
	if (!bag?.article) return reference === null;
	if (!reference || !bag.case || !bag.number) return false;
	const component = reference.surface;
	const features = component.inflectionalFeatures;
	return (
		component.lemma.coreFeatures.pronType === "Art" &&
		component.lemma.coreFeatures.definite ===
			(bag.article === "Definite" ? "Def" : "Ind") &&
		JSON.stringify(component.lemma) ===
			JSON.stringify(reference.reading.lemma) &&
		features?.case === bag.case &&
		features.number === bag.number &&
		features.gender === value.lemma.coreFeatures.gender &&
		value.normalizedSurface.startsWith(`${component.normalizedSurface} `)
	);
}
export function germanNounSurfaceError(): string {
	return "Noun article reference must match its article feature, agreement, authored Reading Lemma and normalized form";
}
export function isGermanNounAttestation(input: unknown): boolean {
	const value = input as {
		surface: NounComposition;
		articleEvidence: { attested: string; orthography: string } | null;
		realizationCoverage: string;
		members: { attested: string }[];
	};
	const reference = value.surface.articleReference;
	if (!reference)
		return (
			value.articleEvidence === null &&
			value.realizationCoverage === "Full"
		);
	if (!value.articleEvidence) return false;
	return (
		value.realizationCoverage === "Partial" ||
		value.members.some(
			(member: { attested: string }) =>
				member.attested === value.articleEvidence?.attested,
		)
	);
}
export function germanNounAttestationError(): string {
	return "Noun realization requires article evidence; Full coverage owns the article and bare nouns have Full coverage";
}
