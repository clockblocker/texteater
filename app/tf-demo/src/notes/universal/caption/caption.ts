import { surfaceSaysSomething } from "../../../../shared/click-story";
import { coreGenders } from "../../../../shared/grammatical-gender";
import type { SupportedTargetLanguage } from "../../../../shared/supported-target-language";
import {
	type Caption,
	type CaptionToken,
	fillTemplate,
	fillText,
	joinTokens,
	type TargetWording,
	targetWordings,
	type UiLanguage,
	type UiWording,
	uiWordings,
	type VerbFormKey,
} from "./wording";

/**
 * Captions for the Heading of a click's Cards. Each says, in plain learner
 * words, how its Card leads to the next Card in front of it:
 * `ging · past, er/sie/es of gehen`. They are generated from the stored
 * grammatical features alone, with words from `wording.ts`.
 */

type Features = Readonly<Record<string, unknown>>;

type CaptionLemma = {
	readonly family: string;
	readonly kind: string;
	readonly canonicalForm: string;
	readonly coreFeatures: unknown;
};

type SurfaceSpelling =
	| { readonly kind: "Canonical" }
	| { readonly kind: "Variant"; readonly variantTags: readonly string[] };

/** What a Surface caption reads: the presented Surface. */
export type CaptionSurface = {
	readonly grundform: boolean | null;
	readonly spelling: SurfaceSpelling;
	readonly inflectionalFeatures: Features;
	readonly lemma: CaptionLemma;
};

type CaptionFusion = {
	readonly spelling: string;
	readonly components: readonly { readonly surface: string }[];
};

type CaptionMember =
	| {
			readonly attested: string;
			readonly orthography: "Standard" | "Typo" | "Shorthand";
	  }
	| {
			readonly attested: string;
			readonly orthography: "Fused";
			readonly fusion: CaptionFusion;
	  };

/** What an Attestation caption reads: its members and where they stand. */
export type CaptionAttestation = {
	readonly members: readonly CaptionMember[];
	/**
	 * The members that realize a valency slot's marker, such as a governed
	 * preposition (ADR 0034). They are not part of the verb's own form.
	 */
	readonly valencyMembers: readonly number[];
	/** The kind of the Lemma the unit resolved to. */
	readonly kind: string;
	/** The Sentence's Segments, and the stored index of each member's. */
	readonly segments: readonly { readonly kind: string }[];
	readonly memberSegmentIndices: readonly number[];
};

export type CaptionLanguages = {
	readonly ui: UiLanguage;
	readonly target: SupportedTargetLanguage;
};

/**
 * The caption of a Surface's Heading: its Variant tags and what its
 * inflection is, of the next Card's title. None when the Surface is the
 * Lemma's Grundform in its standard spelling: then it says nothing.
 */
export function surfaceCaption(
	surface: CaptionSurface,
	next: string,
	languages: CaptionLanguages,
): Caption | null {
	const ui: UiWording = uiWordings[languages.ui];
	const form = surfaceForm(surface, ui, targetWordings[languages.target]);
	if (form === null) return null;
	const slots = { form, next: [{ kind: "Next", text: next }] } as const;
	return {
		full: fillTemplate(ui.relations.form.full, slots),
		compact: fillTemplate(ui.relations.form.compact, slots),
	};
}

/**
 * The words of a Surface's form: its Variant tags, then what its inflection
 * says, or `form` when that says nothing a learner can use. Null when the
 * Surface is Grundform in its standard spelling. A Grundform's features are
 * its citation form's, so only its tags are named.
 */
