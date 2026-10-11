import type { FixtureWord } from "./text";

/**
 * A fake resolution of one clicked word: the Cards a click deals, in deal
 * order. tf-demo deals Attestation → Surface → Lemma → Reading; the last
 * Card is the front one, and each earlier Card's caption says how it leads
 * to the Card dealt in front of it.
 */

export type CardKind = "Attestation" | "Surface" | "Lemma" | "Reading";

export const cardKinds: readonly CardKind[] = [
	"Attestation",
	"Surface",
	"Lemma",
	"Reading",
];

/** A hop from one Card to another word's resolution, e.g. form → lemma. */
export type FakeCardLink = {
	readonly relation: "lemma";
	/** What the link shows and what `resolveWord` looks up. */
	readonly word: string;
};

export type FakeCard = {
	/** Unique within its resolution, such as `ging/Surface`. */
	readonly id: string;
	readonly kind: CardKind;
	readonly title: string;
	/** The one-line tail: `ging · past of`. */
	readonly caption: string;
	readonly emoji: string;
	/** Without slashes; `Ipa` adds them. */
	readonly ipa: string;
	readonly translations: readonly string[];
	readonly definition: string;
	/** The sentence the word was met in. */
	readonly quote: string;
	/** The words of `quote` to mark, such as `fängt … an`'s members. */
	readonly quoteMarks: readonly string[];
	readonly links: readonly FakeCardLink[];
};

export type FakeResolution = {
	/** The clicked form, or the unit's forms joined with ` … `. */
	readonly word: string;
	readonly cards: readonly FakeCard[];
};

type Entry = {
	/** Every form the entry answers to, lower-case. */
	readonly forms: readonly string[];
	readonly form: string;
	readonly formIpa: string;
	readonly formOf: string;
	readonly formNote: string;
	readonly lemma: string;
	readonly lemmaIpa: string;
	readonly lemmaNote: string;
	readonly emoji: string;
	readonly translations: readonly string[];
	readonly gloss: string;
	readonly definition: string;
	readonly marks: readonly string[];
};

const entries: readonly Entry[] = [
	{
		forms: ["ging", "gehen"],
		form: "ging",
		formIpa: "ɡɪŋ",
		formOf: "past of",
		formNote: "Präteritum, 3rd person singular.",
		lemma: "gehen",
		lemmaIpa: "ˈɡeːən",
		lemmaNote: "Strong verb: geht, ging, ist gegangen.",
		emoji: "🚶",
		translations: ["went", "walked"],
		gloss: "to go on foot",
		definition: "To move somewhere on foot, at walking pace.",
		marks: ["ging"],
	},
	{
		forms: ["bank"],
		form: "Bank",
		formIpa: "baŋk",
		formOf: "singular of",
		formNote: "Dative singular, after „auf der“.",
		lemma: "die Bank",
		lemmaIpa: "baŋk",
		lemmaNote: "Feminine noun; plural Bänke (bench) or Banken (bank).",
		emoji: "🪑",
		translations: ["bench"],
		gloss: "a bench",
		definition: "A long seat for several people, often outdoors.",
		marks: ["auf", "der", "Bank"],
	},
	{
		forms: ["fängt", "an", "anfangen"],
		form: "fängt … an",
		formIpa: "fɛŋt … an",
		formOf: "present of",
		formNote: "Present, 3rd person singular; the prefix an- splits off.",
		lemma: "anfangen",
		lemmaIpa: "ˈanˌfaŋən",
		lemmaNote: "Separable strong verb: fängt an, fing an, hat angefangen.",
		emoji: "🎬",
		translations: ["starts", "begins"],
		gloss: "to begin",
		definition: "Of an event: to start happening at a given time.",
		marks: ["fängt", "an"],
	},
	{
		forms: ["zum"],
		form: "zum",
		formIpa: "tsʊm",
		formOf: "fusion of",
		formNote: "zu + dem, fused before a masculine or neuter dative.",
		lemma: "zu",
		lemmaIpa: "tsuː",
		lemmaNote: "Preposition taking the dative.",
		emoji: "➡️",
		translations: ["to the"],
		gloss: "towards, to",
		definition: "Marks the place someone or something moves towards.",
		marks: ["zum"],
	},
	{
		forms: ["bahnhof"],
		form: "Bahnhof",
		formIpa: "ˈbaːnˌhoːf",
		formOf: "singular of",
		formNote: "Dative singular, after „zum“.",
		lemma: "der Bahnhof",
		lemmaIpa: "ˈbaːnˌhoːf",
		lemmaNote: "Masculine noun; plural Bahnhöfe.",
		emoji: "🚉",
		translations: ["train station", "railway station"],
		gloss: "a train station",
		definition: "A place where trains stop for people to get on and off.",
		marks: ["Bahnhof"],
	},
	{
		forms: ["detaillierte", "detailliert"],
		form: "detaillierte",
		formIpa: "detaˈjiːɐ̯tə",
		formOf: "inflection of",
		formNote: "Feminine accusative singular, strong ending -e.",
		lemma: "detailliert",
		lemmaIpa: "detaˈjiːɐ̯t",
		lemmaNote: "Adjective; comparative detaillierter.",
		emoji: "🔍",
		translations: ["detailed"],
		gloss: "detailed",
		definition: "Giving many small facts or parts, not only an overview.",
		marks: ["detaillierte"],
	},
	{
		forms: ["הלך", "ללכת"],
		form: "הלך",
		formIpa: "haˈlax",
		formOf: "past of",
		formNote: "Past, 3rd person masculine singular.",
		lemma: "ללכת",
		lemmaIpa: "laˈlexet",
		lemmaNote: "Verb, pa'al: הולך, הלך, ילך.",
		emoji: "🚶",
		translations: ["walked", "went"],
		gloss: "to walk, to go",
		definition: "To move somewhere on foot.",
		marks: ["הלך"],
	},
];

