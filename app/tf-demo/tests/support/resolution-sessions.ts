import type { WithoutSystemFields } from "convex/server";
import type * as Dumling from "dumling/types";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { submitText, type TestConvexDb } from "./convex";
import {
	bankenSurface,
	bankLemma,
	bankOccurrenceCommit,
	bankReading,
	type Selection,
	type SessionGuard,
} from "./occurrences";

/*
 * The sources, projections and row reads the Resolution Session tests share.
 */

/** A stored "Die Banken." whose `Banken` Segment sits at index 2. */
export async function bankenSource(t: TestConvexDb) {
	const { scrollId, sentenceIds, segmentIds } = await submitText(t, [
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
	return { scrollId, sentenceId, segmentId, select };
}

export function session(t: TestConvexDb, requestId: string) {
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
export function segmentState(t: TestConvexDb, segmentId: Id<"segments">) {
	return t.run(
		async (ctx) => (await ctx.db.get(segmentId))?.resolutionState ?? null,
	);
}

export function rows<
	Table extends
		| "resolutionRuns"
		| "resolutionSessions"
		| "visitorEncounters"
		| "knowledgeGenerationAttempts"
		| "inspectionClicks"
		| "inspectionSteps"
		| "inspectionPayloads",
>(t: TestConvexDb, table: Table) {
	return t.run((ctx) => ctx.db.query(table).collect());
}

/** Scheduled functions not yet run, by name. */
export async function pendingScheduled(t: TestConvexDb) {
	const jobs = await t.run((ctx) =>
		ctx.db.system.query("_scheduled_functions").collect(),
	);
	return jobs
		.filter((job) => job.state.kind === "pending")
		.map((job) => ({ name: job.name, args: job.args[0] }));
}

/** Moves a live session to a state a test starts from. */
export async function patchSession(
	t: TestConvexDb,
	requestId: string,
	values: Partial<WithoutSystemFields<Doc<"resolutionSessions">>>,
) {
	const row = await session(t, requestId);
	await t.run((ctx) => ctx.db.patch(row._id, values));
}

/** A Resolved Grammar checkpoint for `Banken` in "Die Banken.". */
export function bankGrammar(sentenceId: Id<"sentences">) {
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
				segmentId: "" as Id<"segments">,
			},
		).occurrence.attestation,
	};
}

export async function startSessionGuard(
	t: TestConvexDb,
	requestId: string,
): Promise<SessionGuard> {
	const row = await session(t, requestId);
	return { requestId, runToken: row.runToken, segmentId: row.segmentId };
}

export function grammaticalInput(canonicalForm = "Bank") {
	const attestation: Dumling.Attestation<"de", "Lexeme", "NOUN"> = {
		unitKind: "Attestation",
		members: [{ attested: "Banken", orthography: "Standard" }],
		realizationCoverage: "Full",
		articleEvidence: null,
		valencyEvidence: [],
		surface: { ...bankenSurface, lemma: { ...bankLemma, canonicalForm } },
	};
	return {
		decision: "Resolved" as const,
		attestation,
		provider: { raw: "must not leak" },
	};
}

export function readingInput(emojiDescription = "🏦", canonicalForm = "Bank") {
	const reading: Dumling.Reading<"de", "Lexeme", "NOUN"> = {
		unitKind: "Reading",
		emojiDescription,
		lemma: { ...bankLemma, canonicalForm },
	};
	return { ...reading, plan: { raw: "must not leak" } };
}

export function grammarProjection(canonicalForm = "Bank") {
	return {
		members: [{ attested: "Banken", orthography: "Standard" as const }],
		valencyMembers: [],
		realizationCoverage: "Full" as const,
		normalizedSurface: "Banken",
		spelling: { kind: "Canonical" as const },
		grundform: false as const,
		canonicalForm,
		family: "Lexeme" as const,
		kind: "NOUN" as const,
		coreFeatures: { gender: "Fem" as const },
	};
}

/** What a resolved click's commit saves beside it: its Reading and its run's record. */
export const commitProgress = {
	readingAvailable: {
		reading: readingProjection(),
		readingCheckpoint: {
			resolution: { decision: "New" as const, emojiDescription: "🏦" },
			reading: bankReading,
		},
	},
	succeeded: { phase: "Commit" as const, generationEvents: [] },
};

export function readingProjection(
	emojiDescription = "🏦",
	canonicalForm = "Bank",
) {
	return {
		emojiDescription,
		canonicalForm,
		family: "Lexeme" as const,
		kind: "NOUN" as const,
	};
}
