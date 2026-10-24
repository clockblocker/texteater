import { expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import { defaultLunaConfiguration } from "../../src/luna.js";
import { resolveHebrewGrammar } from "../../src/resolve/he/grammar.js";
import type { Unit } from "../../src/segment/segmented-sentence.js";
import { requestBudget, runOperation } from "./../service-test-adapter.js";

test("a bare Hebrew noun resolves with explicit absent article evidence", async () => {
	const unit: Unit<"he"> = {
		segments: [0],
		route: { language: "he", family: "Lexeme", kind: "NOUN" },
	};
	const surface = {
		unitKind: "Surface",
		language: "he",
		lemma: {
			unitKind: "Lemma",
			language: "he",
			family: "Lexeme",
			kind: "NOUN",
			canonicalForm: "ספר",
			coreFeatures: { gender: "Masc", abbr: null },
		},
		normalizedSurface: "ספר",
		spelling: { kind: "Canonical" },
		surfaceFeatures: null,
		inflectionalFeatures: { number: "Sing", definite: "Ind" },
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
					text: "ספר",
					segments: [{ kind: "ResolvableText", text: "ספר" }],
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
	expect(result.attestation).toMatchObject({
		articleEvidence: null,
		members: [{ attested: "ספר", orthography: "Standard" }],
	});
});