function entryFor(form: string, asLemma: boolean): Entry | undefined {
	const key = form.toLowerCase();
	return entries.find(
		(entry) =>
			entry.forms.includes(key) ||
			(asLemma && entry.lemma.toLowerCase() === key),
	);
}

function genericEntry(form: string): Entry {
	return {
		forms: [form.toLowerCase()],
		form,
		formIpa: "…",
		formOf: "form of",
		formNote: "A form of the word as it stands here.",
		lemma: form.toLowerCase(),
		lemmaIpa: "…",
		lemmaNote: "No authored Lemma: this is the generic fake.",
		emoji: "📖",
		translations: [`“${form}”`],
		gloss: "its sense here",
		definition: `What “${form}” means in this sentence.`,
		marks: [form],
	};
}

function cardsOf(entry: Entry, quote: string): FakeCard[] {
	const base = {
		emoji: entry.emoji,
		translations: entry.translations,
		quote,
		quoteMarks: entry.marks,
	};
	const lemmaLink: FakeCardLink = { relation: "lemma", word: entry.lemma };
	return [
		{
			...base,
			id: `${entry.form}/Attestation`,
			kind: "Attestation",
			title: entry.form,
			caption: `${entry.form} · here as`,
			ipa: entry.formIpa,
			definition: `This occurrence of “${entry.form}” in its sentence.`,
			links: [lemmaLink],
		},
		{
			...base,
			id: `${entry.form}/Surface`,
			kind: "Surface",
			title: entry.form,
			caption: `${entry.form} · ${entry.formOf}`,
			ipa: entry.formIpa,
			definition: entry.formNote,
			links: [lemmaLink],
		},
		{
			...base,
			id: `${entry.form}/Lemma`,
			kind: "Lemma",
			title: entry.lemma,
			caption: `${entry.lemma} · read as`,
			ipa: entry.lemmaIpa,
			definition: entry.lemmaNote,
			links: [],
		},
		{
			...base,
			id: `${entry.form}/Reading`,
			kind: "Reading",
			title: entry.lemma,
			caption: `${entry.lemma} · ${entry.gloss}`,
			ipa: entry.lemmaIpa,
			definition: entry.definition,
			links: [],
		},
	];
}

/**
 * The fake resolution of a clicked word, or of a bare form such as a
 * lemma link's `word` (a bare string also matches an entry's lemma, so
 * `resolveWord("zu")` finds zum's entry while a clicked `zu` does not).
 * Authored Cards exist for ging/gehen, Bank,
 * fängt … an/anfangen, zum, Bahnhof, detaillierte/detailliert and the
 * Hebrew הלך/ללכת; any other word gets generic Cards.
 */
export function resolveWord(word: FixtureWord | string): FakeResolution {
	const form = typeof word === "string" ? word : word.text;
	const quote = typeof word === "string" ? "" : word.sentence;
	const entry =
		entryFor(form, typeof word === "string") ?? genericEntry(form);
	return { word: entry.form, cards: cardsOf(entry, quote) };
}