function surfaceForm(
	surface: CaptionSurface,
	ui: UiWording,
	target: TargetWording,
): CaptionToken[] | null {
	const variant =
		surface.spelling.kind === "Variant"
			? surface.spelling.variantTags.flatMap((tag) =>
					tag in ui.variant
						? [ui.variant[tag as keyof UiWording["variant"]]]
						: [],
				)
			: [];
	if (surface.grundform === true && variant.length === 0) return null;
	const inflection =
		surface.grundform === true
			? []
			: inflectionPhrases(surface, ui, target);
	const phrases: (readonly CaptionToken[])[] = [
		...variant.map((text) => [{ kind: "Word", text }] as const),
		...inflection,
	];
	if (phrases.length === 0) phrases.push([{ kind: "Word", text: ui.form }]);
	return joinTokens(phrases, ui.listSeparator);
}

/** What a Surface's inflection says, phrase by phrase, by its Lemma's Kind. */
function inflectionPhrases(
	surface: CaptionSurface,
	ui: UiWording,
	target: TargetWording,
): (readonly CaptionToken[])[] {
	const features = surface.inflectionalFeatures;
	switch (surface.lemma.kind) {
		case "VERB":
		case "AUX":
			return verbPhrases(features, ui, target);
		case "NOUN":
		case "PROPN":
			return wordPhrase(
				[caseWord(features, ui), numberWord(features, ui)],
				ui,
			);
		case "DET":
		case "PRON":
		case "NUM":
			return wordPhrase(
				[
					caseWord(features, ui),
					features.number === "Plur"
						? null
						: genderWord(features, ui),
					numberWord(features, ui),
				],
				ui,
			);
		case "ADJ":
		case "ADV":
			return wordPhrase([valueWords(features.degree, ui.degree, ui)], ui);
		default:
			return [];
	}
}

/** The words of one phrase, joined, or no phrase when there are none. */
function wordPhrase(
	words: readonly (string | null)[],
	ui: UiWording,
): (readonly CaptionToken[])[] {
	const present = words.filter((word): word is string => word !== null);
	return present.length === 0
		? []
		: [[{ kind: "Word", text: present.join(ui.wordSeparator) }]];
}

/**
 * The noun case rule: a case is named unless it is the nominative, so a
 * nominative singular says nothing of its form, and dative `Bahnhof` says
 * `dative` though it is spelled like its Lemma.
 */
function caseWord(features: Features, ui: UiWording): string | null {
	const { case: value } = features;
	if (value === "Nom") return null;
	return valueWords(value, ui.case, ui);
}

/** A number is named only when it is the plural. */
function numberWord(features: Features, ui: UiWording): string | null {
	return features.number === "Plur" ? ui.number.Plur : null;
}

/** A closed-class form names its gender when its Lemma's Masc one is not it. */
function genderWord(features: Features, ui: UiWording): string | null {
	const { gender } = features;
	if (gender === "Masc") return null;
	return valueWords(gender, ui.gender, ui);
}

/**
 * The words for one feature's value, or its several values joined as
 * alternatives. Values the table does not name are left out.
 */
function valueWords<Value extends string>(
	value: unknown,
	words: Readonly<Record<Value, string>>,
	ui: UiWording,
): string | null {
	const values = (Array.isArray(value) ? value : [value]).filter(
		(member): member is Value =>
			typeof member === "string" && member in words,
	);
	if (values.length === 0) return null;
	return values.map((member) => words[member]).join(ui.alternativeSeparator);
}

/**
 * A verb form: its tense, mood or non-finite form, passive where it is one,
 * then the target-language pronoun its person and number name.
 */
function verbPhrases(
	features: Features,
	ui: UiWording,
	target: TargetWording,
): (readonly CaptionToken[])[] {
	const phrases: (readonly CaptionToken[])[] = [];
	const key = verbFormKey(features);
	if (key) {
		const tense = ui.verb[key];
		phrases.push([
			{
				kind: "Word",
				text:
					features.voice === "Pass"
						? fillText(ui.passive, { verb: tense })
						: tense,
			},
		]);
	}
	const pronoun = verbPronoun(features, target);
	if (pronoun) phrases.push([{ kind: "Target", text: pronoun }]);
	return phrases;
}

