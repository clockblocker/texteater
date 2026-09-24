import { afterEach, beforeEach, describe, expect, jest, test } from "bun:test";
import type { WithoutSystemFields } from "convex/server";
import { api, internal } from "../convex/_generated/api";
import type { Doc, Id } from "../convex/_generated/dataModel";
import {
	assertResolutionLifecycle,
	assertResolutionProgressTransition,
	MAX_RESOLUTION_RUNS,
	projectResolutionGrammar,
	projectResolutionReading,
	STALE_RUN_AFTER_MS,
} from "../convex/model/resolutionSessions";
import {
	createTestConvex,
	submitText,
	type TestConvexDb,
} from "./support/convex";
import {
	bankOccurrenceCommit,
	commitBankOccurrence,
	type Selection,
	type SessionGuard,
	startSession,
} from "./support/occurrences";

beforeEach(() => {
	// Sessions schedule their runs; each test drives the run itself.
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

/** A stored "Die Banken." whose `Banken` Segment sits at index 2. */
async function bankenSource(t: TestConvexDb) {
	const { textId, sentenceIds, segmentIds } = await submitText(t, [
		["Die", " ", "Banken", "."],
	]);
	const sentenceId = sentenceIds[0];
	const segmentId = segmentIds[0]?.[2];
	if (!sentenceId || !segmentId) throw new Error("Expected a Sentence.");
	const select = (requestId: string, visitorId = "visitor-1"): Selection => ({
		requestId,
		visitorId,
		sentenceId,
		clickedSegmentIndex: 2,
	});
	return { textId, sentenceId, segmentId, select };
}

function session(t: TestConvexDb, requestId: string) {
	return t.run(async (ctx) => {
		const row = await ctx.db
			.query("resolutionSessions")
			.withIndex("by_request_id", (q) => q.eq("requestId", requestId))
			.unique();
		if (!row) throw new Error(`No Resolution Session for ${requestId}.`);
		return row;
	});
}

/** The Segment's Resolution State; null once membership clears it. */
function segmentState(t: TestConvexDb, segmentId: Id<"segments">) {
	return t.run(
		async (ctx) => (await ctx.db.get(segmentId))?.resolutionState ?? null,
	);
}

function rows<
	Table extends
		| "resolutionRuns"
		| "resolutionSessions"
		| "visitorClicks"
		| "knowledgeGenerationAttempts"
		| "inspectionClicks"
		| "inspectionSteps"
		| "inspectionPayloads",
>(t: TestConvexDb, table: Table) {
	return t.run((ctx) => ctx.db.query(table).collect());
}

/** Scheduled functions not yet run, by name. */
async function pendingScheduled(t: TestConvexDb) {
	const jobs = await t.run((ctx) =>
		ctx.db.system.query("_scheduled_functions").collect(),
	);
	return jobs
		.filter((job) => job.state.kind === "pending")
		.map((job) => ({ name: job.name, args: job.args[0] }));
}

/** Moves a live session to a state a test starts from. */
async function patchSession(
	t: TestConvexDb,
	requestId: string,
	values: Partial<WithoutSystemFields<Doc<"resolutionSessions">>>,
) {
	const row = await session(t, requestId);
	await t.run((ctx) => ctx.db.patch(row._id, values));
}

/** A Resolved Grammar checkpoint for `Banken` in "Die Banken.". */
function bankGrammar(sentenceId: Id<"sentences">) {
	return {
		decision: "Resolved" as const,
		language: "de" as const,
		encounter: {
			sentence: {
				id: sentenceId,
				language: "de" as const,
				segments: [
					{ kind: "ResolvableText" as const, text: "Die" },
					{ kind: "Whitespace" as const, text: " " },
					{ kind: "ResolvableText" as const, text: "Banken" },
					{ kind: "Punctuation" as const, text: "." },
				],
			},
			target: {
				family: "Lexeme",
				kind: "NOUN",
				memberSegmentIndices: [2],
			},
		},
		attestation: bankOccurrenceCommit(
			{
				requestId: "grammar",
				visitorId: "grammar",
				sentenceId,
				clickedSegmentIndex: 2,
			},
			{
				requestId: "grammar",
				runToken: "grammar",
				segmentId: "" as never,
			},
		).occurrence.attestation,
	};
}

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
			surfaceLanguage: "de",
			normalizedSurface: "Banken",
			surfaceId: expect.any(String),
			attestationId: committed.attestationId,
		};

		expect(
			await t.mutation(api.resolutionSessions.selectSegment, {
				...select("request-1"),
				routeNoteRequested: false,
			}),
		).toEqual({
			kind: "Available",
			canonical,
			target: { kind: "Reading", readingId: committed.readingId },
		});
		expect(
			await t.mutation(api.resolutionSessions.selectSegment, {
				...select("request-2"),
				routeNoteRequested: true,
			}),
		).toEqual({
			kind: "Available",
			canonical,
			target: {
				kind: "Attestation",
				attestationId: committed.attestationId,
			},
		});

		const encounters = (await rows(t, "visitorClicks")).filter(
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
			routeNoteRequested: false,
			inspect: true,
		};

		await t.mutation(api.resolutionSessions.selectSegment, args);
		await t.mutation(api.resolutionSessions.selectSegment, args);
		await t.mutation(api.resolutionSessions.selectSegment, {
			...args,
			requestId: "second-inspected-click",
		});

		expect(
			(await rows(t, "visitorClicks")).filter(
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
		const { select, segmentId, textId } = await bankenSource(t);
		const args = { ...select("request-1"), routeNoteRequested: false };

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
					textId,
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

	test("same request with a different click is rejected", async () => {
		const t = createTestConvex();
		const { select } = await bankenSource(t);
		const args = { ...select("request-1"), routeNoteRequested: false };
		await t.mutation(api.resolutionSessions.selectSegment, args);

		await expect(
			t.mutation(api.resolutionSessions.selectSegment, {
				...args,
				visitorId: "visitor-2",
			}),
		).rejects.toThrow("different click");
		await expect(
			t.mutation(api.resolutionSessions.selectSegment, {
				...args,
				routeNoteRequested: true,
			}),
		).rejects.toThrow("different click");
	});

	test("terminal navigation preserves ordinary and one-shot Route Note intent", async () => {
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
		await t.run(async (ctx) => {
			const row = await ctx.db
				.query("resolutionSessions")
				.withIndex("by_request_id", (q) =>
					q.eq("requestId", "request-1"),
				)
				.unique();
			if (!row) throw new Error("Expected a session.");
			const { _id, _creationTime, ...copy } = row;
			await ctx.db.insert("resolutionSessions", {
				...copy,
				requestId: "request-route",
				routeNoteRequested: true,
			});
		});

		expect(
			(
				await t.query(api.resolutionSessions.getResolutionNote, {
					requestId: "request-1",
				})
			)?.terminal,
		).toMatchObject({
			kind: "Complete",
			target: { kind: "Reading", readingId: committed.readingId },
			canonical: {
				readingId: committed.readingId,
				surfaceLanguage: "de",
				normalizedSurface: "Banken",
				surfaceId,
				attestationId: committed.attestationId,
			},
		});
		expect(
			(
				await t.query(api.resolutionSessions.getResolutionNote, {
					requestId: "request-route",
				})
			)?.terminal,
		).toMatchObject({
			kind: "Complete",
			target: {
				kind: "Attestation",
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

	test("completion accepts an Encounter first recorded by an earlier request", async () => {
		const t = createTestConvex();
		const { select, segmentId } = await bankenSource(t);
		// Both selections share one Visitor Encounter, recorded by the first (ADR-0002).
		const earlier = await startSession(t, select("request-earlier"));
		const later = await startSession(t, select("request-later"));
		expect(await segmentState(t, segmentId)).toEqual({
			kind: "Active",
			activeSessionCount: 2,
		});
		const committed = await t.mutation(
			internal.persistence.persistResolvedClick,
			bankOccurrenceCommit(select("request-earlier"), earlier),
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

		expect(
			await t.mutation(internal.resolutionSessions.settleAfterRun, {
				guard: later,
				result: {
					kind: "Complete",
					attestationId: committed.attestationId,
				},
			}),
		).toBeNull();
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

		const note = await t.query(api.resolutionSessions.getResolutionNote, {
			requestId: "request-1",
		});
		expect(note?.terminal).toEqual({
			kind: "PermanentFailure",
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
			routeNoteRequested: false,
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

	test("cleanup removes stale active and old terminal sessions but keeps a completed target that vanished", async () => {
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

		const result = await t.mutation(internal.resolutionSessions.cleanup, {
			staleBefore: Date.now() - 1,
			terminalBefore: Date.now() - 1,
		});

		expect(result).toEqual({ deleted: 2, hasMore: false });
		expect(
			(await rows(t, "resolutionSessions")).map(
				({ requestId }) => requestId,
			),
		).toEqual(["complete-missing"]);
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
		expect(await rows(t, "visitorClicks")).toEqual([]);
	});

	test("strip, visitor clear, and full reset invalidate sessions before source writes", async () => {
		const stripped = createTestConvex();
		{
			const { select, segmentId, textId } = await bankenSource(stripped);
			await startSession(stripped, select("request-1"));
			const first = await stripped.mutation(
				internal.demoReset.stripTextAnalysisGraphBatch,
				{ textId },
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
			expect(await rows(cleared, "visitorClicks")).toEqual([]);
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
			const textId = await ctx.db.insert("texts", {
				submissionKey: "submission-1",
				sourceText: "Die Banken.",
			});
			const sentenceId = await ctx.db.insert("sentences", {
				segmentedSentenceId: "submission-1:0",
				textId,
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
			t.mutation(internal.persistence.persistSubmittedText, {
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
					},
				],
			}),
		).rejects.toThrow("analysis is incomplete");
	});

	test("the scheduled run completes an occurrence another session committed, without model work", async () => {
		const t = createTestConvex();
		const { select, segmentId } = await bankenSource(t);
		// One Visitor selects twice; the second session commits first.
		const running = await startSession(t, select("request-1"));
		const winner = await startSession(t, select("request-2"));
		const committed = await t.mutation(
			internal.persistence.persistResolvedClick,
			bankOccurrenceCommit(select("request-2"), winner),
		);
		if (committed.status !== "Committed")
			throw new Error("Expected a committed occurrence.");
		const providerRequests: string[] = [];
		const previousFetch = globalThis.fetch;
		globalThis.fetch = (async (url: string | URL | Request) => {
			providerRequests.push(String(url));
			throw new Error("No model call is expected.");
		}) as typeof fetch;
		try {
			await t.action(
				internal.orchestration.runResolutionSession,
				running,
			);
		} finally {
			globalThis.fetch = previousFetch;
		}

		expect(providerRequests).toEqual([]);
		expect(await session(t, "request-1")).toMatchObject({
			lifecycle: { state: "Terminal", outcome: "Complete" },
			readingId: committed.readingId,
			attestationId: committed.attestationId,
		});
		expect(await rows(t, "resolutionRuns")).toEqual([
			expect.objectContaining({
				runToken: running.runToken,
				state: "Succeeded",
				generationEvents: [],
			}),
		]);
		expect(await segmentState(t, segmentId)).toBeNull();
	});

	test("a loser that fails after another session committed converges on the winner", async () => {
		const t = createTestConvex();
		const { select, segmentId } = await bankenSource(t);
		const failing = await startSession(t, select("request-generation"));
		const missing = await startSession(
			t,
			select("request-miss", "visitor-2"),
		);
		for (const guard of [failing, missing])
			await t.mutation(internal.resolutionSessions.beginRun, { guard });
		await t.mutation(internal.resolutionSessions.advance, {
			guard: failing,
			progress: "GrammarAvailable",
			grammar: grammarProjection("loser"),
		});
		await t.mutation(internal.resolutionSessions.advance, {
			guard: failing,
			progress: "ReadingAvailable",
			reading: readingProjection("🧪", "loser"),
		});
		const winner = await commitBankOccurrence(
			t,
			select("request-winner", "visitor-3"),
		);

		await t.mutation(internal.resolutionSessions.recordRunFailure, {
			guard: failing,
			failure: {
				kind: "Generation",
				phase: "Commit",
				failure: {
					attempts: 1,
					category: "ProviderUnavailable",
					retryable: false,
				},
			},
		});
		await t.mutation(
			internal.catalogGrowthSignals.recordAndSettleCatalogMiss,
			{
				guard: missing,
				miss: {
					decision: "CatalogMiss",
					route: "de/Lexeme/NOUN",
					stage: "resolveGrammar",
					message: "No reviewed member matches",
				},
			},
		);

		for (const [requestId, visitorId] of [
			["request-generation", "visitor-1"],
			["request-miss", "visitor-2"],
		] as const) {
			const converged = await session(t, requestId);
			expect(converged).toMatchObject({
				lifecycle: { state: "Terminal", outcome: "Complete" },
				readingId: winner.readingId,
				attestationId: winner.attestationId,
				grammar: { canonicalForm: "Bank" },
				reading: { emojiDescription: "🏦", canonicalForm: "Bank" },
			});
			expect(converged).not.toHaveProperty("failureCode");
			const encounter = (await rows(t, "visitorClicks")).find(
				(row) => row.visitorId === visitorId,
			);
			expect(encounter?.attestationId).toBe(winner.attestationId);
		}
		expect(await segmentState(t, segmentId)).toBeNull();
	});

	test("retrying a failure after another session committed lands on the winner", async () => {
		const t = createTestConvex();
		const { select } = await bankenSource(t);
		const failed = await startSession(t, select("request-failed"));
		await t.mutation(internal.resolutionSessions.recordRunFailure, {
			guard: failed,
			failure: {
				kind: "Internal",
				phase: "Grammar",
				diagnosticId: "diagnostic-1",
				errorName: "Error",
				errorFingerprint: "fnv1a-1",
			},
		});
		const winner = await commitBankOccurrence(
			t,
			select("request-winner", "visitor-2"),
		);
		const scheduledBefore = await pendingScheduled(t);

		expect(
			await t.mutation(api.resolutionSessions.retryResolution, {
				requestId: "request-failed",
				visitorId: "visitor-1",
			}),
		).toEqual({ retried: true });

		expect(await session(t, "request-failed")).toMatchObject({
			lifecycle: { state: "Terminal", outcome: "Complete" },
			attestationId: winner.attestationId,
		});
		expect(
			(await pendingScheduled(t)).filter(
				({ name }) => name === "orchestration:runResolutionSession",
			),
		).toEqual(
			scheduledBefore.filter(
				({ name }) => name === "orchestration:runResolutionSession",
			),
		);
	});

	test("a reused-occurrence commit completes a session whose Encounter predates the winner", async () => {
		const t = createTestConvex();
		const { select } = await bankenSource(t);
		const loser = await startSession(t, select("request-loser"));
		const winner = await commitBankOccurrence(
			t,
			select("request-winner", "visitor-2"),
		);

		expect(
			await t.mutation(internal.persistence.persistReusedResolvedClick, {
				...select("request-loser"),
				attestationId: winner.attestationId,
				sessionGuard: loser,
			}),
		).toMatchObject({
			status: "Reused",
			readingId: winner.readingId,
			attestationId: winner.attestationId,
			deduplicated: false,
		});
		expect(await session(t, "request-loser")).toMatchObject({
			lifecycle: { state: "Terminal", outcome: "Complete" },
			attestationId: winner.attestationId,
		});
	});

	test("the Segment stays Active while any of several sessions is live", async () => {
		const t = createTestConvex();
		const { select, segmentId } = await bankenSource(t);
		const first = await startSession(t, select("request-1"));
		await startSession(t, select("request-2"));
		await startSession(t, select("request-3", "visitor-2"));
		await startSession(t, select("request-4", "visitor-3"));
		expect(await segmentState(t, segmentId)).toEqual({
			kind: "Active",
			activeSessionCount: 4,
		});

		await t.mutation(internal.persistence.persistUnresolvedClick, {
			...select("request-1"),
			sessionGuard: first,
		});
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

	test("the scheduled run records an unexpected failure and ends its session", async () => {
		const t = createTestConvex();
		const { select, segmentId } = await bankenSource(t);
		// A malformed stored Lemma found under the clicked word breaks the run.
		await t.run((ctx) =>
			ctx.db.insert("lemmas", {
				lemmaKey: "malformed",
				language: "de",
				family: "Lexeme",
				kind: "NOUN",
				canonicalForm: "Banken",
				coreFeatures: "secret-malformed-features",
			}),
		);
		const guard = await startSession(t, select("request-1"));
		const providerRequests: string[] = [];
		const errors: string[] = [];
		const previousFetch = globalThis.fetch;
		const previousError = console.error;
		globalThis.fetch = (async (url: string | URL | Request) => {
			providerRequests.push(String(url));
			throw new Error("No model call is expected.");
		}) as typeof fetch;
		console.error = (...values: unknown[]) => {
			errors.push(values.map(String).join(" "));
		};
		try {
			await t.action(internal.orchestration.runResolutionSession, guard);
		} finally {
			globalThis.fetch = previousFetch;
			console.error = previousError;
		}

		expect(providerRequests).toEqual([]);
		const failed = await session(t, "request-1");
		expect(failed).toMatchObject({
			lifecycle: { state: "Terminal", outcome: "PermanentFailure" },
			failureCode: "Internal",
			failureMessage: "Resolution could not be completed.",
		});
		expect(await rows(t, "resolutionRuns")).toEqual([
			expect.objectContaining({
				state: "Failed",
				failureCode: "Internal",
				diagnosticId: failed.diagnosticId,
				errorName: expect.any(String),
				errorFingerprint: expect.stringContaining("fnv1a-"),
			}),
		]);
		expect(errors.join("\n")).toContain("ResolutionRunInternalFailure");
		expect(errors.join("\n")).not.toContain("secret-malformed-features");
		expect(await segmentState(t, segmentId)).toEqual({
			kind: "PermanentFailure",
		});
	});

	test("reset batches spend one budget on sessions and end their Segment state", async () => {
		const t = createTestConvex();
		const { select, segmentId } = await bankenSource(t);
		for (let index = 0; index < 401; index += 1)
			await t.mutation(api.resolutionSessions.selectSegment, {
				...select(`request-${index}`),
				routeNoteRequested: false,
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

async function startSessionGuard(
	t: TestConvexDb,
	requestId: string,
): Promise<SessionGuard> {
	const row = await session(t, requestId);
	return { requestId, runToken: row.runToken, segmentId: row.segmentId };
}

test("progress cannot skip", () => {
	expect(() =>
		assertResolutionProgressTransition(
			"RouteAvailable",
			"GrammarAvailable",
		),
	).not.toThrow();
	expect(() =>
		assertResolutionProgressTransition(
			"RouteAvailable",
			"ReadingAvailable",
		),
	).toThrow("cannot follow");
});

test("every legal Resolution lifecycle variant is accepted", () => {
	const progresses = [
		"Starting",
		"RouteAvailable",
		"GrammarAvailable",
		"ReadingAvailable",
		"Committing",
	] as const;
	for (const progress of progresses) {
		for (const activity of ["Scheduled", "Running"] as const) {
			expect(() =>
				assertResolutionLifecycle({
					state: "Active",
					progress,
					activity,
				}),
			).not.toThrow();
		}
		for (const outcome of ["Unresolved", "PermanentFailure"] as const) {
			expect(() =>
				assertResolutionLifecycle({
					state: "Terminal",
					progress,
					outcome,
				}),
			).not.toThrow();
		}
	}
	expect(() =>
		assertResolutionLifecycle({
			state: "Terminal",
			progress: "Committing",
			outcome: "Complete",
		}),
	).not.toThrow();
});

test("impossible active and terminal lifecycle combinations are rejected", () => {
	for (const impossible of [
		{
			state: "Active",
			progress: "Starting",
			activity: "Scheduled",
			outcome: "Complete",
		},
		{
			state: "Active",
			progress: "Starting",
			activity: "WaitingForRetry",
		},
		{
			state: "Terminal",
			progress: "Starting",
			activity: "Running",
			outcome: "Unresolved",
		},
		{ state: "Terminal", progress: "Starting", outcome: "Complete" },
	] as const) {
		expect(() => assertResolutionLifecycle(impossible)).toThrow();
	}
});

test("analysis history survives without a resolution session and is scoped to its visitor", async () => {
	const t = createTestConvex();
	await t.mutation(internal.resolutionInspection.beginAnalysis, {
		requestId: "analysis-1",
		visitorId: "visitor-1",
		sourceText: "Hallo. Welt!",
	});

	expect(
		await t.query(api.resolutionInspection.detail, {
			requestId: "analysis-1",
			visitorId: "visitor-2",
		}),
	).toBeNull();
	expect(
		await t.query(api.resolutionInspection.detail, {
			requestId: "analysis-1",
			visitorId: "visitor-1",
		}),
	).toMatchObject({ state: "Running", finishedAt: null });
	await t.mutation(internal.resolutionInspection.finishAnalysis, {
		requestId: "analysis-1",
		state: "PermanentFailure",
	});
	expect(
		await t.query(api.resolutionInspection.detail, {
			requestId: "analysis-1",
			visitorId: "visitor-1",
		}),
	).toMatchObject({
		state: "PermanentFailure",
		finishedAt: expect.any(Number),
	});
});

test("beginRun atomically claims work, loads sentence and stored Surface candidates, and rejects duplicate runners", async () => {
	const t = createTestConvex();
	const other = await submitText(t, [["Banken"]], {
		submissionKey: "earlier",
	});
	const otherSentenceId = other.sentenceIds[0];
	if (!otherSentenceId) throw new Error("Expected a Sentence.");
	// An earlier occurrence stores the Bank Lemma and its Banken Surface.
	await commitBankOccurrence(t, {
		requestId: "request-0",
		visitorId: "visitor-0",
		sentenceId: otherSentenceId,
		clickedSegmentIndex: 0,
	});
	await t.run(async (ctx) => {
		for (const run of await ctx.db.query("resolutionRuns").collect())
			await ctx.db.delete(run._id);
	});
	const { select } = await bankenSource(t);
	const guard = await startSession(t, select("request-1"));

	expect(
		await t.mutation(internal.resolutionSessions.beginRun, {
			guard: { ...guard, runToken: "stale" },
		}),
	).toBeNull();
	expect(await rows(t, "resolutionRuns")).toHaveLength(0);
	expect(
		await t.mutation(internal.resolutionSessions.beginRun, { guard }),
	).toMatchObject({
		selection: { requestId: "request-1" },
		checkpoints: {},
		context: {
			recorded: null,
			reusable: null,
			sentence: { stitchedText: "Die Banken." },
			lemmaCandidates: [
				{
					lemma: expect.objectContaining({ canonicalForm: "Bank" }),
					foundUnder: ["Banken"],
				},
			],
		},
	});
	expect(await session(t, "request-1")).toMatchObject({
		lifecycle: {
			state: "Active",
			progress: "RouteAvailable",
			activity: "Running",
		},
	});
	expect(await rows(t, "resolutionRuns")).toHaveLength(1);
	expect(
		await t.mutation(internal.resolutionSessions.beginRun, { guard }),
	).toBeNull();
	expect(await rows(t, "resolutionRuns")).toHaveLength(1);
});

test("a stored Grammar checkpoint is restored when a run resumes", async () => {
	const t = createTestConvex();
	const { select, sentenceId } = await bankenSource(t);
	const guard = await startSession(t, select("request-1"));
	await t.mutation(internal.resolutionSessions.beginRun, { guard });
	await t.mutation(internal.resolutionSessions.advance, {
		guard,
		progress: "GrammarAvailable",
		grammar: grammarProjection(),
		grammaticalCheckpoint: bankGrammar(sentenceId),
	});
	const stored = await session(t, "request-1");
	await patchSession(t, "request-1", {
		lifecycle: {
			state: "Active",
			progress: "GrammarAvailable",
			activity: "Scheduled",
		},
	});

	const claimed = await t.mutation(internal.resolutionSessions.beginRun, {
		guard,
	});

	expect(stored.grammaticalCheckpoint).toBeDefined();
	expect(claimed?.checkpoints.grammatical).toMatchObject({
		decision: "Resolved",
		attestation: { members: [{ attested: "Banken" }] },
	});
	expect(claimed?.context.lemmaCandidates).toEqual([]);
});

function grammaticalInput(canonicalForm = "Bank") {
	return {
		decision: "Resolved" as const,
		attestation: {
			unitKind: "Attestation",
			members: [{ attested: "Banken", orthography: "Standard" as const }],
			realizationCoverage: "Full" as const,
			surface: {
				unitKind: "Surface",
				normalizedSurface: "Banken",
				spelling: "Canonical" as const,

				lemma: { canonicalForm, family: "Lexeme", kind: "NOUN" },
			},
		},
		provider: { raw: "must not leak" },
	};
}

function readingInput(emojiDescription = "🏦", canonicalForm = "Bank") {
	return {
		unitKind: "Reading",
		emojiDescription,
		lemma: { canonicalForm, family: "Lexeme", kind: "NOUN" },
		plan: { raw: "must not leak" },
	};
}

function grammarProjection(canonicalForm = "Bank") {
	return {
		members: [{ attested: "Banken", orthography: "Standard" as const }],
		realizationCoverage: "Full" as const,
		normalizedSurface: "Banken",
		spelling: "Canonical" as const,
		grundform: false as const,
		canonicalForm,
		family: "Lexeme",
		kind: "NOUN",
	};
}

function readingProjection(emojiDescription = "🏦", canonicalForm = "Bank") {
	return {
		emojiDescription,
		canonicalForm,
		family: "Lexeme",
		kind: "NOUN",
	};
}
