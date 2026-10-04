import { expect, test } from "bun:test";
import { checkPromptCitations, rules } from "dumcorpus";
import { foldCase } from "dumling";
import { readingCases } from "../../src/evaluation/resolve-reading/cases.js";
import {
	generation,
	judgePolicy,
	judgeQuestion,
	readingDemonstrations,
	readingExamples,
	readingPromptTexts,
} from "../../src/resolve/de/reading-prompts.js";
import {
	emojiDescriptionRequest,
	emojiDescriptionSchema,
	generationPrompt,
} from "../../src/resolve/reading.js";

test("every Reading prompt paragraph cites the Rules it states at their current hashes (ADR 0037, #695)", () => {
	const prompts = readingPromptTexts();
	expect(prompts.length).toBeGreaterThan(15);
	expect(checkPromptCitations(prompts, rules)).toEqual([]);
});

const judgeText = [
	...Object.values(judgePolicy),
	...Object.values(judgeQuestion),
].join("\n");

test("neither prompt frames the description for a learner, and the judge hard-codes no es gibt (#596)", () => {
	for (const text of [judgeText, generationPrompt])
		expect(text).not.toMatch(/mnemonic|learner|beginner|mislead/iu);
	expect(judgeText).not.toMatch(/es gibt|geben/iu);
	expect(generationPrompt).toContain(
		"Different concepts get different descriptions; closely related uses of one meaning may share one.",
	);
});

test("the demonstrations come in the input shape production sends, es gibt, a function word and a Locution among them (#596, #694)", () => {
	const production = emojiDescriptionRequest({
		markedSentence: "Das <TARGET>Schloss</TARGET> klemmt.",
		lemma: "Schloss",
	});
	for (const demonstration of readingDemonstrations) {
		expect(Object.keys(demonstration).sort()).toEqual(
			["emojiDescription", "lemma", "markedSentence", "text"].sort(),
		);
		expect(demonstration.markedSentence).toContain("<TARGET>");
		expect(generationPrompt).toContain(demonstration.text);
	}
	expect(Object.keys(production.input as object).sort()).toEqual([
		"lemma",
		"markedSentence",
	]);
	const byLemma = new Map(
		readingDemonstrations.map((demonstration) => [
			demonstration.lemma,
			demonstration,
		]),
	);
	expect(byLemma.get("geben")?.markedSentence).toStartWith(
		"<TARGET>Es</TARGET> <TARGET>gibt</TARGET>",
	);
	expect(byLemma.get("geben")?.emojiDescription).not.toContain("🎁");
	expect(byLemma.get("anstatt")).toBeDefined();
	expect(byLemma.get("die Daumen drücken")?.markedSentence).toMatch(
		/<TARGET>die<\/TARGET> <TARGET>Daumen<\/TARGET>/u,
	);
	// A verbal demonstration marks its auxiliary too.
	expect(byLemma.get("flicken")?.markedSentence).toContain(
		"<TARGET>hat</TARGET>",
	);
});

test("the judge tests each option both ways, NoMatch for another meaning and a pick for a loose picture; Luna's prompt and schema rule out non-emoji answers (#877 round 2)", () => {
	expect(judgeText).not.toContain("When in doubt");
	expect(judgeText).toContain("Test each option both ways");
	expect(judgeQuestion.stored).not.toContain("authored");
	expect(judgeQuestion.storedWithAuthored).toContain("Options a…");
	expect(generationPrompt).toContain(
		"write a number with keycap emoji, and describe a sign or symbol by what it means",
	);
	expect(emojiDescriptionSchema).toEqual({
		type: "string",
		minLength: 1,
		description: generation.schema,
	});
	const byLemma = new Map(
		readingDemonstrations.map((demonstration) => [
			demonstration.lemma,
			demonstration.emojiDescription,
		]),
	);
	expect(byLemma.get("neun")).toBe("9⃣");
	expect(byLemma.get("±")).toBe("➕➖");
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

/** Whether `form`'s words occur in `text`'s in a row. */
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

/**
 * Clashes that wait for the user's ruling on #877: the es gibt
 * demonstration #694 asks for has the Lemma geben, which the folded es
 * gibt evaluation cases share. Either the demonstration goes or every
 * geben case leaves the evaluation; until then the clash is named here,
 * and the test fails once it is gone so the entry cannot outlive it.
 */
const awaitingRuling = ["geben"];

test("no demonstration or example in a Reading prompt uses an evaluation case's Lemma or one of its open-class forms (#693)", () => {
	const { dev, heldout } = readingCases();
	const lemmas = new Map<string, string>();
	const openForms = new Map<string, string>();
	for (const goldCase of [...dev, ...heldout]) {
		const { lemma, normalizedSurface } = goldCase.attestation.surface;
		lemmas.set(foldCase(lemma.canonicalForm, "de"), goldCase.id);
		const open =
			lemma.family === "Lexeme" ? openKinds.has(lemma.kind) : true;
		if (!open) continue;
		openForms.set(lemma.canonicalForm, goldCase.id);
		if (lemma.family === "Lexeme")
			openForms.set(normalizedSurface, goldCase.id);
	}
	const clashes: { readonly form: string; readonly message: string }[] = [];
	for (const { lemma } of readingDemonstrations) {
		const id = lemmas.get(foldCase(lemma, "de"));
		if (id)
			clashes.push({
				form: lemma,
				message: `${lemma} is the Lemma of ${id}`,
			});
		for (const [form, of] of openForms)
			if (
				foldCase(form, "de") !== foldCase(lemma, "de") &&
				occursIn(form, lemma)
			)
				clashes.push({
					form,
					message: `${lemma} uses ${form} (${of})`,
				});
	}
	for (const example of readingExamples())
		for (const [form, of] of openForms)
			if (occursIn(form, example))
				clashes.push({
					form,
					message: `«${example}» uses ${form} (${of})`,
				});
	expect(
		clashes
			.filter(({ form }) => !awaitingRuling.includes(form))
			.map(({ message }) => message),
	).toEqual([]);
	expect([...new Set(clashes.map(({ form }) => form))]).toEqual(
		awaitingRuling,
	);
});
