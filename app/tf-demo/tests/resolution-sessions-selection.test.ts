import { afterEach, beforeEach, describe, expect, jest, test } from "bun:test";
import { api, internal } from "../convex/_generated/api";
import { createTestConvex, submitText } from "./support/convex";
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

	test("the Segment stays Active while any of several sessions is live", async () => {
		const t = createTestConvex();
		const { select, segmentId } = await bankenSource(t);
		const first = await startSession(t, select("request-1"));
		await startSession(t, select("request-3", "visitor-2"));
		await startSession(t, select("request-4", "visitor-3"));
		expect(await segmentState(t, segmentId)).toEqual({
			kind: "Active",
			activeSessionCount: 3,
		});

		await t.mutation(internal.persistence.persistUnresolvedClick, {
			...select("request-1"),
			sessionGuard: first,
		});
		expect(await segmentState(t, segmentId)).toEqual({
			kind: "Active",
			activeSessionCount: 2,
		});
		// Once visitor-1's session has ended, its next click starts another.
		await startSession(t, select("request-2"));
		expect(await segmentState(t, segmentId)).toEqual({
			kind: "Active",
			activeSessionCount: 3,
		});

		// visitor-1 holds one Terminal and one Active session.
		await t.action(api.demoReset.clearVisitorData, {
			visitorId: "visitor-1",
		});
		expect(await segmentState(t, segmentId)).toEqual({
			kind: "Active",
			activeSessionCount: 2,
		});

		const old = Date.now() - 10_000;
		for (const requestId of ["request-3", "request-4"])
			await patchSession(t, requestId, { updatedAt: old });
		await t.mutation(internal.resolutionSessions.cleanup, {
			staleBefore: Date.now() - 1,
			terminalBefore: Date.now() - 1,
		});
		expect(await segmentState(t, segmentId)).toEqual({
			kind: "PermanentFailure",
		});
	});
});
