/**
 * The #693 disjointness check for a revision's own examples and quoted
 * words: every gold or spot-check Lemma (as tests/knowledge/prompts.test.ts
 * collects them) that occurs inside one of `texts`.
 */
import { isRecord } from "common-utils";
import { loadSpecRecords } from "dumcorpus";
import { foldCase } from "dumling";
import { knowledgeCases, spotCheckCases } from "../knowledge/cases.js";

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

function lemmasIn(value: unknown, into: Set<string>) {
	if (!value || typeof value !== "object") return;
	if (
		isRecord(value) &&
		value.unitKind === "Lemma" &&
		typeof value.canonicalForm === "string" &&
		(value.family !== "Lexeme" || openKinds.has(String(value.kind)))
	)
		into.add(value.canonicalForm);
	for (const inner of Object.values(value)) lemmasIn(inner, into);
}

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

/** The gold and spot-check Lemma forms. */
export function goldForms(): Set<string> {
	const records = loadSpecRecords();
	const { dev, heldout } = knowledgeCases(records);
	const forms = new Set<string>();
	for (const goldCase of [...dev, ...heldout]) {
		if (!goldCase.gold) continue;
		lemmasIn(goldCase.reading, forms);
		lemmasIn(goldCase.gold.knowledge, forms);
	}
	for (const goldCase of spotCheckCases(records, dev).cases)
		lemmasIn(goldCase.reading, forms);
	return forms;
}

/** Each text that uses a gold form, with the form. */
export function clashes(texts: readonly string[]): string[] {
	const forms = [...goldForms()];
	return texts.flatMap((text) =>
		forms
			.filter((form) => occursIn(form, text))
			.map((form) => `«${text}» uses ${form}`),
	);
}

if (import.meta.main) console.log(clashes(process.argv.slice(2)));
