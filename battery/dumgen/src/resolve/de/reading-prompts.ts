/**
 * Every text `resolve.reading` sends, each a paragraph that cites the
 * dumspec Rules it states at the statement hash it was last checked
 * against (ADR 0037, #695): the judge's policy and question, which jev
 * reads with the stored Emoji Descriptions bare, and Luna's generation
 * prompt with its demonstrations. Both ask the same question, which emoji
 * names the target's meaning here (ADR 0031), and neither frames the
 * description as a learner's mnemonic (#596).
 *
 * The demonstrations come in the shape production sends: the whole unit
 * marked, its auxiliaries, articles and subject es included (#596, #694).
 * Their Lemmas and target words stay off the evaluation (#693); the
 * disjointness test reads `readingDemonstrations` and `readingExamples`.
 */
import type { CitingPrompt } from "dumspec/types";

type Cite = readonly [rule: string, hash: string];

/** The Rules the Reading prompts cite, at the statement hashes they were checked against. */
const rules = {
	meaning: ["de/emoji-description-names-the-meaning", "5532d94dbbc3bb71"],
	distinct: [
		"de/distinct-concepts-get-distinct-readings",
		"500ad6b7f0020325",
	],
	copula: ["de/copula-describes-its-own-part", "986b2cb2531c76d7"],
	polarity: [
		"de/emoji-description-keeps-polarity-and-scale",
		"6c7521135fde5795",
	],
	existential: ["de/existential-es-gibt-reading", "59b07c586bf78075"],
	multiword: [
		"de/multiword-unit-describes-its-whole-meaning",
		"99996175abb4200d",
	],
	idiom: ["de/idiom", "c05df428b3a42079"],
	modification: ["de/modification-attests-partially", "91fc596acb3813f1"],
	auxiliary: ["de/auxiliary-joins-the-verb-it-serves", "17cec6bff2108a22"],
	expletive: ["de/expletive-es-joins-its-verb", "99bff23563b49716"],
} as const satisfies Readonly<Record<string, Cite>>;

/** One registered paragraph: its name, its text and what it cites. */
type PromptText = {
	readonly name: string;
	readonly text: string;
	readonly cites: readonly Cite[];
};

const registry: PromptText[] = [];

/** Registers one paragraph and returns its text. */
function paragraph(name: string, text: string, ...cites: Cite[]): string {
	if (text.includes("\n")) throw Error(`${name} is more than one paragraph`);
	registry.push({ name, text, cites });
	return text;
}

// The judge (jev): the policy block it reads beside the candidates.

export const judgePolicy = {
	task: paragraph(
		"judge.task",
		"`markedSentence` marks one German unit with <TARGET>…</TARGET>, every word of it, and `lemma` is its dictionary headword, already fixed. Each option is the Emoji Description of one Reading of that Lemma: one to four emoji that label one meaning of it.",
		rules.meaning,
	),
	meaning: paragraph(
		"judge.meaning",
		"An Emoji Description names what its target means, in any sentence with that meaning: never the sentence's scene, its participants or objects, a neighbouring word's meaning, or grammar such as tense, person or number.",
		rules.meaning,
	),
	label: paragraph(
		"judge.label",
		"An option is the label a meaning already carries, not a picture to grade against this sentence: a symbol, a stand-in object, a series marker or a loose image still labels its meaning. Ask which meaning of the Lemma each option stands for, then whether the target has that meaning here.",
		rules.meaning,
		rules.distinct,
	),
	distinct: paragraph(
		"judge.distinct",
		"Meanings get different Readings when they are different concepts a model would tell apart from the sentence: «Birne» the pear and the light bulb, «Pflaster» the sticking plaster and the paving. Closely related uses of one meaning, figurative ones and functional or grammatical shades included, share one Reading.",
		rules.distinct,
	),
	noMatch: paragraph(
		"judge.noMatch",
		"Test each option both ways. When the sentence gives the target a different meaning from the one the option stands for, a meaning you would name apart from it, the option is wrong: answer NoMatch rather than take the nearest option, also when it is the only one. When the target has the option's meaning and the option only pictures it loosely, by a symbol or a stand-in, pick it.",
		rules.distinct,
	),
	copula: paragraph(
		"judge.copula",
		"A copula, a light verb or another verb whose complement carries the sentence's meaning is described by its own part alone: being, staying, becoming, causing or seeming.",
		rules.copula,
	),
	multiword: paragraph(
		"judge.multiword",
		"A fixed expression is described by the meaning of the whole unit, not of its words, and it keeps that one meaning when it is quoted, cut short or altered.",
		rules.multiword,
		rules.idiom,
		rules.modification,
	),
} as const;

