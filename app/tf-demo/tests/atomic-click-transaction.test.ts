import { afterEach, beforeEach, expect, jest, test } from "bun:test";
import { makeSurfaceId } from "dumdict";
import { nounArticleReference } from "dumgen";
import { internal } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import type { MutationCtx } from "../convex/_generated/server";
import {
	migrateCompositionAttestation,
	migrateCompositionOwnership,
	migrateNounArticle,
} from "../convex/model/nounArticleMigration";
import { loadSourceContextPage } from "../convex/modules/notes/readingNote";
import schema from "../convex/schema";
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
	bankOccurrenceCommit,
	dieBankenOccurrenceCommit,
	bankLemma as lemma,
	bankReading as reading,
	resolutionSessionRow,
	type Selection,
	startSession,
	bankenSurface as surface,
} from "./support/occurrences";

type TableName = keyof typeof schema.tables;

const lemmaKey = lemmaIdentityKey(lemma);
const readingKey = readingFingerprint(reading);
const surfaceKey = makeSurfaceId("de", surface);
const note = { attestedTranslations: [], attestations: [], notes: "" };

/** The tables an Occurrence commit writes besides its session and Segment. */
const dictionaryAndOccurrenceTables = [
	"lemmas",
	"readings",
	"surfaces",
	"dictionaryLemmas",
	"readingEntries",
	"ownedSurfaces",
	"attestations",
	"accumulatedKnowledge",
	"knowledgeGenerationAttempts",
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

/** Every row of the given tables, all of the schema's by default. */
function snapshot(
	t: TestConvexDb,
	tables: readonly TableName[] = Object.keys(schema.tables) as TableName[],
) {
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

/** Stores one Sentence and selects the Segment at `clickedSegmentIndex`. */
async function selectIn(
	t: TestConvexDb,
	segments: readonly string[],
	clickedSegmentIndex = 0,
) {
	const { sentenceIds, segmentIds } = await submitText(t, [segments]);
	const sentenceId = sentenceIds[0];
	const sentenceSegmentIds = segmentIds[0];
	if (!sentenceId || !sentenceSegmentIds) {
		throw new Error("Expected a stored Sentence.");
	}
	const selection: Selection = {
		requestId: "request-1",
		visitorId: "visitor-1",
		sentenceId,
		clickedSegmentIndex,
	};
	const guard = await startSession(t, selection);
	return { selection, guard, segmentIds: sentenceSegmentIds };
}

function insertBankLemma(ctx: MutationCtx) {
	const { unitKind: _unitKind, ...fields } = lemma;
	return ctx.db.insert("lemmas", { lemmaKey, ...fields });
}

function insertBankReading(ctx: MutationCtx, lemmaId: Id<"lemmas">) {
	return ctx.db.insert("readings", {
		readingKey,
		lemmaId,
		emojiDescription: reading.emojiDescription,
	});
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

test("a New Reading plans and commits dictionary, occurrence membership, and Click in one transaction", async () => {
	const t = createTestConvex();
	const { selection, guard, segmentIds } = await selectIn(t, ["Banken"]);

	const result = await t.mutation(
		internal.persistence.persistResolvedClick,
		bankOccurrenceCommit(selection, guard, "New"),
	);

	expect(result).toMatchObject({ status: "Committed", deduplicated: false });
	if (result.status !== "Committed") throw new Error("Expected a commit.");
	expect(await rows(t, "lemmas")).toHaveLength(1);
	expect(await rows(t, "readings")).toHaveLength(1);
	expect(await rows(t, "surfaces")).toHaveLength(1);
	expect(await rows(t, "attestations")).toHaveLength(1);
	expect(await rows(t, "visitorClicks")).toEqual([
		expect.objectContaining({ attestationId: result.attestationId }),
	]);
	const [segment] = await rows(t, "segments");
	expect(segment?._id).toBe(segmentIds[0]);
	expect(segment?.attestationMembership).toEqual({
		attestationId: result.attestationId,
		orthography: "Standard",
	});
	// Committed Attestation Membership replaces the Segment Resolution State.
	expect(segment?.resolutionState).toBeUndefined();
	await expectCompleted(t, "request-1", result.attestationId);
});

test("a commit advances every Visitor's earlier Encounter of its members, so their Source Contexts show it", async () => {
	const t = createTestConvex();
	const { selection, guard, segmentIds } = await selectIn(t, ["Banken"]);
	const [segmentId] = segmentIds;
	if (!segmentId) throw new Error("Expected a stored Segment.");
	const segment = await t.run((ctx) => ctx.db.get(segmentId));
	if (!segment) throw new Error("Expected a stored Segment.");
	const sentence = await t.run((ctx) => ctx.db.get(segment.sentenceId));
	if (!sentence) throw new Error("Expected a stored Sentence.");
	// Other Visitors met the Segment before, and their sessions ended
	// without an occurrence. 300 is more than one commit advances.
	const earlierVisitors = Array.from(
		{ length: 300 },
		(_, index) => `visitor-earlier-${index}`,
	);
	await t.run(async (ctx) => {
		for (const [index, visitorId] of earlierVisitors.entries())
			await ctx.db.insert("visitorClicks", {
				requestId: `earlier-${index}`,
				visitorId,
				textId: sentence.textId,
				sentenceId: sentence._id,
				segmentId,
				clickedAt: index,
			});
	});

	const result = await t.mutation(
		internal.persistence.persistResolvedClick,
		bankOccurrenceCommit(selection, guard, "New"),
	);
	if (result.status !== "Committed") throw new Error("Expected a commit.");
	const advanced = async () =>
		(await rows(t, "visitorClicks")).filter(
			({ attestationId, readingId }) =>
				attestationId === result.attestationId &&
				readingId === result.readingId,
		).length;
	expect(await advanced()).toBe(256);

	const continuations = await t.run((ctx) =>
		ctx.db.system.query("_scheduled_functions").collect(),
	);
	const continuation = continuations.find(
		({ name }) => name === "visitorEncounters:advanceMemberEncounters",
	);
	expect(continuation?.args).toEqual([
		{ segmentIds: [segmentId], attestationId: result.attestationId },
	]);
	await t.mutation(
		internal.visitorEncounters.advanceMemberEncounters,
		continuation?.args[0],
	);
	expect(await advanced()).toBe(earlierVisitors.length + 1);

	const contexts = await t.run((ctx) =>
		loadSourceContextPage(
			ctx,
			result.readingId,
			readingKey,
			"visitor-earlier-0",
		),
	);
	expect(contexts.page.map(({ attestationId }) => attestationId)).toEqual([
		result.attestationId,
	]);
});

test("Knowledge drafts follow the committed occurrence and a late writer cannot replace them", async () => {
	const t = createTestConvex();
	const { selection, guard } = await selectIn(t, ["Banken"]);
	const lateSelection = {
		...selection,
		requestId: "late-writer",
		visitorId: "visitor-2",
	};
	const lateGuard = await startSession(t, lateSelection);
	const knowledgeDraftJson = JSON.stringify({
		sourceFingerprint: "original",
		texts: [],
	});

	const first = await t.mutation(internal.persistence.persistResolvedClick, {
		...bankOccurrenceCommit(selection, guard, "New"),
		knowledgeDraftJson,
	});
	if (first.status !== "Committed") throw new Error("Expected a commit.");
	expect(await rows(t, "knowledgeGenerationAttempts")).toEqual([
		expect.objectContaining({
			knowledgeDraftJson,
			readingId: first.readingId,
		}),
	]);

	const late = await t.mutation(internal.persistence.persistResolvedClick, {
		...bankOccurrenceCommit(lateSelection, lateGuard, "New"),
		knowledgeDraftJson: JSON.stringify({
			sourceFingerprint: "late",
			texts: [],
		}),
	});

	expect(late).toMatchObject({
		status: "Reused",
		attestationId: first.attestationId,
	});
	const attempts = await rows(t, "knowledgeGenerationAttempts");
	expect(
		attempts.find(({ attemptKey }) => attemptKey === "late-writer")
			?.knowledgeDraftJson,
	).toBeUndefined();
	expect(
		attempts.find(({ attemptKey }) => attemptKey === "request-1")
			?.knowledgeDraftJson,
	).toBe(knowledgeDraftJson);
	const knowledgeRuns = (
		await t.run((ctx) =>
			ctx.db.system.query("_scheduled_functions").collect(),
		)
	).filter(
		({ name }) =>
			name === "knowledgeGenerationActions:runKnowledgeGeneration",
	);
	expect(knowledgeRuns).toHaveLength(1);
	expect(await rows(t, "attestations")).toHaveLength(1);
	// The late writer's session settles on the winner it reused.
	await expectCompleted(t, "late-writer", first.attestationId);
});

test("a New Reading adopts canonical-only Lemma, Reading, and Surface rows", async () => {
	const t = createTestConvex();
	const canonical = await t.run(async (ctx) => {
		const lemmaId = await insertBankLemma(ctx);
		const readingId = await insertBankReading(ctx, lemmaId);
		const surfaceId = await ctx.db.insert("surfaces", {
			surfaceKey,
			lemmaId,
			language: surface.language,
			normalizedSurface: surface.normalizedSurface,
			spelling: surface.spelling,
			surfaceFeatures: surface.surfaceFeatures,
			inflectionalFeatures: surface.inflectionalFeatures,
		});
		return { lemmaId, readingId, surfaceId };
	});
	const { selection, guard } = await selectIn(t, ["Banken"]);

	const result = await t.mutation(
		internal.persistence.persistResolvedClick,
		bankOccurrenceCommit(selection, guard, "New"),
	);

	expect(result).toMatchObject({
		status: "Committed",
		readingId: canonical.readingId,
	});
	expect(await rows(t, "lemmas")).toHaveLength(1);
	expect(await rows(t, "readings")).toHaveLength(1);
	expect(await rows(t, "surfaces")).toHaveLength(1);
	expect(await rows(t, "dictionaryLemmas")).toEqual([
		expect.objectContaining({ lemmaId: canonical.lemmaId }),
	]);
	expect(await rows(t, "readingEntries")).toEqual([
		expect.objectContaining({ readingId: canonical.readingId }),
	]);
	expect(await rows(t, "ownedSurfaces")).toEqual([
		expect.objectContaining({ surfaceId: canonical.surfaceId }),
	]);
	expect((await rows(t, "attestations"))[0]).toMatchObject({
		readingId: canonical.readingId,
		surfaceId: canonical.surfaceId,
	});
});

/** Stores `Banken` twice, one Sentence each, and selects both Segments. */
async function selectTwoBanken(t: TestConvexDb) {
	const { sentenceIds } = await submitText(t, [["Banken"], ["Banken"]]);
	const selections = sentenceIds.map(
		(sentenceId, position): Selection => ({
			requestId: `request-${position + 1}`,
			visitorId: `visitor-${position + 1}`,
			sentenceId,
			clickedSegmentIndex: 0,
		}),
	);
	const [first, second] = selections;
	if (!first || !second) throw new Error("Expected two stored Sentences.");
	return {
		first: { selection: first, guard: await startSession(t, first) },
		second: { selection: second, guard: await startSession(t, second) },
	};
}

test("a New homonym Reading of a stored Lemma commits against the Surface its Lemma already owns", async () => {
	const t = createTestConvex();
	const { first, second } = await selectTwoBanken(t);
	const bench = { ...reading, emojiDescription: "🪑" } as const;
	const bank = await t.mutation(
		internal.persistence.persistResolvedClick,
		bankOccurrenceCommit(first.selection, first.guard, "New"),
	);

	const result = await t.mutation(internal.persistence.persistResolvedClick, {
		...bankOccurrenceCommit(second.selection, second.guard, "New"),
		reading: bench,
		readingKey: readingFingerprint(bench),
	});

	if (bank.status !== "Committed" || result.status !== "Committed")
		throw new Error("Expected both occurrences to commit.");
	expect(result.readingId).not.toBe(bank.readingId);
	expect(await rows(t, "lemmas")).toHaveLength(1);
	expect(await rows(t, "readings")).toHaveLength(2);
	expect(await rows(t, "readingEntries")).toHaveLength(2);
	const [ownedSurface] = await rows(t, "ownedSurfaces");
	expect(await rows(t, "ownedSurfaces")).toHaveLength(1);
	expect(
		(await rows(t, "attestations")).map(({ readingId, surfaceId }) => ({
			readingId,
			surfaceId,
		})),
	).toEqual([
		{ readingId: bank.readingId, surfaceId: ownedSurface?.surfaceId },
		{ readingId: result.readingId, surfaceId: ownedSurface?.surfaceId },
	]);
	await expectCompleted(t, "request-2", result.attestationId);
});

test("a New decision for a Reading another commit stored first commits as a reuse", async () => {
	const t = createTestConvex();
	// Both sessions decided New before either committed.
	const { first, second } = await selectTwoBanken(t);
	const winner = await t.mutation(
		internal.persistence.persistResolvedClick,
		bankOccurrenceCommit(first.selection, first.guard, "New"),
	);

	const result = await t.mutation(
		internal.persistence.persistResolvedClick,
		bankOccurrenceCommit(second.selection, second.guard, "New"),
	);

	if (winner.status !== "Committed" || result.status !== "Committed")
		throw new Error("Expected both occurrences to commit.");
	expect(result.readingId).toBe(winner.readingId);
	expect(result.attestationId).not.toBe(winner.attestationId);
	expect(await rows(t, "readings")).toHaveLength(1);
	expect(await rows(t, "readingEntries")).toHaveLength(1);
	expect(await rows(t, "ownedSurfaces")).toHaveLength(1);
	await expectCompleted(t, "request-2", result.attestationId);
});

test("a reused Reading gains a previously unseen Surface in the occurrence transaction", async () => {
	const t = createTestConvex();
	const readingId = await t.run(async (ctx) => {
		const lemmaId = await insertBankLemma(ctx);
		await ctx.db.insert("dictionaryLemmas", { lemmaId });
		const readingId = await insertBankReading(ctx, lemmaId);
		await ctx.db.insert("readingEntries", { readingId, record: note });
		return readingId;
	});
	const { selection, guard } = await selectIn(t, ["Banken"]);

	const result = await t.mutation(
		internal.persistence.persistResolvedClick,
		bankOccurrenceCommit(selection, guard, "Reuse"),
	);

	expect(result).toMatchObject({ status: "Committed", readingId });
	expect(await rows(t, "readings")).toHaveLength(1);
	expect(await rows(t, "surfaces")).toHaveLength(1);
	expect(await rows(t, "ownedSurfaces")).toHaveLength(1);
	expect((await rows(t, "attestations"))[0]?.readingId).toBe(readingId);
});

test("a reused Reading that no longer exists is reported as a dictionary conflict without writes", async () => {
	const t = createTestConvex();
	const { selection, guard, segmentIds } = await selectIn(t, ["Banken"]);
	const before = await snapshot(t, dictionaryAndOccurrenceTables);

	const result = await t.mutation(
		internal.persistence.persistResolvedClick,
		bankOccurrenceCommit(selection, guard, "Reuse"),
	);

	expect(result).toMatchObject({
		status: "DictionaryConflict",
		code: "semanticPreconditionFailed",
	});
	expect(await snapshot(t, dictionaryAndOccurrenceTables)).toEqual(before);
	const [segment] = await rows(t, "segments");
	expect(segment?._id).toBe(segmentIds[0]);
	expect(segment?.attestationMembership).toBeUndefined();
	// The conflict settles the session and the Segment it ran for.
	expect(segment?.resolutionState).toEqual({ kind: "PermanentFailure" });
	expect(
		(await resolutionSessionRow(t, "request-1")).lifecycle,
	).toMatchObject({ state: "Terminal", outcome: "PermanentFailure" });
	expect((await rows(t, "visitorClicks"))[0]?.attestationId).toBeUndefined();
});

test("a failure after the dictionary commit rolls back dictionary, occurrence, and session writes", async () => {
	const t = createTestConvex();
	// An earlier occurrence already holds this commit's Knowledge attempt key,
	// so Knowledge scheduling, the commit's last step, refuses it.
	await t.run(async (ctx) => {
		const lemmaId = await ctx.db.insert("lemmas", {
			lemmaKey: "lemma:haus",
			language: "de",
			family: "Lexeme",
			kind: "NOUN",
			canonicalForm: "Haus",
			coreFeatures: {},
		});
		const readingId = await ctx.db.insert("readings", {
			readingKey: "reading:haus",
			lemmaId,
			emojiDescription: "🏠",
		});
		const surfaceId = await ctx.db.insert("surfaces", {
			surfaceKey: "surface:haus",
			lemmaId,
			language: "de",
			normalizedSurface: "Haus",
			spelling: "Canonical",
			surfaceFeatures: null,
		});
		const attestationId = await ctx.db.insert("attestations", {
			surfaceId,
			readingId,
			realizationCoverage: "Full",
		});
		await ctx.db.insert("knowledgeGenerationAttempts", {
			attemptKey: "request-1",
			visitorId: "visitor-1",
			ownerReadingKey: "reading:haus",
			readingId,
			attestationId,
			state: "Scheduled",
			createdAt: 1,
			updatedAt: 1,
		});
	});
	const { selection, guard } = await selectIn(t, ["Banken"]);
	const before = await snapshot(t);

	await expect(
		t.mutation(
			internal.persistence.persistResolvedClick,
			bankOccurrenceCommit(selection, guard, "New"),
		),
	).rejects.toThrow("attemptKey collides with a different occurrence.");

	expect(await snapshot(t)).toEqual(before);
	expect(await rows(t, "attestations")).toHaveLength(1);
	expect((await rows(t, "visitorClicks"))[0]?.attestationId).toBeUndefined();
	expect(
		(await resolutionSessionRow(t, "request-1")).lifecycle,
	).toMatchObject({ state: "Active" });
});

test("an unknown surfaceKey is rejected without durable writes", async () => {
	const t = createTestConvex();
	const { selection, guard } = await selectIn(t, ["Banken"]);
	const before = await snapshot(t);
	const args = bankOccurrenceCommit(selection, guard, "New");
	args.occurrence.surfaceKey = makeSurfaceId("de", {
		...surface,
		normalizedSurface: "Bank",
	});

	await expect(
		t.mutation(internal.persistence.persistResolvedClick, args),
	).rejects.toThrow(
		"Canonical Lemma, Surface, and Reading must be committed first.",
	);
	expect(await snapshot(t)).toEqual(before);
});

test("a readingKey for a different Reading is rejected without durable writes", async () => {
	const t = createTestConvex();
	const { selection, guard } = await selectIn(t, ["Banken"]);
	const before = await snapshot(t);
	const args = bankOccurrenceCommit(selection, guard, "New");
	args.readingKey = readingFingerprint({
		...reading,
		emojiDescription: "🏧",
	});

	await expect(
		t.mutation(internal.persistence.persistResolvedClick, args),
	).rejects.toThrow(
		"readingKey does not match the selected Reading identity.",
	);
	expect(await snapshot(t)).toEqual(before);
});

test("a noun article materializes its Reading without a second occurrence", async () => {
	const articleLemma = {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "DET",
		canonicalForm: "die",
		coreFeatures: {
			case: "Nom",
			definite: "Def",
			extPos: null,
			foreign: null,
			gender: null,
			number: "Plur",
			numType: null,
			person: null,
			polite: null,
			poss: null,
			pronType: "Art",
		},
	} as const;
	const articleReading = {
		unitKind: "Reading",
		lemma: articleLemma,
		emojiDescription: "👉",
	} as const;
	const t = createTestConvex();
	const { selection, guard, segmentIds } = await selectIn(
		t,
		["die", " ", "Banken"],
		2,
	);

	const result = await t.mutation(
		internal.persistence.persistResolvedClick,
		dieBankenOccurrenceCommit(selection, guard, [0, 2]),
	);

	if (result.status !== "Committed") throw new Error("Expected a commit.");
	expect(await rows(t, "lemmas")).toHaveLength(2);
	expect(await rows(t, "readings")).toHaveLength(2);
	expect(await rows(t, "surfaces")).toHaveLength(2);
	expect(await rows(t, "attestations")).toHaveLength(1);
	expect(await rows(t, "visitorClicks")).toHaveLength(1);
	const members = (await rows(t, "segments")).filter(({ _id }) =>
		[segmentIds[0], segmentIds[2]].includes(_id),
	);
	expect(members).toHaveLength(2);
	for (const member of members) {
		expect(member.attestationMembership?.attestationId).toBe(
			result.attestationId,
		);
		expect(member.resolutionState).toBeUndefined();
	}
	const component = (await rows(t, "readings")).find(
		(row) => row.readingKey === readingFingerprint(articleReading),
	);
	expect(component).toBeDefined();
	expect(result.readingId).not.toBe(component?._id);
	await expectCompleted(t, "request-1", result.attestationId);
});

test("article owner migration preserves Surface and occurrence IDs and is repeatable", async () => {
	const correct = nounArticleReference({
		article: "Definite",
		case: "Dat",
		number: "Sing",
		gender: "Fem",
		spelled: "der",
	});
	const oldLemma = { ...correct.reading.lemma, canonicalForm: "der" };
	const oldReference = {
		reading: { ...correct.reading, lemma: oldLemma },
		surface: { ...correct.surface, lemma: oldLemma },
	};
	const oldSurface = {
		...surface,
		normalizedSurface: "der Bank",
		inflectionalFeatures: {
			article: "Definite",
			case: "Dat",
			number: "Sing",
		},
	} as const;
	const t = createTestConvex();
	const seeded = await t.run(async (ctx) => {
		const lemmaId = await insertBankLemma(ctx);
		const readingId = await insertBankReading(ctx, lemmaId);
		const surfaceId = await ctx.db.insert("surfaces", {
			surfaceKey: "legacy-noun-surface-key",
			lemmaId,
			language: oldSurface.language,
			normalizedSurface: oldSurface.normalizedSurface,
			spelling: oldSurface.spelling,
			surfaceFeatures: oldSurface.surfaceFeatures,
			inflectionalFeatures: oldSurface.inflectionalFeatures,
			articleReference: oldReference,
		});
		const ownedSurfaceId = await ctx.db.insert("ownedSurfaces", {
			surfaceId,
			record: { notes: "keep this", attestedTranslations: [] },
		});
		const attestationId = await ctx.db.insert("attestations", {
			surfaceId,
			readingId,
			realizationCoverage: "Full",
		});
		return { surfaceId, ownedSurfaceId, attestationId };
	});
	const migrate = () =>
		t.run(async (ctx) => {
			const row = await ctx.db.get(seeded.surfaceId);
			if (!row) throw new Error("Missing Surface.");
			await migrateNounArticle(ctx, row);
		});

	await migrate();

	const updated = await t.run((ctx) => ctx.db.get(seeded.surfaceId));
	expect(updated).toMatchObject({
		_id: seeded.surfaceId,
		surfaceKey: makeSurfaceId("de", oldSurface),
	});
	expect(updated?.articleReference).toBeUndefined();
	expect(
		(await t.run((ctx) => ctx.db.get(seeded.attestationId)))?.surfaceId,
	).toBe(seeded.surfaceId);
	expect(
		(await t.run((ctx) => ctx.db.get(seeded.ownedSurfaceId)))?.record,
	).toEqual({ notes: "keep this", attestedTranslations: [] });
	const migrated = await snapshot(t);
	await migrate();
	expect(await snapshot(t)).toEqual(migrated);
});

test("composition cutover reconciles collisions while preserving encounters, annotations and saved Surface IDs", async () => {
	const value = {
		...surface,
		normalizedSurface: "der Bank",
		inflectionalFeatures: {
			article: "Definite",
			case: "Dat",
			number: "Sing",
		},
	} as const;
	const t = createTestConvex();
	const { sentenceIds, segmentIds } = await submitText(t, [["Bank"]]);
	const sentenceId = sentenceIds[0];
	const segmentId = segmentIds[0]?.[0];
	if (!sentenceId || !segmentId) throw new Error("Expected a Segment.");
	const seeded = await t.run(async (ctx) => {
		const lemmaId = await insertBankLemma(ctx);
		const readingId = await insertBankReading(ctx, lemmaId);
		const common = {
			language: "de" as const,
			lemmaId,
			normalizedSurface: value.normalizedSurface,
			spelling: value.spelling,
			surfaceFeatures: value.surfaceFeatures,
			inflectionalFeatures: value.inflectionalFeatures,
		};
		const oldId = await ctx.db.insert("surfaces", {
			...common,
			surfaceKey: "legacy-collision-key",
			articleReference: { obsolete: true },
		});
		const currentId = await ctx.db.insert("surfaces", {
			...common,
			surfaceKey: makeSurfaceId("de", value),
		});
		const ownedOldId = await ctx.db.insert("ownedSurfaces", {
			surfaceId: oldId,
			record: { notes: "old note", attestedTranslations: ["old"] },
		});
		const ownedCurrentId = await ctx.db.insert("ownedSurfaces", {
			surfaceId: currentId,
			record: { notes: "current note", attestedTranslations: ["new"] },
		});
		const attestationId = await ctx.db.insert("attestations", {
			surfaceId: oldId,
			readingId,
			realizationCoverage: "Full",
		});
		await ctx.db.patch(segmentId, {
			attestationMembership: { attestationId, orthography: "Standard" },
		});
		const sentence = await ctx.db.get(sentenceId);
		if (!sentence) throw new Error("Missing Sentence.");
		await ctx.db.insert("visitorClicks", {
			requestId: "click-old",
			visitorId: "visitor",
			textId: sentence.textId,
			sentenceId,
			segmentId,
			attestationId,
			clickedAt: 1,
		});
		await ctx.db.insert("personalAnnotations", {
			visitorId: "visitor",
			readingId,
			text: "remember this",
			updatedAt: 1,
		});
		await ctx.db.insert("accumulatedKnowledge", {
			ownerReadingKey: readingKey,
			knowledge: { definition: "keep" },
			status: "Partial",
			updatedAt: 1,
		});
		return { oldId, currentId, ownedOldId, ownedCurrentId, attestationId };
	});
	const protectedTables = [
		"visitorClicks",
		"personalAnnotations",
		"accumulatedKnowledge",
		"segments",
	] as const;
	const protectedRows = await snapshot(t, protectedTables);
	const migrateSurface = () =>
		t.run(async (ctx) => {
			const row = await ctx.db.get(seeded.oldId);
			if (!row) throw new Error("Missing Surface.");
			await migrateNounArticle(ctx, row);
		});
	const migrateAttestation = () =>
		t.run(async (ctx) => {
			const row = await ctx.db.get(seeded.attestationId);
			if (!row) throw new Error("Missing Attestation.");
			await migrateCompositionAttestation(ctx, row);
		});

	await migrateSurface();
	const redirected = await t.run((ctx) => ctx.db.get(seeded.oldId));
	expect(redirected).toMatchObject({ redirectedTo: seeded.currentId });
	expect(redirected?.articleReference).toBeUndefined();
	await t.run(async (ctx) => {
		const row = await ctx.db.get(seeded.ownedOldId);
		if (!row) throw new Error("Missing owned Surface.");
		await migrateCompositionOwnership(ctx, row);
	});
	await migrateAttestation();

	expect(
		(await t.run((ctx) => ctx.db.get(seeded.attestationId)))?.surfaceId,
	).toBe(seeded.currentId);
	expect(
		(await t.run((ctx) => ctx.db.get(seeded.ownedCurrentId)))?.record,
	).toEqual({
		notes: "current note\n\nold note",
		attestedTranslations: ["new", "old"],
	});
	expect(await t.run((ctx) => ctx.db.get(seeded.ownedOldId))).toBeNull();
	const afterCutover = await snapshot(t, protectedTables);
	for (const table of protectedTables) {
		expect(afterCutover[table], table).toEqual(
			expect.arrayContaining(protectedRows[table] ?? []),
		);
	}
	const migrated = await snapshot(t);
	await migrateSurface();
	await migrateAttestation();
	expect(await snapshot(t)).toEqual(migrated);
});

test("an in-flight legacy Surface proposal cannot reintroduce articleReference", async () => {
	const t = createTestConvex();
	const { selection, guard } = await selectIn(t, ["Banken"]);
	const before = await snapshot(t);
	const args = bankOccurrenceCommit(selection, guard, "New");
	Object.assign(args.occurrence.attestation, {
		surface: { ...surface, articleReference: null },
	});

	await expect(
		t.mutation(internal.persistence.persistResolvedClick, args),
	).rejects.toThrow();
	expect(await snapshot(t)).toEqual(before);
});

test("subject es materializes its exact Reading and Knowledge while retaining one verbal occurrence", async () => {
	const verbLemma = {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "VERB",
		canonicalForm: "geben",
		coreFeatures: {
			hasSepPrefix: null,
			lexicallyReflexive: null,
			verbType: null,
		},
	} as const;
	const verbReading = {
		unitKind: "Reading",
		lemma: verbLemma,
		emojiDescription: "🌍",
	} as const;
	const verbSurface = {
		unitKind: "Surface",
		language: "de",
		lemma: verbLemma,
		normalizedSurface: "es gibt",
		spelling: "Canonical",
		surfaceFeatures: null,
		inflectionalFeatures: {
			verbForm: "Fin",
			tense: "Pres",
			mood: "Ind",
			person: "3",
			number: "Sing",
			expletive: "Subject",
			perfect: null,
			future: null,
			passive: null,
			voice: null,
		},
	} as const;
	const t = createTestConvex();
	const { selection, guard, segmentIds } = await selectIn(t, [
		"Es",
		" ",
		"gibt",
	]);

	const result = await t.mutation(internal.persistence.persistResolvedClick, {
		...bankOccurrenceCommit(selection, guard, "New"),
		reading: verbReading,
		readingKey: readingFingerprint(verbReading),
		occurrence: {
			surfaceKey: makeSurfaceId("de", verbSurface),
			lemmaKey: lemmaIdentityKey(verbLemma),
			memberSegmentIndices: [0, 2],
			attestation: {
				unitKind: "Attestation",
				surface: verbSurface,
				members: [
					{ attested: "Es", orthography: "Standard" },
					{ attested: "gibt", orthography: "Standard" },
				],
				realizationCoverage: "Full",
				expletiveEvidence: { attested: "Es", orthography: "Standard" },
				valencyEvidence: [],
			},
		},
	});

	if (result.status !== "Committed") throw new Error("Expected a commit.");
	const attestations = await rows(t, "attestations");
	expect(attestations).toHaveLength(1);
	expect(attestations[0]).toMatchObject({
		expletiveEvidence: { attested: "Es", orthography: "Standard" },
		valencyEvidence: [],
	});
	const componentLemma = (await rows(t, "lemmas")).find(
		(row) => row.kind === "PRON",
	);
	const componentReading = (await rows(t, "readings")).find(
		(row) => row.lemmaId === componentLemma?._id,
	);
	expect(componentReading?.emojiDescription).toBe("⚪");
	expect(
		(await rows(t, "accumulatedKnowledge")).some(
			(row) => row.ownerReadingKey === componentReading?.readingKey,
		),
	).toBe(true);
	const members = (await rows(t, "segments")).filter(({ _id }) =>
		[segmentIds[0], segmentIds[2]].includes(_id),
	);
	expect(
		members.map((row) => row.attestationMembership?.attestationId),
	).toEqual([result.attestationId, result.attestationId]);
	await expectCompleted(t, "request-1", result.attestationId);
});
