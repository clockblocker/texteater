import { expect, test } from "bun:test";
import { checkPromptCitations, rules } from "dumcorpus";
import { foldCase } from "dumling";
import { grammarCases } from "../../lab/evaluation/resolve-grammar/cases.js";
import {
	grammarPromptTexts,
	promptExamples,
} from "../../src/resolve/de/prompts.js";

test("every grammar prompt paragraph cites the Rules it states at their current hashes (ADR 0037)", () => {
	const prompts = grammarPromptTexts();
	expect(prompts.length).toBeGreaterThan(60);
	expect(checkPromptCitations(prompts, rules)).toEqual([]);
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

/** Whether `form`'s words occur in `example` in a row. */
const occursIn = (form: readonly string[], example: readonly string[]) =>
	form.length > 0 &&
	example.some((_, start) =>
		form.every((word, offset) => example[start + offset] === word),
	);

test("no worked example in a prompt uses an evaluation case's Lemma or one of its open-class forms (#693)", () => {
	const { dev, heldout } = grammarCases();
	const forms = new Map<string, string>();
	for (const goldCase of [...dev, ...heldout]) {
		const { lemma, normalizedSurface } = goldCase.ideal.surface;
		const open =
			lemma.family === "Lexeme" ? openKinds.has(lemma.kind) : true;
		if (!open) continue;
		forms.set(foldCase(lemma.canonicalForm, "de"), goldCase.id);
		if (lemma.family === "Lexeme")
			forms.set(foldCase(normalizedSurface, "de"), goldCase.id);
	}
	const examples = promptExamples();
	expect(examples.length).toBeGreaterThan(5);
	const clashes = examples.flatMap((example) =>
		[...forms]
			.filter(([form]) => occursIn(words(form), words(example)))
			.map(([form, id]) => `«${example}» uses ${form} (${id})`),
	);
	expect(clashes).toEqual([]);
});
