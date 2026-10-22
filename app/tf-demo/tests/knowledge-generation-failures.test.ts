import { afterEach, beforeEach, expect, jest, spyOn, test } from "bun:test";
import {
	type DefaultFunctionArgs,
	type FunctionReference,
	getFunctionName,
} from "convex/server";
import * as Effect from "effect/Effect";
import { internal } from "../convex/_generated/api";
import { STALE_KNOWLEDGE_RUN_AFTER_MS } from "../convex/model/knowledgeAttempts";
import { replaceAccumulatedKnowledge } from "../convex/model/shadows";
import type { KnowledgeProduction } from "../server/knowledgeProduction";
import { actionContext, createTestConvex } from "./support/convex";
import {
	attempts,
	EMPTY_RELATION_RUN,
	generateWith,
	insertAccumulatedKnowledge,
	insertAttempt,
	interceptPublish,
	logEvent,
	publish,
	publishArgs,
	queued,
	rows,
	schedule,
	scheduledAttempts,
	scheduledWatchdogs,
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

test("manual writes never downgrade Full and failures persist only a safe category", async () => {
	const t = createTestConvex();
	const occurrence = await seedOccurrence(t);
	await insertAccumulatedKnowledge(t, occurrence, {
		knowledge: { definition: "winner" },
		status: "Full",
	});
	await insertAttempt(t, occurrence, "attempt-1");
	await t.run((ctx) =>
		replaceAccumulatedKnowledge(ctx, occurrence.readingKey, {
			definition: "manual",
		}),
	);
	await t.mutation(internal.knowledgeGeneration.fail, {
		attemptKey: "attempt-1",
		runNumber: 1,
		failureCode: "providerPayload",
		failureMessage: "secret provider response",
	});
	expect((await rows(t, "accumulatedKnowledge"))[0]).toMatchObject({
		knowledge: { definition: "manual" },
		status: "Full",
	});
	expect((await attempts(t))[0]).toMatchObject({
		state: "Failed",
		failureMessage: "Knowledge generation failed. Please retry.",
	});
});

test("a publication rejected after production keeps the run's aspect failures in its failure evidence", async () => {
	const t = createTestConvex();
	const occurrence = await seedDictionaryReading(t);
	await insertAttempt(t, occurrence, "rejected", { state: "Scheduled" });
	const logged: unknown[] = [];
	const errors = spyOn(console, "error").mockImplementation((message) => {
		logged.push(logEvent(message));
	});
	const failures: KnowledgeProduction["failures"] = [
		{
			aspect: "translations",
			leaf: "ru",
			code: "ProviderFailure",
			message: "offline",
		},
	];
	try {
		await generateWith(
			t,
			"rejected",
			() =>
				Effect.succeed({
					failures,
					changes: [
						{
							kind: "Contribute",
							aspect: "definition",
							value: "Ein Geldinstitut.",
						},
					],
					pendingRelations: [],
				}),
			interceptPublish(t, async () => ({
				status: "Rejected",
				message: "Generated Knowledge could not be planned.",
			})),
		);
	} finally {
		errors.mockRestore();
	}
	expect((await attempts(t))[0]).toMatchObject({
		state: "Failed",
		failureCode: "generationFailed",
	});
	expect((await rows(t, "knowledgeProductionRuns"))[0]).toMatchObject({
		outcome: "Failure",
		evidence: { failures },
	});
	expect(logged).toEqual([
		expect.objectContaining({
			event: "KnowledgeGenerationFailed",
			attemptKey: "rejected",
			runNumber: 1,
			phase: "Publish",
			errorName: "KnowledgePublicationRejected",
		}),
	]);
});

test("a failure recording that throws is logged as a structured line and leaves the run to the stale-run watchdog (#1032)", async () => {
	const t = createTestConvex();
	const occurrence = await seedDictionaryReading(t);
	await insertAttempt(t, occurrence, "unrecorded", { state: "Scheduled" });
	const logged: unknown[] = [];
	const errors = spyOn(console, "error").mockImplementation((message) => {
		logged.push(logEvent(message));
	});
	const context = actionContext(t);
	const failingRecording = {
		...context,
		runMutation: (
			reference: FunctionReference<"mutation", "internal">,
			args: DefaultFunctionArgs,
		) =>
			getFunctionName(reference) ===
			getFunctionName(internal.knowledgeGeneration.fail)
				? Promise.reject(new Error("secret recording failure"))
				: context.runMutation(reference, args),
	};
	try {
		await expect(
			generateWith(
				t,
				"unrecorded",
				() => Effect.die(new Error("offline")),
				failingRecording,
			),
		).resolves.toBeNull();
	} finally {
		errors.mockRestore();
	}
	expect(logged).toEqual([
		expect.objectContaining({ event: "KnowledgeGenerationFailed" }),
		{
			event: "KnowledgeFailureRecordingFailed",
			attemptKey: "unrecorded",
			runNumber: 1,
			phase: "Produce",
			recordingFailure: {
				errorName: "Error",
				errorFingerprint: expect.stringMatching(/^fnv1a-/),
			},
			// Logged under the run's span, after its hop failed.
			span: {
				name: "Generate and publish Knowledge",
				id: expect.any(String),
			},
		},
	]);
	expect(JSON.stringify(logged)).not.toContain("secret recording failure");
	expect((await attempts(t))[0]).toMatchObject({
		state: "Running",
		runNumber: 1,
	});
	expect(await rows(t, "knowledgeProductionRuns")).toEqual([]);
});

test("an interrupted run records no failure and leaves the run to the stale-run watchdog", async () => {
	const t = createTestConvex();
	const occurrence = await seedDictionaryReading(t);
	await insertAttempt(t, occurrence, "interrupted", { state: "Scheduled" });
	const errors = spyOn(console, "error").mockImplementation(() => {});
	try {
		await expect(
			generateWith(t, "interrupted", () => Effect.interrupt),
		).rejects.toBeDefined();
		expect(errors).not.toHaveBeenCalled();
	} finally {
		errors.mockRestore();
	}
	expect((await attempts(t))[0]).toMatchObject({
		state: "Running",
		runNumber: 1,
	});
	expect(await rows(t, "knowledgeProductionRuns")).toEqual([]);
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

test("a run whose every failure is a Catalog Miss records a growth signal and fails as catalogMiss (#883 point 8)", async () => {
	const t = createTestConvex();
	const occurrence = await seedDictionaryReading(t);
	await insertAttempt(t, occurrence, "miss", { state: "Scheduled" });
	await generateWith(t, "miss", () =>
		Effect.succeed({
			changes: [],
			pendingRelations: [],
			failures: [
				{
					aspect: "definition",
					code: "CatalogMiss",
					message:
						"The authored NOUN Bank has no reviewed definition",
				},
			],
		}),
	);
	expect(await rows(t, "catalogGrowthSignals")).toHaveLength(1);
	expect((await attempts(t))[0]).toMatchObject({
		state: "Failed",
		failureCode: "catalogMiss",
	});
});
