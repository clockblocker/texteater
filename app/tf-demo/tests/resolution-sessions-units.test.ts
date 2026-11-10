import { afterEach, beforeEach, describe, expect, jest, test } from "bun:test";
import { api, internal } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import {
	createTestConvex,
	submitText,
	type TestConvexDb,
	unresolvedWords,
} from "./support/convex";
import { enableDeploymentFlags } from "./support/deploymentFlags";
import { type Selection, startSession } from "./support/occurrences";
import {
	pendingScheduled,
	rows,
	segmentState,
	session,
} from "./support/resolution-sessions";

/*
 * A click resolves the biggest unit holding the clicked Segment, so a
 * Segment Selection acts on that unit: one the model has nothing to say
 * about settles at once, and a Visitor's click on any member of a unit
 * already resolving joins that run.
 */

enableDeploymentFlags();

beforeEach(() => {
	// Sessions schedule their runs; no run executes here.
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

const runs = async (t: TestConvexDb) =>
	(await pendingScheduled(t))
		.filter(({ name }) => name === "orchestration:runResolutionSession")
		.map(({ args }) => args.requestId);

/** "rufe an" stored as one unit, `rufe … an`, at Segments 0 and 2. */
async function anrufenSource(t: TestConvexDb) {
	const { sentenceIds, segmentIds } = await submitText(
		t,
		[["rufe", " ", "an", "."]],
		{
			units: [
				[
					{
						segments: [0, 2],
						route: {
							language: "de",
							family: "Lexeme",
							kind: "VERB",
						},
					},
				],
			],
		},
	);
	const sentenceId = sentenceIds[0];
	const [rufe, , an] = segmentIds[0] ?? [];
	if (!sentenceId || !rufe || !an) throw new Error("Expected a Sentence.");
	const select = (
		requestId: string,
		clickedSegmentIndex: number,
		visitorId = "visitor-1",
	): Selection => ({ requestId, visitorId, sentenceId, clickedSegmentIndex });
	return { select, rufe, an };
}

describe("a click on a unit intake left Unresolved", () => {
	test("settles at selection as the run would have, with nothing scheduled", async () => {
		const t = createTestConvex();
		const words = ["Die", " ", "Banken", "."];
		const { sentenceIds, segmentIds } = await submitText(t, [words], {
			units: [unresolvedWords(words)],
		});
		const sentenceId = sentenceIds[0] as Id<"sentences">;
		const banken = segmentIds[0]?.[2] as Id<"segments">;

		for (const requestId of ["request-1", "request-2"])
			expect(
				await t.mutation(api.resolutionSessions.selectSegment, {
					requestId,
					visitorId: "visitor-1",
					sentenceId,
					clickedSegmentIndex: 2,
				}),
			).toEqual({
				kind: "Resolving",
				requestId,
				progress: "RouteAvailable",
				activity: "Terminal",
				deduplicated: false,
				unitRoute: "Unresolved",
				unitSegments: [2],
			});

		expect(await pendingScheduled(t)).toEqual([]);
		expect(await rows(t, "resolutionRuns")).toEqual([]);
		expect(await session(t, "request-1")).toMatchObject({
			segmentId: banken,
			clickedSegmentIndex: 2,
			lifecycle: {
				state: "Terminal",
				progress: "RouteAvailable",
				outcome: "Unresolved",
			},
		});
		expect(await segmentState(t, banken)).toEqual({ kind: "Unresolved" });
		expect(
			await t.query(api.resolutionSessions.getResolutionNote, {
				requestId: "request-2",
			}),
		).toMatchObject({
			lifecycle: { state: "Terminal", outcome: "Unresolved" },
		});
		// The Visitor encountered the Segment once, however often they click.
		expect(await rows(t, "visitorEncounters")).toEqual([
			expect.objectContaining({
				requestId: "request-1",
				segmentId: banken,
			}),
		]);
	});

	test("leaves another session's Active state on the Segment as it is", async () => {
		const t = createTestConvex();
		const words = ["Die", " ", "Banken", "."];
		const { sentenceIds, segmentIds } = await submitText(t, [words], {
			units: [unresolvedWords(words)],
		});
		const sentenceId = sentenceIds[0] as Id<"sentences">;
		const banken = segmentIds[0]?.[2] as Id<"segments">;
		await t.run((ctx) =>
			ctx.db.patch(banken, {
				resolutionState: { kind: "Active", activeSessionCount: 1 },
			}),
		);
		await t.mutation(api.resolutionSessions.selectSegment, {
			requestId: "request-1",
			visitorId: "visitor-1",
			sentenceId,
			clickedSegmentIndex: 2,
		});
		expect(await segmentState(t, banken)).toEqual({
			kind: "Active",
			activeSessionCount: 1,
		});
	});
});

describe("a click on a member of a unit already resolving", () => {
	test("joins the Visitor's run on another member instead of starting a second", async () => {
		const t = createTestConvex();
		const { select, rufe, an } = await anrufenSource(t);
		await startSession(t, select("request-1", 0));

		expect(
			await t.mutation(
				api.resolutionSessions.selectSegment,
				select("request-2", 2),
			),
		).toMatchObject({
			kind: "Resolving",
			requestId: "request-1",
			progress: "Starting",
			activity: "Scheduled",
			deduplicated: true,
			unitSegments: [0, 2],
		});

		expect(await runs(t)).toEqual(["request-1"]);
		expect(
			(await rows(t, "resolutionSessions")).map(
				({ requestId }) => requestId,
			),
		).toEqual(["request-1"]);
		expect(await segmentState(t, rufe)).toEqual({
			kind: "Active",
			activeSessionCount: 1,
		});
		expect(await segmentState(t, an)).toBeNull();
		// Both clicked members are encountered; the commit advances both.
		expect(
			(await rows(t, "visitorEncounters")).map(
				({ segmentId }) => segmentId,
			),
		).toEqual([rufe, an]);
	});

	test("starts another Visitor's own run", async () => {
		const t = createTestConvex();
		const { select } = await anrufenSource(t);
		await startSession(t, select("request-1", 0));
		await startSession(t, select("request-2", 2, "visitor-2"));
		expect(await runs(t)).toEqual(["request-1", "request-2"]);
	});

	test("makes a retry of the Visitor's failed click on another member start nothing", async () => {
		const t = createTestConvex();
		const { select } = await anrufenSource(t);
		const failed = await startSession(t, select("request-1", 0));
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
		await startSession(t, select("request-2", 2));

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
		expect(await runs(t)).toEqual(["request-1", "request-2"]);
	});
});
