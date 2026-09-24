import { afterEach, beforeEach, expect, jest, test } from "bun:test";
import { makeSurfaceId } from "dumdict";
import { internal } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { applyDumdictPlanInTransaction } from "../convex/dumdictStorage/transaction";
import type schema from "../convex/schema";
import {
	lemmaIdentityKey,
	readingIdentityKey as readingFingerprint,
} from "../server/linguisticIdentity";
import {
	createTestConvex,
	submitText,
	type TestConvexDb,
} from "./support/convex";
import {
	bankenSurface,
	bankLemma,
	bankOccurrenceCommit,
	bankReading,
	commitBankOccurrence,
	dieBankenOccurrenceCommit,
	resolutionSessionRow,
	type Selection,
	startSession,
} from "./support/occurrences";

type TableName = keyof typeof schema.tables;

/** The dictionary and occurrence rows a losing commit must leave alone. */
const dictionaryAndOccurrenceTables = [
	"lemmas",
	"readings",
	"surfaces",
	"dictionaryLemmas",
	"readingEntries",
	"ownedSurfaces",
	"attestations",
] as const satisfies readonly TableName[];

beforeEach(() => {
	// A Segment Selection schedules its Resolution Session; nothing here runs it.
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

function rows<Table extends TableName>(t: TestConvexDb, table: Table) {
	return t.run((ctx) => ctx.db.query(table).collect());
}

function snapshot(t: TestConvexDb, tables: readonly TableName[]) {
	return t.run(async (ctx) =>
		Object.fromEntries(
			await Promise.all(
				tables.map(async (table) => [
					table,
					await ctx.db.query(table).collect(),
				]),
			),
		),
	);
}

async function encountersOf(t: TestConvexDb, visitorId: string) {
	return (await rows(t, "visitorClicks")).filter(
		(row) => row.visitorId === visitorId,
	);
}

/** Stores `die Banken` as Segments 0 (`die`), 1 (space) and 2 (`Banken`). */
async function dieBanken(t: TestConvexDb) {
	const { sentenceIds, segmentIds } = await submitText(t, [
		["die", " ", "Banken"],
	]);
	const sentenceId = sentenceIds[0];
	const sentenceSegmentIds = segmentIds[0];
	if (!sentenceId || !sentenceSegmentIds) {
		throw new Error("Expected a stored Sentence.");
	}
	const select = (
		requestId: string,
		visitorId: string,
		clickedSegmentIndex: number,
	): Selection => ({ requestId, visitorId, sentenceId, clickedSegmentIndex });
	return { select, segmentIds: sentenceSegmentIds };
}

/** Commits `die Banken` as one occurrence over Segments 0 and 2. */
async function commitDieBankenWinner(
	t: TestConvexDb,
	selection: Selection,
): Promise<Id<"attestations">> {
	const guard = await startSession(t, selection);
	const result = await t.mutation(
		internal.persistence.persistResolvedClick,
		dieBankenOccurrenceCommit(selection, guard, [0, 2]),
	);
	if (result.status !== "Committed") {
		throw new Error(`Expected a committed winner, got ${result.status}.`);
	}
	return result.attestationId;
}

async function expectCompleted(
	t: TestConvexDb,
	requestId: string,
	attestationId: Id<"attestations">,
) {
	expect(await resolutionSessionRow(t, requestId)).toMatchObject({
		lifecycle: {
			state: "Terminal",
			progress: "Committing",
			outcome: "Complete",
		},
		attestationId,
	});
}

test("a host-composed empty Dumdict plan commits without writes", async () => {
	const t = createTestConvex();
	const before = await snapshot(t, dictionaryAndOccurrenceTables);

	const result = await t.run((ctx) =>
		applyDumdictPlanInTransaction(ctx, { changes: [] }),
	);

	expect(result).toEqual({ status: "committed", nextRevision: "convex" });
	expect(await snapshot(t, dictionaryAndOccurrenceTables)).toEqual(before);
});

test("the storage adapter rejects a malformed internal plan before writes", async () => {
	const t = createTestConvex();

	// Both rejections and the reads after them share one transaction, so an
	// empty dictionary shows the adapter wrote nothing before rejecting,
	// rather than a rollback discarding its writes.
	await t.run(async (ctx) => {
		await expect(
			applyDumdictPlanInTransaction(ctx, {
				changes: [
					{
						type: "createLemma",
						record: {},
						preconditions: [],
					},
				],
			}),
		).rejects.toThrow();
		await expect(
			applyDumdictPlanInTransaction(ctx, {
				changes: [
					{
						type: "createLemma",
						record: {
							lemma: {
								unitKind: "Lemma",
								language: "de",
								family: "Lexeme",
								kind: "NOUN",
								canonicalForm: "Haus",
								coreFeatures: {},
							},
							knowledge: { transcription: "haʊs" },
						},
						preconditions: [],
					},
				],
			}),
		).rejects.toThrow("cannot contain Knowledge");
		expect(await ctx.db.query("lemmas").collect()).toEqual([]);
	});
});

test("stores occurrence membership and a minimal resolved Click", async () => {
	const t = createTestConvex();
	// The reused Reading and its Surface are already dictionary entries, so
	// the mutation-side planner produces an empty plan.
	const { readingId, surfaceId } = await t.run(async (ctx) => {
		const { unitKind: _unitKind, ...lemmaFields } = bankLemma;
		const lemmaId = await ctx.db.insert("lemmas", {
			lemmaKey: lemmaIdentityKey(bankLemma),
			...lemmaFields,
		});
		const readingId = await ctx.db.insert("readings", {
			readingKey: readingFingerprint(bankReading),
			lemmaId,
			emojiDescription: bankReading.emojiDescription,
		});
		const surfaceId = await ctx.db.insert("surfaces", {
			surfaceKey: makeSurfaceId("de", bankenSurface),
			lemmaId,
			language: "de",
			normalizedSurface: bankenSurface.normalizedSurface,
			spelling: bankenSurface.spelling,
			surfaceFeatures: bankenSurface.surfaceFeatures,
			inflectionalFeatures: bankenSurface.inflectionalFeatures,
		});
		const record = {
			attestedTranslations: [],
			attestations: [],
			notes: "",
		};
		await ctx.db.insert("dictionaryLemmas", { lemmaId });
		await ctx.db.insert("readingEntries", { readingId, record });
		await ctx.db.insert("ownedSurfaces", { surfaceId, record });
		return { readingId, surfaceId };
	});
	const { textId, sentenceIds, segmentIds } = await submitText(t, [
		["Banken"],
	]);
	const sentenceId = sentenceIds[0];
	const segmentId = segmentIds[0]?.[0];
	if (!sentenceId || !segmentId) throw new Error("Expected a Segment.");
	const selection: Selection = {
		requestId: "request-1",
		visitorId: "visitor-1",
		sentenceId,
		clickedSegmentIndex: 0,
	};
	const guard = await startSession(t, selection);
	const commit = bankOccurrenceCommit(selection, guard, "Reuse");

	const result = await t.mutation(internal.persistence.persistResolvedClick, {
		...commit,
		occurrence: {
			...commit.occurrence,
			attestation: {
				...commit.occurrence.attestation,
				members: [{ attested: "Banken", orthography: "Typo" }],
			},
		},
	});

	if (result.status !== "Committed") throw new Error("Expected a commit.");
	const attestations = await rows(t, "attestations");
	expect(
		attestations.map(({ _id, _creationTime, ...fields }) => fields),
	).toEqual([
		{
			surfaceId,
			readingId,
			realizationCoverage: "Full",
			articleEvidence: null,
		},
	]);
	const attestationId = attestations[0]?._id;
	const segment = await t.run((ctx) => ctx.db.get(segmentId));
	expect(segment?.attestationMembership).toEqual({
		attestationId,
		orthography: "Typo",
	});
	expect(segment?.resolutionState).toBeUndefined();
	expect(
		(await rows(t, "visitorClicks")).map(
			({ _id, _creationTime, ...fields }) => fields,
		),
	).toEqual([
		{
			requestId: "request-1",
			visitorId: "visitor-1",
			textId,
			sentenceId,
			segmentId,
			attestationId,
			readingId,
			clickedAt: expect.any(Number),
		},
	]);
	if (!attestationId) throw new Error("Expected an Attestation.");
	await expectCompleted(t, "request-1", attestationId);
});

test("clicked membership reuses the winner even when the losing proposal has fewer members", async () => {
	const t = createTestConvex();
	const { select, segmentIds } = await dieBanken(t);
	const loser = select("request-overlap", "visitor-2", 2);
	const loserGuard = await startSession(t, loser);
	const winnerId = await commitDieBankenWinner(
		t,
		select("request-winner", "visitor-1", 2),
	);
	const before = await snapshot(t, [
		...dictionaryAndOccurrenceTables,
		"segments",
	]);

	const result = await t.mutation(
		internal.persistence.persistResolvedClick,
		bankOccurrenceCommit(loser, loserGuard, "New"),
	);

	expect(result).toMatchObject({
		status: "Reused",
		attestationId: winnerId,
		occurrence: { reading: { emojiDescription: "🏦" } },
	});
	// Committed memberships and the dictionary stay as the winner left them.
	expect(
		await snapshot(t, [...dictionaryAndOccurrenceTables, "segments"]),
	).toEqual(before);
	expect(await encountersOf(t, "visitor-2")).toEqual([
		expect.objectContaining({
			requestId: "request-overlap",
			segmentId: segmentIds[2],
			attestationId: winnerId,
		}),
	]);
	await expectCompleted(t, "request-overlap", winnerId);
});

test("an unresolved model loser records and returns the committed winner", async () => {
	const t = createTestConvex();
	const { select, segmentIds } = await dieBanken(t);
	const loser = select("request-unresolved-race", "visitor-3", 2);
	const loserGuard = await startSession(t, loser);
	const winnerId = await commitDieBankenWinner(
		t,
		select("request-winner", "visitor-1", 2),
	);
	const before = await snapshot(t, dictionaryAndOccurrenceTables);

	const result = await t.mutation(
		internal.persistence.persistUnresolvedClick,
		{
			...loser,
			sessionGuard: loserGuard,
		},
	);

	const [encounter] = await encountersOf(t, "visitor-3");
	expect(result).toMatchObject({
		status: "Reused",
		clickId: encounter?._id,
		attestationId: winnerId,
		deduplicated: false,
		occurrence: {
			grammatical: {
				encounter: { target: { memberSegmentIndices: [0, 2] } },
			},
		},
	});
	expect(encounter).toMatchObject({
		segmentId: segmentIds[2],
		attestationId: winnerId,
	});
	await expectCompleted(t, "request-unresolved-race", winnerId);
	// The loser still cannot replace the committed occurrence.
	expect(await snapshot(t, dictionaryAndOccurrenceTables)).toEqual(before);
	const nounId = segmentIds[2];
	if (!nounId) throw new Error("Expected the noun Segment.");
	const noun = await t.run((ctx) => ctx.db.get(nounId));
	expect(noun).toMatchObject({
		attestationMembership: { attestationId: winnerId },
	});
	expect(noun?.resolutionState).toBeUndefined();
});

test("a later selection by the same Visitor and Segment reuses the first Visitor Encounter row", async () => {
	const t = createTestConvex();
	const { select } = await dieBanken(t);
	const first = select("request-first", "visitor-3", 2);
	const second = select("request-second", "visitor-3", 2);
	const firstGuard = await startSession(t, first);
	const secondGuard = await startSession(t, second);
	await commitDieBankenWinner(t, select("request-winner", "visitor-1", 2));

	const firstResult = await t.mutation(
		internal.persistence.persistUnresolvedClick,
		{ ...first, sessionGuard: firstGuard },
	);
	const secondResult = await t.mutation(
		internal.persistence.persistUnresolvedClick,
		{ ...second, sessionGuard: secondGuard },
	);

	const encounters = await encountersOf(t, "visitor-3");
	expect(encounters).toHaveLength(1);
	expect(firstResult).toMatchObject({ clickId: encounters[0]?._id });
	expect(secondResult).toMatchObject({ clickId: encounters[0]?._id });
	expect(firstResult).toMatchObject({
		status: "Reused",
		attestationId: encounters[0]?.attestationId,
	});
	expect(secondResult).toMatchObject({
		status: "Reused",
		attestationId: encounters[0]?.attestationId,
	});
	const winnerId = encounters[0]?.attestationId;
	if (!winnerId)
		throw new Error("Expected the encounter to reach the winner.");
	await expectCompleted(t, "request-first", winnerId);
	await expectCompleted(t, "request-second", winnerId);
});

test("partial overlap reports the committed membership and writes nothing", async () => {
	const t = createTestConvex();
	const { select, segmentIds } = await dieBanken(t);
	const loser = select("request-partial", "visitor-2", 0);
	const loserGuard = await startSession(t, loser);
	const winner = await commitBankOccurrence(
		t,
		select("request-winner", "visitor-1", 2),
	);
	const before = await snapshot(t, [
		...dictionaryAndOccurrenceTables,
		"knowledgeGenerationAttempts",
	]);

	const result = await t.mutation(
		internal.persistence.persistResolvedClick,
		dieBankenOccurrenceCommit(loser, loserGuard, [0, 2]),
	);

	expect(result).toEqual({
		status: "MembershipConflict",
		code: "partialOverlap",
		message:
			"Proposed Attestation members partially overlap committed membership.",
		conflictingAttestationIds: [winner.attestationId],
	});
	expect(
		await snapshot(t, [
			...dictionaryAndOccurrenceTables,
			"knowledgeGenerationAttempts",
		]),
	).toEqual(before);
	const [article, , noun] = await Promise.all(
		segmentIds.map((segmentId) => t.run((ctx) => ctx.db.get(segmentId))),
	);
	expect(article?.attestationMembership).toBeUndefined();
	expect(noun?.attestationMembership?.attestationId).toBe(
		winner.attestationId,
	);
	expect(
		(await encountersOf(t, "visitor-2"))[0]?.attestationId,
	).toBeUndefined();
	// A Membership Conflict fails the loser's session and its Segment.
	expect(article?.resolutionState).toEqual({ kind: "PermanentFailure" });
	expect(
		(await resolutionSessionRow(t, "request-partial")).lifecycle,
	).toMatchObject({ state: "Terminal", outcome: "PermanentFailure" });
});
