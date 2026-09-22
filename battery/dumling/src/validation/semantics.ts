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

	lemma: { coreFeatures: { gender: string | null } };
	normalizedSurface: string;
};
export function isGermanNounSurface(input: unknown): boolean {
	const value = input as NounComposition;
	const bag = value.inflectionalFeatures;
	if (!bag?.article) return true;
	const form = germanArticleForm({
		...bag,
		gender: value.lemma.coreFeatures.gender,
	});
	return form !== null && value.normalizedSurface.startsWith(`${form} `);
}
export function germanNounSurfaceError(): string {
	return "Noun article must match its article feature, agreement and normalized form";
}
export function isGermanNounAttestation(input: unknown): boolean {
	const value = input as {
		surface: NounComposition;
		articleEvidence: { attested: string; orthography: string } | null;
		realizationCoverage: string;
		members: { attested: string }[];
	};
	const article = value.surface.inflectionalFeatures?.article;
	if (!article)
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

const definiteForms: Record<string, Record<string, string>> = {
	Masc: { Nom: "der", Acc: "den", Dat: "dem", Gen: "des" },
	Fem: { Nom: "die", Acc: "die", Dat: "der", Gen: "der" },
	Neut: { Nom: "das", Acc: "das", Dat: "dem", Gen: "des" },
	Plur: { Nom: "die", Acc: "die", Dat: "den", Gen: "der" },
};
const indefiniteForms: Record<string, Record<string, string>> = {
	Masc: { Nom: "ein", Acc: "einen", Dat: "einem", Gen: "eines" },
	Fem: { Nom: "eine", Acc: "eine", Dat: "einer", Gen: "einer" },
	Neut: { Nom: "ein", Acc: "ein", Dat: "einem", Gen: "eines" },
};

/** Normalized German article morphology; null means absent or unsupported coordinates. */
export function germanArticleForm(input: {
	article: string | null;
	case: string | null;
	number: string | null;
	gender: string | null;
}): string | null {
	if (
		!input.case ||
		!input.number ||
		!["Sing", "Plur"].includes(input.number)
	)
		return null;
	const forms =
		input.article === "Definite"
			? definiteForms
			: input.article === "Indefinite"
				? indefiniteForms
				: null;
	return (
		forms?.[input.number === "Plur" ? "Plur" : (input.gender ?? "")]?.[
			input.case
		] ?? null
	);
}

export function isGermanVerbalAttestation(input: unknown): boolean {
	const value = input as {
		surface: {
			normalizedSurface: string;
			inflectionalFeatures: {
				expletive: string | null;
				verbForm: string;
				person: string | null;
				number: string | null;
			} | null;
		};
		expletiveEvidence: { attested: string; orthography: string } | null;
		governedPrepositionEvidence: {
			attested: string;
			orthography: string;
		} | null;
		members: { attested: string; orthography: string }[];
		realizationCoverage: string;
	};
	if (!isOwnedEvidence(value.governedPrepositionEvidence, value.members))
		return false;
	const bag = value.surface.inflectionalFeatures;
	if (!bag?.expletive) return value.expletiveEvidence === null;
	const evidence = value.expletiveEvidence;
	if (!evidence || value.realizationCoverage !== "Full") return false;
	if (bag.verbForm === "Fin" && (bag.person !== "3" || bag.number !== "Sing"))
		return false;
	return (
		value.surface.normalizedSurface.split(" ").includes("es") &&
		(evidence.orthography === "Typo" ||
			evidence.attested.toLocaleLowerCase("de") === "es") &&
		value.members.some(
			(member) =>
				member.attested === evidence.attested &&
				member.orthography === evidence.orthography,
		)
	);
}
export function germanVerbalAttestationError(): string {
	return "Subject expletive requires third-person singular agreement and owned es evidence in the complete verbal realization; governed-preposition evidence must be an owned member";
}

/** Null evidence is fine; present evidence must equal one owned member. */
function isOwnedEvidence(
	evidence: { attested: string; orthography: string } | null,
	members: readonly { attested: string; orthography: string }[],
): boolean {
	return (
		evidence === null ||
		members.some(
			(member) =>
				member.attested === evidence.attested &&
				member.orthography === evidence.orthography,
		)
	);
}

export function isGermanVerbalSurface(input: unknown): boolean {
	const value = input as {
		normalizedSurface: string;
		inflectionalFeatures: {
			expletive: string | null;
			verbForm: string;
			person: string | null;
			number: string | null;
			mood: string | null;
		} | null;
	};
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
