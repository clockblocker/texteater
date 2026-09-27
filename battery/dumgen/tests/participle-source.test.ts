import { expect, test } from "bun:test";
import { Effect } from "effect";
import { choiceAnswers } from "../src/testing/execution-fixture.js";
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
	meaning = "Verbal",
	form = "Participle",
) {
	return Effect.runPromise(
		createDumgen({
			execute: async (request) =>
				(request.input as { aspect?: string }).aspect ===
				"participleSource"
					? { output: source }
					: { output: { text: "Ein Zustand." } },
			judge: async (request) =>
				choiceAnswers(request.questions, (id) =>
					id === "form" ? form : meaning,
				),
			onKnowledgeContribution: (changes) =>
				incremental.push(...changes.map((change) => change.aspect)),
		}).produceKnowledge(input),
	);
}

test("an adjectival participle names its source VERB Lemma, published only with the final batch", async () => {
	const incremental: unknown[] = [];
	const result = await produce(
		adjective("umgestürzt", "umgestürzt"),
		{
			source: "umstürzen",
			separablePrefix: "um",
			preterite: "stürzte um",
			participle: "umgestürzt",
		},
		incremental,
	);
	expect(result.failures).toEqual([]);
	expect(
		result.changes.find((change) => change.aspect === "participleSource"),
	).toEqual({
		kind: "Contribute",
		aspect: "participleSource",
		value: {
			verb: {
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
			meaning: "Verbal",
		},
	});
	expect(incremental).toEqual(["definition"]);
});

test("a reflexive source verb is lexicallyReflexive", async () => {
	const result = await produce(adjective("verliebt", "verliebt"), {
		source: "sich verlieben",
		separablePrefix: null,
		preterite: "verliebte sich",
		participle: "verliebt",
	});
	expect(
		result.changes.find((change) => change.aspect === "participleSource"),
	).toMatchObject({
		value: {
			verb: {
				canonicalForm: "sich verlieben",
				coreFeatures: {
					hasSepPrefix: null,
					lexicallyReflexive: "Yes",
					verbType: null,
				},
			},
		},
	});
});

test("a participle that is not the adjective's form is no source", async () => {
	const result = await produce(adjective("verlegen", "verlegen"), {
		source: "verlegen",
		separablePrefix: null,
		preterite: "verlegte",
		participle: "verlegt",
	});
	expect(result.failures).toEqual([]);
	expect(result.changes.map((change) => change.aspect)).toEqual([
		"definition",
	]);
});

test("a drifted Reading keeps the verb its form names and records the drift", async () => {
	const result = await produce(
		adjective("gelassen", "gelassen"),
		{
			source: "lassen",
			separablePrefix: null,
			preterite: "ließ",
			participle: "gelassen",
		},
		[],
		"Drifted",
	);
	expect(
		result.changes.find((change) => change.aspect === "participleSource"),
	).toMatchObject({
		value: { verb: { canonicalForm: "lassen" }, meaning: "Drifted" },
	});
});

test("a plain adjective is no contribution; a malformed source is an attributable failure", async () => {
	const plain = await produce(adjective("schnell", "schnell"), {
		source: null,
		separablePrefix: null,
		preterite: null,
		participle: null,
	});
	expect(plain.failures).toEqual([]);
	expect(plain.changes.map((change) => change.aspect)).toEqual([
		"definition",
	]);
	const answer = {
		source: "kochen",
		separablePrefix: null,
		preterite: "kochte",
		participle: "gekocht",
	};
	for (const source of [
		{ ...answer, source: "gekocht" },
		{ ...answer, separablePrefix: "ab" },
		{
			source: null,
			separablePrefix: "ab",
			preterite: null,
			participle: null,
		},
		{
			source: null,
			separablePrefix: null,
			preterite: null,
			participle: "gekocht",
		},
		{ ...answer, participle: null },
		{ ...answer, preterite: null },
		{ source: "kochen", separablePrefix: null },
		{ ...answer, meaning: "Verbal" },
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

test("a verb the judge finds builds no such participle is no source", async () => {
	const result = await produce(
		adjective("verschieden", "verschieden"),
		{
			source: "verschieden",
			separablePrefix: null,
			preterite: "verschied",
			participle: "verschieden",
		},
		[],
		"Drifted",
		"NotParticiple",
	);
	expect(result.failures).toEqual([]);
	expect(result.changes.map((change) => change.aspect)).toEqual([
		"definition",
	]);
});

test("an unresolved meaning stores no source and fails the aspect", async () => {
	const result = await produce(
		adjective("gekocht", "gekocht"),
		{
			source: "kochen",
			separablePrefix: null,
			preterite: "kochte",
			participle: "gekocht",
		},
		[],
		"Unresolved",
	);
	expect(result.changes.map((change) => change.aspect)).toEqual([
		"definition",
	]);
	expect(result.failures).toMatchObject([
		{ aspect: "participleSource", code: "Unresolved" },
	]);
});
