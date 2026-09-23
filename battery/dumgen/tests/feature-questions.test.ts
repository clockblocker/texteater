import { expect, test } from "bun:test";
import {
	featureQuestion,
	inflectionQuestion,
} from "../src/concrete-lang/de/grammatical-resolution/feature-questions.js";
import { grammarFeatureFields } from "../src/concrete-lang/de/grammatical-resolution/feature-schema.js";
import { modelSchemas } from "../src/generated/model-schemas.js";

const verbal = new Set(["VERB", "AUX", "Idiom", "Collocation"]);

test("every enabled German grammatical feature has explicit meanings for all schema choices", () => {
	const lexemes = new Set<string>();
	let checked = 0;
	let nounNumberChecked = false;
	let propnNumberChecked = false;
	for (const key of Object.keys(modelSchemas)) {
		if (!key.startsWith("grammar/de/")) continue;
		const route = key.slice("grammar/".length);
		const [, family, kind] = route.split("/");
		if (!kind || family === "Morpheme" || kind === "PUNCT") continue;
		if (family === "Lexeme") lexemes.add(kind);
		const fields = grammarFeatureFields(route);
		if (fields.has("surface.inflectionalFeatures")) {
			const question = inflectionQuestion(kind);
			expect(question.instructions).toContain("`markedContext`");
			expect(Object.keys(question.criteria)).toEqual([
				"Marked",
				"Citation",
				"Unresolved",
			]);
		}
		for (const [path, field] of fields) {
			if (
				!(
					path.startsWith("lemma.coreFeatures.") ||
					path.startsWith("surface.inflectionalFeatures.")
				)
			)
				continue;
			if (kind === "AUX" && path.startsWith("lemma.")) continue;
			if (verbal.has(kind) && path.endsWith(".voice")) continue;
			const question = featureQuestion(kind, path, field);
			// A contextual common noun always has Number: no Unmarked choice.
			const nounNumber =
				kind === "NOUN" &&
				path === "surface.inflectionalFeatures.number";
			const expected = field.open
				? ["Present", "Absent", "Unresolved"]
				: [
						...field.values
							.filter((value) => !(nounNumber && value === null))
							.map((value) =>
								value === null ? "Unmarked" : String(value),
							),
						"Unresolved",
					];
			expect(Object.keys(question.criteria)).toEqual(expected);
			if (nounNumber) {
				nounNumberChecked = true;
				expect(expected).toEqual(["Plur", "Sing", "Unresolved"]);
			}
			if (
				kind === "PROPN" &&
				path === "surface.inflectionalFeatures.number"
			) {
				propnNumberChecked = true;
				expect(Object.keys(question.criteria)).toContain("Unmarked");
			}
			expect(question.instructions).toContain("`markedContext`");
			expect(question.instructions).toContain(kind);
			for (const description of Object.values(question.criteria)) {
				expect(typeof description).toBe("string");
				expect(description).not.toMatch(/^Feature value /);
			}
			checked++;
		}
	}
	expect(nounNumberChecked).toBe(true);
	expect(propnNumberChecked).toBe(true);
	expect(lexemes.size).toBe(16);
	expect(checked).toBeGreaterThan(100);
});

test("new features and values cannot silently fall back to schema-label questions", () => {
	expect(() =>
		featureQuestion("NOUN", "lemma.coreFeatures.unknown", {
			values: [null],
			open: false,
		}),
	).toThrow("Missing German feature question");
	expect(() =>
		featureQuestion("NOUN", "lemma.coreFeatures.gender", {
			values: ["NewGender"],
			open: false,
		}),
	).toThrow("Missing German feature choice");
	expect(() =>
		featureQuestion("NOUN", "lemma.coreFeatures.gender", {
			values: [],
			open: true,
		}),
	).toThrow("Missing open-feature meaning");
});
