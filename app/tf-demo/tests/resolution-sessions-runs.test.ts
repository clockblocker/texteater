import { afterEach, beforeEach, describe, expect, jest, test } from "bun:test";
import { api, internal } from "../convex/_generated/api";
import {
	MAX_RESOLUTION_RUNS,
	STALE_RUN_AFTER_MS,
} from "../server/resolutionLifecycle";
import { createTestConvex, submitText } from "./support/convex";
import { enableDeploymentFlags } from "./support/deploymentFlags";
import {
	bankOccurrenceCommit,
	commitBankOccurrence,
	dieBankenOccurrenceCommit,
	startSession,
} from "./support/occurrences";
import {
	bankenSource,
	bankGrammar,
	commitProgress,
	grammarProjection,
	patchSession,
	pendingScheduled,
	readingProjection,
	rows,
	segmentState,
	session,
	startSessionGuard,
} from "./support/resolution-sessions";

enableDeploymentFlags();

beforeEach(() => {
	// Sessions schedule their runs; each test drives the run itself.
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

describe("Resolution Session", () => {
	test("completion accepts an Encounter first recorded by an earlier request", async () => {
		const t = createTestConvex();
		const { select, segmentId } = await bankenSource(t);
		// Both selections share one Visitor Encounter, recorded by the first (ADR-0002).
		const earlier = await startSession(t, select("request-earlier"));
		await t.mutation(internal.resolutionSessions.recordRunFailure, {
			guard: earlier,
			failure: {
				kind: "Internal",
				phase: "Grammar",
				diagnosticId: "diagnostic-earlier",
				errorName: "Error",
				errorFingerprint: "earlier",
			},
		});
		const later = await startSession(t, select("request-later"));
		const winner = await startSession(
			t,
			select("request-winner", "visitor-2"),
		);
		expect(await segmentState(t, segmentId)).toEqual({
			kind: "Active",
			activeSessionCount: 2,
		});
		const committed = await t.mutation(
			internal.persistence.persistResolvedClick,
			bankOccurrenceCommit(select("request-winner", "visitor-2"), winner),
		);
		if (committed.status !== "Committed")
			throw new Error("Expected a committed occurrence.");
		await t.mutation(internal.resolutionSessions.beginRun, {
			guard: later,
		});
		await t.mutation(internal.resolutionSessions.advance, {
			guard: later,
			progress: "GrammarAvailable",
			grammar: grammarProjection("loser"),
		});

		// The later run finds the committed membership and reuses it.
		expect(
			await t.mutation(internal.persistence.persistReusedResolvedClick, {
				...select("request-later"),
				sessionGuard: later,
				attestationId: committed.attestationId,
			}),
		).toMatchObject({
			status: "Reused",
			attestationId: committed.attestationId,
		});
		// Terminal convergence replaces the loser's provisional projections.
		expect(await session(t, "request-later")).toMatchObject({
			lifecycle: {
				state: "Terminal",
				progress: "Committing",
				outcome: "Complete",
			},
			readingId: committed.readingId,
			attestationId: committed.attestationId,
			grammar: { canonicalForm: "Bank" },
			reading: { emojiDescription: "🏦", canonicalForm: "Bank" },
		});
		expect(await segmentState(t, segmentId)).toBeNull();
	});

	test("a stale run rotates its token and is rescheduled", async () => {
		const t = createTestConvex();
		const { select, segmentId } = await bankenSource(t);
		const guard = await startSession(t, select("request-1"));
		await patchSession(t, "request-1", {
			lifecycle: {
				state: "Active",
				progress: "ReadingAvailable",
				activity: "Running",
			},
			updatedAt: Date.now() - STALE_RUN_AFTER_MS - 1,
		});

		expect(
			await t.mutation(internal.resolutionSessions.recoverStaleRun, {
				requestId: "request-1",
				runToken: guard.runToken,
			}),
		).toBe(true);

		const recovered = await session(t, "request-1");
		expect(recovered.runToken).not.toBe(guard.runToken);
		expect(recovered).toMatchObject({
			runNumber: 2,
			lifecycle: {
				state: "Active",
				activity: "Scheduled",
				progress: "ReadingAvailable",
			},
		});
		expect(await pendingScheduled(t)).toEqual(
			expect.arrayContaining([
				{
					name: "orchestration:runResolutionSession",
					args: {
						requestId: "request-1",
						runToken: recovered.runToken,
						segmentId,
					},
				},
			]),
		);
	});

	for (const budgetCase of ["run limit", "deadline"] as const) {
		test(`a stale run becomes permanent when its ${budgetCase} is exhausted`, async () => {
			const t = createTestConvex();
			const { select, segmentId } = await bankenSource(t);
			const guard = await startSession(t, select("request-1"));
			await t.mutation(internal.resolutionSessions.beginRun, { guard });
			const now = Date.now();
			await patchSession(t, "request-1", {
				runNumber: budgetCase === "run limit" ? MAX_RESOLUTION_RUNS : 1,
				retryDeadlineAt:
					budgetCase === "deadline" ? now - 1 : now + 60_000,
				lifecycle: {
					state: "Active",
					progress: "GrammarAvailable",
					activity: "Running",
				},
				updatedAt: now - STALE_RUN_AFTER_MS - 1,
			});
			const scheduledBefore = await pendingScheduled(t);

			expect(
				await t.mutation(internal.resolutionSessions.recoverStaleRun, {
					requestId: "request-1",
					runToken: guard.runToken,
				}),
			).toBe(true);

			expect(await pendingScheduled(t)).toEqual(scheduledBefore);
			const failed = await session(t, "request-1");
			expect(failed).toMatchObject({
				lifecycle: {
					state: "Terminal",
					outcome: "PermanentFailure",
					progress: "GrammarAvailable",
				},
				failureCode: "Internal",
				diagnosticId: expect.any(String),
			});
			expect(await rows(t, "resolutionRuns")).toEqual([
				expect.objectContaining({
					failureCode: "Internal",
					state: "Failed",
					diagnosticId: failed.diagnosticId,
				}),
			]);
			expect(await segmentState(t, segmentId)).toEqual({
				kind: "PermanentFailure",
			});
		});
	}

	test("a generation failure ends the session at once, even one the provider calls retryable", async () => {
		const t = createTestConvex();
		const { select, segmentId } = await bankenSource(t);
		const guard = await startSession(t, select("request-1"));
		await t.mutation(internal.resolutionSessions.beginRun, { guard });
		await t.mutation(internal.resolutionSessions.advance, {
			guard,
			progress: "GrammarAvailable",
			grammar: grammarProjection(),
		});
		const scheduledBefore = await pendingScheduled(t);
		const failure = {
			attempts: 3,
			category: "ProviderUnavailable" as const,
			providerRequestId: "provider-request-1",
			retryable: true,
			retryAfterMs: 120_000,
			status: 500,
		};

		await t.mutation(internal.resolutionSessions.recordRunFailure, {
			guard,
			failure: {
				kind: "Generation",
				phase: "Reading",
				failure,
				generationEvents: [
					{
						kind: "AttemptFailed",
						requestId: "request-1",
						runToken: guard.runToken,
						phase: "Reading",
						failure,
					},
				],
			},
		});

		const failed = await session(t, "request-1");
		expect(failed).toMatchObject({
			runToken: guard.runToken,
			lifecycle: {
				state: "Terminal",
				outcome: "PermanentFailure",
				progress: "GrammarAvailable",
			},
			failureCode: "ProviderUnavailable",
			failureMessage: "Reading generation is temporarily unavailable.",
			grammar: grammarProjection(),
			diagnosticId: expect.any(String),
		});
		expect(await rows(t, "resolutionRuns")).toEqual([
			expect.objectContaining({
				state: "Failed",
				failure: expect.objectContaining({
					category: "ProviderUnavailable",
					providerRequestId: "provider-request-1",
				}),
				generationEvents: [
					expect.objectContaining({
						kind: "AttemptFailed",
						runToken: guard.runToken,
					}),
				],
			}),
		]);
		expect(await pendingScheduled(t)).toEqual(scheduledBefore);
		expect(await segmentState(t, segmentId)).toEqual({
			kind: "PermanentFailure",
		});
	});

	test("an internal run failure ends the session with its diagnostic", async () => {
		const t = createTestConvex();
		const { select, segmentId } = await bankenSource(t);
		const guard = await startSession(t, select("request-1"));
		await t.mutation(internal.resolutionSessions.beginRun, { guard });

		await t.mutation(internal.resolutionSessions.recordRunFailure, {
			guard,
			failure: {
				kind: "Internal",
				phase: "Grammar",
				diagnosticId: "diagnostic-1",
				errorName: "TypeError",
				errorFingerprint: "fnv1a-1",
			},
		});

		expect(await session(t, "request-1")).toMatchObject({
			lifecycle: { state: "Terminal", outcome: "PermanentFailure" },
			failureCode: "Internal",
			diagnosticId: "diagnostic-1",
		});
		expect(await rows(t, "resolutionRuns")).toEqual([
			expect.objectContaining({
				state: "Failed",
				errorName: "TypeError",
				diagnosticId: "diagnostic-1",
			}),
		]);
		expect(await segmentState(t, segmentId)).toEqual({
			kind: "PermanentFailure",
		});
		// A late record from a run that no longer holds the session is a no-op.
		expect(
			await t.mutation(internal.resolutionSessions.recordRunFailure, {
				guard,
				failure: {
					kind: "Internal",
					phase: "Grammar",
					diagnosticId: "diagnostic-2",
					errorName: "TypeError",
					errorFingerprint: "fnv1a-1",
				},
			}),
		).toBe(false);
		expect(await session(t, "request-1")).toMatchObject({
			diagnosticId: "diagnostic-1",
		});
	});

	test("public failure projection omits operational provider diagnostics", async () => {
		const t = createTestConvex();
		const { select } = await bankenSource(t);
		const guard = await startSession(t, select("request-1"));
		await t.mutation(internal.resolutionSessions.recordRunFailure, {
			guard,
			failure: {
				kind: "Generation",
				phase: "Reading",
				failure: {
					attempts: 1,
					category: "ProviderUnavailable",
					providerRequestId: "provider-secret-reference",
					retryable: false,
				},
			},
		});
		const { diagnosticId } = await session(t, "request-1");
		if (diagnosticId === undefined)
			throw new Error("Expected the failure's diagnostic id.");

		const note = await t.query(api.resolutionSessions.getResolutionNote, {
			requestId: "request-1",
		});
		expect(note?.lifecycle).toEqual({
			state: "Terminal",
			progress: expect.any(String),
			outcome: "PermanentFailure",
			failureCode: "ProviderUnavailable",
			diagnosticId,
			message: "Reading generation is temporarily unavailable.",
		});
		expect(JSON.stringify(note)).not.toContain("provider-secret-reference");
	});

	test("an explicit retry reactivates a failed session through the one scheduling path", async () => {
		const t = createTestConvex();
		const { select, segmentId, sentenceId } = await bankenSource(t);
		await t.mutation(api.resolutionSessions.selectSegment, {
			...select("request-1"),
			inspect: true,
		});
		const guard = await startSessionGuard(t, "request-1");
		await t.mutation(internal.resolutionSessions.beginRun, { guard });
		await t.mutation(internal.resolutionSessions.advance, {
			guard,
			progress: "GrammarAvailable",
			grammar: grammarProjection(),
			grammaticalCheckpoint: bankGrammar(sentenceId),
		});
		await t.mutation(internal.resolutionSessions.recordRunFailure, {
			guard,
			failure: {
				kind: "Generation",
				phase: "Reading",
				failure: {
					attempts: 1,
					category: "ProviderUnavailable",
					retryable: false,
				},
			},
		});
		const failed = await session(t, "request-1");

		expect(
			await t.mutation(api.resolutionSessions.retryResolution, {
				requestId: "request-1",
				visitorId: "visitor-2",
			}),
		).toEqual({ retried: false });
		expect(
			await t.mutation(api.resolutionSessions.retryResolution, {
				requestId: "request-1",
				visitorId: "visitor-1",
			}),
		).toEqual({ retried: true });

		const retried = await session(t, "request-1");
		expect(retried).toMatchObject({
			lifecycle: {
				state: "Active",
				activity: "Scheduled",
				progress: "GrammarAvailable",
			},
			grammar: grammarProjection(),
			grammaticalCheckpoint: failed.grammaticalCheckpoint,
			runNumber: 1,
		});
		expect(retried.lifecycle).not.toHaveProperty("outcome");
		expect(retried).not.toHaveProperty("failureCode");
		expect(retried.runToken).not.toBe(guard.runToken);
		expect(await segmentState(t, segmentId)).toEqual({
			kind: "Active",
			activeSessionCount: 1,
		});
		// A restart keeps the inspection the Visitor asked for.
		expect(await pendingScheduled(t)).toEqual(
			expect.arrayContaining([
				{
					name: "orchestration:runResolutionSession",
					args: {
						requestId: "request-1",
						runToken: retried.runToken,
						segmentId,
						inspect: true,
					},
				},
			]),
		);
	});

	test("a retry starts no run while the Visitor's later click runs the Segment", async () => {
		const t = createTestConvex();
		const { select, segmentId } = await bankenSource(t);
		const failed = await startSession(t, select("request-1"));
		await t.mutation(internal.resolutionSessions.recordRunFailure, {
			guard: failed,
			failure: {
				kind: "Internal",
				phase: "Route",
				diagnosticId: "diagnostic-1",
				errorName: "Error",
				errorFingerprint: "fnv1a-1",
			},
		});
		await startSession(t, select("request-2"));

		expect(
			await t.mutation(api.resolutionSessions.retryResolution, {
				requestId: "request-1",
				visitorId: "visitor-1",
			}),
		).toEqual({ retried: false });

		expect(await session(t, "request-1")).toMatchObject({
			lifecycle: { state: "Terminal", outcome: "PermanentFailure" },
			runToken: failed.runToken,
		});
		expect(await segmentState(t, segmentId)).toEqual({
			kind: "Active",
			activeSessionCount: 1,
		});
		expect(
			(await pendingScheduled(t))
				.filter(
					({ name }) => name === "orchestration:runResolutionSession",
				)
				.map(({ args }) => args.requestId),
		).toEqual(["request-1", "request-2"]);
	});

	test("a retry after a commit conflict resolves again instead of replaying its checkpoints", async () => {
		const t = createTestConvex();
		const { sentenceIds } = await submitText(t, [
			["die", " ", "Banken", "."],
		]);
		const sentenceId = sentenceIds[0];
		if (!sentenceId) throw new Error("Expected a Sentence.");
		// visitor-1 proposes `die Banken` over Segments 0 and 2, but visitor-2
		// has committed `Banken` alone.
		const loser = {
			requestId: "request-1",
			visitorId: "visitor-1",
			sentenceId,
			clickedSegmentIndex: 0,
		};
		const guard = await startSession(t, loser);
		await commitBankOccurrence(t, {
			requestId: "request-winner",
			visitorId: "visitor-2",
			sentenceId,
			clickedSegmentIndex: 2,
		});
		await t.mutation(internal.resolutionSessions.beginRun, { guard });
		await t.mutation(internal.resolutionSessions.advance, {
			guard,
			progress: "GrammarAvailable",
			grammar: grammarProjection(),
			grammaticalCheckpoint: bankGrammar(sentenceId),
		});
		// The Reading and the run's record ride along with the commit.
		expect(
			await t.mutation(internal.persistence.persistResolvedClick, {
				...dieBankenOccurrenceCommit(loser, guard, [0, 2]),
				...commitProgress,
			}),
		).toMatchObject({ status: "MembershipConflict" });
		expect(await session(t, "request-1")).toMatchObject({
			lifecycle: {
				state: "Terminal",
				outcome: "PermanentFailure",
				progress: "ReadingAvailable",
			},
			failureCode: "MembershipConflict",
			reading: readingProjection(),
		});
		expect(await rows(t, "resolutionRuns")).toEqual([
			expect.objectContaining({ state: "Succeeded", phase: "Commit" }),
		]);

		expect(
			await t.mutation(api.resolutionSessions.retryResolution, {
				requestId: "request-1",
				visitorId: "visitor-1",
			}),
		).toEqual({ retried: true });

		const retried = await session(t, "request-1");
		expect(retried.lifecycle).toEqual({
			state: "Active",
			progress: "Starting",
			activity: "Scheduled",
		});
		for (const field of [
			"grammar",
			"reading",
			"grammaticalCheckpoint",
			"readingCheckpoint",
		])
			expect(retried).not.toHaveProperty(field);
		const claimed = await t.mutation(internal.resolutionSessions.beginRun, {
			guard: await startSessionGuard(t, "request-1"),
		});
		expect(claimed?.checkpoints).toEqual({});
	});

	test("a resolved commit saves its ReadingAvailable progress and the run's success in its own transaction", async () => {
		const t = createTestConvex();
		const { sentenceId, select } = await bankenSource(t);
		const guard = await startSession(t, select("request-1"));
		await t.mutation(internal.resolutionSessions.beginRun, { guard });
		await t.mutation(internal.resolutionSessions.advance, {
			guard,
			progress: "GrammarAvailable",
			grammar: grammarProjection(),
			grammaticalCheckpoint: bankGrammar(sentenceId),
		});
		expect(
			await t.mutation(internal.persistence.persistResolvedClick, {
				...bankOccurrenceCommit(select("request-1"), guard),
				...commitProgress,
			}),
		).toMatchObject({ status: "Committed" });
		expect(await session(t, "request-1")).toMatchObject({
			lifecycle: { state: "Terminal", outcome: "Complete" },
			readingCheckpoint:
				commitProgress.readingAvailable.readingCheckpoint,
		});
		expect(await rows(t, "resolutionRuns")).toEqual([
			expect.objectContaining({
				runToken: guard.runToken,
				state: "Succeeded",
				phase: "Commit",
				generationEvents: [],
			}),
		]);
	});
});
