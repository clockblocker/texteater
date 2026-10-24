import { expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import { defaultLunaConfiguration } from "../../src/luna.js";
import { resolveHebrewGrammar } from "../../src/resolve/he/grammar.js";
import type { Unit } from "../../src/segment/segmented-sentence.js";
import { requestBudget, runOperation } from "./../service-test-adapter.js";

test("a Hebrew verb has no noun-only article evidence field", async () => {
	const unit: Unit<"he"> = {
		segments: [0],
		route: { language: "he", family: "Lexeme", kind: "VERB" },
	};
	const surface = {
		unitKind: "Surface",
		language: "he",
		lemma: {
			unitKind: "Lemma",
			language: "he",
			family: "Lexeme",
			kind: "VERB",
			canonicalForm: "אמר",
			coreFeatures: { hebBinyan: "PAAL", hebExistential: null },
		},
		normalizedSurface: "אומרים",
		spelling: { kind: "Canonical" },
		surfaceFeatures: null,
		inflectionalFeatures: {
			definite: null,
			gender: "Masc",
			mood: null,
			number: "Plur",
			person: null,
			polarity: null,
			tense: null,
			verbForm: "Part",
			voice: "Act",
		},
	} as const;
	const result = await Effect.runPromise(
		runOperation(
			"resolve.grammar",
			{ budget: requestBudget(2), payloads: false },
			{
				luna: {
					configuration: defaultLunaConfiguration,
					ask: async () => ({
						output: { emojiDescription: "📚", surface },
					}),
				},
				jev: {
					model: "jev-test",
					ask: async () => {
						throw Error("Unexpected judge");
					},
				},
			},
			resolveHebrewGrammar({
				language: "he",
				sentence: {
					text: "אומרים",
					segments: [{ kind: "ResolvableText", text: "אומרים" }],
					units: [unit],
				},
				unit,
				neighbours: {},
				lemmaCandidates: [],
			}),
		),
	);
	expect(result._tag).toBe("Resolved");
	if (result._tag !== "Resolved") throw Error("Expected resolved noun");
	expect("articleEvidence" in result.attestation).toBe(false);
	expect(result.attestation).toMatchObject({
		members: [{ attested: "אומרים", orthography: "Standard" }],
	});
});
