import {
	type FormFeatures,
	formFeatures,
	surfaceSaysSomething,
} from "../../../../shared/click-story";
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
} from "./wording";

/**
 * Captions for the Heading of a click's Cards. Each says, in plain learner
 * words, how its Card leads to the next Card in front of it: `ging · past
 * of` in the pile, above that Card's tail, and `ging · past of gehen` as a
 * Sheet. They are generated from the stored grammatical features alone,
 * with words from `wording.ts`.
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
	readonly normalizedSurface: string;
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
 * inflection is, of the next Card's title. None when the Surface says
 * nothing (shared/click-story.ts).
 */
export function surfaceCaption(
	surface: CaptionSurface,
	next: string,
	languages: CaptionLanguages,
): Caption | null {
	if (!surfaceSaysSomething(surface)) return null;
	const ui: UiWording = uiWordings[languages.ui];
	const form = surfaceForm(surface, ui, targetWordings[languages.target]);
	return relationCaption(ui.relations.form, { form }, next);
}

/** A relation's two forms, the Sheet's naming the next Card's title. */
function relationCaption(
	template: { readonly card: string; readonly sheet: string },
	slots: Readonly<Record<string, readonly CaptionToken[]>>,
	next: string,
): Caption {
	const filled = { ...slots, next: [{ kind: "Next", text: next }] as const };
	return {
		card: fillTemplate(template.card, filled),
		sheet: fillTemplate(template.sheet, filled),
	};
}

/**
 * The words of a Surface's form: its Variant tags, then what its inflection
 * says, or `form` when nothing is stored to say how it differs. A
 * Grundform's features are its citation form's, so only its tags are named.
 */
function surfaceForm(
	surface: CaptionSurface,
	ui: UiWording,
	target: TargetWording,
): CaptionToken[] {
	const variant =
		surface.spelling.kind === "Variant"
			? surface.spelling.variantTags.flatMap((tag) =>
					tag in ui.variant
						? [ui.variant[tag as keyof UiWording["variant"]]]
						: [],
				)
			: [];
	const inflection =
		surface.grundform === true
			? []
			: inflectionPhrases(formFeatures(surface), ui, target);
	const phrases: (readonly CaptionToken[])[] = [
		...variant.map((text) => [{ kind: "Word", text }] as const),
		...inflection,
	];
	if (phrases.length === 0) phrases.push([{ kind: "Word", text: ui.form }]);
	return joinTokens(phrases, ui.listSeparator);
}

/**
 * What a Surface's inflection says, phrase by phrase: a verb's tense and the
 * pronoun its person fixes; a degree; a declension's case, gender and number
 * as one phrase (`accusative plural`).
 */
function inflectionPhrases(
	features: FormFeatures,
	ui: UiWording,
	target: TargetWording,
): (readonly CaptionToken[])[] {
	const phrases: (readonly CaptionToken[])[] = [];
	if (features.part) phrases.push([{ kind: "Word", text: ui.part }]);
	if (features.verb) {
		const tense = ui.verb[features.verb.form];
		phrases.push([
			{
				kind: "Word",
				text: features.verb.passive
					? fillText(ui.passive, { verb: tense })
					: tense,
			},
		]);
	}
	const pronoun = features.person && pronounOf(features.person, target);
	if (pronoun) phrases.push([{ kind: "Target", text: pronoun }]);
	if (features.degree)
		phrases.push([{ kind: "Word", text: ui.degree[features.degree] }]);
	const declension = [
		features.case && alternatives(features.case, ui.case, ui),
		features.gender && alternatives(features.gender, ui.gender, ui),
		features.plural ? ui.number.Plur : undefined,
	].filter((word): word is string => word !== undefined);
	if (declension.length > 0)
		phrases.push([
			{ kind: "Word", text: declension.join(ui.wordSeparator) },
		]);
	return phrases;
}

/** A feature's values in words, several joined as alternatives. */
function alternatives<Value extends string>(
	values: readonly Value[],
	words: Readonly<Record<Value, string>>,
	ui: UiWording,
): string {
	return values.map((value) => words[value]).join(ui.alternativeSeparator);
}

/**
 * The pronoun a finite form's person and number fix, if they fix one: an
 * expletive subject is `es`, a polite imperative `Sie`, and a third person
 * whose subject could be er, sie or es (or sie or Sie) has none.
 */
function pronounOf(
	person: NonNullable<FormFeatures["person"]>,
	target: TargetWording,
): string | null {
	if (person.kind === "Expletive") return target.expletivePronoun;
	const cell = `${person.person}.${person.number}` as const;
	return (
		(person.imperative ? target.imperativePronoun[cell] : undefined) ??
		target.pronoun[cell] ??
		null
	);
}

/**
 * The word an Attestation's caption names: its Surface when the Surface
 * says something, by `surfaceTitle` when the language prints one (German
 * prints the slotted line, `jD mit jM zu tun hatte`), and otherwise its
 * Lemma by the bare Canonical Form. The
 * Reading's title cites a lexical reflexive (`sich erinnern`), but the
 * caption names what the written form is a form of, and `sich` is no form
 * of `erinnern` (ADR 0052).
 */
export function attestationNextTitle(
	surface: Parameters<typeof surfaceSaysSomething>[0],
	surfaceTitle: string = surface.normalizedSurface,
): string {
	return surfaceSaysSomething(surface)
		? surfaceTitle
		: surface.lemma.canonicalForm;
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
	const relation = (template: UiWording["relations"]["typo"]): Caption =>
		relationCaption(template, {}, next);
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
			fillTemplate(ui.relations.fusion.sheet, {
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
		return { card: tokens, sheet: tokens };
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
		card: fillTemplate(template.card, slots),
		sheet: fillTemplate(template.sheet, slots),
	};
}
