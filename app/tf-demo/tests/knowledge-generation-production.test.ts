import { afterEach, beforeEach, expect, jest, spyOn, test } from "bun:test";
import * as Effect from "effect/Effect";
import { internal } from "../convex/_generated/api";
import { generationRequestFor } from "../server/generatedKnowledgeRequest";
import { missingKnowledgeRequest } from "../server/knowledgeCompletion";
import type { KnowledgeInput } from "../server/knowledgeProduction";
import { createTestConvex } from "./support/convex";
import {
	addToDictionary,
	attempts,
	BANK_READING,
	generateWith,
	insertAccumulatedKnowledge,
	insertAttempt,
	interceptPublish,
	type KnowledgeChange,
	logEvent,
	type PublishArgs,
	rows,
	seedDictionaryReading,
	seedOccurrence,
} from "./support/knowledgeGeneration";

beforeEach(() => {
	// Scheduling a Knowledge attempt queues its action; nothing here runs it.
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

test("a run that proposes an empty frame stores nothing and still completes the Reading", async () => {
	const t = createTestConvex();
	const occurrence = await seedDictionaryReading(t);
	await insertAttempt(t, occurrence, "empty-frame", { state: "Scheduled" });
	const requests: KnowledgeInput["request"][] = [];
	await generateWith(t, "empty-frame", (input) => {
		requests.push(input.request);
		// No valency change: the proposed frame is empty.
		return Effect.succeed({
			failures: [],
			changes: [
				{
					kind: "Contribute",
					aspect: "definition",
					value: "Ein Geldinstitut.",
				},
				{
					kind: "Contribute",
					aspect: "transcription",
					value: "baŋk",
				},
				{
					kind: "Contribute",
					aspect: "translations",
					language: "en",
					value: ["bank"],
				},
				{
					kind: "Contribute",
					aspect: "translations",
					language: "ru",
					value: ["банк"],
				},
			],
			pendingRelations: [],
		});
	});
	expect(Object.keys(requests[0] ?? {})).toContain("valency");
	const [accumulated] = await rows(t, "accumulatedKnowledge");
	expect(accumulated?.knowledge).not.toHaveProperty("valency");
	expect((await attempts(t))[0]).toMatchObject({ state: "Committed" });
});

test("a deployment without TF_KNOWLEDGE_PRODUCTION fails a run with the safe message and calls no model (#887)", async () => {
	const t = createTestConvex();
	const occurrence = await seedDictionaryReading(t);
	await insertAttempt(t, occurrence, "idle", { state: "Scheduled" });
	const errors = spyOn(console, "error").mockImplementation(() => {});
	const previousFetch = globalThis.fetch;
	const previousFlag = process.env.TF_KNOWLEDGE_PRODUCTION;
	delete process.env.TF_KNOWLEDGE_PRODUCTION;
	const fetched: string[] = [];
	globalThis.fetch = Object.assign(
		async (url: string | URL | Request) => {
			fetched.push(String(url));
			throw new Error("No model may be called.");
		},
		{ preconnect: previousFetch.preconnect },
	);
	try {
		await t.action(
			internal.knowledgeGenerationActions.runKnowledgeGeneration,
			{ attemptKey: "idle" },
		);
	} finally {
		errors.mockRestore();
		globalThis.fetch = previousFetch;
		if (previousFlag !== undefined)
			process.env.TF_KNOWLEDGE_PRODUCTION = previousFlag;
	}
	expect(fetched).toEqual([]);
	expect((await attempts(t))[0]).toMatchObject({
		state: "Failed",
		failureMessage: "Knowledge generation failed. Please retry.",
	});
	expect(await rows(t, "knowledgeChanges")).toEqual([]);
});

test("each contribution's base text is published in order, one call each", async () => {
	const t = createTestConvex();
	const occurrence = await seedDictionaryReading(t);
	await insertAttempt(t, occurrence, "in-order", { state: "Scheduled" });
	const incremental: PublishArgs["changes"][] = [];
	const definition: KnowledgeChange = {
		kind: "Contribute",
		aspect: "definition",
		value: "Ein Geldinstitut.",
	};
	const russian: KnowledgeChange = {
		kind: "Contribute",
		aspect: "translations",
		language: "ru",
		value: ["банк"],
	};
	const english: KnowledgeChange = {
		kind: "Contribute",
		aspect: "translations",
		language: "en",
		value: ["bank"],
	};
	await generateWith(
		t,
		"in-order",
		(_input, { onContribution }) =>
			// The port's contract: one contribution at a time, each awaited.
			Effect.gen(function* () {
				yield* onContribution([definition]);
				yield* onContribution([russian]);
				yield* onContribution([english]);
				return {
					failures: [],
					changes: [definition, russian, english],
					pendingRelations: [],
				};
			}),
		interceptPublish(t, async (args, commit) => {
			if (!args.final) incremental.push(args.changes);
			return commit();
		}),
	);
	expect(incremental).toEqual([[definition], [russian], [english]]);
	expect((await attempts(t))[0]).toMatchObject({ state: "Committed" });
});

/**
 * Stubs the model provider and restores it with the fixture API key. A
 * Valency Frame request gets `frame`; every other request gets text.
 */
function stubProvider(
	respond: (modelInput: ModelInput) => Promise<string>,
	frame: readonly unknown[] = [],
	plural: unknown = { plurality: "NoPlural", plurals: [] },
) {
	const previousFetch = globalThis.fetch;
	const previousKey = process.env.OPENAI_API_KEY;
	const requests: ModelInput[] = [];
	process.env.OPENAI_API_KEY = "fixture";
	globalThis.fetch = (async (_url, init) => {
		const body = JSON.parse(String(init?.body));
		const modelInput: ModelInput = JSON.parse(body.input[1].content);
		requests.push(modelInput);
		return Response.json({
			status: "completed",
			output: [
				{
					content: [
						{
							type: "output_text",
							text: JSON.stringify({
								value:
									modelInput.aspect === "valency"
										? { valency: frame }
										: modelInput.aspect === "pluralPattern"
											? plural
											: {
													text:
														await respond(
															modelInput,
														),
												},
							}),
						},
					],
				},
			],
		});
	}) as typeof fetch;
	return {
		requests,
		restore() {
			globalThis.fetch = previousFetch;
			if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
			else process.env.OPENAI_API_KEY = previousKey;
		},
	};
}

type ModelInput = { readonly aspect?: string; readonly language?: string };

test("Full is a zero-call cache hit and generation keeps the complete German base mask", async () => {
	const t = createTestConvex();
	const occurrence = await seedOccurrence(t);
	await insertAccumulatedKnowledge(t, occurrence, {
		knowledge: { translations: { en: ["bank"], ru: ["банк"] } },
		status: "Full",
		coveredTranslationLanguages: ["en", "ru"],
	});
	await insertAttempt(t, occurrence, "already-full", { state: "Scheduled" });
	const provider = stubProvider(async () => {
		throw new Error("A Full attempt needs no model call.");
	});
	try {
		expect(
			await t.action(
				internal.knowledgeGenerationActions.runKnowledgeGeneration,
				{ attemptKey: "already-full" },
			),
		).toBeNull();
	} finally {
		provider.restore();
	}
	expect(provider.requests).toEqual([]);
	expect(await attempts(t)).toEqual([
		expect.objectContaining({ state: "LostRace" }),
	]);
	expect(await rows(t, "knowledgeChanges")).toEqual([]);

	const request = generationRequestFor(BANK_READING, []);
	// The Knowledge call that creates the Reading proposes its frame and names its plural.
	expect(request).toEqual({
		transcription: null,
		definition: null,
		translations: { en: null, ru: null },
		valency: null,
		plural: null,
	});
	expect(
		generationRequestFor(BANK_READING, [], {
			translationLanguages: ["ru"],
			topUpOnly: true,
		}),
	).toEqual({ translations: { ru: null } });
	const angst = {
		unitKind: "Reading",
		lemma: {
			unitKind: "Lemma",
			language: "de",
			family: "Lexeme",
			kind: "NOUN",
			canonicalForm: "Angst",
			coreFeatures: { gender: "Fem" },
		},
		emojiDescription: "😨",
	} as const;
	// A top-up never proposes a frame; attested government travels beside it.
	expect(
		generationRequestFor(angst, [], {
			translationLanguages: [],
			topUpOnly: true,
		}),
	).toEqual({});
	// Only a Reading with no frame yet asks for one.
	expect(
		missingKnowledgeRequest(generationRequestFor(angst, []), {
			knowledge: {
				definition: "Furcht.",
				valency: [
					{
						status: "Optional",
						complements: [
							{
								kind: "Preposition",
								preposition: { canonicalForm: "vor" },
								governedCase: "Dat",
								referent: "Either",
							},
						],
					},
				],
			},
			checkedRelationKinds: [],
		}),
	).toEqual({
		transcription: null,
		translations: { en: null, ru: null },
		plural: null,
	});
});

test.each([false, true])(
	"the generation action publishes before a slow translation and retries failed publication (failure=%s)",
	async (failFirstPublication) => {
		// Nothing is scheduled here; the run is driven directly and polled.
		jest.useRealTimers();
		const t = createTestConvex();
		const occurrence = await seedOccurrence(t);
		// A Reading missing from the dictionary rejects the first publication,
		// a transient failure the final publication recovers from.
		if (!failFirstPublication) await addToDictionary(t, occurrence);
		await insertAttempt(t, occurrence, "progress", { state: "Scheduled" });
		const slow = Promise.withResolvers<void>();
		const firstPublication = Promise.withResolvers<void>();
		const errors = spyOn(console, "error").mockImplementation(
			(message: unknown) => {
				if (
					logEvent(message)?.event ===
					"KnowledgeContributionPublicationFailed"
				)
					firstPublication.resolve();
			},
		);
		const definition: KnowledgeChange = {
			kind: "Contribute",
			aspect: "definition",
			value: "Ein Geldinstitut.",
		};
		const russian: KnowledgeChange = {
			kind: "Contribute",
			aspect: "translations",
			language: "ru",
			value: ["банк"],
		};
		const english: KnowledgeChange = {
			kind: "Contribute",
			aspect: "translations",
			language: "en",
			value: ["bank"],
		};
		const transcription: KnowledgeChange = {
			kind: "Contribute",
			aspect: "transcription",
			value: "baŋk",
		};
		const committedChanges = () =>
			t.run((ctx) => ctx.db.query("knowledgeChanges").take(10));
		let finished = false;
		try {
			const running = generateWith(t, "progress", (_input, options) =>
				Effect.promise(async () => {
					// The finished leaves are handed on before the slow one.
					await Effect.runPromise(
						options.onContribution([definition, russian]),
					);
					await slow.promise;
					return {
						failures: [],
						changes: [definition, russian, english, transcription],
						pendingRelations: [],
					};
				}),
			).then(() => {
				finished = true;
			});
			if (!failFirstPublication) {
				void (async () => {
					while (!finished && (await committedChanges()).length === 0)
						await Bun.sleep(1);
					firstPublication.resolve();
				})();
			}
			await firstPublication.promise;
			expect(finished).toBe(false);
			expect((await committedChanges()).length).toBeLessThan(3);
			expect((await attempts(t))[0]).toMatchObject({ state: "Running" });
			if (failFirstPublication) {
				expect(await committedChanges()).toEqual([]);
				await addToDictionary(t, occurrence);
			}
			slow.resolve();
			await running;
			// The final publication always carries every change; the mutation
			// drops what this run already published.
			const changes = await committedChanges();
			expect(changes).toHaveLength(4);
			const sequences = new Set(
				changes.map(
					({ knowledgeChangeKey }) =>
						knowledgeChangeKey.split(":")[2],
				),
			);
			expect(sequences.size).toBe(failFirstPublication ? 1 : 2);
			expect((await attempts(t))[0]).toMatchObject({
				state: "Committed",
			});
		} finally {
			slow.resolve();
			errors.mockRestore();
		}
	},
);
