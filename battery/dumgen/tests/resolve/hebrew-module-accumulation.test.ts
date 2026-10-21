import { expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import { createDumgen } from "../../src/create-dumgen.js";

test("registered Hebrew module handles empty translation accumulation without a provider call", async () => {
	const lemma = {
		unitKind: "Lemma",
		language: "he",
		family: "Lexeme",
		kind: "NOUN",
		canonicalForm: "ספר",
		coreFeatures: { gender: "Masc", abbr: null },
	} as const;
	const dumgen = createDumgen({
		luna: async () => {
			throw Error("Unexpected Luna call");
		},
		jev: async () => {
			throw Error("Unexpected Jev call");
		},
	});
	const result = await Effect.runPromise(
		dumgen.knowledge.accumulateTranslations({
			language: "he",
			reading: { unitKind: "Reading", lemma, emojiDescription: "📚" },
			attestation: {
				unitKind: "Attestation",
				surface: {
					unitKind: "Surface",
					language: "he",
					lemma,
					normalizedSurface: "ספר",
					spelling: { kind: "Canonical" },
					surfaceFeatures: null,
					inflectionalFeatures: { number: "Sing", definite: "Ind" },
				},
				members: [{ attested: "ספר", orthography: "Standard" }],
				realizationCoverage: "Full",
				articleEvidence: null,
				valencyEvidence: [],
			},
			sentence: { segments: [{ text: "ספר" }], target: [0] },
			translations: {},
		}),
	);
	expect(result).toEqual({ changes: [], failures: [] });
});
