import { describe, expect, test } from "bun:test";
import {
	recordAndSettleCatalogMiss,
	recordKnowledgeCatalogMiss,
} from "../convex/catalogGrowthSignals";
import type { CatalogMissSignal } from "../server/resolutionGrammar";
import { IndexedTestDb, runTestMutation } from "./support/indexed-db";

const miss = {
	decision: "CatalogMiss",
	route: "de/Lexeme/DET",
	stage: "resolveGrammar",
	message: "No reviewed member matches",
} as const satisfies CatalogMissSignal;

function seedSession(requestId: string, runToken: string, suffix: string) {
	return {
		segments: [
			{
				_id: `segment-${suffix}`,
				sentenceId: `sentence-${suffix}`,
				index: 0,
				kind: "ResolvableText",
			},
		],
		resolutionSessions: [
			{
				_id: `session-${suffix}`,
				requestId,
				runToken,
				visitorId: `visitor-${suffix}`,
				sentenceId: `sentence-${suffix}`,
				segmentId: `segment-${suffix}`,
				clickedSegmentIndex: 0,
				lifecycle: {
					state: "Active",
					progress: "RouteAvailable",
					activity: "Running",
				},
				createdAt: 1,
				updatedAt: 1,
			},
		],
	};
}

describe("Catalog Growth Signals", () => {
	test("aggregates equal misses and atomically fails each active session", async () => {
		const first = seedSession("request-1", "run-1", "1");
		const second = seedSession("request-2", "run-2", "2");
		const db = new IndexedTestDb({
			segments: [...first.segments, ...second.segments],
			resolutionSessions: [
				...first.resolutionSessions,
				...second.resolutionSessions,
			],
		});

		for (const [requestId, runToken, suffix] of [
			["request-1", "run-1", "1"],
			["request-2", "run-2", "2"],
		] as const) {
			await runTestMutation(db, recordAndSettleCatalogMiss, {
				guard: { requestId, runToken, segmentId: `segment-${suffix}` },
				miss,
			});
		}

		expect(db.rows("catalogGrowthSignals")).toHaveLength(1);
		expect(db.rows("catalogGrowthSignals")[0]).toMatchObject({
			route: miss.route,
			stage: miss.stage,
			occurrences: 2,
			lastRequestId: "request-2",
		});
		expect(
			db.rows("resolutionSessions").map(({ lifecycle }) => lifecycle),
		).toEqual([
			{
				state: "Terminal",
				progress: "RouteAvailable",
				outcome: "PermanentFailure",
			},
			{
				state: "Terminal",
				progress: "RouteAvailable",
				outcome: "PermanentFailure",
			},
		]);
	});

	test("a retry against the terminal session cannot double count", async () => {
		const db = new IndexedTestDb(seedSession("request-1", "run-1", "1"));
		const args = {
			guard: {
				requestId: "request-1",
				runToken: "run-1",
				segmentId: "segment-1",
			},
			miss,
		};
		await runTestMutation(db, recordAndSettleCatalogMiss, args);

		expect(
			runTestMutation(db, recordAndSettleCatalogMiss, args),
		).rejects.toThrow("no longer active");
		expect(db.rows("catalogGrowthSignals")[0]?.occurrences).toBe(1);
	});

	test("rejects oversized catalog diagnostics without changing the session", async () => {
		const db = new IndexedTestDb(seedSession("request-1", "run-1", "1"));
		await expect(
			runTestMutation(db, recordAndSettleCatalogMiss, {
				guard: {
					requestId: "request-1",
					runToken: "run-1",
					segmentId: "segment-1",
				},
				miss: { ...miss, message: "x".repeat(2001) },
			}),
		).rejects.toThrow("too long");
		expect(db.rows("catalogGrowthSignals")).toHaveLength(0);
	});

	test("records a Knowledge catalog miss and fails its attempt exactly once", async () => {
		const withoutCandidate = { ...miss, stage: "produceKnowledge" };
		const db = new IndexedTestDb({
			knowledgeGenerationAttempts: [
				{
					_id: "attempt-1",
					attemptKey: "attempt-key",
					state: "Running",
				},
			],
		});

		await runTestMutation(db, recordKnowledgeCatalogMiss, {
			attemptKey: "attempt-key",
			miss: withoutCandidate,
		});
		await runTestMutation(db, recordKnowledgeCatalogMiss, {
			attemptKey: "attempt-key",
			miss: withoutCandidate,
		});

		expect(db.rows("catalogGrowthSignals")[0]?.occurrences).toBe(1);
		expect(db.rows("knowledgeGenerationAttempts")[0]).toMatchObject({
			state: "Failed",
			failureCode: "catalogMiss",
		});
	});
});
