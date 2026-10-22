import { afterEach, beforeEach, describe, expect, jest, test } from "bun:test";
import type * as Dumling from "dumling/types";
import { api, internal } from "../convex/_generated/api";
import { createDumdictTransaction } from "../convex/model/dumdictTransaction";
import { createTestConvex, submitText } from "./support/convex";
import { enableDeploymentFlags } from "./support/deploymentFlags";
import {
	bankOccurrenceCommit,
	bankReading,
	commitBankOccurrence,
	dieBankenOccurrenceCommit,
	type Selection,
	type SessionGuard,
	startSession,
} from "./support/occurrences";
import {
	bankenSource,
	bankGrammar,
	commitProgress,
	grammarProjection,
	patchSession,
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
	test("a complete Session names its Reading and canonical occurrence", async () => {
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
		expect(
			(
				await t.query(api.resolutionSessions.getResolutionNote, {
					requestId: "request-1",
				})
			)?.lifecycle,
		).toMatchObject({
			outcome: "Complete",
			readingId: committed.readingId,
			canonical: {
				readingId: committed.readingId,
				surfaceLanguage: "de",
				normalizedSurface: "Banken",
				surfaceId,
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
		await t.mutation(internal.resolutionSessions.recordRunFailure, {
			guard: earlier,
			failure: {
				kind: "Internal",
				phase: "Grammar",
				diagnosticId: "diagnostic-earlier",
				errorName: "Error",
				errorFingerprint: "earlier",
			},
		});
		const later = await startSession(t, select("request-later"));
		const winner = await startSession(
			t,
			select("request-winner", "visitor-2"),
		);
		expect(await segmentState(t, segmentId)).toEqual({
			kind: "Active",
			activeSessionCount: 2,
		});
		const committed = await t.mutation(
			internal.persistence.persistResolvedClick,
			bankOccurrenceCommit(select("request-winner", "visitor-2"), winner),
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

		// The later run finds the committed membership and reuses it.
		expect(
			await t.mutation(internal.persistence.persistReusedResolvedClick, {
				...select("request-later"),
				sessionGuard: later,
				attestationId: committed.attestationId,
			}),
		).toMatchObject({
			status: "Reused",
			attestationId: committed.attestationId,
		});
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

	test("a resolved commit saves its ReadingAvailable progress and the run's success in its own transaction", async () => {
		const t = createTestConvex();
		const { sentenceId, select } = await bankenSource(t);
		const guard = await startSession(t, select("request-1"));
		await t.mutation(internal.resolutionSessions.beginRun, { guard });
		await t.mutation(internal.resolutionSessions.advance, {
			guard,
			progress: "GrammarAvailable",
			grammar: grammarProjection(),
			grammaticalCheckpoint: bankGrammar(sentenceId),
		});
		expect(
			await t.mutation(internal.persistence.persistResolvedClick, {
				...bankOccurrenceCommit(select("request-1"), guard),
				...commitProgress,
			}),
		).toMatchObject({ status: "Committed" });
		expect(await session(t, "request-1")).toMatchObject({
			lifecycle: { state: "Terminal", outcome: "Complete" },
			readingCheckpoint:
				commitProgress.readingAvailable.readingCheckpoint,
		});
		expect(await rows(t, "resolutionRuns")).toEqual([
			expect.objectContaining({
				runToken: guard.runToken,
				state: "Succeeded",
				phase: "Commit",
				generationEvents: [],
			}),
		]);
	});

	test("a New refused as stale saves its progress and leaves the run's record to the commit that follows", async () => {
		const t = createTestConvex();
		const { sentenceId, select } = await bankenSource(t);
		const guard = await startSession(t, select("request-1"));
		await t.mutation(internal.resolutionSessions.beginRun, { guard });
		await t.mutation(internal.resolutionSessions.advance, {
			guard,
			progress: "GrammarAvailable",
			grammar: grammarProjection(),
			grammaticalCheckpoint: bankGrammar(sentenceId),
		});
		// Another click stores Bank's 🪑 after this judge saw no Reading.
		await t.run((ctx) =>
			createDumdictTransaction(ctx).addNewNote({
				draft: {
					reading: {
						...bankReading,
						emojiDescription: "🪑",
					} as Dumling.Reading<"de">,
					note: {
						attestedTranslations: [],
						attestations: [],
						notes: "",
					},
				},
			}),
		);
		const stale = await t.mutation(
			internal.persistence.persistResolvedClick,
			{
				...bankOccurrenceCommit(select("request-1"), guard, "New"),
				readingCandidates: [],
				...commitProgress,
			},
		);
		expect(stale).toMatchObject({ status: "StaleReading" });
		expect(await session(t, "request-1")).toMatchObject({
			lifecycle: { state: "Active", progress: "ReadingAvailable" },
		});
		expect(await rows(t, "resolutionRuns")).toEqual([
			expect.objectContaining({ state: "Running" }),
		]);
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
