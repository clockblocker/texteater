import { afterEach, beforeEach, describe, expect, jest, test } from "bun:test";
import { api, internal } from "../convex/_generated/api";
import crons from "../convex/crons";
import { RESOLUTION_RETENTION_MS } from "../server/resolutionLifecycle";
import { createTestConvex } from "./support/convex";
import { enableDeploymentFlags } from "./support/deploymentFlags";
import { commitBankOccurrence, startSession } from "./support/occurrences";
import {
	bankenSource,
	patchSession,
	pendingScheduled,
	rows,
	segmentState,
	session,
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
	test("cleanup removes stale active and old terminal sessions, even a completed one whose Reading vanished", async () => {
		const t = createTestConvex();
		const { select } = await bankenSource(t);
		await startSession(t, select("stale"));
		const failed = await startSession(t, select("failed", "visitor-2"));
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
		await commitBankOccurrence(t, select("complete-missing", "visitor-3"));
		const { readingId } = await session(t, "complete-missing");
		await t.run(async (ctx) => {
			if (readingId) await ctx.db.delete(readingId);
		});
		const old = Date.now() - 10_000;
		for (const requestId of ["stale", "failed", "complete-missing"])
			await patchSession(t, requestId, { updatedAt: old });

		const cutoffs = {
			staleBefore: Date.now() - 1,
			terminalBefore: Date.now() - 1,
		};

		// Active sessions go in one batch, Terminal ones in the next.
		expect(
			await t.mutation(internal.resolutionSessions.cleanup, cutoffs),
		).toEqual({ deleted: 1, hasMore: true });
		expect(
			await t.mutation(internal.resolutionSessions.cleanup, cutoffs),
		).toEqual({ deleted: 2, hasMore: false });
		expect(await rows(t, "resolutionSessions")).toEqual([]);
	});

	test("repeated cleanup removes every expired row, even past a batch of vanished Readings", async () => {
		const t = createTestConvex();
		const { select } = await bankenSource(t);
		await commitBankOccurrence(t, select("complete-missing"));
		// `Banken` is committed now, so the other sessions select `Die`.
		const onDie = (requestId: string, visitorId: string) => ({
			...select(requestId, visitorId),
			clickedSegmentIndex: 0,
		});
		await startSession(t, onDie("recent", "visitor-2"));
		const missing = await session(t, "complete-missing");
		const old = Date.now() - 10_000;
		await t.run(async (ctx) => {
			if (missing.readingId) await ctx.db.delete(missing.readingId);
			const { _id, _creationTime, ...row } = missing;
			for (let index = 0; index < 250; index += 1)
				await ctx.db.insert("resolutionSessions", {
					...row,
					requestId: `missing-${index}`,
					updatedAt: old - 1,
				});
			await ctx.db.patch(_id, { updatedAt: old });
		});
		const failed = await startSession(t, onDie("failed", "visitor-3"));
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
		await patchSession(t, "failed", { updatedAt: old });
		await t.run(async (ctx) => {
			for (const run of await ctx.db.query("resolutionRuns").collect())
				await ctx.db.patch(run._id, { expiresAt: old });
		});

		const cutoffs = {
			staleBefore: Date.now() - 5_000,
			terminalBefore: Date.now() - 5_000,
		};
		let batches = 0;
		while (
			(await t.mutation(internal.resolutionSessions.cleanup, cutoffs))
				.hasMore
		)
			if (++batches > 5) throw new Error("Cleanup made no progress.");

		expect(await rows(t, "resolutionRuns")).toEqual([]);
		expect(
			(await rows(t, "resolutionSessions")).map(
				({ requestId }) => requestId,
			),
		).toEqual(["recent"]);
	});

	test("repeated cleanup removes expired runs whose traces outgrow one transaction", async () => {
		const t = createTestConvex({ transactionLimits: true });
		const expiredAt = Date.now() - 1;
		// 120 runs of 200 KB are 24 MB, past the 16 MiB a transaction may read.
		const traceJson = "x".repeat(200 * 1024);
		for (let chunk = 0; chunk < 6; chunk += 1)
			await t.run(async (ctx) => {
				for (let index = 0; index < 20; index += 1) {
					const requestId = `request-${chunk}-${index}`;
					await ctx.db.insert("resolutionRuns", {
						requestId,
						runToken: "run-token",
						runNumber: 1,
						phase: "Route",
						state: "Failed",
						generationEvents: [
							{
								kind: "TraceRecorded",
								requestId,
								runToken: "run-token",
								phase: "Route",
								traceJson,
							},
						],
						startedAt: expiredAt,
						expiresAt: expiredAt,
					});
				}
			});

		const cutoffs = {
			staleBefore: Date.now() - 1,
			terminalBefore: Date.now() - 1,
		};
		let batches = 0;
		while (
			(await t.mutation(internal.resolutionSessions.cleanup, cutoffs))
				.hasMore
		)
			if (++batches > 20) throw new Error("Cleanup made no progress.");

		expect(await rows(t, "resolutionRuns")).toEqual([]);
	});

	test("scheduled cleanup continues until nothing expired is left", async () => {
		const t = createTestConvex();
		const { select } = await bankenSource(t);
		await startSession(t, select("recent"));
		const recent = await session(t, "recent");
		await t.run(async (ctx) => {
			const { _id, _creationTime, ...row } = recent;
			for (let index = 0; index < 201; index += 1)
				await ctx.db.insert("resolutionSessions", {
					...row,
					requestId: `expired-${index}`,
					lifecycle: {
						state: "Terminal",
						progress: "Starting",
						outcome: "Unresolved",
					},
					updatedAt: Date.now() - RESOLUTION_RETENTION_MS - 1,
				});
		});

		await t.mutation(internal.resolutionSessions.cleanupExpired, {});
		expect(await rows(t, "resolutionSessions")).toHaveLength(2);
		expect(
			(await pendingScheduled(t)).filter(
				({ name }) => name === "resolutionSessions:cleanupExpired",
			),
		).toHaveLength(1);
		await t.mutation(internal.resolutionSessions.cleanupExpired, {});
		expect(
			(await rows(t, "resolutionSessions")).map(
				({ requestId }) => requestId,
			),
		).toEqual(["recent"]);
		expect(crons.crons).toEqual({
			"clean up expired Resolution Sessions": expect.objectContaining({
				name: "resolutionSessions:cleanupExpired",
			}),
		});
	});

	test("cleanup ends Segment Resolution State once per deleted session", async () => {
		const t = createTestConvex();
		const { select, segmentId } = await bankenSource(t);
		await startSession(t, select("stale-1"));
		await startSession(t, select("stale-2", "visitor-2"));
		expect(await segmentState(t, segmentId)).toEqual({
			kind: "Active",
			activeSessionCount: 2,
		});
		const old = Date.now() - 10_000;
		for (const requestId of ["stale-1", "stale-2"])
			await patchSession(t, requestId, { updatedAt: old });

		await t.mutation(internal.resolutionSessions.cleanup, {
			staleBefore: Date.now() - 1,
			terminalBefore: Date.now() - 1,
		});

		expect(await rows(t, "resolutionSessions")).toEqual([]);
		expect(await segmentState(t, segmentId)).toEqual({
			kind: "PermanentFailure",
		});
	});

	test("strip, visitor clear, and full reset invalidate sessions before source writes", async () => {
		const stripped = createTestConvex();
		{
			const { select, segmentId, scrollId } =
				await bankenSource(stripped);
			await startSession(stripped, select("request-1"));
			const first = await stripped.mutation(
				internal.analysisStripping.stripScrollAnalysisGraphBatch,
				{ scrollId },
			);
			expect(first).toEqual({
				deleted: 1,
				hasMore: true,
				nextPosition: 0,
			});
			expect(await rows(stripped, "resolutionSessions")).toEqual([]);
			expect(await segmentState(stripped, segmentId)).toEqual({
				kind: "PermanentFailure",
			});
		}

		const cleared = createTestConvex();
		{
			const { select, segmentId } = await bankenSource(cleared);
			await startSession(cleared, select("request-1"));
			await cleared.action(api.demoReset.clearVisitorData, {
				visitorId: "visitor-1",
			});
			expect(await rows(cleared, "resolutionSessions")).toEqual([]);
			expect(await rows(cleared, "visitorEncounters")).toEqual([]);
			expect(await segmentState(cleared, segmentId)).toEqual({
				kind: "PermanentFailure",
			});
		}

		const reset = createTestConvex();
		{
			const { select } = await bankenSource(reset);
			await startSession(reset, select("request-1"));
			expect(
				await reset.mutation(internal.demoReset.clearSharedDataBatch, {
					tableIndex: 0,
				}),
			).toEqual({ deleted: 1, hasMore: true, nextTableIndex: 1 });
			expect(await rows(reset, "resolutionSessions")).toEqual([]);
		}
	});

	test("reset batches spend one budget on sessions and end their Segment state", async () => {
		const t = createTestConvex();
		const { select, segmentId } = await bankenSource(t);
		await startSession(t, select("request-0"));
		// A repeat click now joins its running session, so the other 400 are
		// stored directly.
		const first = await session(t, "request-0");
		await t.run(async (ctx) => {
			const { _id, _creationTime, ...row } = first;
			for (let index = 1; index < 401; index += 1)
				await ctx.db.insert("resolutionSessions", {
					...row,
					requestId: `request-${index}`,
				});
			await ctx.db.patch(segmentId, {
				resolutionState: { kind: "Active", activeSessionCount: 401 },
			});
		});

		expect(
			await t.mutation(internal.demoReset.clearVisitorDataBatch, {
				visitorId: "visitor-1",
				phase: "ResolutionSessions",
			}),
		).toEqual({
			deleted: 400,
			hasMore: true,
			nextPhase: "ResolutionSessions",
		});
		expect(await segmentState(t, segmentId)).toEqual({
			kind: "Active",
			activeSessionCount: 1,
		});
		expect(
			await t.mutation(internal.demoReset.clearSharedDataBatch, {
				tableIndex: 0,
			}),
		).toEqual({ deleted: 1, hasMore: true, nextTableIndex: 1 });
		expect(await rows(t, "resolutionSessions")).toEqual([]);
	});
});
