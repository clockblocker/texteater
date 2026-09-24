import {
	afterEach,
	beforeEach,
	expect,
	jest,
	setSystemTime,
	test,
} from "bun:test";
import { makeFunctionReference } from "convex/server";
import { v } from "convex/values";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { internalMutation } from "../convex/_generated/server";
import { consumeRateLimit, RATE_LIMITS } from "../convex/rateLimits";
import {
	createTestConvex,
	createTestConvexWith,
	submitText,
	type TestConvexDb,
} from "./support/convex";

beforeEach(() => {
	// Sessions schedule their runs; no run executes here.
	jest.useFakeTimers();
	setSystemTime(new Date("2026-01-01T12:00:00Z"));
});

afterEach(() => {
	setSystemTime();
	jest.useRealTimers();
});

const PER_VISITOR = RATE_LIMITS.segmentSelection.rate;
const GLOBAL = RATE_LIMITS.segmentSelectionGlobal.rate;

type Word = { sentenceId: Id<"sentences">; clickedSegmentIndex: number };

/** A Text with `count` fresh words, each its own resolvable Segment. */
async function words(t: TestConvexDb, count: number): Promise<Word[]> {
	const sentences = Array.from({ length: Math.ceil(count / 10) }, (_, row) =>
		Array.from({ length: 10 }, (_, column) => [
			`wort${row * 10 + column}`,
			" ",
		])
			.flat()
			.slice(0, -1),
	);
	const { sentenceIds } = await submitText(t, sentences);
	return Array.from({ length: count }, (_, index) => {
		const sentenceId = sentenceIds[Math.floor(index / 10)];
		if (!sentenceId) throw new Error("Expected a Sentence.");
		return { sentenceId, clickedSegmentIndex: (index % 10) * 2 };
	});
}

async function select(
	t: TestConvexDb,
	visitorId: string,
	word: Word | undefined,
) {
	if (!word) throw new Error("Expected a word.");
	return t.mutation(api.resolutionSessions.selectSegment, {
		requestId: crypto.randomUUID(),
		visitorId,
		...word,
		routeNoteRequested: false,
	});
}

async function scheduledRuns(t: TestConvexDb) {
	return (
		await t.run((ctx) =>
			ctx.db.system.query("_scheduled_functions").collect(),
		)
	).filter(({ name }) => name === "orchestration:runResolutionSession")
		.length;
}

test("selecting past the per-Visitor limit is rejected without scheduling a run", async () => {
	const t = createTestConvex();
	const available = await words(t, PER_VISITOR + 2);
	for (const word of available.slice(0, PER_VISITOR))
		await select(t, "visitor-1", word);
	expect(await scheduledRuns(t)).toBe(PER_VISITOR);

	await expect(
		select(t, "visitor-1", available[PER_VISITOR]),
	).rejects.toMatchObject({
		data: {
			code: "RateLimited",
			message: expect.stringContaining("try again"),
		},
	});
	expect(await scheduledRuns(t)).toBe(PER_VISITOR);
	// A repeat click joins its running session and costs nothing.
	expect(await select(t, "visitor-1", available[0])).toMatchObject({
		kind: "Resolving",
	});
	expect(await select(t, "visitor-2", available[PER_VISITOR])).toMatchObject({
		kind: "Resolving",
	});
});

test("another Visitor is unaffected until the global bucket runs out", async () => {
	const drain = makeFunctionReference<"mutation">("drainLimits:drain");
	const t = createTestConvexWith({
		"drainLimits.ts": async () => ({
			drain: internalMutation({
				args: { count: v.number() },
				handler: async (ctx, { count }) => {
					for (let index = 0; index < count; index += 1)
						await consumeRateLimit(
							ctx,
							"segmentSelection",
							`crowd-${index}`,
						);
				},
			}),
		}),
	});
	const available = await words(t, 3);
	await select(t, "visitor-1", available[0]);
	await t.mutation(drain, { count: GLOBAL - 2 });

	expect(await select(t, "visitor-2", available[1])).toMatchObject({
		kind: "Resolving",
	});
	await expect(select(t, "visitor-3", available[2])).rejects.toMatchObject({
		data: { code: "RateLimited" },
	});
});

test("reading at a human pace stays under both limits", async () => {
	const t = createTestConvex();
	const available = await words(t, 120);
	let now = Date.now();
	// One new word every two seconds for four minutes.
	for (const word of available) {
		now += 2_000;
		setSystemTime(now);
		await select(t, "visitor-1", word);
	}
	expect(await scheduledRuns(t)).toBe(120);
});

test("a submission past the per-Visitor limit is Rejected before any model call", async () => {
	const t = createTestConvex();
	const drain = RATE_LIMITS.textSubmission.rate;
	// Re-submitting an analysed Text starts no intake, so it never counts.
	await submitText(t, [["Die", " ", "Banken", "."]]);
	const previousFetch = globalThis.fetch;
	const requests: string[] = [];
	globalThis.fetch = (async (url: string | URL | Request) => {
		requests.push(String(url));
		return new Response("unavailable", { status: 503 });
	}) as typeof fetch;
	try {
		for (let index = 0; index < drain + 1; index += 1)
			expect(
				await t.action(api.orchestration.submitText, {
					visitorId: "visitor-1",
					submissionKey: "Die Banken.",
					sourceText: "Die Banken.",
				}),
			).toMatchObject({ status: "Accepted" });
		for (let index = 0; index < drain; index += 1)
			await t
				.action(api.orchestration.submitText, {
					visitorId: "visitor-1",
					submissionKey: `new-${index}`,
					sourceText: `Neuer Satz ${index}.`,
				})
				.catch(() => undefined);
		const before = requests.length;

		expect(
			await t.action(api.orchestration.submitText, {
				visitorId: "visitor-1",
				submissionKey: "one-more",
				sourceText: "Noch ein Satz.",
			}),
		).toEqual({
			status: "Rejected",
			message: expect.stringContaining("try again"),
		});
		expect(requests.length).toBe(before);
	} finally {
		globalThis.fetch = previousFetch;
	}
});