export const judgeQuestion = {
	stored: paragraph(
		"judge.question",
		"Which option labels the meaning the target has in this sentence? NoMatch if the sentence gives the target a meaning no option stands for.",
		rules.meaning,
		rules.distinct,
	),
	storedWithAuthored: paragraph(
		"judge.question.withAuthored",
		"Options a… are the word's authored Readings: each labels one function of the word by the conventions its word class shares, not by a picture of this sentence, and covers its abstract and figurative uses too. Which option labels the meaning the target has in this sentence? NoMatch if the sentence gives the target a meaning no option stands for.",
		rules.meaning,
		rules.distinct,
	),
	noMatch: paragraph(
		"judge.question.NoMatch",
		"The target here means a concept no option stands for",
		rules.distinct,
	),
	authored: paragraph(
		"judge.question.authored",
		"Each option is one authored Reading of the Lemma. Which one names what the target means in this sentence?",
		rules.meaning,
		rules.distinct,
	),
} as const;

// Luna's generation prompt: one system prompt, then the demonstrations.

export const generation = {
	task: paragraph(
		"generation.task",
		"You write the Emoji Description of one German unit: one to four emoji naming what it means where `markedSentence` marks it with <TARGET>…</TARGET>. Every marked span belongs to the one unit, its auxiliaries, its article and a subject es included. `lemma` is its dictionary headword.",
		rules.meaning,
		rules.auxiliary,
		rules.expletive,
	),
	meaning: paragraph(
		"generation.meaning",
		"The description is the label of one sense of the Lemma, the same in every sentence with that sense. Name the sense the marked words have here, a figurative use included: not another sense of the word, even one the same word has elsewhere in the sentence, and not the sentence's scene, its participants or objects, a time, place or amount other words mention, or a neighbouring word's meaning. Repeat no grammar the headword or its forms carry, such as tense, person, number or gender.",
		rules.meaning,
	),
	distinct: paragraph(
		"generation.distinct",
		"Different concepts get different descriptions; closely related uses of one meaning may share one.",
		rules.distinct,
	),
	copula: paragraph(
		"generation.copula",
		"A copula, a light verb or another verb whose complement carries the sentence's meaning contributes only its own part: being, staying, becoming, causing or seeming, and being is 🟰, a mark no other verb takes. Leave the complement out, even as a second emoji and even when it names a time, a place or an amount; its meaning belongs to its own Lemma.",
		rules.copula,
	),
	polarity: paragraph(
		"generation.polarity",
		"Keep polarity, direction and scale: a pleasant against an unpleasant feeling, up against down, effort needed against strength had, much against little. A word that grades how intense or how much something is labels that degree on its scale, never the physical strength or size its literal sense names. Start from the one emoji that carries the meaning and add another only to remove a real ambiguity; never add a negation or emphasis sign to an emoji that already shows the state.",
		rules.polarity,
	),
	modal: paragraph(
		"generation.modal",
		"A modal verb labels its own modality, the same in every sentence: necessity, obligation, ability, permission, wish or supposition, never the effort, goal or scene of the action it governs.",
		rules.meaning,
	),
	existential: paragraph(
		"generation.existential",
		"Existential es gibt, 'there is', in any tense, describes existence or availability, whatever the sentence says is there; it never takes the giving meaning.",
		rules.existential,
		rules.expletive,
	),
	multiword: paragraph(
		"generation.multiword",
		"Describe a fixed expression by the meaning of the whole unit, not of its words; keep its own image only when it is transparent. Quoted, cut short or altered, it keeps the whole unit's description.",
		rules.multiword,
		rules.idiom,
		rules.modification,
	),
	json: paragraph(
		"generation.output.json",
		"Answer with the emoji alone as the JSON string: one to four emoji and nothing else. Never a letter, a word in any language or script, a bare digit, punctuation or a sign that is no emoji: write a number with keycap emoji, and describe a sign or symbol by what it means instead of copying it.",
		rules.meaning,
	),
	schema: paragraph(
		"generation.output.schema",
		"One to four emoji and nothing else: no letter, word, bare digit, punctuation or sign that is no emoji.",
		rules.meaning,
	),
	examples: paragraph(
		"generation.examples",
		"Examples, each an input and the description it takes:",
		rules.meaning,
	),
} as const;

