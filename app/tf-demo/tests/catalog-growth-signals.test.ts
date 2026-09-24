import { afterEach, beforeEach, describe, expect, jest, test } from "bun:test";
import { api, internal } from "../convex/_generated/api";
import type { Id, TableNames } from "../convex/_generated/dataModel";
import type { CatalogMissSignal } from "../server/resolutionGrammar";
import {
	createTestConvex,
	submitText,
	type TestConvexDb,
} from "./support/convex";

const miss = {
	decision: "CatalogMiss",
	route: "de/Lexeme/DET",
	stage: "resolveGrammar",
	message: "No reviewed member matches",
} as const satisfies CatalogMissSignal;

/**
 * Clicks the only Segment of a fresh Text, advances its session to where
 * grammar resolution runs, and returns the session guard.
 */
async function startSession(t: TestConvexDb, requestId: string) {
	const { sentenceIds } = await submitText(t, [[requestId]], {
		submissionKey: requestId,
	});
	const sentenceId = sentenceIds[0];
	if (!sentenceId) throw new Error("Expected a stored Sentence.");
	await t.mutation(api.resolutionSessions.selectSegment, {
		requestId,
		visitorId: `visitor-${requestId}`,
		sentenceId,
		clickedSegmentIndex: 0,
		routeNoteRequested: false,
	});
	const session = await t.run(async (ctx) => {
		const row = await ctx.db
			.query("resolutionSessions")
			.withIndex("by_request_id", (q) => q.eq("requestId", requestId))
			.unique();
		if (!row) throw new Error("Expected an active session.");
		await ctx.db.patch(row._id, {
			lifecycle: {
				state: "Active",
				progress: "RouteAvailable",
				activity: "Running",
			},
		});
		return row;
	});
	return {
		requestId,
		runToken: session.runToken,
		segmentId: session.segmentId,
	};
}

function tableRows<Table extends TableNames>(t: TestConvexDb, table: Table) {
	return t.run((ctx) => ctx.db.query(table).collect());
}

beforeEach(() => {
	// A Segment Selection schedules its Resolution Session; nothing here runs it.
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

describe("Catalog Growth Signals", () => {
	test("aggregates equal misses and atomically fails each active session", async () => {
		const t = createTestConvex();
		const guards = [
			await startSession(t, "request-1"),
			await startSession(t, "request-2"),
		];

		for (const guard of guards) {
			await t.mutation(
				internal.catalogGrowthSignals.recordAndSettleCatalogMiss,
				{ guard, miss },
			);
		}

		const signals = await tableRows(t, "catalogGrowthSignals");
		expect(signals).toHaveLength(1);
		expect(signals[0]).toMatchObject({
			route: miss.route,
			stage: miss.stage,
			occurrences: 2,
			lastRequestId: "request-2",
		});
		expect(
			(await tableRows(t, "resolutionSessions")).map(
				({ lifecycle }) => lifecycle,
			),
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
		const t = createTestConvex();
		const args = { guard: await startSession(t, "request-1"), miss };
		await t.mutation(
			internal.catalogGrowthSignals.recordAndSettleCatalogMiss,
			args,
		);

		await expect(
			t.mutation(
				internal.catalogGrowthSignals.recordAndSettleCatalogMiss,
				args,
			),
		).rejects.toThrow("no longer active");
		expect(
			(await tableRows(t, "catalogGrowthSignals"))[0]?.occurrences,
		).toBe(1);
	});

	test("rejects oversized catalog diagnostics without changing the session", async () => {
		const t = createTestConvex();
		const guard = await startSession(t, "request-1");
		const [before] = await tableRows(t, "resolutionSessions");
		await expect(
			t.mutation(
				internal.catalogGrowthSignals.recordAndSettleCatalogMiss,
				{ guard, miss: { ...miss, message: "x".repeat(2001) } },
			),
		).rejects.toThrow("too long");
		expect(await tableRows(t, "catalogGrowthSignals")).toHaveLength(0);
		expect(await tableRows(t, "resolutionSessions")).toEqual([before]);
	});

	test("records a Knowledge catalog miss and fails its attempt exactly once", async () => {
		const t = createTestConvex();
		const withoutCandidate = { ...miss, stage: "produceKnowledge" };
		await t.run(async (ctx) => {
			const lemmaId = await ctx.db.insert("lemmas", {
				lemmaKey: "lemma-key",
				language: "de",
				family: "Lexeme",
				kind: "NOUN",
				canonicalForm: "Bank",
				coreFeatures: {},
			});
			const readingId: Id<"readings"> = await ctx.db.insert("readings", {
				readingKey: "reading-key",
				lemmaId,
				emojiDescription: "🏦",
			});
			const surfaceId = await ctx.db.insert("surfaces", {
				surfaceKey: "surface-key",
				lemmaId,
				language: "de",
				normalizedSurface: "Bank",
				spelling: "Canonical",
				surfaceFeatures: {},
			});
			const attestationId = await ctx.db.insert("attestations", {
				surfaceId,
				readingId,
				realizationCoverage: "Full",
			});
			await ctx.db.insert("knowledgeGenerationAttempts", {
				attemptKey: "attempt-key",
				visitorId: "visitor-1",
				ownerReadingKey: "reading-key",
				readingId,
				attestationId,
				state: "Running",
				createdAt: 1,
				updatedAt: 1,
			});
		});

		for (let call = 0; call < 2; call += 1) {
			await t.mutation(
				internal.catalogGrowthSignals.recordKnowledgeCatalogMiss,
				{
					attemptKey: "attempt-key",
					runNumber: 1,
					miss: withoutCandidate,
				},
			);
		}

		expect(
			(await tableRows(t, "catalogGrowthSignals"))[0]?.occurrences,
		).toBe(1);
		expect(
			await t.run((ctx) =>
				ctx.db.query("knowledgeGenerationAttempts").first(),
			),
		).toMatchObject({ state: "Failed", failureCode: "catalogMiss" });
	});
});
