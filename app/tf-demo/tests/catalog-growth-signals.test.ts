import { describe, expect, test } from "bun:test";
import type { LemmaCatalogMiss } from "dumgen";
import {
	recordAndSettleCatalogMiss,
	recordKnowledgeCatalogMiss,
} from "../convex/catalogGrowthSignals";
import { IndexedTestDb, runTestMutation } from "./support/indexed-db";

const miss = {
	decision: "CatalogMiss",
	reason: "MemberNotCatalogued",
	language: "de",
	route: { family: "Lexeme", kind: "VERB" },
	stage: "Lemma",
	candidate: {
		language: "de",
		family: "Lexeme",
		kind: "VERB",
		canonicalForm: "wachsen",
		coreFeatures: {
			verbType: null,
			lexicallyReflexive: null,
			hasSepPrefix: null,
			hasGovPrep: null,
		},
	},
} as const satisfies LemmaCatalogMiss;

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
			language: "de",
			family: "Lexeme",
			kind: "VERB",
			stage: "Lemma",
			reason: "MemberNotCatalogued",
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

	test("rejects every Catalog Miss stage when route evidence disagrees", async () => {
		const reading = { lemma: miss.candidate, emojiDescription: "🌱" };
		const mismatches = [
			{
				...miss,
				route: { family: "Lexeme", kind: "NOUN" },
			},
			{
				...miss,
				route: { family: "Lexeme", kind: "NOUN" },
				stage: "Reading",
				candidate: reading,
			},
			{
				...miss,
				route: { family: "Lexeme", kind: "NOUN" },
				stage: "ReadingKnowledge",
				reading,
				missingRequest: { definition: null },
			},
		] as const;

		for (const [index, mismatchedMiss] of mismatches.entries()) {
			const suffix = String(index + 1);
			const requestId = `request-${suffix}`;
			const runToken = `run-${suffix}`;
			const db = new IndexedTestDb(
				seedSession(requestId, runToken, suffix),
			);
			expect(
				runTestMutation(db, recordAndSettleCatalogMiss, {
					guard: {
						requestId,
						runToken,
						segmentId: `segment-${suffix}`,
					},
					miss: mismatchedMiss,
				}),
			).rejects.toThrow("route must match");
			expect(db.rows("catalogGrowthSignals")).toHaveLength(0);
			expect(db.rows("resolutionSessions")[0]?.lifecycle).toEqual({
				state: "Active",
				progress: "RouteAvailable",
				activity: "Running",
			});
		}
	});

	test("records a Knowledge catalog miss and fails its attempt exactly once", async () => {
		const knowledgeMiss = {
			...miss,
			stage: "ReadingKnowledge",
			reading: {
				lemma: miss.candidate,
				emojiDescription: "🌱",
			},
			missingRequest: { definition: null },
		} as const;
		const { candidate: _candidate, ...withoutCandidate } = knowledgeMiss;
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
