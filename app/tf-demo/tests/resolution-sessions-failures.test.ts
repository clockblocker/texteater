import { afterEach, beforeEach, describe, expect, jest, test } from "bun:test";
import { api, internal } from "../convex/_generated/api";
import {
	MAX_RESOLUTION_RUNS,
	STALE_RUN_AFTER_MS,
} from "../server/resolutionLifecycle";
import { createTestConvex } from "./support/convex";
import { enableDeploymentFlags } from "./support/deploymentFlags";
import { startSession } from "./support/occurrences";
import {
	bankenSource,
	grammarProjection,
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
});
