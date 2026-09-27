import { expect, test } from "bun:test";
import type * as Dumrel from "dumrel/types";
import { Effect } from "effect";
import type { KnowledgeInput } from "../src/types.js";
import { createDumgen } from "../src/universal/dumgen.js";

const noun = (
	canonicalForm: string,
	attested: string,
	request: KnowledgeInput<"de">["request"],
	attestedPluralPattern?: Dumrel.PluralPattern,
) =>
	({
		encounter: {
			sentence: {
				id: "plural",
				language: "de",
				segments: [
					{ kind: "OpaqueText", text: "Das ist " },
					{ kind: "ResolvableText", text: attested },
					{ kind: "Punctuation", text: "." },
				],
			},
			target: {
				family: "Lexeme",
				kind: "NOUN",
				memberSegmentIndices: [1],
			},
		},
		reading: {
			unitKind: "Reading",
			lemma: {
				unitKind: "Lemma",
				language: "de",
				family: "Lexeme",
				kind: "NOUN",
				canonicalForm,
				coreFeatures: { gender: "Fem", hyph: null },
			},
			emojiDescription: "🍕",
		},
		request,
		...(attestedPluralPattern ? { attestedPluralPattern } : {}),
	}) as const satisfies KnowledgeInput<"de">;

function produce(
	input: KnowledgeInput<"de">,
	plural: unknown,
	incremental: unknown[] = [],
) {
	const calls: string[] = [];
	const result = Effect.runPromise(
		createDumgen({
			execute: async (request) => {
				const aspect = (request.input as { aspect?: string }).aspect;
				calls.push(String(aspect));
				return aspect === "pluralPattern"
					? { output: plural }
					: { output: { text: "Ein Gericht." } };
			},
			judge: async () => {
				throw Error("No judgment expected");
			},
			onKnowledgeContribution: (changes) =>
				incremental.push(...changes.map((change) => change.aspect)),
		}).produceKnowledge(input),
	);
	return result.then((production) => ({ production, calls }));
}

const pluralChange = (production: { changes: readonly unknown[] }) =>
	production.changes.find(
		(change) => (change as { aspect?: string }).aspect === "pluralPattern",
	);

test("the model names a noun's plurals and code derives their patterns, published only with the final batch", async () => {
	const incremental: unknown[] = [];
	const { production } = await produce(
		noun("Pizza", "Pizza", { definition: null, pluralPattern: null }),
		{ plurality: "HasPlural", plurals: ["Pizzen", "Pizzas"] },
		incremental,
	);
	expect(production.failures).toEqual([]);
	expect(pluralChange(production)).toEqual({
		kind: "Contribute",
		aspect: "pluralPattern",
		value: ["En", "S"],
	});
	expect(incremental).toEqual(["definition"]);
});

test("a noun with no plural or no singular stores its marker", async () => {
	for (const plurality of ["NoPlural", "PluralOnly"] as const) {
		const { production } = await produce(
			noun("Milch", "Milch", { pluralPattern: null }),
			{ plurality, plurals: [] },
		);
		expect(pluralChange(production)).toEqual({
			kind: "Contribute",
			aspect: "pluralPattern",
			value: plurality,
		});
	}
});

test("an attested plural is Contributed with no model call, and joins a proposed plural", async () => {
	const attestedOnly = await produce(noun("Pizza", "Pizzas", {}, "S"), null);
	expect(attestedOnly.calls).toEqual([]);
	expect(pluralChange(attestedOnly.production)).toEqual({
		kind: "Contribute",
		aspect: "pluralPattern",
		value: ["S"],
	});
	const joined = await produce(
		noun("Pizza", "Pizzas", { pluralPattern: null }, "S"),
		{ plurality: "HasPlural", plurals: ["Pizzen"] },
	);
	expect(pluralChange(joined.production)).toEqual({
		kind: "Contribute",
		aspect: "pluralPattern",
		value: ["En", "S"],
	});
	const overruled = await produce(
		noun("Pizza", "Pizzas", { pluralPattern: null }, "S"),
		{ plurality: "NoPlural", plurals: [] },
	);
	expect(pluralChange(overruled.production)).toEqual({
		kind: "Contribute",
		aspect: "pluralPattern",
		value: ["S"],
	});
	const pluralOnly = await produce(
		noun("Leute", "Leute", { pluralPattern: null }, "NoEnding"),
		{ plurality: "PluralOnly", plurals: [] },
	);
	expect(pluralChange(pluralOnly.production)).toEqual({
		kind: "Contribute",
		aspect: "pluralPattern",
		value: "PluralOnly",
	});
});

test("a malformed plural answer fails only its aspect", async () => {
	for (const output of [
		{ plurality: "HasPlural", plurals: [] },
		{ plurality: "NoPlural", plurals: ["Milche"] },
		{ plurality: "HasPlural", plurals: ["die Pizzen"] },
		{ plurality: "Countable", plurals: [] },
	]) {
		const { production } = await produce(
			noun("Pizza", "Pizza", { definition: null, pluralPattern: null }),
			output,
		);
		expect(pluralChange(production)).toBeUndefined();
		expect(production.failures.map((failure) => failure.aspect)).toEqual([
			"pluralPattern",
		]);
		expect(production.changes.map((change) => change.aspect)).toEqual([
			"definition",
		]);
	}
});
