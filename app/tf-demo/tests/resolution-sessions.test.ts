import { afterEach, beforeEach, describe, expect, jest, test } from "bun:test";
import { internal } from "../convex/_generated/api";
import {
	assertResolutionLifecycle,
	assertResolutionProgressTransition,
} from "../server/resolutionLifecycle";
import {
	projectResolutionGrammar,
	projectResolutionReading,
} from "../server/resolutionSessionProjection";
import { createTestConvex } from "./support/convex";
import { enableDeploymentFlags } from "./support/deploymentFlags";
import {
	grammarProjection,
	grammaticalInput,
	readingInput,
	readingProjection,
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
	test("projection exposes learner-safe fields only", () => {
		const grammar = projectResolutionGrammar(grammaticalInput("Bank"));
		const reading = projectResolutionReading(readingInput("🏦", "Bank"));
		expect(grammar).toEqual(grammarProjection("Bank"));
		expect(reading).toEqual(readingProjection("🏦", "Bank"));
		expect(JSON.stringify({ grammar, reading })).not.toContain("provider");
		expect(JSON.stringify({ grammar, reading })).not.toContain("plan");
	});

	test("a partial analysis cannot masquerade as a deduplicated reanalysis", async () => {
		const t = createTestConvex();
		// A Sentence whose stored Segments stop short of its text.
		await t.run(async (ctx) => {
			const scrollId = await ctx.db.insert("scrolls", {
				submissionKey: "submission-1",
				sourceText: "Die Banken.",
			});
			const sentenceId = await ctx.db.insert("sentences", {
				segmentedSentenceId: "submission-1:0",
				scrollId,
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
			t.mutation(internal.persistence.persistSubmittedScroll, {
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
						units: [
							{ segments: [0], route: "Unresolved" },
							{ segments: [2], route: "Unresolved" },
						],
					},
				],
			}),
		).rejects.toMatchObject({
			data: {
				code: "Conflict",
				message: expect.stringContaining("analysis is incomplete"),
			},
		});
	});
});

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
