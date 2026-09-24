import { afterEach, beforeEach, expect, jest, test } from "bun:test";
import { api, internal } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import {
	createTestConvex,
	submitText,
	type TestConvexDb,
} from "./support/convex";
import {
	bankOccurrenceCommit,
	type Selection,
	startSession,
} from "./support/occurrences";

beforeEach(() => {
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

async function bankenSegment(t: TestConvexDb) {
	const { sentenceIds, segmentIds } = await submitText(t, [
		["Die", " ", "Banken", "."],
	]);
	const sentenceId = sentenceIds[0];
	const segmentId = segmentIds[0]?.[2];
	if (!sentenceId || !segmentId) throw new Error("Expected a Sentence.");
	const select = (requestId: string, visitorId: string): Selection => ({
		requestId,
		visitorId,
		sentenceId,
		clickedSegmentIndex: 2,
	});
	return { segmentId, select };
}

/** The Segment's Resolution State; null once membership clears it. */
function segmentState(t: TestConvexDb, segmentId: Id<"segments">) {
	return t.run(
		async (ctx) => (await ctx.db.get(segmentId))?.resolutionState ?? null,
	);
}

const internalFailure = {
	kind: "Internal",
	phase: "Grammar",
	diagnosticId: "diagnostic-1",
	errorName: "Error",
	errorFingerprint: "fnv1a-1",
} as const;

test("shared Segment Resolution State counts concurrent active sessions", async () => {
	const t = createTestConvex();
	const { segmentId, select } = await bankenSegment(t);
	const first = await startSession(t, select("request-1", "visitor-1"));
	const second = await startSession(t, select("request-2", "visitor-2"));
	expect(await segmentState(t, segmentId)).toEqual({
		kind: "Active",
		activeSessionCount: 2,
	});

	await t.mutation(internal.persistence.persistUnresolvedClick, {
		...select("request-1", "visitor-1"),
		sessionGuard: first,
	});
	expect(await segmentState(t, segmentId)).toEqual({
		kind: "Active",
		activeSessionCount: 1,
	});

	await t.mutation(internal.resolutionSessions.recordRunFailure, {
		guard: second,
		failure: internalFailure,
	});
	expect(await segmentState(t, segmentId)).toEqual({
		kind: "PermanentFailure",
	});

	await startSession(t, select("request-3", "visitor-3"));
	expect(await segmentState(t, segmentId)).toEqual({
		kind: "Active",
		activeSessionCount: 1,
	});
});

test("committed Attestation membership heals every stale terminal write", async () => {
	const t = createTestConvex();
	const { segmentId, select } = await bankenSegment(t);
	const winner = await startSession(t, select("request-1", "visitor-1"));
	const loser = await startSession(t, select("request-2", "visitor-2"));

	await t.mutation(
		internal.persistence.persistResolvedClick,
		bankOccurrenceCommit(select("request-1", "visitor-1"), winner),
	);
	expect(await segmentState(t, segmentId)).toBeNull();

	await t.mutation(internal.resolutionSessions.recordRunFailure, {
		guard: loser,
		failure: internalFailure,
	});
	expect(await segmentState(t, segmentId)).toBeNull();

	expect(
		await t.mutation(api.resolutionSessions.selectSegment, {
			...select("request-3", "visitor-3"),
			routeNoteRequested: false,
		}),
	).toMatchObject({ kind: "Available" });
	expect(await segmentState(t, segmentId)).toBeNull();
});