function verbFormKey(features: Features): VerbFormKey | null {
	const perfect = features.perfect === "Yes";
	const future = features.future === "Yes";
	if (features.verbForm === "Part")
		return features.participleForm === "Present"
			? "presentParticiple"
			: "participle";
	if (features.verbForm === "Inf")
		return perfect ? "perfectInfinitive" : "infinitive";
	if (features.mood === "Imp") return "imperative";
	if (features.mood === "Sub")
		return future
			? "futureSubjunctive"
			: perfect
				? "perfectSubjunctive"
				: "subjunctive";
	if (future) return perfect ? "futurePerfect" : "future";
	if (perfect) return features.tense === "Past" ? "pastPerfect" : "perfect";
	if (features.tense === "Past") return "past";
	if (features.tense === "Pres") return "present";
	return null;
}

function verbPronoun(features: Features, target: TargetWording): string | null {
	const { person, number } = features;
	if (
		(person !== "1" && person !== "2" && person !== "3") ||
		(number !== "Sing" && number !== "Plur")
	)
		return null;
	const cell = `${person}.${number}` as const;
	return (
		(features.mood === "Imp"
			? target.imperativePronoun[cell]
			: undefined) ?? target.pronoun[cell]
	);
}

/**
 * The title of the Card an Attestation's caption names: the next Card dealt
 * in front of it. That is its Surface when the Surface says something, and
 * otherwise the Lemma or the Reading, both titled by the canonical form.
 */
export function attestationNextTitle(occurrence: {
	readonly normalizedSurface: string;
	readonly grundform: boolean | null;
	readonly spelling: { readonly kind: string };
	readonly canonicalForm: string;
}): string {
	return surfaceSaysSomething(occurrence)
		? occurrence.normalizedSurface
		: occurrence.canonicalForm;
}

/**
 * How a Card names a Lemma when its title's gender tone is gone: a common
 * noun with its article (der Bahnhof, der/das Balg), a proper noun cited
 * with its article (der Rhein) too, and anything else by its canonical form.
 */
export function lemmaTitle(
	lemma: CaptionLemma,
	targetLanguage: SupportedTargetLanguage,
): string {
	const target: TargetWording = targetWordings[targetLanguage];
	const cited =
		lemma.family === "Lexeme" &&
		(lemma.kind === "NOUN" ||
			(lemma.kind === "PROPN" &&
				typeof lemma.coreFeatures === "object" &&
				lemma.coreFeatures !== null &&
				"article" in lemma.coreFeatures &&
				lemma.coreFeatures.article === "Definite"));
	const genders = cited ? coreGenders(lemma) : [];
	if (genders.length === 0) return lemma.canonicalForm;
	return fillText(target.nounWithArticle, {
		article: genders
			.map((gender) => target.article[gender])
			.join(target.articleSeparator),
		noun: lemma.canonicalForm,
	});
}

/**
 * The caption of an Attestation's Heading: what its written words are to
 * the next Card's title. The first that applies wins: a Typo, a Shorthand,
 * the fused word, a verb whose form is split by other words. A noun's
 * article member is left out of the Typo and Shorthand checks, since the
 * Attestation does not store the word it stands for (`'ne Kiste`). None
 * when the words are only the unit's, as in `der Hund`: its title, the
 * whole unit, says that.
 */
