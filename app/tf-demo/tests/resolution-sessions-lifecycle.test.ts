import { afterEach, beforeEach, expect, jest, test } from "bun:test";
import { api, internal } from "../convex/_generated/api";
import {
	assertResolutionLifecycle,
	assertResolutionProgressTransition,
} from "../server/resolutionLifecycle";
import { createTestConvex, submitText } from "./support/convex";
import { enableDeploymentFlags } from "./support/deploymentFlags";
import {
	commitBankOccurrence,
	dieBankenOccurrenceCommit,
	type Selection,
	startSession,
} from "./support/occurrences";
import {
	bankenSource,
	bankGrammar,
	grammarProjection,
	patchSession,
	rows,
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

test("beginRun atomically claims work, loads the sentence and its Lemma candidates, and rejects duplicate runners", async () => {
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
			reusable: null,
			sentence: { stitchedText: "Die Banken." },
			// Hints come from Canonical Forms alone, never from stored
			// Surfaces (#1293): the stored Banken leads to no hint.
			lemmaCandidates: [],
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

test("the Resolution Note quotes the clicked occurrence of a repeated phrase at every stage", async () => {
	const t = createTestConvex();
	const words = [
		"Die",
		" ",
		"Banken",
		" ",
		"und",
		" ",
		"die",
		" ",
		"Banken",
		".",
	];
	const { sentenceIds } = await submitText(t, [words]);
	const sentenceId = sentenceIds[0];
	if (!sentenceId) throw new Error("Expected a Sentence.");
	const selection: Selection = {
		requestId: "request-1",
		visitorId: "visitor-1",
		sentenceId,
		clickedSegmentIndex: 8,
	};
	const members = async () =>
		(
			await t.query(api.resolutionSessions.getResolutionNote, {
				requestId: "request-1",
			})
		)?.source.memberSegmentIndices;

	// Before Grammar the clicked Segment is the only member.
	const guard = await startSession(t, selection);
	expect(await members()).toEqual([8]);

	// Grammar joins the second `die` to the clicked `Banken`.
	const commit = dieBankenOccurrenceCommit(selection, guard, [6, 8]);
	const grammar = bankGrammar(sentenceId);
	await t.mutation(internal.resolutionSessions.beginRun, { guard });
	await t.mutation(internal.resolutionSessions.advance, {
		guard,
		progress: "GrammarAvailable",
		grammar: grammarProjection(),
		grammaticalCheckpoint: {
			...grammar,
			encounter: {
				sentence: {
					...grammar.encounter.sentence,
					segments: words.map((text) => ({
						kind:
							text === " "
								? ("Whitespace" as const)
								: text === "."
									? ("Punctuation" as const)
									: ("ResolvableText" as const),
						text,
					})),
				},
				target: {
					...grammar.encounter.target,
					memberSegmentIndices: [6, 8],
				},
			},
			attestation: commit.occurrence.attestation,
		},
	});
	expect(await members()).toEqual([6, 8]);

	await t.mutation(internal.persistence.persistResolvedClick, commit);
	expect(await members()).toEqual([6, 8]);
});