/** One demonstration: an input as production sends it and its description. */
export type ReadingDemonstration = {
	readonly markedSentence: string;
	readonly lemma: string;
	readonly emojiDescription: string;
	/** The demonstration's line in the generation prompt. */
	readonly text: string;
};

function demonstration(
	name: string,
	input: { readonly markedSentence: string; readonly lemma: string },
	emojiDescription: string,
	...cites: Cite[]
): ReadingDemonstration {
	const text = paragraph(
		`generation.demonstration.${name}`,
		`${JSON.stringify(input)} → ${emojiDescription}`,
		...cites,
	);
	return { ...input, emojiDescription, text };
}

/**
 * The generation demonstrations: an adjective, a noun, a verb with its
 * auxiliary, a copula, a function word, a numeral, a sign, a Locution and
 * existential es gibt (#694). None of their Lemmas or target words is an
 * evaluation case's.
 */
export const readingDemonstrations: readonly ReadingDemonstration[] = [
	demonstration(
		"adjective",
		{
			markedSentence: "Der Aufstieg war <TARGET>mühsam</TARGET>.",
			lemma: "mühsam",
		},
		"😓",
		rules.meaning,
		rules.polarity,
	),
	demonstration(
		"noun",
		{
			markedSentence:
				"Vergiss deinen <TARGET>Regenschirm</TARGET> nicht!",
			lemma: "Regenschirm",
		},
		"☂",
		rules.meaning,
	),
	demonstration(
		"verb",
		{
			markedSentence:
				"Er <TARGET>hat</TARGET> die Hose gestern <TARGET>geflickt</TARGET>.",
			lemma: "flicken",
		},
		"🩹",
		rules.meaning,
		rules.auxiliary,
	),
	demonstration(
		"copula",
		{
			markedSentence: "Die Lage <TARGET>scheint</TARGET> ernst.",
			lemma: "scheinen",
		},
		"👀",
		rules.copula,
	),
	demonstration(
		"function-word",
		{
			markedSentence: "Er trank Tee <TARGET>anstatt</TARGET> Kaffee.",
			lemma: "anstatt",
		},
		"🔄",
		rules.meaning,
	),
	demonstration(
		"numeral",
		{
			markedSentence: "Die Katze hat <TARGET>neun</TARGET> Leben.",
			lemma: "neun",
		},
		"9⃣",
		rules.meaning,
	),
	demonstration(
		"sign",
		{
			markedSentence: "Die Toleranz beträgt <TARGET>±</TARGET> 0,5 mm.",
			lemma: "±",
		},
		"➕➖",
		rules.meaning,
	),
	demonstration(
		"locution",
		{
			markedSentence:
				"Ich <TARGET>drücke</TARGET> dir morgen <TARGET>die</TARGET> <TARGET>Daumen</TARGET>.",
			lemma: "die Daumen drücken",
		},
		"🤞",
		rules.multiword,
		rules.idiom,
	),
	demonstration(
		"es-gibt",
		{
			markedSentence:
				"<TARGET>Es</TARGET> <TARGET>gibt</TARGET> hier keinen Empfang.",
			lemma: "geben",
		},
		"🌍",
		rules.existential,
		rules.expletive,
	),
];

/** Every registered paragraph, as dumspec's citation check reads it. */
export function readingPromptTexts(): readonly CitingPrompt[] {
	return registry.map(({ name, text, cites }) => ({
		name: `de/resolve-reading/${name}`,
		text,
		paragraphs: [
			{
				opens: text.slice(0, 32),
				implements: cites.map(([rule, hash]) => ({ rule, hash })),
			},
		],
	}));
}

/** The German words the policy and question paragraphs quote, as written; the demonstrations aside. */
export function readingExamples(): readonly string[] {
	return registry
		.filter(({ name }) => !name.startsWith("generation.demonstration."))
		.flatMap(({ text }) =>
			[...text.matchAll(/«([^»]+)»/gu)].map(
				([, example]) => example ?? "",
			),
		);
}
