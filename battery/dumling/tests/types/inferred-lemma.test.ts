import { afterAll, describe, expect, it } from "bun:test";
import { closeTestingSessions, inferredType } from "prinfer/testing";
import { dumling } from "../../src";

afterAll(closeTestingSessions);

const germanNounLemmaInferenceGuard = dumling.de.create.lemma({
	canonicalForm: "Schloss",
	family: "Lexeme",
	kind: "NOUN",
	coreFeatures: { gender: "Neut", hyph: null },
});

describe("Dumling Lemma inference", () => {
	it("keeps the language, Family, and Kind branches in the inferred type", async () => {
		void germanNounLemmaInferenceGuard;
		expect(
			await inferredType(import.meta.url, {
				name: "germanNounLemmaInferenceGuard",
				backend: "typescript7",
			}),
		).toMatchInlineSnapshot(
			`"{ canonicalForm: string; coreFeatures: { gender: "Fem" | "Masc" | "Neut" | null; hyph: "Yes" | null; }; family: "Lexeme"; kind: "NOUN"; language: "de"; }"`,
		);
	});
});
