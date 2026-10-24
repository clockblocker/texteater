import { afterEach, beforeEach, describe, expect, jest, test } from "bun:test";
import { api, internal } from "../convex/_generated/api";
import { STALE_RUN_AFTER_MS } from "../server/resolutionLifecycle";
import { createTestConvex, submitText } from "./support/convex";
import { enableDeploymentFlags } from "./support/deploymentFlags";
import {
	bankOccurrenceCommit,
	commitBankOccurrence,
	type SessionGuard,
	startSession,
} from "./support/occurrences";
import {
	bankenSource,
	grammarProjection,
	patchSession,
	pendingScheduled,
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
	test("a committed occurrence opens its canonical Note directly and records only the first Visitor Encounter", async () => {
		const t = createTestConvex();
		const { select, segmentId } = await bankenSource(t);
		const committed = await commitBankOccurrence(
			t,
			select("request-0", "visitor-0"),
		);
		// Start from a Reading with no Knowledge demand yet.
		await t.run(async (ctx) => {
			for (const attempt of await ctx.db
				.query("knowledgeGenerationAttempts")
				.collect())
				await ctx.db.delete(attempt._id);
		});
		const scheduledBefore = (await pendingScheduled(t)).length;
		const canonical = {
			readingId: committed.readingId,
			lemmaId: expect.any(String),
			surfaceLanguage: "de" as const,
			normalizedSurface: "Banken",
			surfaceId: expect.any(String),
			attestationId: committed.attestationId,
			// "Banken" alone, spelled right, plural, of a Lemma with one Reading.
			steps: { attestation: false, surface: true, lemma: false },
		};

		for (const requestId of ["request-1", "request-2"])
			expect(
				await t.mutation(
					api.resolutionSessions.selectSegment,
					select(requestId),
				),
			).toEqual({ kind: "Available", canonical });

		const encounters = (await rows(t, "visitorEncounters")).filter(
			({ visitorId }) => visitorId === "visitor-1",
		);
		expect(encounters).toEqual([
			expect.objectContaining({
				requestId: "request-1",
				segmentId,
				attestationId: committed.attestationId,
			}),
		]);
		expect(await rows(t, "knowledgeGenerationAttempts")).toEqual([
			expect.objectContaining({
				attemptKey: "request-1",
				state: "Scheduled",
			}),
			expect.objectContaining({
				attemptKey: "request-2",
				state: "Waiting",
			}),
		]);
		expect(
			(await rows(t, "resolutionSessions")).map(
				({ requestId }) => requestId,
			),
		).toEqual(["request-0"]);
		// Only request-1 starts a Knowledge run, scheduled with its watchdog.
		expect((await pendingScheduled(t)).slice(scheduledBefore)).toEqual([
			{
				name: "knowledgeGenerationActions:runKnowledgeGeneration",
				args: { attemptKey: "request-1" },
			},
			{
				name: "knowledgeGeneration:recoverStaleRun",
				args: { attemptKey: "request-1", runNumber: 1 },
			},
		]);
	});

	test("inspection records repeat selections separately while encounters stay deduplicated", async () => {
		const t = createTestConvex();
		const { select } = await bankenSource(t);
		await commitBankOccurrence(t, select("request-0", "visitor-0"));
		const args = {
			...select("request-1"),
			inspect: true,
		};

		await t.mutation(api.resolutionSessions.selectSegment, args);
		await t.mutation(api.resolutionSessions.selectSegment, args);
		await t.mutation(api.resolutionSessions.selectSegment, {
			...args,
			requestId: "second-inspected-click",
		});

		expect(
			(await rows(t, "visitorEncounters")).filter(
				({ visitorId }) => visitorId === "visitor-1",
			),
		).toHaveLength(1);
		const clicks = await rows(t, "inspectionClicks");
		expect(clicks).toHaveLength(2);
		expect(await rows(t, "inspectionSteps")).toHaveLength(2);
		const payloads = await rows(t, "inspectionPayloads");
		expect(payloads).toHaveLength(2);
		expect(clicks[0]).toMatchObject({
			selectedSegment: "Banken",
			sentence: "Die Banken.",
			selectionKind: "Available",
		});
		expect(JSON.parse(String(payloads[0]?.text)).output.kind).toBe(
			"Available",
		);
	});

	test("inspection retains terminal status and failure payloads independently of session cleanup", async () => {
		const t = createTestConvex();
		const { select } = await bankenSource(t);
		await commitBankOccurrence(t, select("request-1"));
		const completed = await session(t, "request-1");
		await t.run(async (ctx) => {
			await ctx.db.insert("inspectionClicks", {
				requestId: "request-1",
				visitorId: "visitor-1",
				selectedSegment: "Banken",
				sentence: "Die Banken.",
				startedAt: 1,
				selectionKind: "Resolving",
			});
			const attempt = await ctx.db
				.query("knowledgeGenerationAttempts")
				.withIndex("by_attempt_key", (q) =>
					q.eq("attemptKey", "request-1"),
				)
				.unique();
			if (attempt) await ctx.db.patch(attempt._id, { state: "Failed" });
		});
		const step = {
			id: "knowledge-run",
			name: "Knowledge",
			kind: "Code" as const,
			owner: "app/tf-demo",
			startedAt: 10,
			durationMs: 40,
			status: "Success" as const,
			payloadJson: JSON.stringify({ error: "Invalid plan" }),
		};

		await t.mutation(internal.resolutionInspection.recordSteps, {
			requestId: "request-1",
			scope: "Knowledge",
			steps: [step],
		});

		expect((await rows(t, "inspectionSteps"))[0]).toMatchObject({
			status: "Failure",
		});
		expect((await rows(t, "inspectionClicks"))[0]).toMatchObject({
			resolutionState: "Complete",
			finishedAt: completed.updatedAt,
			knowledgeState: "Failed",
		});
		expect((await rows(t, "inspectionPayloads"))[0]?.text).toBe(
			step.payloadJson,
		);
	});

	test("selection timing records the browser round trip once and rejects another visitor", async () => {
		const t = createTestConvex();
		await t.run(async (ctx) => {
			await ctx.db.insert("inspectionClicks", {
				requestId: "request-1",
				visitorId: "visitor-1",
				selectedSegment: "Banken",
				sentence: "Die Banken.",
				startedAt: 100,
				selectionKind: "Available",
			});
			await ctx.db.insert("inspectionSteps", {
				requestId: "request-1",
				id: "request-1:selection",
				name: "Reuse stored Attestation",
				kind: "Code",
				owner: "app/tf-demo",
				startedAt: 100,
				durationMs: 0,
				timing: "Unmeasured",
				status: "Success",
			});
		});
		const args = {
			requestId: "request-1",
			visitorId: "visitor-2",
			startedAt: 90,
			durationMs: 25,
		};

		await t.mutation(api.resolutionInspection.recordSelectionTiming, args);
		expect((await rows(t, "inspectionSteps"))[0]?.durationMs).toBe(0);
		await t.mutation(api.resolutionInspection.recordSelectionTiming, {
			...args,
			visitorId: "visitor-1",
		});
		await t.mutation(api.resolutionInspection.recordSelectionTiming, {
			...args,
			visitorId: "visitor-1",
			durationMs: 90,
		});
		expect((await rows(t, "inspectionSteps"))[0]).toMatchObject({
			durationMs: 25,
			startedAt: 90,
		});
	});

	test("selection starts one session on the exact Segment and schedules its run once", async () => {
		const t = createTestConvex();
		const { select, segmentId, scrollId } = await bankenSource(t);
		const args = select("request-1");

		expect(
			await t.mutation(api.resolutionSessions.selectSegment, args),
		).toMatchObject({
			kind: "Resolving",
			progress: "Starting",
			deduplicated: false,
		});
		expect(
			await t.mutation(api.resolutionSessions.selectSegment, args),
		).toMatchObject({
			kind: "Resolving",
			progress: "Starting",
			deduplicated: true,
		});

		expect(await rows(t, "resolutionSessions")).toEqual([
			expect.objectContaining({
				segmentId,
				route: expect.objectContaining({
					scrollId,
					selectedSegment: "Banken",
				}),
			}),
		]);
		expect(await segmentState(t, segmentId)).toEqual({
			kind: "Active",
			activeSessionCount: 1,
		});
		const { runToken } = await session(t, "request-1");
		expect(await pendingScheduled(t)).toEqual([
			{
				name: "orchestration:runResolutionSession",
				args: { requestId: "request-1", runToken, segmentId },
			},
			{
				name: "resolutionSessions:recoverStaleRun",
				args: { requestId: "request-1", runToken },
			},
		]);
	});

	test("a Resolving selection names the route intake stored for the clicked unit", async () => {
		const t = createTestConvex();
		const banken = {
			language: "de" as const,
			family: "Lexeme" as const,
			kind: "NOUN" as const,
		};
		const { sentenceIds } = await submitText(
			t,
			[["Die", " ", "Banken", "."]],
			{
				units: [
					[
						{ segments: [0], route: "Unresolved" },
						{ segments: [2], route: banken },
					],
				],
			},
		);
		const sentenceId = sentenceIds[0];
		if (!sentenceId) throw new Error("Expected a Sentence.");
		const select = (requestId: string, clickedSegmentIndex: number) =>
			t.mutation(api.resolutionSessions.selectSegment, {
				requestId,
				visitorId: "visitor-1",
				sentenceId,
				clickedSegmentIndex,
			});

		expect(await select("request-1", 2)).toMatchObject({
			kind: "Resolving",
			unitRoute: banken,
		});
		// A repeat click joins the running session and names the route too.
		expect(await select("request-2", 2)).toMatchObject({
			requestId: "request-1",
			unitRoute: banken,
		});
		expect(await select("request-3", 0)).toMatchObject({
			kind: "Resolving",
			unitRoute: "Unresolved",
		});
	});

	test("a repeat click joins the Visitor's running session without another run", async () => {
		const t = createTestConvex();
		const { select, segmentId } = await bankenSource(t);
		await startSession(t, select("request-1"));

		expect(
			await t.mutation(api.resolutionSessions.selectSegment, {
				...select("request-2"),
			}),
		).toMatchObject({
			kind: "Resolving",
			requestId: "request-1",
			progress: "Starting",
			activity: "Scheduled",
		});

		expect(await rows(t, "resolutionSessions")).toHaveLength(1);
		expect(
			(await pendingScheduled(t)).filter(
				({ name }) => name === "orchestration:runResolutionSession",
			),
		).toHaveLength(1);
		expect(await segmentState(t, segmentId)).toEqual({
			kind: "Active",
			activeSessionCount: 1,
		});
	});

	test("an inspected click that joins a running session records no inspection of its own", async () => {
		const t = createTestConvex();
		const { select } = await bankenSource(t);
		const inspected = (requestId: string) => ({
			...select(requestId),
			inspect: true,
		});
		await t.mutation(
			api.resolutionSessions.selectSegment,
			inspected("request-1"),
		);

		expect(
			await t.mutation(
				api.resolutionSessions.selectSegment,
				inspected("request-2"),
			),
		).toMatchObject({ kind: "Resolving", requestId: "request-1" });

		expect(
			(await rows(t, "inspectionClicks")).map(
				({ requestId }) => requestId,
			),
		).toEqual(["request-1"]);
		expect(
			(await rows(t, "inspectionSteps")).map(
				({ requestId }) => requestId,
			),
		).toEqual(["request-1"]);
	});

	test("another Visitor's click on a resolving Segment starts its own session", async () => {
		const t = createTestConvex();
		const { select, segmentId } = await bankenSource(t);
		await startSession(t, select("request-1"));

		expect(
			await t.mutation(api.resolutionSessions.selectSegment, {
				...select("request-2", "visitor-2"),
			}),
		).toMatchObject({ kind: "Resolving", requestId: "request-2" });

		expect(
			(await rows(t, "resolutionSessions")).map(
				({ requestId }) => requestId,
			),
		).toEqual(["request-1", "request-2"]);
		expect(await segmentState(t, segmentId)).toEqual({
			kind: "Active",
			activeSessionCount: 2,
		});
	});

	test("a session whose run keeps crashing fails permanently after its second run", async () => {
		const t = createTestConvex();
		const { select, segmentId } = await bankenSource(t);
		await startSession(t, select("request-1"));

		for (const runNumber of [1, 2]) {
			const { runToken } = await session(t, "request-1");
			expect(await session(t, "request-1")).toMatchObject({ runNumber });
			await patchSession(t, "request-1", {
				updatedAt: Date.now() - STALE_RUN_AFTER_MS - 1,
			});
			await t.mutation(internal.resolutionSessions.recoverStaleRun, {
				requestId: "request-1",
				runToken,
			});
		}

		expect(await session(t, "request-1")).toMatchObject({
			runNumber: 2,
			lifecycle: { state: "Terminal", outcome: "PermanentFailure" },
		});
		expect(await segmentState(t, segmentId)).toEqual({
			kind: "PermanentFailure",
		});
	});

	test("same request with a different click is rejected", async () => {
		const t = createTestConvex();
		const { select } = await bankenSource(t);
		const args = select("request-1");
		await t.mutation(api.resolutionSessions.selectSegment, args);

		await expect(
			t.mutation(api.resolutionSessions.selectSegment, {
				...args,
				visitorId: "visitor-2",
			}),
		).rejects.toMatchObject({
			data: {
				code: "InvalidInput",
				message: expect.stringContaining("different click"),
			},
		});
	});

	test("a complete Session names its Reading and canonical occurrence", async () => {
		const t = createTestConvex();
		const { select } = await bankenSource(t);
		const ordinary = select("request-1");
		const guard = await startSession(t, ordinary);
		const committed = await t.mutation(
			internal.persistence.persistResolvedClick,
			bankOccurrenceCommit(ordinary, guard),
		);
		if (committed.status !== "Committed")
			throw new Error("Expected a committed occurrence.");
		const surfaceId = (
			await t.run((ctx) => ctx.db.get(committed.attestationId))
		)?.surfaceId;
		expect(
			(
				await t.query(api.resolutionSessions.getResolutionNote, {
					requestId: "request-1",
				})
			)?.lifecycle,
		).toMatchObject({
			outcome: "Complete",
			readingId: committed.readingId,
			canonical: {
				readingId: committed.readingId,
				surfaceLanguage: "de",
				normalizedSurface: "Banken",
				surfaceId,
				attestationId: committed.attestationId,
			},
		});
	});

	test("progress is ordered and duplicate or regressive runner updates are harmless", async () => {
		const t = createTestConvex();
		const { select } = await bankenSource(t);
		const guard = await startSession(t, select("request-1"));
		const advance = (args: {
			guard: SessionGuard;
			progress: "RouteAvailable" | "GrammarAvailable";
			grammar?: ReturnType<typeof grammarProjection>;
		}) => t.mutation(internal.resolutionSessions.advance, args);

		expect(await advance({ guard, progress: "RouteAvailable" })).toBe(true);
		expect(
			await advance({
				guard,
				progress: "GrammarAvailable",
				grammar: grammarProjection(),
			}),
		).toBe(true);
		expect(await advance({ guard, progress: "RouteAvailable" })).toBe(
			false,
		);
		expect(
			await advance({
				guard,
				progress: "GrammarAvailable",
				grammar: grammarProjection(),
			}),
		).toBe(false);
		await expect(
			advance({
				guard: { ...guard, runToken: "old" },
				progress: "RouteAvailable",
			}),
		).rejects.toThrow("no longer active");
	});
});
