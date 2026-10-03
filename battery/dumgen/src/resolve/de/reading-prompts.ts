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
	copula: ["de/copula-describes-its-own-part", "5827fe2c3295d1b6"],
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
		"`markedSentence` marks one German unit with <TARGET>…</TARGET>, every word of it, and `lemma` is its dictionary headword, already fixed. Each option is the Emoji Description of one stored Reading of that Lemma: one to four emoji naming one meaning of it.",
		rules.meaning,
	),
	meaning: paragraph(
		"judge.meaning",
		"An Emoji Description names what its target means, in any sentence with that meaning: never the sentence's scene, its participants or objects, a neighbouring word's meaning, or grammar such as tense, person or number. Pick the option that names what this target means here.",
		rules.meaning,
	),
	distinct: paragraph(
		"judge.distinct",
		"Different concepts get different descriptions, and closely related uses of one meaning, figurative ones included, share one. Answer NoMatch when this target means a concept no option names.",
		rules.distinct,
	),
	copula: paragraph(
		"judge.copula",
		"A copula, a light verb or another verb whose complement carries the sentence's meaning is described by its own part alone: being, staying, becoming, causing or seeming.",
		rules.copula,
	),
	multiword: paragraph(
		"judge.multiword",
		"A fixed expression is described by the meaning of the whole unit, not of its words.",
		rules.multiword,
		rules.idiom,
	),
} as const;

export const judgeQuestion = {
	stored: paragraph(
		"judge.question",
		"Which option names what the target means in this sentence? NoMatch if none does.",
		rules.meaning,
		rules.distinct,
	),
	noMatch: paragraph(
		"judge.question.NoMatch",
		"None of them names the target's meaning here",
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
		"Name what the unit means here, a figurative use included, so the description fits every sentence with that meaning: not another sense of the word, not the sentence's scene, its participants or objects, and not a neighbouring word's meaning. Repeat no grammar the headword or its forms carry, such as tense, person, number or gender.",
		rules.meaning,
	),
	distinct: paragraph(
		"generation.distinct",
		"Different concepts get different descriptions; closely related uses of one meaning may share one.",
		rules.distinct,
	),
	copula: paragraph(
		"generation.copula",
		"A copula, a light verb or another verb whose complement carries the sentence's meaning contributes only its own part: being, staying, becoming, causing or seeming. Leave the complement out, even as a second emoji; its meaning belongs to its own Lemma.",
		rules.copula,
	),
	polarity: paragraph(
		"generation.polarity",
		"Keep polarity, direction and scale: a pleasant against an unpleasant feeling, up against down, effort needed against strength had. Start from the one emoji that carries the meaning and add another only to remove a real ambiguity; never add a negation or emphasis sign to an emoji that already shows the state.",
		rules.polarity,
	),
	multiword: paragraph(
		"generation.multiword",
		"Describe a fixed expression by the meaning of the whole unit, not of its words; keep its own image only when it is transparent.",
		rules.multiword,
		rules.idiom,
	),
	text: paragraph(
		"generation.output.text",
		"Answer with the emoji alone, one to four of them, and nothing else.",
		rules.meaning,
	),
	json: paragraph(
		"generation.output.json",
		"Answer with the emoji alone as the JSON string, one to four of them and nothing else.",
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
 * auxiliary, a copula, a function word, a Locution and existential es gibt
 * (#694). None of their Lemmas or target words is an evaluation case's.
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
		"🪡",
		rules.meaning,
		rules.auxiliary,
	),
	demonstration(
		"copula",
		{
			markedSentence: "Die Lage <TARGET>scheint</TARGET> ernst.",
			lemma: "scheinen",
		},
		"🟰🤔",
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
