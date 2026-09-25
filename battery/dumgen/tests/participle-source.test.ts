import { expect, test } from "bun:test";
import { Effect } from "effect";
import type { KnowledgeInput } from "../src/types.js";
import { createDumgen } from "../src/universal/dumgen.js";

const adjective = (canonicalForm: string, attested: string) =>
	({
		encounter: {
			sentence: {
				id: "participle",
				language: "de",
				segments: [
					{ kind: "OpaqueText", text: "Sie ist " },
					{ kind: "ResolvableText", text: attested },
					{ kind: "Punctuation", text: "." },
				],
			},
			target: {
				family: "Lexeme",
				kind: "ADJ",
				memberSegmentIndices: [1],
			},
		},
		reading: {
			unitKind: "Reading",
			lemma: {
				unitKind: "Lemma",
				language: "de",
				family: "Lexeme",
				kind: "ADJ",
				canonicalForm,
				coreFeatures: {
					abbr: null,
					foreign: null,
					numType: null,
					variant: null,
				},
			},
			emojiDescription: "🙂",
		},
		request: { definition: null, participleSource: null },
	}) as const satisfies KnowledgeInput<"de">;

function produce(
	input: KnowledgeInput<"de">,
	source: unknown,
	incremental: unknown[] = [],
) {
	return Effect.runPromise(
		createDumgen({
			execute: async (request) =>
				(request.input as { aspect?: string }).aspect ===
				"participleSource"
					? { output: source }
					: { output: { text: "Ein Zustand." } },
			judge: async () => {
				throw Error("No judgment expected");
			},
			onKnowledgeContribution: (changes) =>
				incremental.push(...changes.map((change) => change.aspect)),
		}).produceKnowledge(input),
	);
}

test("an adjectival participle names its source VERB Lemma, published only with the final batch", async () => {
	const incremental: unknown[] = [];
	const result = await produce(
		adjective("umgestürzt", "umgestürzt"),
		{ source: "umstürzen", separablePrefix: "um" },
		incremental,
	);
	expect(result.failures).toEqual([]);
	expect(
		result.changes.find((change) => change.aspect === "participleSource"),
	).toEqual({
		kind: "Contribute",
		aspect: "participleSource",
		value: {
			unitKind: "Lemma",
			language: "de",
			family: "Lexeme",
			kind: "VERB",
			canonicalForm: "umstürzen",
			coreFeatures: {
				hasSepPrefix: "um",
				lexicallyReflexive: null,
				verbType: null,
			},
		},
	});
	expect(incremental).toEqual(["definition"]);
});

test("a reflexive source verb is lexicallyReflexive", async () => {
	const result = await produce(adjective("verliebt", "verliebt"), {
		source: "sich verlieben",
		separablePrefix: null,
	});
	expect(
		result.changes.find((change) => change.aspect === "participleSource"),
	).toMatchObject({
		value: {
			canonicalForm: "sich verlieben",
			coreFeatures: {
				hasSepPrefix: null,
				lexicallyReflexive: "Yes",
				verbType: null,
			},
		},
	});
});

test("a plain adjective is no contribution; a malformed source is an attributable failure", async () => {
	const plain = await produce(adjective("schnell", "schnell"), {
		source: null,
		separablePrefix: null,
	});
	expect(plain.failures).toEqual([]);
	expect(plain.changes.map((change) => change.aspect)).toEqual([
		"definition",
	]);
	for (const source of [
		{ source: "gekocht", separablePrefix: null },
		{ source: "kochen", separablePrefix: "ab" },
		{ source: null, separablePrefix: "ab" },
		{ source: "kochen" },
	]) {
		const invalid = await produce(adjective("gekocht", "gekocht"), source);
		expect(invalid.changes.map((change) => change.aspect)).toEqual([
			"definition",
		]);
		expect(invalid.failures).toMatchObject([
			{ aspect: "participleSource", code: "InvalidModelOutput" },
		]);
	}
});
