import { expect, test } from "bun:test";
import { isRecord } from "common-utils";
import { checkPromptCitations, loadSpecRecords, rules } from "dumcorpus";
import { foldCase } from "dumling";
import {
	knowledgeCases,
	spotCheckCases,
} from "../../lab/evaluation/knowledge/cases.js";
import {
	knowledgeExamples,
	knowledgeParagraphs,
	knowledgePromptTexts,
	relationDefinitions,
} from "../../src/knowledge/de/prompts.js";
import { candidatePrompt } from "../../src/knowledge/de/relations.js";
import {
	definitionPrompt,
	transcriptionPrompt,
	translationPrompt,
} from "../../src/knowledge/de/text.js";
import { valencyPrompt } from "../../src/knowledge/de/valency.js";

test("every Knowledge prompt paragraph cites the Rules it states at their current hashes (ADR 0037, #695)", () => {
	const prompts = knowledgePromptTexts();
	expect(prompts.length).toBeGreaterThan(60);
	expect(checkPromptCitations(prompts, rules)).toEqual([]);
});

test("every prompt anchors on the Emoji Description, and the Sentence is evidence only (#623)", () => {
	for (const prompt of [
		transcriptionPrompt,
		definitionPrompt,
		translationPrompt,
		valencyPrompt,
		candidatePrompt,
	])
		expect(prompt).toContain("`emojiDescription`, one to four emoji");
	for (const prompt of [definitionPrompt, translationPrompt, valencyPrompt])
		expect(prompt).toContain("The sentence is evidence");
	expect(valencyPrompt).toContain(
		"The frame is the Satzbauplan of the one Lesart",
	);
});

test("there is one translation prompt, with the citation-form clause; the candidate prompt has one wording and no 'preserve its meaning' (#697, #518)", () => {
	expect(translationPrompt).toContain("dictionary headword form");
	expect(translationPrompt).not.toMatch(
		/\ben\b.*English.*\n.*\ben\b.*English/su,
	);
	expect(candidatePrompt).not.toMatch(/preserve its meaning/iu);
	// A relation's definition is stated once, never as a candidate's option.
	for (const definition of Object.values(relationDefinitions))
		expect(
			knowledgeParagraphs().filter((text) => text === definition),
		).toHaveLength(1);
	// No negative list the schema already enforces.
	for (const text of knowledgeParagraphs())
		expect(text).not.toMatch(
			/No relation labels, Kinds, Language, Family|Do not return judgments or domain objects/u,
		);
});

/** The open-class Kinds whose Lemmas a worked example could give away (#693). */
const openKinds = new Set([
	"NOUN",
	"PROPN",
	"VERB",
	"ADJ",
	"ADV",
	"NUM",
	"INTJ",
	"SYM",
]);

const words = (text: string) =>
	foldCase(text, "de")
		.split(/[\s…]+/u)
		.filter(Boolean);

const occursIn = (form: string, text: string) => {
	const needle = words(form);
	const haystack = words(text);
	return (
		needle.length > 0 &&
		haystack.some((_, start) =>
			needle.every((word, offset) => haystack[start + offset] === word),
		)
	);
};

/** Every open-class Lemma inside a value: a Reading's, a relation target's, a source verb's. */
function lemmasIn(value: unknown, into: Map<string, string>, of: string) {
	if (!value || typeof value !== "object") return;
	if (
		isRecord(value) &&
		value.unitKind === "Lemma" &&
		typeof value.canonicalForm === "string" &&
		(value.family !== "Lexeme" || openKinds.has(String(value.kind)))
	)
		into.set(value.canonicalForm, of);
	for (const inner of Object.values(value)) lemmasIn(inner, into, of);
}

test("no example in a Knowledge prompt uses a Lemma of the Knowledge gold or the spot-check samples (#693)", () => {
	const records = loadSpecRecords();
	const { dev, heldout } = knowledgeCases(records);
	const forms = new Map<string, string>();
	for (const goldCase of [...dev, ...heldout]) {
		if (!goldCase.gold) continue;
		lemmasIn(goldCase.reading, forms, goldCase.id);
		lemmasIn(goldCase.gold.knowledge, forms, goldCase.id);
	}
	for (const goldCase of spotCheckCases(records, dev).cases)
		lemmasIn(goldCase.reading, forms, goldCase.id);
	expect(forms.size).toBeGreaterThan(100);
	const examples = knowledgeExamples();
	expect(examples.length).toBeGreaterThan(15);
	const clashes = examples.flatMap((example) =>
		[...forms]
			.filter(([form]) => occursIn(form, example))
			.map(([form, of]) => `«${example}» uses ${form} (${of})`),
	);
	expect(clashes).toEqual([]);
});
