import { afterEach, beforeEach, expect, jest, test } from "bun:test";
import { internal } from "../convex/_generated/api";
import { RELATION_PUBLICATION_FINGERPRINTS } from "../convex/model/generatedKnowledgeContainment";
import { KNOWLEDGE_RETRY_COOLDOWN_MS } from "../convex/model/knowledgeAttempts";
import { createTestConvex } from "./support/convex";
import {
	attempts,
	BANK_READING_KEY,
	insertAccumulatedKnowledge,
	insertAttempt,
	PRODUCTION_EVIDENCE,
	type PublishArgs,
	publish,
	publishArgs,
	rows,
	schedule,
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

test("existing requested content completes an empty generated batch and the first complete writer wins", async () => {
	const t = createTestConvex();
	const occurrence = await seedDictionaryReading(t, {
		knowledge: {
			definition: "canonical",
			translations: { en: ["bank"] },
		},
	});
	await insertAttempt(t, occurrence, "attempt-1");
	await insertAttempt(t, occurrence, "attempt-2");

	expect(await publish(t, publishArgs({ attemptKey: "attempt-1" }))).toEqual({
		status: "Committed",
	});
	expect(await publish(t, publishArgs({ attemptKey: "attempt-2" }))).toEqual({
		status: "AlreadyFull",
	});
	expect(await rows(t, "accumulatedKnowledge")).toEqual([
		expect.objectContaining({
			ownerReadingKey: BANK_READING_KEY,
			knowledge: {
				definition: "canonical",
				translations: { en: ["bank"] },
			},
			status: "Full",
		}),
	]);
	expect(await attempts(t)).toEqual([
		expect.objectContaining({
			attemptKey: "attempt-1",
			state: "Committed",
		}),
		expect.objectContaining({ attemptKey: "attempt-2", state: "LostRace" }),
	]);
});

test("commit-time relation blocking keeps base evidence and records publication failure", async () => {
	const t = createTestConvex();
	const occurrence = await seedDictionaryReading(t);
	await insertAttempt(t, occurrence, "attempt-1");
	const relationPublication: PublishArgs["relationPublication"] = {
		runNumber: 1,
		requestedKinds: ["synonym"],
		artifactPath: "gate/verdict.json",
		fingerprints: RELATION_PUBLICATION_FINGERPRINTS,
		proposals: [
			{
				relation: "synonym",
				targetShadow: {
					language: "de",
					family: "Lexeme",
					kind: "NOUN",
					canonicalForm: "Geldinstitut",
				},
			},
		],
	};
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
				{
					kind: "Contribute",
					aspect: "semanticRelations",
					relation: "synonym",
					value: [],
				},
			],
			pendingRelations: [
				{
					relation: "synonym",
					target: {
						language: "de",
						family: "Lexeme",
						kind: "NOUN",
						canonicalForm: "Geldinstitut",
					},
				},
			],
			relationPublication,
		}),
	);
	expect(result).toEqual({ status: "Committed" });
	// The blocked relation never reaches the dictionary: no pending Shadow, no edge.
	expect(await rows(t, "pendingSemanticRelations")).toEqual([]);
	expect(await rows(t, "knowledgeChanges")).toEqual([
		expect.objectContaining({
			change: expect.objectContaining({ aspect: "definition" }),
		}),
	]);
	expect((await rows(t, "readingEntries"))[0]?.record).toMatchObject({
		knowledge: { definition: "Ein Geldinstitut." },
	});
	expect(await rows(t, "generatedRelationRuns")).toEqual([
		expect.objectContaining({
			relation: "synonym",
			generatedTargets: 1,
			publicationFailures: 1,
			directMatches: 0,
			pendingShadows: 0,
		}),
	]);
	expect(await rows(t, "generatedRelationProposals")).toEqual([
		expect.objectContaining({ outcome: "PublicationFailed" }),
	]);
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
