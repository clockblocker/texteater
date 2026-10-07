import { afterEach, beforeEach, expect, jest, test } from "bun:test";
import type * as Dumling from "dumling/types";
import { internal } from "../convex/_generated/api";
import { createDumdictTransaction } from "../convex/model/dumdictTransaction";
import {
	createTestConvex,
	submitText,
	type TestConvexDb,
} from "./support/convex";
import {
	bankLemma,
	bankOccurrenceCommit,
	resolutionSessionRow,
	type Selection,
	startSession,
} from "./support/occurrences";

beforeEach(() => {
	// A Segment Selection schedules its Resolution Session; nothing here runs it.
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

const note = { attestedTranslations: [], attestations: [], notes: "" };

/** Stores Bank's bench Reading, 🪑, as another click would have since. */
function storeBench(t: TestConvexDb) {
	return t.run((ctx) =>
		createDumdictTransaction(ctx).addNewNote({
			draft: {
				reading: {
					unitKind: "Reading",
					lemma: bankLemma,
					emojiDescription: "🪑",
				} as Dumling.Reading<"de">,
				note,
			},
		}),
	);
}

async function selectBanken(t: TestConvexDb) {
	const { sentenceIds } = await submitText(t, [["Banken"]]);
	const sentenceId = sentenceIds[0];
	if (!sentenceId) throw new Error("Expected a stored Sentence.");
	const selection: Selection = {
		requestId: "request-1",
		visitorId: "visitor-1",
		sentenceId,
		clickedSegmentIndex: 0,
	};
	return { selection, guard: await startSession(t, selection) };
}

const rows = (t: TestConvexDb, table: "attestations" | "readings") =>
	t.run((ctx) => ctx.db.query(table).collect());

test("a New whose judge never saw a Reading the Lemma has gained is refused, writing nothing and leaving the session committing (ADR 0031)", async () => {
	const t = createTestConvex();
	const { selection, guard } = await selectBanken(t);
	expect(await storeBench(t)).toMatchObject({ status: "committed" });

	const refused = await t.mutation(
		internal.persistence.persistResolvedClick,
		{
			...bankOccurrenceCommit(selection, guard, "New"),
			readingCandidates: [],
		},
	);
	expect(refused).toEqual({ status: "StaleReading", candidates: ["🪑"] });
	expect(await rows(t, "attestations")).toEqual([]);
	expect(await rows(t, "readings")).toHaveLength(1);
	expect(await resolutionSessionRow(t, "request-1")).not.toMatchObject({
		lifecycle: { state: "Terminal" },
	});

	// Judged again over 🪑, the New commits.
	const committed = await t.mutation(
		internal.persistence.persistResolvedClick,
		{
			...bankOccurrenceCommit(selection, guard, "New"),
			readingCandidates: ["🪑"],
		},
	);
	expect(committed).toMatchObject({ status: "Committed" });
	expect(await rows(t, "readings")).toHaveLength(2);
});

test("a New no judge took part in, or a Reuse, is never refused as stale", async () => {
	const t = createTestConvex();
	const { selection, guard } = await selectBanken(t);
	await storeBench(t);
	// No candidates: an authored or Foreign Reading, or a commit of old.
	const committed = await t.mutation(
		internal.persistence.persistResolvedClick,
		bankOccurrenceCommit(selection, guard, "New"),
	);
	expect(committed).toMatchObject({ status: "Committed" });
});

test("a New stored by another commit since is reused rather than refused", async () => {
	const t = createTestConvex();
	const { selection, guard } = await selectBanken(t);
	await t.run((ctx) =>
		createDumdictTransaction(ctx).addNewNote({
			draft: {
				reading: {
					unitKind: "Reading",
					lemma: bankLemma,
					emojiDescription: "🏦",
				} as Dumling.Reading<"de">,
				note,
			},
		}),
	);
	const committed = await t.mutation(
		internal.persistence.persistResolvedClick,
		{
			...bankOccurrenceCommit(selection, guard, "New"),
			readingCandidates: [],
		},
	);
	expect(committed).toMatchObject({ status: "Committed" });
	expect(await rows(t, "readings")).toHaveLength(1);
});