export function attestationCaption(
	attestation: CaptionAttestation,
	next: string,
	languages: CaptionLanguages,
): Caption | null {
	const ui: UiWording = uiWordings[languages.ui];
	const target: TargetWording = targetWordings[languages.target];
	const nextTokens = [{ kind: "Next", text: next }] as const;
	const relation = (template: UiWording["relations"]["typo"]): Caption => ({
		full: fillTemplate(template.full, { next: nextTokens }),
		compact: fillTemplate(template.compact, { next: nextTokens }),
	});
	const { members } = attestation;
	const nominal = attestation.kind === "NOUN" || attestation.kind === "PROPN";
	const ownsWord = (index: number) =>
		!nominal || members.length === 1 || index === members.length - 1;
	const marked = (orthography: "Typo" | "Shorthand") =>
		members.some(
			(member, index) =>
				member.orthography === orthography && ownsWord(index),
		);
	if (marked("Typo")) return relation(ui.relations.typo);
	if (marked("Shorthand")) return relation(ui.relations.shorthand);
	const fusions = fusionsOf(members);
	if (fusions.length > 0) {
		const runs = fusions.map((fusion) =>
			fillTemplate(ui.relations.fusion.full, {
				fused: [{ kind: "Target", text: fusion.spelling }],
				words: [
					{
						kind: "Target",
						text: fusion.components
							.map(({ surface }) => surface)
							.join(target.wordSeparator),
					},
				],
			}),
		);
		const tokens = joinTokens(runs, ui.listSeparator);
		return { full: tokens, compact: tokens };
	}
	if (
		(attestation.kind === "VERB" || attestation.kind === "AUX") &&
		formIsSplit(attestation)
	)
		return relation(ui.relations.split);
	return null;
}

/** Each distinct Fusion the members are pieces of, in member order. */
function fusionsOf(members: readonly CaptionMember[]): CaptionFusion[] {
	const seen = new Map<string, CaptionFusion>();
	for (const member of members) {
		if (member.orthography !== "Fused") continue;
		const key = JSON.stringify([
			member.fusion.spelling,
			member.fusion.components.map(({ surface }) => surface),
		]);
		if (!seen.has(key)) seen.set(key, member.fusion);
	}
	return [...seen.values()];
}

/**
 * Whether other words stand between the members that spell the verb's own
 * form. A governed preposition is a member but not part of that form, so
 * `um Hilfe bitten` is not split and `fängt … an` is.
 */
function formIsSplit(attestation: CaptionAttestation): boolean {
	const { members, memberSegmentIndices, valencyMembers, segments } =
		attestation;
	const aligned = memberSegmentIndices.length === members.length;
	const form = memberSegmentIndices
		.filter((_, member) => !aligned || !valencyMembers.includes(member))
		.toSorted((a, b) => a - b);
	const all = new Set(memberSegmentIndices);
	return form.some((index, position) => {
		const previous = form[position - 1];
		if (previous === undefined) return false;
		return segments
			.slice(previous + 1, index)
			.some(
				(segment, offset) =>
					segment.kind !== "Whitespace" &&
					!all.has(previous + 1 + offset),
			);
	});
}

/**
 * The caption of a Lemma's Heading: how many Readings it holds and each
 * one's emoji, the one the Deck leads to marked: `2 readings: 🏦 🪑`. A
 * Reading without an Emoji Description (Foreign) is counted but not shown.
 * None for a Lemma of one Reading: it says nothing the Reading does not.
 */
export function lemmaCaption(
	readings: readonly {
		readonly readingId: string;
		readonly emojiDescription?: string;
	}[],
	activeReadingId: string | undefined,
	languages: CaptionLanguages,
): Caption | null {
	if (readings.length < 2) return null;
	const ui: UiWording = uiWordings[languages.ui];
	const emojis = joinTokens(
		readings.flatMap(({ readingId, emojiDescription }) =>
			emojiDescription
				? [
						[
							{
								kind: "Emoji",
								text: emojiDescription,
								current: readingId === activeReadingId,
							},
						] as const,
					]
				: [],
		),
		ui.wordSeparator,
	);
	const category = new Intl.PluralRules(languages.ui).select(readings.length);
	const template =
		ui.relations.readings[category] ?? ui.relations.readings.other;
	const slots = {
		count: [{ kind: "Word", text: String(readings.length) }],
		emojis,
	} as const;
	return {
		full: fillTemplate(template.full, slots),
		compact: fillTemplate(template.compact, slots),
	};
}
