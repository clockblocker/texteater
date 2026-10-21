import { afterEach, beforeEach, expect, jest, test } from "bun:test";
import { internal } from "../convex/_generated/api";
import {
	effectiveRelationPublicationPolicy,
	generatedKnowledgeAllowedForPublication,
} from "../convex/model/generatedKnowledgeContainment";
import {
	KNOWLEDGE_RETRY_COOLDOWN_MS,
	STALE_KNOWLEDGE_RUN_AFTER_MS,
} from "../convex/model/knowledgeAttempts";
import { generationRequestFor } from "../server/generatedKnowledgeRequest";
import { missingKnowledgeRequest } from "../server/knowledgeCompletion";
import {
	attempts,
	BANK_READING,
	BANK_READING_KEY,
	EMPTY_RELATION_RUN,
	insertAccumulatedKnowledge,
	insertAttempt,
	type Occurrence,
	publish,
	publishArgs,
	queued,
	rows,
	schedule,
	scheduledAttempts,
	scheduledWatchdogs,
	seedDictionaryReading,
	seedOccurrence,
	stubProvider,
} from "./knowledge-generation-fixtures";
import { createTestConvex } from "./support/convex";

beforeEach(() => {
	// Scheduling a Knowledge attempt queues its action; nothing here runs it.
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

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

test("production publication remains empty without a reviewed verdict", () => {
	expect(effectiveRelationPublicationPolicy()).toMatchObject({
		artifactPath: null,
		qualifiedKinds: [],
		invalidationReasons: ["missingReviewedVerdictArtifact"],
	});
	const publishable = generatedKnowledgeAllowedForPublication({
		changes: [
			{
				kind: "Contribute",
				aspect: "transcription",
				value: "bank",
			},
			{
				kind: "Contribute",
				aspect: "semanticRelations",
				relation: "synonym",
				value: [],
			},
			{
				kind: "Contribute",
				aspect: "definition",
				value: "Ein Geldinstitut.",
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
	});

	expect(publishable).toEqual({
		changes: [
			{
				kind: "Contribute",
				aspect: "transcription",
				value: "bank",
			},
			{
				kind: "Contribute",
				aspect: "definition",
				value: "Ein Geldinstitut.",
			},
		],
		pendingRelations: [],
	});
});

test("the production application path keeps generated relations outside Dumdict", async () => {
	const t = createTestConvex();
	const occurrence = await seedDictionaryReading(t);
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
		}),
	);

	expect(result).toEqual({ status: "Committed" });
	expect(await rows(t, "knowledgeChanges")).toEqual([
		expect.objectContaining({
			knowledgeChangeKey: "attempt-1:1:1:0",
			change: {
				kind: "Contribute",
				aspect: "definition",
				value: "Ein Geldinstitut.",
			},
		}),
	]);
	expect(await rows(t, "pendingSemanticRelations")).toEqual([]);
	expect(await rows(t, "semanticRelationEdges")).toEqual([]);
	expect((await attempts(t))[0]).toMatchObject({
		state: "Committed",
		publicationSequence: 1,
	});
});

test("scheduling is exact, idempotent, skips Full, and retries Failed", async () => {
	const inputFor = (occurrence: Occurrence, attemptKey: string) => ({
		attemptKey,
		visitorId: "visitor-1",
		readingId: occurrence.readingId,
		attestationId: occurrence.attestationId,
	});

	const t = createTestConvex();
	const occurrence = await seedOccurrence(t);
	const input = inputFor(occurrence, "request-1");
	await schedule(t, input);
	await schedule(t, input);
	expect(await scheduledAttempts(t)).toEqual(queued("request-1"));
	expect(await attempts(t)).toEqual([
		expect.objectContaining({
			attemptKey: "request-1",
			ownerReadingKey: BANK_READING_KEY,
			state: "Scheduled",
		}),
	]);
	const loaded = await t.mutation(internal.knowledgeGeneration.begin, {
		attemptKey: "request-1",
	});
	expect(loaded).toEqual(
		expect.objectContaining({
			kind: "Generate",
			reading: expect.objectContaining({ emojiDescription: "🏦" }),
			encounter: expect.objectContaining({
				target: {
					family: "Lexeme",
					kind: "NOUN",
					memberSegmentIndices: [0],
				},
			}),
			attestation: expect.objectContaining({ unitKind: "Attestation" }),
		}),
	);
	expect(JSON.stringify(loaded)).toContain("Bank");
	expect(JSON.stringify(loaded)).toContain("am Fluss");

	const otherReadingId = await t.run((ctx) =>
		ctx.db.insert("readings", {
			readingKey: "reading-other",
			lemmaId: occurrence.lemmaId,
			emojiDescription: "🪑",
		}),
	);
	await expect(
		schedule(t, { ...input, readingId: otherReadingId }),
	).rejects.toThrow("exact saved occurrence");

	const full = createTestConvex();
	const fullOccurrence = await seedOccurrence(full);
	await insertAccumulatedKnowledge(full, fullOccurrence, {
		knowledge: { translations: { en: ["bank"], ru: ["банк"] } },
		status: "Full",
		coveredTranslationLanguages: ["en", "ru"],
	});
	await schedule(full, inputFor(fullOccurrence, "full-request"));
	expect(await scheduledAttempts(full)).toEqual([]);
	expect(await attempts(full)).toEqual([]);

	const supplement = createTestConvex();
	const supplementOccurrence = await seedOccurrence(supplement);
	await insertAccumulatedKnowledge(supplement, supplementOccurrence, {
		knowledge: { translations: { en: ["bank"] } },
		status: "Full",
		coveredTranslationLanguages: ["en"],
	});
	await schedule(
		supplement,
		inputFor(supplementOccurrence, "russian-supplement"),
	);
	expect(
		await supplement.mutation(internal.knowledgeGeneration.begin, {
			attemptKey: "russian-supplement",
		}),
	).toEqual(
		expect.objectContaining({
			kind: "Generate",
			translationLanguages: ["ru"],
			topUpOnly: true,
			government: [],
		}),
	);

	const retry = createTestConvex();
	const retryOccurrence = await seedOccurrence(retry);
	await retry.run((ctx) =>
		ctx.db.insert("visitorEncounters", {
			requestId: "click-request",
			visitorId: "visitor-1",
			scrollId: retryOccurrence.scrollId,
			sentenceId: retryOccurrence.sentenceId,
			segmentId: retryOccurrence.segmentId,
			attestationId: retryOccurrence.attestationId,
			encounteredAt: 1,
		}),
	);
	await insertAttempt(retry, retryOccurrence, "retry-request", {
		state: "Failed",
		failureCode: "generationFailed",
		failureMessage: "Knowledge generation failed. Please retry.",
	});
	await retry.mutation(internal.knowledgeGeneration.retry, {
		attemptKey: "retry-request",
		visitorId: "visitor-1",
		readingId: retryOccurrence.readingId,
		attestationId: retryOccurrence.attestationId,
	});
	expect(await scheduledAttempts(retry)).toEqual(queued("retry-request"));
	const [retried] = await attempts(retry);
	expect(retried).toEqual(expect.objectContaining({ state: "Scheduled" }));
	expect(retried).not.toHaveProperty("failureMessage");
});

test("a repeated demand reruns a Failed attempt only after its cooldown, unless it was interrupted", async () => {
	const demandAgain = async (failureCode: string) => {
		const t = createTestConvex();
		const occurrence = await seedOccurrence(t);
		await insertAttempt(t, occurrence, "failed", {
			state: "Failed",
			failureCode,
			failureMessage: "Knowledge generation failed. Please retry.",
			createdAt: Date.now(),
		});
		await schedule(t, {
			attemptKey: "failed",
			visitorId: "visitor-1",
			readingId: occurrence.readingId,
			attestationId: occurrence.attestationId,
		});
		return t;
	};

	const failed = await demandAgain("generationFailed");
	expect(await scheduledAttempts(failed)).toEqual([]);
	expect((await attempts(failed))[0]).toMatchObject({ state: "Failed" });

	jest.setSystemTime(Date.now() + KNOWLEDGE_RETRY_COOLDOWN_MS);
	const [attempt] = await attempts(failed);
	if (!attempt) throw new Error("Expected the Failed attempt.");
	await schedule(failed, {
		attemptKey: "failed",
		visitorId: "visitor-1",
		readingId: attempt.readingId,
		attestationId: attempt.attestationId,
	});
	expect(await scheduledAttempts(failed)).toEqual(queued("failed"));
	expect((await attempts(failed))[0]).toMatchObject({ state: "Scheduled" });

	const interrupted = await demandAgain("interrupted");
	expect(await scheduledAttempts(interrupted)).toEqual(queued("failed"));
	expect((await attempts(interrupted))[0]).toMatchObject({
		state: "Scheduled",
	});
});

test("a second Knowledge demand for the same Reading waits for the active attempt", async () => {
	const t = createTestConvex();
	const occurrence = await seedOccurrence(t);
	const input = {
		visitorId: "visitor-1",
		readingId: occurrence.readingId,
		attestationId: occurrence.attestationId,
	};

	await schedule(t, { ...input, attemptKey: "resolution-request" });
	await schedule(t, { ...input, attemptKey: "coverage-request" });

	expect(await scheduledAttempts(t)).toEqual(queued("resolution-request"));
	expect(await attempts(t)).toEqual([
		expect.objectContaining({
			attemptKey: "resolution-request",
			state: "Scheduled",
		}),
		expect.objectContaining({
			attemptKey: "coverage-request",
			state: "Waiting",
		}),
	]);
});

test("settling an active Knowledge attempt schedules the next waiting demand", async () => {
	const settle = async (failureCode: string) => {
		const t = createTestConvex();
		const occurrence = await seedOccurrence(t);
		await insertAttempt(t, occurrence, "resolution-request");
		await insertAttempt(t, occurrence, "coverage-request", {
			state: "Waiting",
			createdAt: 2,
		});
		await t.mutation(internal.knowledgeGeneration.fail, {
			attemptKey: "resolution-request",
			runNumber: 1,
			failureCode,
			failureMessage: "failed",
		});
		return t;
	};

	// An interrupted run never reached the model, so the next demand starts.
	const interrupted = await settle("interrupted");
	expect(await scheduledAttempts(interrupted)).toEqual(
		queued("coverage-request"),
	);
	expect(await attempts(interrupted)).toEqual([
		expect.objectContaining({
			attemptKey: "resolution-request",
			state: "Failed",
		}),
		expect.objectContaining({
			attemptKey: "coverage-request",
			state: "Scheduled",
		}),
	]);

	// Any other failure holds the next demand until the cooldown ends.
	const failed = await settle("generationFailed");
	expect(await scheduledAttempts(failed)).toEqual([]);
	expect((await attempts(failed))[1]).toMatchObject({ state: "Waiting" });
	const promotions = (
		await failed.run((ctx) =>
			ctx.db.system.query("_scheduled_functions").collect(),
		)
	).filter(({ name }) => name === "knowledgeGeneration:promoteWaiting");
	expect(promotions).toEqual([
		expect.objectContaining({
			args: [{ ownerReadingKey: BANK_READING_KEY }],
			scheduledTime: Date.now() + KNOWLEDGE_RETRY_COOLDOWN_MS,
		}),
	]);

	jest.setSystemTime(Date.now() + KNOWLEDGE_RETRY_COOLDOWN_MS);
	await failed.mutation(internal.knowledgeGeneration.promoteWaiting, {
		ownerReadingKey: BANK_READING_KEY,
	});
	expect(await scheduledAttempts(failed)).toEqual(queued("coverage-request"));
	expect((await attempts(failed))[1]).toMatchObject({ state: "Scheduled" });
});

test("a Reading cooling down after a failure starts no run for a demand under any attemptKey", async () => {
	const t = createTestConvex();
	const occurrence = await seedOccurrence(t);
	await insertAttempt(t, occurrence, "first-click", {
		state: "Failed",
		failureCode: "generationFailed",
		failureMessage: "Knowledge generation failed. Please retry.",
		createdAt: Date.now(),
	});
	const demand = (attemptKey: string) =>
		schedule(t, {
			attemptKey,
			visitorId: "visitor-2",
			readingId: occurrence.readingId,
			attestationId: occurrence.attestationId,
		});

	// A new click and a changed language set each bring a fresh key.
	await demand("second-click");
	await demand("coverage:click:en,ru");
	expect(await scheduledAttempts(t)).toEqual([]);
	expect((await attempts(t)).map(({ attemptKey }) => attemptKey)).toEqual([
		"first-click",
	]);

	jest.setSystemTime(Date.now() + KNOWLEDGE_RETRY_COOLDOWN_MS);
	await demand("third-click");
	expect(await scheduledAttempts(t)).toEqual(queued("third-click"));
});

test("a late action cannot end the run that replaced it", async () => {
	const t = createTestConvex();
	const occurrence = await seedOccurrence(t);
	await insertAttempt(t, occurrence, "attempt-1", { runNumber: 2 });
	const failure = {
		attemptKey: "attempt-1",
		failureCode: "generationFailed",
		failureMessage: "failed",
	};

	// Run 1's action, and an action that never claimed a run, come back late.
	await t.mutation(internal.knowledgeGeneration.fail, {
		...failure,
		runNumber: 1,
	});
	await t.mutation(internal.knowledgeGeneration.fail, {
		...failure,
		runNumber: null,
	});
	await t.mutation(internal.catalogGrowthSignals.recordKnowledgeCatalogMiss, {
		attemptKey: "attempt-1",
		runNumber: 1,
		miss: {
			decision: "CatalogMiss",
			route: "de/Lexeme/NOUN",
			stage: "produceKnowledge",
			message: "No reviewed member matches",
		},
	});
	expect(
		await publish(
			t,
			publishArgs({
				attemptKey: "attempt-1",
				relationPublication: { ...EMPTY_RELATION_RUN, runNumber: 1 },
			}),
		),
	).toEqual({ status: "Ignored" });
	// Only a Scheduled attempt has a run to claim.
	expect(
		await t.mutation(internal.knowledgeGeneration.begin, {
			attemptKey: "attempt-1",
		}),
	).toBe(null);
	expect(await attempts(t)).toEqual([
		expect.objectContaining({ state: "Running", runNumber: 2 }),
	]);
	expect(await rows(t, "catalogGrowthSignals")).toEqual([]);

	await t.mutation(internal.knowledgeGeneration.fail, {
		...failure,
		runNumber: 2,
	});
	expect(await attempts(t)).toEqual([
		expect.objectContaining({ state: "Failed", runNumber: 2 }),
	]);
});

test("a run whose action died fails as interrupted, starts the next demand, and retries", async () => {
	const t = createTestConvex();
	const occurrence = await seedOccurrence(t);
	await t.run((ctx) =>
		ctx.db.insert("visitorEncounters", {
			requestId: "click-request",
			visitorId: "visitor-1",
			scrollId: occurrence.scrollId,
			sentenceId: occurrence.sentenceId,
			segmentId: occurrence.segmentId,
			attestationId: occurrence.attestationId,
			encounteredAt: 1,
		}),
	);
	const input = {
		visitorId: "visitor-1",
		readingId: occurrence.readingId,
		attestationId: occurrence.attestationId,
	};
	await schedule(t, { ...input, attemptKey: "stuck" });
	await schedule(t, { ...input, attemptKey: "behind" });
	expect(await scheduledWatchdogs(t)).toEqual([
		{ attemptKey: "stuck", runNumber: 1 },
	]);
	await t.mutation(internal.knowledgeGeneration.begin, {
		attemptKey: "stuck",
	});

	// A run still inside an action's lifetime is left alone and checked again.
	expect(
		await t.mutation(internal.knowledgeGeneration.recoverStaleRun, {
			attemptKey: "stuck",
			runNumber: 1,
		}),
	).toBe(false);
	expect(await scheduledWatchdogs(t)).toHaveLength(2);

	jest.setSystemTime(Date.now() + STALE_KNOWLEDGE_RUN_AFTER_MS);
	expect(
		await t.mutation(internal.knowledgeGeneration.recoverStaleRun, {
			attemptKey: "stuck",
			runNumber: 1,
		}),
	).toBe(true);
	expect(await attempts(t)).toEqual([
		expect.objectContaining({
			attemptKey: "stuck",
			state: "Failed",
			failureCode: "interrupted",
		}),
		expect.objectContaining({ attemptKey: "behind", state: "Scheduled" }),
	]);
	expect(await scheduledAttempts(t)).toEqual(queued("stuck", "behind"));

	// The dead action's own late failure no longer owns the attempt.
	await t.mutation(internal.knowledgeGeneration.fail, {
		attemptKey: "stuck",
		runNumber: 1,
		failureCode: "generationFailed",
		failureMessage: "failed",
	});
	expect((await attempts(t))[0]).toMatchObject({
		failureCode: "interrupted",
	});

	await t.mutation(internal.knowledgeGeneration.retry, {
		...input,
		attemptKey: "stuck",
	});
	expect((await attempts(t))[0]).toMatchObject({ state: "Waiting" });
});
