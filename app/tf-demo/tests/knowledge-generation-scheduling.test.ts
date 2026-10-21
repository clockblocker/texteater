import { afterEach, beforeEach, expect, jest, spyOn, test } from "bun:test";
import * as Effect from "effect/Effect";
import { api, internal } from "../convex/_generated/api";
import { defaultKnowledgeSettings } from "../convex/knowledgeSettings";
import { KNOWLEDGE_RETRY_COOLDOWN_MS } from "../convex/model/knowledgeAttempts";
import { publishInRelationChunks } from "../convex/model/relationPublicationChunks";
import { generationRequestFor } from "../server/generatedKnowledgeRequest";
import {
	answeredRelationKinds,
	knowledgeRequestComplete,
	missingKnowledgeRequest,
} from "../server/knowledgeCompletion";
import {
	addToDictionary,
	attempts,
	BANK_READING,
	generateWith,
	insertAccumulatedKnowledge,
	insertAttempt,
	type KnowledgeChange,
	logEvent,
	PRODUCTION_EVIDENCE,
	publish,
	publishArgs,
	publishSixtyPendingSynonyms,
	rows,
	schedule,
	seedDictionaryReading,
	seedOccurrence,
	seedSecondOccurrence,
} from "./knowledge-generation-fixtures";
import { createTestConvex } from "./support/convex";

