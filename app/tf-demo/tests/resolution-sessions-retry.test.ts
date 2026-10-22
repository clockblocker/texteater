import { afterEach, beforeEach, describe, expect, jest, test } from "bun:test";
import { api, internal } from "../convex/_generated/api";
import { createTestConvex, submitText } from "./support/convex";
import { enableDeploymentFlags } from "./support/deploymentFlags";
import {
	commitBankOccurrence,
	dieBankenOccurrenceCommit,
	startSession,
} from "./support/occurrences";
import {
	bankenSource,
	bankGrammar,
	commitProgress,
	grammarProjection,
	pendingScheduled,
	readingProjection,
	rows,
	segmentState,
	session,
	startSessionGuard,
} from "./support/resolutionSessions";

enableDeploymentFlags();

beforeEach(() => {
	// Sessions schedule their runs; each test drives the run itself.
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

describe("Resolution Session", () => {
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
});
