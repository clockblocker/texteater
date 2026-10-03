import { expect, test } from "bun:test";
import { checkPromptCitations, rules } from "dumspec";
import {
	judgePolicy,
	judgeQuestion,
	readingDemonstrations,
	readingPromptTexts,
} from "../../src/resolve/de/reading-prompts.js";
import {
	emojiDescriptionRequest,
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
