import { afterEach, beforeEach, describe, expect, jest, test } from "bun:test";
import { api, internal } from "../convex/_generated/api";
import { createTestConvex } from "./support/convex";
import { enableDeploymentFlags } from "./support/deploymentFlags";
import {
	bankOccurrenceCommit,
	commitBankOccurrence,
	startSession,
} from "./support/occurrences";
import {
	bankenSource,
	grammarProjection,
	patchSession,
	pendingScheduled,
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
	test("the scheduled run completes an occurrence another session committed, without model work", async () => {
		const t = createTestConvex();
		const { select, segmentId } = await bankenSource(t);
		// Two Visitors select; the second session commits first.
		const running = await startSession(t, select("request-1"));
		const winner = await startSession(t, select("request-2", "visitor-2"));
		const committed = await t.mutation(
			internal.persistence.persistResolvedClick,
			bankOccurrenceCommit(select("request-2", "visitor-2"), winner),
		);
		if (committed.status !== "Committed")
			throw new Error("Expected a committed occurrence.");
		const providerRequests: string[] = [];
		const previousFetch = globalThis.fetch;
		globalThis.fetch = Object.assign(
			async (url: string | URL | Request) => {
				providerRequests.push(String(url));
				throw new Error("No model call is expected.");
			},
			{ preconnect: previousFetch.preconnect },
		);
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
			const encounter = (await rows(t, "visitorEncounters")).find(
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
			// The winner's commit already advanced the loser's Encounter.
			deduplicated: true,
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
				foldedCanonicalForm: "banken",
				coreFeatures: "secret-malformed-features",
			}),
		);
		const guard = await startSession(t, select("request-1"));
		const providerRequests: string[] = [];
		const errors: string[] = [];
		const previousFetch = globalThis.fetch;
		const previousError = console.error;
		globalThis.fetch = Object.assign(
			async (url: string | URL | Request) => {
				providerRequests.push(String(url));
				throw new Error("No model call is expected.");
			},
			{ preconnect: previousFetch.preconnect },
		);
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
