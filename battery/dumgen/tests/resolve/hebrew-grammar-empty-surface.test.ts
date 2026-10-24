import { expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import { defaultLunaConfiguration } from "../../src/luna.js";
import { resolveHebrewGrammar } from "../../src/resolve/he/grammar.js";
import type { Unit } from "../../src/segment/segmented-sentence.js";
import { requestBudget, runOperation } from "./../service-test-adapter.js";

// Grammatical response from frozen he01-book-raw-luna-4.json, 2026-10-21.
// Replays the real rejected value offline; this is not a new model answer.
const frozenBook = {
	emojiDescription: "📖",
	surface: {
		unitKind: "Surface",
		language: "he",
		lemma: {
			unitKind: "Lemma",
			language: "he",
			family: "Lexeme",
			kind: "NOUN",
			canonicalForm: "ספר",
			coreFeatures: { abbr: null, gender: "Masc" },
		},
		normalizedSurface: "ספר",
		spelling: { kind: "Canonical" },
		surfaceFeatures: { historicalStatus: null },
		inflectionalFeatures: { definite: "Ind", number: "Sing" },
	},
} as const;

async function resolve(output: unknown) {
	const unit: Unit<"he"> = {
		segments: [2],
		route: { language: "he", family: "Lexeme", kind: "NOUN" },
	};
	return Effect.runPromise(
		runOperation(
			"resolve.grammar",
			{ budget: requestBudget(1), payloads: false },
			{
				luna: {
					configuration: defaultLunaConfiguration,
					ask: async () => ({ output }),
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
					text: "קניתי ספר מעניין לקריאה.",
					segments: [
						{ kind: "ResolvableText", text: "קניתי" },
						{ kind: "Whitespace", text: " " },
						{ kind: "ResolvableText", text: "ספר" },
						{ kind: "Whitespace", text: " " },
						{ kind: "ResolvableText", text: "מעניין" },
						{ kind: "Whitespace", text: " " },
						{ kind: "ResolvableText", text: "ל" },
						{ kind: "ResolvableText", text: "קריאה" },
						{ kind: "Punctuation", text: "." },
					],
					units: [unit],
				},
				unit,
				neighbours: {},
				lemmaCandidates: [],
			}),
		),
	);
}

test("frozen he01 book resolves when its optional surface bag explicitly marks nothing", async () => {
	const result = await resolve(frozenBook);
	expect(result._tag).toBe("Resolved");
	if (result._tag !== "Resolved") throw Error("Expected resolved book");
	expect(result.attestation.surface).toEqual({
		...frozenBook.surface,
		surfaceFeatures: null,
	});
	expect(result.attestation.members).toEqual([
		{ attested: "ספר", orthography: "Standard" },
	]);
	expect(frozenBook.surface.surfaceFeatures).toEqual({
		historicalStatus: null,
	});
});

test("surface bag normalization does not discard an unknown nullable field", async () => {
	await expect(
		resolve({
			...frozenBook,
			surface: {
				...frozenBook.surface,
				surfaceFeatures: { historicalStatus: null, invented: null },
			},
		}),
	).rejects.toThrow("Invalid Hebrew Surface");
});

test("surface bag normalization preserves a marked historical feature", async () => {
	const result = await resolve({
		...frozenBook,
		surface: {
			...frozenBook.surface,
			surfaceFeatures: { historicalStatus: "Archaic" },
		},
	});
	expect(result._tag).toBe("Resolved");
	if (result._tag !== "Resolved") throw Error("Expected resolved book");
	expect(result.attestation.surface.surfaceFeatures).toEqual({
		historicalStatus: "Archaic",
	});
});
