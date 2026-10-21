import { afterEach, beforeEach, describe, expect, jest, test } from "bun:test";
import type * as Dumling from "dumling/types";
import { api, internal } from "../convex/_generated/api";
import crons from "../convex/crons";
import { createDumdictTransaction } from "../convex/model/dumdictTransaction";
import { RESOLUTION_RETENTION_MS } from "../server/resolutionLifecycle";
import {
	projectResolutionGrammar,
	projectResolutionReading,
} from "../server/resolutionSessionProjection";
import { createTestConvex } from "./support/convex";
import { enableDeploymentFlags } from "./support/deploymentFlags";
import {
	bankOccurrenceCommit,
	bankReading,
	commitBankOccurrence,
	startSession,
} from "./support/occurrences";
import {
	bankenSource,
	bankGrammar,
	commitProgress,
	grammarProjection,
	grammaticalInput,
	patchSession,
	pendingScheduled,
	readingInput,
	readingProjection,
	rows,
	segmentState,
	session,
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
	test("a New refused as stale saves its progress and leaves the run's record to the commit that follows", async () => {
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
		// Another click stores Bank's 🪑 after this judge saw no Reading.
		await t.run((ctx) =>
			createDumdictTransaction(ctx).addNewNote({
				draft: {
					reading: {
						...bankReading,
						emojiDescription: "🪑",
					} as Dumling.Reading<"de">,
					note: {
						attestedTranslations: [],
						attestationLinks: [],
						notes: "",
					},
				},
			}),
		);
		const stale = await t.mutation(
			internal.persistence.persistResolvedClick,
			{
				...bankOccurrenceCommit(select("request-1"), guard, "New"),
				readingCandidates: [],
				...commitProgress,
			},
		);
		expect(stale).toMatchObject({ status: "StaleReading" });
		expect(await session(t, "request-1")).toMatchObject({
			lifecycle: { state: "Active", progress: "ReadingAvailable" },
		});
		expect(await rows(t, "resolutionRuns")).toEqual([
			expect.objectContaining({ state: "Running" }),
		]);
	});

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

	test("concurrent sessions keep the Segment Active until the last one settles", async () => {
		const t = createTestConvex();
		const { select, segmentId } = await bankenSource(t);
		const first = await startSession(t, select("request-1"));
		const second = await startSession(t, select("request-2", "visitor-2"));

		await t.mutation(internal.persistence.persistUnresolvedClick, {
			...select("request-1"),
			sessionGuard: first,
		});
		expect(await segmentState(t, segmentId)).toEqual({
			kind: "Active",
			activeSessionCount: 1,
		});
		await t.mutation(internal.persistence.persistUnresolvedClick, {
			...select("request-2", "visitor-2"),
			sessionGuard: second,
		});
		expect(await segmentState(t, segmentId)).toEqual({
			kind: "Unresolved",
		});
		expect(await session(t, "request-2")).toMatchObject({
			lifecycle: { state: "Terminal", outcome: "Unresolved" },
		});
	});

	test("projection exposes learner-safe fields only", () => {
		const grammar = projectResolutionGrammar(grammaticalInput("Bank"));
		const reading = projectResolutionReading(readingInput("🏦", "Bank"));
		expect(grammar).toEqual(grammarProjection("Bank"));
		expect(reading).toEqual(readingProjection("🏦", "Bank"));
		expect(JSON.stringify({ grammar, reading })).not.toContain("provider");
		expect(JSON.stringify({ grammar, reading })).not.toContain("plan");
	});

	test("an invalidated session cannot write even an Unresolved Click", async () => {
		const t = createTestConvex();
		const { select, segmentId } = await bankenSource(t);

		await expect(
			t.mutation(internal.persistence.persistUnresolvedClick, {
				...select("request-1"),
				sessionGuard: {
					requestId: "request-1",
					runToken: "deleted-run",
					segmentId,
				},
			}),
		).rejects.toThrow("no longer active");
		expect(await rows(t, "visitorEncounters")).toEqual([]);
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

	test("a partial analysis cannot masquerade as a deduplicated reanalysis", async () => {
		const t = createTestConvex();
		// A Sentence whose stored Segments stop short of its text.
		await t.run(async (ctx) => {
			const scrollId = await ctx.db.insert("scrolls", {
				submissionKey: "submission-1",
				sourceText: "Die Banken.",
			});
			const sentenceId = await ctx.db.insert("sentences", {
				segmentedSentenceId: "submission-1:0",
				scrollId,
				position: 0,
				language: "de",
				stitchedText: "Die Banken.",
			});
			await ctx.db.insert("segments", {
				sentenceId,
				index: 0,
				kind: "ResolvableText",
				text: "Die",
			});
		});
		await expect(
			t.mutation(internal.persistence.persistSubmittedScroll, {
				submissionKey: "submission-1",
				sourceText: "Die Banken.",
				sentences: [
					{
						segmentedSentenceId: "submission-1:0",
						position: 0,
						paragraph: 0,
						language: "de",
						stitchedText: "Die Banken.",
						segments: [
							{ kind: "ResolvableText", text: "Die" },
							{ kind: "Whitespace", text: " " },
							{ kind: "ResolvableText", text: "Banken" },
							{ kind: "Punctuation", text: "." },
						],
						units: [
							{ segments: [0], route: "Unresolved" },
							{ segments: [2], route: "Unresolved" },
						],
					},
				],
			}),
		).rejects.toMatchObject({
			data: {
				code: "Conflict",
				message: expect.stringContaining("analysis is incomplete"),
			},
		});
	});
});
