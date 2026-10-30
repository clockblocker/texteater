import { describe, expect, test } from "bun:test";
import { cases } from "./cases";
import { aboutRuns, ordered, plainAbout, separator } from "./chain";

const locution = cases[0];
if (!locution) throw new Error("no cases");

describe("the chain", () => {
	test("from the lemma, the step nearest the lemma comes first", () => {
		expect(ordered(locution.steps, "lemma").map((step) => step.id)).toEqual(
			["zu", "da", "subject", "tense", "order"],
		);
		expect(ordered(locution.steps, "words")).toBe(locution.steps);
	});

	test("the separator points at the lemma", () => {
		expect(separator("yomitan", "lemma")).toBe("«");
		expect(separator("yomitan", "words")).toBe("»");
		expect(separator("tenten", "lemma")).toBe("<");
		expect(separator("tenten", "words")).toBe(">");
	});

	test("an about's marked words are target-language runs", () => {
		expect(aboutRuns("_damit_ is _da(r)_ + _mit_.")).toEqual([
			{ text: "damit", target: true },
			{ text: " is ", target: false },
			{ text: "da(r)", target: true },
			{ text: " + ", target: false },
			{ text: "mit", target: true },
			{ text: ".", target: false },
		]);
		expect(plainAbout("_es_, 'it'")).toBe("es, 'it'");
	});

	test("every step of every case is authored in full", () => {
		for (const each of cases) {
			expect(each.steps.length).toBeGreaterThan(0);
			for (const step of each.steps) {
				expect(step.terse.length).toBeLessThanOrEqual(16);
				for (const word of step.words)
					expect(each.surface.split(" ")).toContain(word);
				expect(plainAbout(step.about)).not.toContain("_");
			}
			const words = each.text.paragraphs
				.flatMap((paragraph) => paragraph.sentences)
				.flatMap((sentence) => sentence.tokens)
				.filter((token) => token.kind === "word")
				.map((token) => token.text);
			expect(words).toContain(each.clicked);
		}
	});
});