beforeEach(() => {
	// Scheduling a Knowledge attempt queues its action; nothing here runs it.
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

test("an answered relation kind covers the request even with no stored target", async () => {
	const request = {
		definition: null,
		semanticRelations: { synonym: null, antonym: null },
	};
	const knowledge = { definition: "Ein Geldinstitut." };
	expect(
		knowledgeRequestComplete(
			{ knowledge, checkedRelationKinds: [] },
			request,
			[],
		),
	).toBe(false);
	expect(
		knowledgeRequestComplete(
			{ knowledge, checkedRelationKinds: ["synonym", "antonym"] },
			request,
			[],
		),
	).toBe(true);
	expect(
		missingKnowledgeRequest(request, {
			knowledge,
			checkedRelationKinds: ["synonym"],
		}),
	).toEqual({ semanticRelations: { antonym: null } });

	expect(answeredRelationKinds(["synonym", "antonym"], false, [])).toEqual(
		[],
	);
	expect(
		answeredRelationKinds(["synonym", "antonym"], true, [
			{ aspect: "semanticRelations", leaf: "antonym" },
		]),
	).toEqual(["synonym"]);
	expect(
		answeredRelationKinds(["synonym"], true, [
			{ aspect: "semanticRelations" },
		]),
	).toEqual([]);
});

test("recorded relation evidence lets a Reading whose relations live as edges reach Full", async () => {
	const t = createTestConvex();
	const occurrence = await seedDictionaryReading(t, {
		knowledge: { definition: "Ein Geldinstitut." },
	});
	await insertAccumulatedKnowledge(t, occurrence, {
		knowledge: { definition: "Ein Geldinstitut." },
		status: "Partial",
	});
	await t.run(async (ctx) => {
		const row = await ctx.db.query("accumulatedKnowledge").first();
		if (row)
			await ctx.db.patch(row._id, { checkedRelationKinds: ["synonym"] });
	});
	await insertAttempt(t, occurrence, "attempt-1");
	const evidence = {
		...PRODUCTION_EVIDENCE,
		request: { definition: null, semanticRelations: { synonym: null } },
	};

	await publish(
		t,
		publishArgs({ attemptKey: "attempt-1", productionEvidence: evidence }),
	);
	// Replacing the content keeps the evidence recorded beside it.
	expect((await rows(t, "accumulatedKnowledge"))[0]).toMatchObject({
		status: "Full",
		checkedRelationKinds: ["synonym"],
	});
});

test("a final publication skips what its run already published behind many earlier changes", async () => {
	const t = createTestConvex();
	const occurrence = await seedDictionaryReading(t);
	// Earlier attempts left more changes than one index page for this Reading.
	await t.run(async (ctx) => {
		for (let index = 0; index < 520; index++)
			await ctx.db.insert("knowledgeChanges", {
				knowledgeChangeKey: `earlier:1:1:${index}`,
				ownerReadingKey: occurrence.readingKey,
				change: {
					kind: "Contribute",
					aspect: "notes",
					value: `${index}`,
				},
				createdAt: 1,
			});
	});
	await insertAttempt(t, occurrence, "attempt-1");
	const definition = {
		kind: "Contribute",
		aspect: "definition",
		value: "Ein Geldinstitut.",
	};
	const transcription = {
		kind: "Contribute",
		aspect: "transcription",
		value: "baŋk",
	};
	expect(
		await publish(
			t,
			publishArgs({
				attemptKey: "attempt-1",
				final: false,
				changes: [definition],
			}),
		),
	).toEqual({ status: "Committed" });
	expect(
		await publish(
			t,
			publishArgs({
				attemptKey: "attempt-1",
				changes: [definition, transcription],
			}),
		),
	).toEqual({ status: "Committed" });

	const published = (await rows(t, "knowledgeChanges")).filter((row) =>
		row.knowledgeChangeKey.startsWith("attempt-1:"),
	);
	expect(
		published.map(({ knowledgeChangeKey, change }) => ({
			knowledgeChangeKey,
			change,
		})),
	).toEqual([
		{ knowledgeChangeKey: "attempt-1:1:1:0", change: definition },
		{ knowledgeChangeKey: "attempt-1:1:2:0", change: transcription },
	]);
	expect((await attempts(t))[0]).toMatchObject({ state: "Committed" });
});

test("a top-up that partly fails keeps a Full Reading Full for the next top-up", async () => {
	const t = createTestConvex();
	const knowledge = {
		definition: "Ein Geldinstitut.",
		translations: { en: ["bank"] },
	};
	const occurrence = await seedDictionaryReading(t, { knowledge });
	await insertAccumulatedKnowledge(t, occurrence, {
		knowledge,
		status: "Full",
		coveredTranslationLanguages: ["en"],
	});
	await insertAttempt(t, occurrence, "russian-top-up", {
		translationLanguages: ["ru"],
	});

	expect(
		await publish(
			t,
			publishArgs({
				attemptKey: "russian-top-up",
				productionEvidence: {
					request: { translations: { ru: null } },
					failures: [
						{
							aspect: "translations",
							leaf: "ru",
							code: "ProviderFailure",
							message: "offline",
						},
					],
					operationTraces: [],
				},
			}),
		),
	).toEqual({ status: "Committed" });
	expect((await rows(t, "accumulatedKnowledge"))[0]).toMatchObject({
		knowledge,
		status: "Full",
	});
	expect((await attempts(t))[0]).toMatchObject({
		state: "Failed",
		failureCode: "partialKnowledge",
	});

	jest.setSystemTime(Date.now() + KNOWLEDGE_RETRY_COOLDOWN_MS);
	await schedule(t, {
		attemptKey: "next-demand",
		visitorId: "visitor-1",
		readingId: occurrence.readingId,
		attestationId: occurrence.attestationId,
	});
	expect(
		await t.mutation(internal.knowledgeGeneration.begin, {
			attemptKey: "next-demand",
		}),
	).toEqual(
		expect.objectContaining({
			kind: "Generate",
			topUpOnly: true,
			translationLanguages: ["ru"],
		}),
	);
});

test("relation chunks split a Contribute by target and keep the rest of the Knowledge for the final one", async () => {
	const definition = { kind: "Contribute", aspect: "definition", value: "x" };
	const synonyms = {
		kind: "Contribute",
		aspect: "semanticRelations",
		relation: "synonym",
		value: ["a", "b", "c", "d", "e"],
	};
	const chunks: unknown[] = [];
	await publishInRelationChunks(
		{ changes: [definition, synonyms], pendingRelations: ["p", "q"] },
		async (chunk) => {
			chunks.push(chunk);
			return "Committed";
		},
		3,
	);
	expect(chunks).toEqual([
		{
			final: false,
			changes: [{ ...synonyms, value: ["a", "b", "c"] }],
			pendingRelations: [],
			proposed: [],
		},
		{
			final: false,
			changes: [{ ...synonyms, value: ["d", "e"] }],
			pendingRelations: ["p"],
			proposed: ["p"],
		},
		{
			final: true,
			changes: [definition],
			pendingRelations: ["q"],
			proposed: ["p", "q"],
		},
	]);

	// Within the budget the publication stays whole.
	const whole: unknown[] = [];
	await publishInRelationChunks(
		{ changes: [definition, synonyms], pendingRelations: [] },
		async (chunk) => {
			whole.push(chunk);
			return "Committed";
		},
	);
	expect(whole).toEqual([
		{
			final: true,
			changes: [definition, synonyms],
			pendingRelations: [],
			proposed: [],
		},
	]);
});

test("a final publication with more relations than one plan commits them all in chunks", async () => {
	const statuses = await publishSixtyPendingSynonyms();
	expect(statuses.every((status) => status === "Committed")).toBe(true);
});

test("a chunk whose plan exceeds the cap writes nothing and is split until every part commits", async () => {
	// An estimate loose enough to send all 60 proposals at once.
	const statuses = await publishSixtyPendingSynonyms(1_000);
	expect(statuses[0]).toBe("OverBudget");
});

test("relation chunks halve an OverBudget chunk and keep the rest of the Knowledge for the last part", async () => {
	const definition = { kind: "Contribute", aspect: "definition", value: "x" };
	const synonyms = {
		kind: "Contribute",
		aspect: "semanticRelations",
		relation: "synonym",
		value: ["a", "b", "c"],
	};
	const sent: unknown[] = [];
	await publishInRelationChunks(
		{ changes: [definition, synonyms], pendingRelations: ["p"] },
		async (chunk) => {
			const units =
				chunk.pendingRelations.length +
				chunk.changes.reduce(
					(total: number, change) =>
						total +
						(change === definition
							? 0
							: (change as typeof synonyms).value.length),
					0,
				);
			// This planner fits two relation units in one commit.
			if (units > 2) return "OverBudget";
			sent.push(chunk);
			return "Committed";
		},
		10,
	);
	expect(sent).toEqual([
		{
			final: false,
			changes: [{ ...synonyms, value: ["a", "b"] }],
			pendingRelations: [],
			proposed: [],
		},
		{
			final: false,
			changes: [{ ...synonyms, value: ["c"] }],
			pendingRelations: [],
			proposed: [],
		},
		{
			final: true,
			changes: [definition],
			pendingRelations: ["p"],
			proposed: ["p"],
		},
	]);

	await expect(
		publishInRelationChunks(
			{ changes: [synonyms], pendingRelations: [] },
			async () => "OverBudget",
		),
	).rejects.toThrow("cannot be split");
});

test("a rejected dictionary plan fails the final publication without recording changes", async () => {
	const t = createTestConvex();
	// The attempt's Reading is not in the dictionary, so planning is rejected.
	const occurrence = await seedOccurrence(t);
	await insertAccumulatedKnowledge(t, occurrence, {
		knowledge: { definition: "partial" },
		status: "Partial",
	});
	await insertAttempt(t, occurrence, "attempt-1");
	const result = await publish(
		t,
		publishArgs({
			attemptKey: "attempt-1",
			changes: [
				{
					kind: "Contribute",
					aspect: "definition",
					value: "Ein Geldinstitut.",
				},
			],
		}),
	);
	expect(result).toMatchObject({ status: "Rejected" });
	expect((await rows(t, "accumulatedKnowledge"))[0]).toMatchObject({
		knowledge: { definition: "partial" },
		status: "Partial",
	});
	expect((await attempts(t))[0]).toMatchObject({
		state: "Failed",
		failureCode: "generationFailed",
	});
	expect(await rows(t, "knowledgeChanges")).toEqual([]);
	expect(await publish(t, publishArgs({ attemptKey: "attempt-1" }))).toEqual({
		status: "Ignored",
	});
});

test("Knowledge settings default enabled and persist independently per visitor", async () => {
	const t = createTestConvex();
	const defaults = defaultKnowledgeSettings();
	expect(defaults.semanticRelations.nearAntonym).toBe(true);
	expect(defaults.translations).toEqual({ en: true, ru: true });
	expect(
		await t.query(api.knowledgeSettings.get, { visitorId: "visitor-1" }),
	).toEqual(defaults);
	const hiddenDefinition = { ...defaults, definition: false };
	expect(
		await t.mutation(api.knowledgeSettings.update, {
			visitorId: "visitor-1",
			settings: hiddenDefinition,
		}),
	).toEqual(hiddenDefinition);
	expect(
		await t.query(api.knowledgeSettings.get, { visitorId: "visitor-1" }),
	).toEqual(hiddenDefinition);
	expect(
		await t.query(api.knowledgeSettings.get, { visitorId: "visitor-2" }),
	).toEqual(defaults);

	expect(generationRequestFor(BANK_READING, []).definition).toBeNull();
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

test.each([false, true])(
	"partial generation commits valid changes and retains its final trace (incremental=%s)",
	async (incremental) => {
		const t = createTestConvex();
		const occurrence = await seedDictionaryReading(t);
		await insertAttempt(t, occurrence, "partial");
		const change = {
			kind: "Contribute",
			aspect: "definition",
			value: "Ein Geldinstitut.",
		};
		const evidence = {
			request: { definition: null, translations: { ru: null } },
			failures: [
				{
					aspect: "translations",
					leaf: "ru",
					code: "ProviderFailure",
					message: "offline",
				},
			],
			operationTraces: [
				JSON.stringify({
					operation: "produceKnowledge",
					outcome: "Partial",
					calls: [],
				}),
			],
		};
		if (incremental) {
			const intermediate = publishArgs({
				attemptKey: "partial",
				final: false,
				changes: [change],
				productionEvidence: {
					...evidence,
					failures: [],
					operationTraces: [],
				},
			});
			expect(await publish(t, intermediate)).toEqual({
				status: "Committed",
			});
			expect((await rows(t, "accumulatedKnowledge"))[0]).toMatchObject({
				knowledge: { definition: "Ein Geldinstitut." },
				status: "Partial",
			});
			expect((await attempts(t))[0]).toMatchObject({
				state: "Running",
				publicationSequence: 1,
			});
			expect(await rows(t, "knowledgeProductionRuns")).toEqual([]);
			// A repeated contribution is deduplicated by content, not by sequence.
			expect(await publish(t, intermediate)).toEqual({
				status: "Committed",
			});
			expect(await rows(t, "knowledgeChanges")).toHaveLength(1);
			expect(
				await publish(t, {
					...intermediate,
					relationPublication: {
						...intermediate.relationPublication,
						runNumber: 999,
					},
				}),
			).toEqual({ status: "Ignored" });
			expect(await rows(t, "knowledgeChanges")).toHaveLength(1);
		}
		const result = await publish(
			t,
			publishArgs({
				attemptKey: "partial",
				changes: [change],
				productionEvidence: evidence,
			}),
		);
		expect(result.status).toBe("Committed");
		expect(await rows(t, "knowledgeChanges")).toHaveLength(1);
		expect((await rows(t, "accumulatedKnowledge"))[0]).toMatchObject({
			status: "Partial",
			knowledge: { definition: "Ein Geldinstitut." },
			coveredTranslationLanguages: [],
		});
		expect((await attempts(t))[0]).toMatchObject({
			state: "Failed",
			failureCode: "partialKnowledge",
		});
		expect((await rows(t, "knowledgeProductionRuns"))[0]).toMatchObject({
			outcome: "Partial",
			evidence,
		});
	},
);

test("a run's origin is New for the Reading's first occurrence and TopUp for a later one (#677, #883 point 5)", async () => {
	const t = createTestConvex();
	const first = await seedDictionaryReading(t);
	const second = await seedSecondOccurrence(t, first);
	await insertAttempt(t, first, "first", { state: "Scheduled" });
	expect(
		await t.mutation(internal.knowledgeGeneration.begin, {
			attemptKey: "first",
		}),
	).toEqual(expect.objectContaining({ kind: "Generate", origin: "New" }));
	await insertAttempt(t, second, "second", { state: "Scheduled" });
	expect(
		await t.mutation(internal.knowledgeGeneration.begin, {
			attemptKey: "second",
		}),
	).toEqual(expect.objectContaining({ kind: "Generate", origin: "TopUp" }));
});
