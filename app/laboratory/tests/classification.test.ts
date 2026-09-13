import { describe, expect, test } from "bun:test";
import { createDumgen } from "dumgen";
import type {
	ModelExchange,
	ModelRequest,
	SegmentedSentence,
} from "dumgen/types";
import * as Effect from "effect/Effect";
import { GermanClassificationResolver } from "../src/classification";

const sentence: SegmentedSentence<"de"> = {
	id: "first",
	language: "de",
	segments: [
		{ kind: "ResolvableText", text: "Bnak" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "Bank" },
	],
};
const target = {
	family: "Lexeme",
	kind: "NOUN",
	memberSegmentIndices: [0, 2],
} as const;
const classification = {
	decision: "Resolved",
	target: { family: "Lexeme", kind: "NOUN" },
	additionalMemberIndices: [1],
};
const grammar = {
	memberOrthographies: ["Typo", "Standard"],
	normalizedMembers: ["Bank", "Bank"],
	surface: {
		spelling: "Canonical",
		surfaceFeatures: null,
		inflectionalFeatures: { case: "Nom", number: "Sing" },
	},
	lemma: {
		canonicalForm: "Bank",
		coreFeatures: { gender: "Fem", hyph: null },
	},
	realizationCoverage: "Full",
};
function harness(outputs: unknown[]) {
	const requests: ModelRequest[] = [];
	const exchanges: ModelExchange[] = [];
	const resolver = new GermanClassificationResolver((onModelExchange) =>
		createDumgen({
			onModelExchange,
			execute: async (request) => {
				requests.push(request);
				const output = outputs.shift();
				if (output instanceof Error) throw output;
				return output;
			},
		}),
	);
	return {
		resolver,
		requests,
		exchanges,
		resolve: (id = "first", supplied = false) =>
			Effect.runPromise(
				resolver.resolve(
					{ ...sentence, id },
					0,
					exchanges,
					[],
					supplied ? target : undefined,
				),
			),
	};
}

describe("Laboratory uses the published Encounter pipeline and dictionary", () => {
	test("resolves all members once, captures real exchanges and commits tagged units", async () => {
		const run = harness([
			classification,
			grammar,
			{ emojiDescription: "🏦" },
		]);
		const result = await run.resolve();
		expect(result).toMatchObject({
			decision: "Resolved",
			encounter: { sentence, target },
			entity: {
				reading: { unitKind: "Reading", emojiDescription: "🏦" },
				attestation: { unitKind: "Attestation" },
			},
			generation: { modelCalls: 3 },
		});
		expect(run.requests.map((value) => value.stage)).toEqual([
			"classifyTarget",
			"resolveGrammar",
			"generateReadingEmojiDescription",
		]);
		expect(run.resolver.snapshot()).toHaveLength(1);
		expect(run.resolver.snapshot()[0]?.readingEntries).toHaveLength(1);
		expect(run.resolver.snapshot()[0]?.ownedSurfaceEntries).toHaveLength(1);
		const cached = await Effect.runPromise(
			run.resolver.resolve(sentence, 2, run.exchanges),
		);
		expect(cached).toMatchObject({
			decision: "Resolved",
			encounter: { target },
			generation: { cache: "member-hit", modelCalls: 0 },
			stages: { target: { traceOrigin: "cached" } },
		});
		expect(run.requests).toHaveLength(3);
	});
	test("a supplied target bypasses classification and stays separate from whole-unit caches", async () => {
		const run = harness([
			grammar,
			{ emojiDescription: "🏦" },
			classification,
			grammar,
			{ emojiDescription: "🏦" },
		]);
		expect(await run.resolve("first", true)).toMatchObject({
			decision: "Resolved",
			stages: { target: { traceOrigin: "supplied" } },
		});
		expect(run.requests.map((value) => value.stage)).toEqual([
			"resolveGrammar",
			"generateReadingEmojiDescription",
		]);
		expect(await run.resolve()).toMatchObject({ decision: "Resolved" });
		expect(run.requests.at(-1)?.stage).toBe(
			"resolveOrGenerateReadingEmojiDescription",
		);
		expect(run.resolver.snapshot()[0]?.readingEntries).toHaveLength(1);
	});
	test("reading failure retains grammar for retry and leaves the dictionary empty", async () => {
		const run = harness([
			classification,
			grammar,
			new Error("provider unavailable"),
			{ emojiDescription: "🏦" },
		]);
		await expect(run.resolve()).rejects.toThrow("provider unavailable");
		expect(run.resolver.snapshot()).toHaveLength(0);
		expect(run.exchanges.at(-1)?.failure).toBe("provider unavailable");
		const response = await run.resolve();
		expect(response).toMatchObject({
			decision: "Resolved",
			stages: {
				target: { traceOrigin: "cached" },
				grammatical: { traceOrigin: "cached" },
			},
			generation: { modelCalls: 1 },
		});
		expect(
			run.requests.filter((value) => value.stage === "classifyTarget"),
		).toHaveLength(1);
	});
	test("different occurrences compare stored Reading candidates through Dumdict", async () => {
		const run = harness([
			classification,
			grammar,
			{ emojiDescription: "🏦" },
			classification,
			grammar,
			{ emojiDescription: "🏦" },
		]);
		await run.resolve();
		await run.resolve("second");
		expect(run.requests.at(-1)?.stage).toBe(
			"resolveOrGenerateReadingEmojiDescription",
		);
		expect(run.resolver.snapshot()[0]?.readingEntries).toHaveLength(1);
		run.resolver.clear();
		expect(run.resolver.snapshot()).toEqual([]);
	});
	test("Unresolved and malformed grammar do not write dictionary records", async () => {
		const unresolved = harness([
			{
				decision: "Unresolved",
				target: null,
				additionalMemberIndices: null,
			},
		]);
		expect(await unresolved.resolve()).toMatchObject({
			decision: "Unresolved",
		});
		expect(unresolved.resolver.snapshot()).toEqual([]);
		const invalid = harness([classification, {}]);
		await expect(invalid.resolve()).rejects.toThrow();
		expect(invalid.resolver.snapshot()).toEqual([]);
	});
	test("a target outside the selected Segment is rejected before model execution", async () => {
		const run = harness([]);
		await expect(
			Effect.runPromise(
				run.resolver.resolve(sentence, 0, [], [], {
					...target,
					memberSegmentIndices: [2],
				}),
			),
		).rejects.toThrow("include");
		expect(run.requests).toHaveLength(0);
	});
});
