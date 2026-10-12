import {
	type FakeCard,
	type FakeResolution,
	type FixtureWord,
	resolveWord,
	textFromParagraphs,
} from "@/fixtures";
import { rarityOf } from "./inflections";

/**
 * A second German text whose clicks land on a lemma with two sets of
 * forms, each on the rarer form: molken (melken), buk (backen) and Kommata
 * (Komma). The fixtures author no Cards for them, so they live here, in
 * the fixtures' shape; every other word resolves as the fixtures have it.
 */
export const paradigmText = textFromParagraphs("de-old", "de", "Früher", [
	"Früher molken sie die Kühe von Hand. Am Sonntag buk die Großmutter einen Apfelkuchen für die ganze Familie.",
	"In der Schule strich der Lehrer alle überflüssigen Kommata aus unseren Aufsätzen.",
]);

type Entry = {
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
};

const entries: readonly Entry[] = [
	{
		form: "molken",
		formIpa: "ˈmɔlkn̩",
		formOf: "past of",
		formNote:
			"Präteritum, 3rd person plural: the older strong form of melkten.",
		lemma: "melken",
		lemmaIpa: "ˈmɛlkn̩",
		lemmaNote: "Verb: melkt, melkte (older molk), hat gemolken.",
		emoji: "🐄",
		translations: ["milked"],
		gloss: "to milk",
		definition: "To draw milk from a cow, goat or other animal by hand.",
	},
	{
		form: "buk",
		formIpa: "buːk",
		formOf: "past of",
		formNote:
			"Präteritum, 3rd person singular: the older strong form of backte.",
		lemma: "backen",
		lemmaIpa: "ˈbakn̩",
		lemmaNote: "Verb: backt or bäckt, backte (older buk), hat gebacken.",
		emoji: "🥧",
		translations: ["baked"],
		gloss: "to bake",
		definition: "To cook bread, cake or the like with dry heat in an oven.",
	},
	{
		form: "Kommata",
		formIpa: "ˈkɔmata",
		formOf: "plural of",
		formNote: "Accusative plural: the learned plural beside Kommas.",
		lemma: "das Komma",
		lemmaIpa: "ˈkɔma",
		lemmaNote: "Neuter noun; plural Kommas or Kommata.",
		emoji: "✍️",
		translations: ["commas"],
		gloss: "a comma",
		definition: "The mark , that separates the parts of a sentence.",
	},
];

/**
 * How the Surface caption names a rarer form, before its relation, as
 * tf-demo names a Variant spelling's tag (`older spelling of`).
 */
const rarityWords = { older: "older ", also: "less common " } as const;

/**
 * The fixtures' four Cards for an entry, as their `cardsOf` deals them.
 * The Surface caption says when the form is the rarer in its cell:
 * `molken · older past of`.
 */
function cardsOf(entry: Entry, quote: string): FakeCard[] {
	const rarity = rarityOf(entry.lemma, entry.form);
	const base = {
		emoji: entry.emoji,
		translations: entry.translations,
		quote,
		quoteMarks: [entry.form],
	};
	const toLemma = [{ relation: "lemma", word: entry.lemma }] as const;
	return [
		{
			...base,
			id: `${entry.form}/Attestation`,
			kind: "Attestation",
			title: entry.form,
			caption: `${entry.form} · here as`,
			ipa: entry.formIpa,
			definition: `This occurrence of “${entry.form}” in its sentence.`,
			links: toLemma,
		},
		{
			...base,
			id: `${entry.form}/Surface`,
			kind: "Surface",
			title: entry.form,
			caption: `${entry.form} · ${rarity ? rarityWords[rarity] : ""}${entry.formOf}`,
			ipa: entry.formIpa,
			definition: entry.formNote,
			links: toLemma,
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
 * `resolveWord` with this file's entries first: a clicked word by its
 * form, a bare string (a lemma link's word) by its form or lemma.
 */
export function lookUp(word: FixtureWord | string): FakeResolution {
	const form = typeof word === "string" ? word : word.text;
	const entry = entries.find(
		(candidate) =>
			candidate.form === form ||
			(typeof word === "string" && candidate.lemma === form),
	);
	if (!entry) return resolveWord(word);
	const quote = typeof word === "string" ? "" : word.sentence;
	return { word: entry.form, cards: cardsOf(entry, quote) };
}
