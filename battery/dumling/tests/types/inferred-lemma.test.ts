import { describe, expect, it } from "bun:test";
import { inferredType } from "prinfer/testing";
import { dumling } from "../../src";

const germanNounLemmaInferenceGuard = dumling.de.create.lemma({
	canonicalForm: "Schloss",
	family: "Lexeme",
	kind: "NOUN",
	coreFeatures: { gender: "Neut", hyph: null },
});

describe("Dumling Lemma inference", () => {
	it("keeps the language, Family, and Kind branches in the inferred type", () => {
		void germanNounLemmaInferenceGuard;
		expect(
			inferredType(import.meta.url, {
				name: "germanNounLemmaInferenceGuard",
			}),
		).toMatchInlineSnapshot(
			`"{ language: "de"; canonicalForm: string; family: "Lexeme"; kind: "NOUN"; coreFeatures: { gender: "Fem" | "Masc" | "Neut" | null; hyph: "Yes" | null; }; }"`,
		);
	});
});
