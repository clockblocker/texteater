import { afterEach, beforeEach, describe, expect, jest, test } from "bun:test";
import { createDumdictService } from "dumdict";
import * as Effect from "effect/Effect";
import { api, internal } from "../convex/_generated/api";
import type { Id, TableNames } from "../convex/_generated/dataModel";
import type { MutationCtx } from "../convex/_generated/server";
import { resetDemoTableNames } from "../convex/demoReset";
import { createConvexDumdictStorage } from "../convex/dumdictStorage/adapter";
import { defaultKnowledgeSettings } from "../convex/knowledgeSettings";
import { loadRelationProjections } from "../convex/modules/notes/relations";
import tfDemoSchema from "../convex/schema";
import { readingIdentityKey as readingFingerprint } from "../server/linguisticIdentity";
import {
	actionContext,
	createTestConvex,
	submitText,
	type TestConvexDb,
} from "./support/convex";

const verbFeatures = {
	verbType: null,
	lexicallyReflexive: null,
	hasSepPrefix: null,
} as const;

const gehenLemma = {
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "VERB",
	canonicalForm: "gehen",
	coreFeatures: verbFeatures,
} as const;
const laufenLemma = { ...gehenLemma, canonicalForm: "laufen" } as const;
const fahrenLemma = { ...gehenLemma, canonicalForm: "fahren" } as const;
const prefixedFahrenLemma = {
	...fahrenLemma,
	coreFeatures: { ...verbFeatures, hasSepPrefix: "ab" },
} as const;

const gehenReading = {
	unitKind: "Reading",
	lemma: gehenLemma,
	emojiDescription: "🚶",
} as const;
const laufenReading = {
	unitKind: "Reading",
	lemma: laufenLemma,
	emojiDescription: "🏃",
} as const;
const fahrenReading = {
	unitKind: "Reading",
	lemma: fahrenLemma,
	emojiDescription: "🚗",
} as const;
const prefixedFahrenReading = {
	unitKind: "Reading",
	lemma: prefixedFahrenLemma,
	emojiDescription: "🚙",
} as const;

const emptyNote = {
	attestedTranslations: [],
	attestations: [],
	notes: "",
};

function dictionaryFor(t: TestConvexDb) {
	return createDumdictService({
		language: "de",
		storage: createConvexDumdictStorage(actionContext(t) as never),
	});
}

async function readingIdFor(
	t: TestConvexDb,
	reading: Parameters<typeof readingFingerprint>[0],
): Promise<Id<"readings">> {
	const row = await t.run((ctx) =>
		ctx.db
			.query("readings")
			.withIndex("by_reading_key", (q) =>
				q.eq("readingKey", readingFingerprint(reading)),
			)
			.unique(),
	);
	if (!row) throw new Error("Expected a stored Reading.");
	return row._id;
}

async function tableRows(
	t: TestConvexDb,
	table: (typeof resetDemoTableNames)[number],
) {
	return t.run((ctx) => ctx.db.query(table).collect());
}

/** Inserts a bare Lemma and Reading, as the dictionary stores them. */
async function insertReading(t: TestConvexDb, readingKey: string) {
	return t.run(async (ctx) => {
		const lemmaId = await ctx.db.insert("lemmas", {
			lemmaKey: `lemma:${readingKey}`,
			language: "de",
			family: "Lexeme",
			kind: "VERB",
			canonicalForm: readingKey,
			coreFeatures: {},
		});
		const readingId = await ctx.db.insert("readings", {
			readingKey,
			lemmaId,
			emojiDescription: "🚶",
		});
		const surfaceId = await ctx.db.insert("surfaces", {
			surfaceKey: `surface:${readingKey}`,
			lemmaId,
			language: "de",
			normalizedSurface: readingKey,
			spelling: "Canonical",
			surfaceFeatures: {},
		});
		const attestationId = await ctx.db.insert("attestations", {
			surfaceId,
			readingId,
			realizationCoverage: "Full",
		});
		return { lemmaId, readingId, readingKey, attestationId };
	});
}

const fingerprints = {
	prompt: "prompt",
	schema: "schema",
	evaluator: "evaluator",
	model: "model",
	policy: "policy",
};

type SeededReading = Awaited<ReturnType<typeof insertReading>>;

/** Fields that tie a row to a Reading, directly or through its attempt. */
const readingOwnershipFields = [
	"readingId",
	"readingKey",
	"ownerReadingKey",
	"sourceReadingId",
	"sourceReadingKey",
	"targetReadingId",
	"targetReadingKey",
	"attemptKey",
];

/** Tables whose rows leave with something other than the owner sweep. */
const readingSweepExemptions: Record<string, string> = {
	readings: "the swept Reading itself",
	attestations: "a Reading with an Attestation is never pruned",
	definitionTexts: "removed with the Definition Text before pruning",
	resolutionSessions: "removed with their Sentence",
};

const visitorSweepExemptions: Record<string, string> = {
	inspectionClicks: "Resolution Inspector diagnostics, cleared as a set",
};

/** Knowledge production runs belong to their attempt's Reading and Visitor. */
const ownedThroughAttempt = ["knowledgeProductionRuns"];

/** Schema tables owned through `fields`, less the exempt ones. */
function ownedTables(
	fields: readonly string[],
	exemptions: Record<string, string>,
): string[] {
	return Object.entries(tfDemoSchema.tables)
		.filter(([tableName, table]) => {
			if (tableName in exemptions) return false;
			if (ownedThroughAttempt.includes(tableName)) return true;
			const tableFields = Object.keys(
				(table.validator as { fields?: Record<string, unknown> })
					.fields ?? {},
			);
			return tableFields.some((field) => fields.includes(field));
		})
		.map(([tableName]) => tableName)
		.sort();
}

async function existingIds(
	t: TestConvexDb,
	ids: readonly string[],
): Promise<Set<string>> {
	const found = await t.run(async (ctx) => {
		const present: string[] = [];
		for (const id of ids) {
			if (await ctx.db.get(id as Id<TableNames>)) present.push(id);
		}
		return present;
	});
	return new Set(found);
}

function attemptKeyFor(owner: SeededReading | string): string {
	return `attempt:${typeof owner === "string" ? owner : owner.readingKey}`;
}

/**
 * One builder per Reading-owned table: it seeds `owner`'s rows, pointing any
 * reference at `other`. A new Reading-owned table needs a builder here and a
 * cleanup phase in demoReset.ts, or the sweep test fails.
 */
const readingOwnedRows: Record<
	string,
	(
		ctx: MutationCtx,
		owner: SeededReading,
		other: SeededReading,
	) => Promise<string[]>
> = {
	knowledgeGenerationAttempts: async (ctx, owner) => [
		await ctx.db.insert("knowledgeGenerationAttempts", {
			attemptKey: attemptKeyFor(owner),
			visitorId: "visitor-1",
			ownerReadingKey: owner.readingKey,
			readingId: owner.readingId,
			attestationId: owner.attestationId,
			state: "Running",
			createdAt: 1,
			updatedAt: 1,
		}),
	],
	knowledgeProductionRuns: async (ctx, owner) => [
		await ctx.db.insert("knowledgeProductionRuns", {
			attemptKey: attemptKeyFor(owner),
			runNumber: 1,
			evidence: { request: {}, failures: [], operationTraces: [] },
			outcome: "Failure",
			createdAt: 1,
		}),
	],
	readingEntries: async (ctx, owner) => [
		await ctx.db.insert("readingEntries", {
			readingId: owner.readingId,
			record: {},
		}),
	],
	semanticRelationEdges: async (ctx, owner, other) => [
		await ctx.db.insert("semanticRelationEdges", {
			sourceReadingId: owner.readingId,
			targetKind: "lemma",
			targetLemmaId: other.lemmaId,
			relation: "synonym",
		}),
		await ctx.db.insert("semanticRelationEdges", {
			sourceReadingId: other.readingId,
			targetKind: "reading",
			targetReadingId: owner.readingId,
			relation: "antonym",
		}),
	],
	pendingSemanticRelations: async (ctx, owner) => [
		await ctx.db.insert("pendingSemanticRelations", {
			locatorKey: `locator:${owner.readingKey}`,
			sourceReadingKey: owner.readingKey,
			targetCanonicalForm: "laufen",
			record: {},
		}),
	],
	structuralShadowReferences: async (ctx, owner) => [
		await ctx.db.insert("structuralShadowReferences", {
			shadowId: await ctx.db.insert("shadows", {
				shadowKey: `shadow:${owner.readingKey}`,
				language: "de",
				canonicalForm: "lauf",
				family: "Morpheme",
				kind: "Root",
			}),
			ownerReadingKey: owner.readingKey,
			aspect: "morphologicalTree",
			path: "0",
			locatorKey: `structure:${owner.readingKey}`,
		}),
	],
	knowledgeChanges: async (ctx, owner) => [
		await ctx.db.insert("knowledgeChanges", {
			knowledgeChangeKey: `change:${owner.readingKey}`,
			ownerReadingKey: owner.readingKey,
			change: {},
			createdAt: 1,
		}),
	],
	accumulatedKnowledge: async (ctx, owner) => [
		await ctx.db.insert("accumulatedKnowledge", {
			ownerReadingKey: owner.readingKey,
			knowledge: {},
			status: "Full",
			updatedAt: 1,
		}),
	],
	generatedRelationRuns: async (ctx, owner) => [
		await ctx.db.insert("generatedRelationRuns", {
			runKey: `run:${owner.readingKey}`,
			attemptKey: attemptKeyFor(owner),
			runNumber: 1,
			relation: "synonym",
			sourceReadingId: owner.readingId,
			sourceReadingKey: owner.readingKey,
			contextAttestationId: owner.attestationId,
			verdictArtifactPath: null,
			fingerprints,
			generatedTargets: 0,
			nulls: 0,
			pendingShadows: 0,
			directMatches: 0,
			rejectedOutputs: 0,
			publicationFailures: 0,
			createdAt: 1,
			updatedAt: 1,
		}),
	],
	generatedRelationProposals: async (ctx, owner) => [
		await ctx.db.insert("generatedRelationProposals", {
			proposalKey: `proposal:${owner.readingKey}`,
			attemptKey: attemptKeyFor(owner),
			runNumber: 1,
			relation: "synonym",
			sourceReadingId: owner.readingId,
			sourceReadingKey: owner.readingKey,
			contextAttestationId: owner.attestationId,
			targetShadow: {
				language: "de",
				canonicalForm: "laufen",
				family: "Lexeme",
				kind: "VERB",
			},
			verdictArtifactPath: "artifact",
			fingerprints,
			outcome: "PendingShadow",
			reviewStatus: "NotSampled",
			createdAt: 1,
			updatedAt: 1,
		}),
	],
	personalAnnotations: async (ctx, owner) => [
		await ctx.db.insert("personalAnnotations", {
			visitorId: "visitor-1",
			readingId: owner.readingId,
			text: "note",
			updatedAt: 1,
		}),
	],
};

/**
 * One builder per Visitor-owned table, seeding `visitorId`'s rows. A new
 * Visitor-owned table needs a builder here and a phase in the Visitor clear.
 */
const visitorOwnedRows: Record<
	string,
	(
		t: TestConvexDb,
		visitorId: string,
		reading: SeededReading,
		sentenceId: Id<"sentences">,
	) => Promise<string[]>
> = {
	resolutionSessions: async (t, visitorId, _reading, sentenceId) => {
		await t.mutation(api.resolutionSessions.selectSegment, {
			requestId: `request-${visitorId}`,
			visitorId,
			sentenceId,
			clickedSegmentIndex: 0,
			routeNoteRequested: false,
		});
		return (await tableRows(t, "resolutionSessions"))
			.filter((row) => row.visitorId === visitorId)
			.map(({ _id }) => _id);
	},
	visitorClicks: async (t, visitorId) =>
		(await tableRows(t, "visitorClicks"))
			.filter((row) => row.visitorId === visitorId)
			.map(({ _id }) => _id),
	knowledgeGenerationAttempts: (t, visitorId, reading) =>
		t.run(async (ctx) => [
			await ctx.db.insert("knowledgeGenerationAttempts", {
				attemptKey: attemptKeyFor(visitorId),
				visitorId,
				ownerReadingKey: reading.readingKey,
				readingId: reading.readingId,
				attestationId: reading.attestationId,
				state: "Failed",
				createdAt: 1,
				updatedAt: 1,
			}),
		]),
	knowledgeProductionRuns: (t, visitorId) =>
		t.run(async (ctx) => [
			await ctx.db.insert("knowledgeProductionRuns", {
				attemptKey: attemptKeyFor(visitorId),
				runNumber: 1,
				evidence: { request: {}, failures: [], operationTraces: [] },
				outcome: "Failure",
				createdAt: 1,
			}),
		]),
	knowledgeSettings: (t, visitorId) =>
		t.run(async (ctx) => [
			await ctx.db.insert("knowledgeSettings", {
				visitorId,
				settings: defaultKnowledgeSettings(),
				updatedAt: 1,
			}),
		]),
	personalAnnotations: (t, visitorId, reading) =>
		t.run(async (ctx) => [
			await ctx.db.insert("personalAnnotations", {
				visitorId,
				readingId: reading.readingId,
				text: "note",
				updatedAt: 1,
			}),
		]),
	readingLanguageLayouts: (t, visitorId) =>
		t.run(async (ctx) => [
			await ctx.db.insert("readingLanguageLayouts", {
				visitorId,
				targetLanguage: "de",
				order: [],
				hidden: [],
				updatedAt: 1,
			}),
		]),
	readingFamilyKindLayouts: (t, visitorId) =>
		t.run(async (ctx) => [
			await ctx.db.insert("readingFamilyKindLayouts", {
				visitorId,
				targetLanguage: "de",
				family: "Lexeme",
				kind: "NOUN",
				order: [],
				hidden: [],
				updatedAt: 1,
			}),
		]),
};

beforeEach(() => {
	// A Segment Selection schedules its Resolution Session; nothing here runs it.
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

describe("tf-demo post-reset contract", () => {
	test("Strip analyses covers every Text and clears Resolution Inspector data", async () => {
		const t = createTestConvex();
		await submitText(t, [["Eins", "."]]);
		await submitText(t, [["Zwei", "."]]);
		await t.run(async (ctx) => {
			await ctx.db.insert("inspectionClicks", {
				requestId: "request-1",
				visitorId: "visitor-1",
				selectedSegment: "Eins",
				sentence: "Eins.",
				startedAt: 1,
				selectionKind: "Resolving",
			});
			const stepId = await ctx.db.insert("inspectionSteps", {
				requestId: "request-1",
				id: "step-1",
				name: "Resolution session",
				kind: "Code",
				owner: "app/tf-demo",
				startedAt: 1,
				durationMs: 1,
				status: "Success",
			});
			await ctx.db.insert("inspectionPayloads", {
				stepId,
				part: 0,
				text: "{}",
			});
		});

		const result = await t.action(api.demoReset.stripAnalyses, {});

		expect(result).toEqual({
			strippedTexts: 2,
			removed: 4,
			deletedReadings: 0,
			deletedLemmas: 0,
			removedInspectionRecords: 3,
		});
		expect(await tableRows(t, "texts")).toHaveLength(2);
		expect(await tableRows(t, "sentences")).toHaveLength(2);
		expect(await tableRows(t, "segments")).toEqual([]);
		expect(await tableRows(t, "inspectionPayloads")).toEqual([]);
		expect(await tableRows(t, "inspectionSteps")).toEqual([]);
		expect(await tableRows(t, "inspectionClicks")).toEqual([]);
	});

	test("the bounded reset inventory stays complete as the schema changes", async () => {
		const schemaTableNames = Object.keys(tfDemoSchema.tables).sort();
		expect([...resetDemoTableNames].sort()).toEqual(schemaTableNames);

		const t = createTestConvex();
		const { sentenceIds } = await submitText(t, [["Banken"]]);
		const sentenceId = sentenceIds[0];
		if (!sentenceId) throw new Error("Expected a stored Sentence.");
		await t.mutation(api.resolutionSessions.selectSegment, {
			requestId: "request-1",
			visitorId: "visitor-1",
			sentenceId,
			clickedSegmentIndex: 0,
			routeNoteRequested: false,
		});
		await insertReading(t, "reading-key-1");

		expect(await t.action(internal.demoReset.resetDemoData, {})).toEqual({
			deleted: expect.any(Number),
		});
		for (const tableName of resetDemoTableNames) {
			expect(await tableRows(t, tableName), tableName).toEqual([]);
		}
	});

	test("pruning a Reading deletes a row from every Reading-owned table, and nothing of another Reading", async () => {
		const t = createTestConvex();
		const pruned = await insertReading(t, "reading-key-1");
		const kept = await insertReading(t, "reading-key-2");
		const bystander = await insertReading(t, "reading-key-3");
		expect(Object.keys(readingOwnedRows).sort()).toEqual(
			ownedTables(readingOwnershipFields, readingSweepExemptions),
		);
		const seeded = await t.run(async (ctx) => {
			const rows = { pruned: [] as string[], kept: [] as string[] };
			for (const build of Object.values(readingOwnedRows)) {
				rows.pruned.push(...(await build(ctx, pruned, bystander)));
				rows.kept.push(...(await build(ctx, kept, bystander)));
			}
			return rows;
		});

		let cursor: { itemIndex: number; phase: string } | null | undefined;
		for (let batch = 0; batch < 8; batch += 1) {
			const result = await t.mutation(
				internal.demoReset.clearReadingDataBatch,
				{
					readingKeys: ["reading-key-1"],
					...(cursor ? { cursor: cursor as never } : {}),
				},
			);
			cursor = result.nextCursor;
			if (!cursor) break;
		}

		expect(cursor).toBeNull();
		const remaining = await existingIds(t, [
			...seeded.pruned,
			...seeded.kept,
		]);
		expect(seeded.pruned.filter((id) => remaining.has(id))).toEqual([]);
		expect(seeded.kept.filter((id) => !remaining.has(id))).toEqual([]);
	});

	test("clearing a Visitor deletes a row from every Visitor-owned table, and nothing of another Visitor", async () => {
		const t = createTestConvex();
		const reading = await insertReading(t, "reading-key-1");
		const { sentenceIds } = await submitText(t, [["Banken"]]);
		const sentenceId = sentenceIds[0];
		if (!sentenceId) throw new Error("Expected a stored Sentence.");
		expect(Object.keys(visitorOwnedRows).sort()).toEqual(
			ownedTables(["visitorId"], visitorSweepExemptions),
		);
		const seeded = { cleared: [] as string[], kept: [] as string[] };
		for (const build of Object.values(visitorOwnedRows)) {
			seeded.cleared.push(
				...(await build(t, "visitor-1", reading, sentenceId)),
			);
			seeded.kept.push(
				...(await build(t, "visitor-2", reading, sentenceId)),
			);
		}

		await t.action(api.demoReset.clearVisitorData, {
			visitorId: "visitor-1",
		});

		const remaining = await existingIds(t, [
			...seeded.cleared,
			...seeded.kept,
		]);
		expect(seeded.cleared.filter((id) => remaining.has(id))).toEqual([]);
		expect(seeded.kept.filter((id) => !remaining.has(id))).toEqual([]);
	});

	test("clearing a Visitor promotes another Visitor's attempt waiting behind a removed one", async () => {
		const t = createTestConvex();
		const reading = await insertReading(t, "reading-key-1");
		await t.run(async (ctx) => {
			for (const [visitorId, state] of [
				["visitor-1", "Running"],
				["visitor-2", "Waiting"],
			] as const) {
				await ctx.db.insert("knowledgeGenerationAttempts", {
					attemptKey: `attempt-${visitorId}`,
					visitorId,
					ownerReadingKey: "reading-key-1",
					readingId: reading.readingId,
					attestationId: reading.attestationId,
					state,
					createdAt: 1,
					updatedAt: 1,
				});
			}
		});

		await t.action(api.demoReset.clearVisitorData, {
			visitorId: "visitor-1",
		});

		expect(await tableRows(t, "knowledgeGenerationAttempts")).toEqual([
			expect.objectContaining({
				attemptKey: "attempt-visitor-2",
				state: "Scheduled",
			}),
		]);
		const scheduled = await t.run((ctx) =>
			ctx.db.system.query("_scheduled_functions").collect(),
		);
		expect(scheduled.map(({ name, args }) => ({ name, args }))).toEqual([
			{
				name: "knowledgeGenerationActions:runKnowledgeGeneration",
				args: [{ attemptKey: "attempt-visitor-2" }],
			},
			{
				name: "knowledgeGeneration:recoverStaleRun",
				args: [{ attemptKey: "attempt-visitor-2", runNumber: 1 }],
			},
		]);
	});

	test("pruning a Reading clears the rows that would haunt its next incarnation", async () => {
		const t = createTestConvex();
		const pruned = await insertReading(t, "reading-key-1");
		const kept = await insertReading(t, "reading-key-2");
		await t.run(async (ctx) => {
			const attempt = (
				owner: typeof pruned,
				ownerReadingKey: string,
				state: "Running" | "Waiting",
				attemptKey: string,
			) =>
				ctx.db.insert("knowledgeGenerationAttempts", {
					attemptKey,
					visitorId: "visitor-1",
					ownerReadingKey,
					readingId: owner.readingId,
					attestationId: owner.attestationId,
					state,
					createdAt: 1,
					updatedAt: 1,
				});
			await attempt(
				pruned,
				"reading-key-1",
				"Running",
				"attempt-running",
			);
			await attempt(
				pruned,
				"reading-key-1",
				"Waiting",
				"attempt-waiting",
			);
			await attempt(kept, "reading-key-2", "Running", "attempt-other");
			await ctx.db.insert("generatedRelationRuns", {
				runKey: "run-1",
				attemptKey: "attempt-running",
				runNumber: 1,
				relation: "synonym",
				sourceReadingId: pruned.readingId,
				sourceReadingKey: "reading-key-1",
				contextAttestationId: pruned.attestationId,
				verdictArtifactPath: null,
				fingerprints,
				generatedTargets: 0,
				nulls: 0,
				pendingShadows: 0,
				directMatches: 0,
				rejectedOutputs: 0,
				publicationFailures: 0,
				createdAt: 1,
				updatedAt: 1,
			});
			await ctx.db.insert("generatedRelationProposals", {
				proposalKey: "proposal-1",
				attemptKey: "attempt-running",
				runNumber: 1,
				relation: "synonym",
				sourceReadingId: pruned.readingId,
				sourceReadingKey: "reading-key-1",
				contextAttestationId: pruned.attestationId,
				targetShadow: {
					language: "de",
					canonicalForm: "laufen",
					family: "Lexeme",
					kind: "VERB",
				},
				verdictArtifactPath: "artifact",
				fingerprints,
				outcome: "PendingShadow",
				reviewStatus: "NotSampled",
				createdAt: 1,
				updatedAt: 1,
			});
			for (const owner of [pruned, kept]) {
				await ctx.db.insert("personalAnnotations", {
					visitorId: "visitor-1",
					readingId: owner.readingId,
					text: "note",
					updatedAt: 1,
				});
			}
		});

		let cursor: { itemIndex: number; phase: string } | null | undefined;
		for (let batch = 0; batch < 4; batch += 1) {
			const result = await t.mutation(
				internal.demoReset.clearReadingDataBatch,
				{
					readingKeys: ["reading-key-1"],
					...(cursor ? { cursor: cursor as never } : {}),
				},
			);
			cursor = result.nextCursor;
			if (!cursor) break;
		}

		expect(cursor).toBeNull();
		expect((await tableRows(t, "readings")).map(({ _id }) => _id)).toEqual([
			kept.readingId,
		]);
		expect(
			(await tableRows(t, "knowledgeGenerationAttempts")).map(
				({ attemptKey }) => attemptKey,
			),
		).toEqual(["attempt-other"]);
		expect(await tableRows(t, "generatedRelationRuns")).toEqual([]);
		expect(await tableRows(t, "generatedRelationProposals")).toEqual([]);
		expect(
			(await tableRows(t, "personalAnnotations")).map(
				({ readingId }) => readingId,
			),
		).toEqual([kept.readingId]);
	});

	test("reset batches spend one transaction-wide budget and expose continuation", async () => {
		const t = createTestConvex();
		const { readingId } = await insertReading(t, "reading-key-1");
		await t.run(async (ctx) => {
			for (let index = 0; index < 400; index += 1) {
				await ctx.db.insert("personalAnnotations", {
					visitorId: "visitor-1",
					readingId,
					text: `note ${index}`,
					updatedAt: index,
				});
			}
			await ctx.db.insert("readingLanguageLayouts", {
				visitorId: "visitor-1",
				targetLanguage: "de",
				order: [],
				hidden: [],
				updatedAt: 1,
			});
		});
		const tableIndex = resetDemoTableNames.indexOf("personalAnnotations");

		expect(
			await t.mutation(internal.demoReset.clearSharedDataBatch, {
				tableIndex,
			}),
		).toEqual({ deleted: 400, hasMore: true, nextTableIndex: tableIndex });

		await t.run(async (ctx) => {
			for (let index = 0; index < 400; index += 1) {
				await ctx.db.insert("personalAnnotations", {
					visitorId: "visitor-1",
					readingId,
					text: `note ${index}`,
					updatedAt: index,
				});
			}
		});
		expect(
			await t.mutation(internal.demoReset.clearVisitorDataBatch, {
				visitorId: "visitor-1",
				phase: "PersonalAnnotations",
			}),
		).toEqual({
			deleted: 400,
			hasMore: true,
			nextPhase: "PersonalAnnotations",
		});
		expect(await tableRows(t, "readingLanguageLayouts")).toHaveLength(1);
	});

	test("visitor reset removes Reading layouts without touching another visitor", async () => {
		const t = createTestConvex();
		await t.run(async (ctx) => {
			for (const visitorId of ["visitor-1", "visitor-2"]) {
				await ctx.db.insert("knowledgeSettings", {
					visitorId,
					settings: defaultKnowledgeSettings(),
					updatedAt: 1,
				});
				await ctx.db.insert("readingLanguageLayouts", {
					visitorId,
					targetLanguage: "de",
					order: [],
					hidden: [],
					updatedAt: 1,
				});
				await ctx.db.insert("readingFamilyKindLayouts", {
					visitorId,
					targetLanguage: "de",
					family: "Lexeme",
					kind: "NOUN",
					order: [],
					hidden: [],
					updatedAt: 1,
				});
			}
		});

		await t.action(api.demoReset.clearVisitorData, {
			visitorId: "visitor-1",
		});

		for (const tableName of [
			"knowledgeSettings",
			"readingLanguageLayouts",
			"readingFamilyKindLayouts",
		] as const) {
			expect(
				(await tableRows(t, tableName)).map((row) =>
					"visitorId" in row ? row.visitorId : null,
				),
			).toEqual(["visitor-2"]);
		}
	});

	test("a clean database stores base Knowledge and direct claims while projecting only valid inferred views", async () => {
		const t = createTestConvex();
		const dictionary = dictionaryFor(t);

		for (const reading of [
			gehenReading,
			fahrenReading,
			prefixedFahrenReading,
		] as const) {
			expect(
				await Effect.runPromise(
					dictionary.addNewNote({
						draft: { reading, note: emptyNote },
					}),
				),
			).toMatchObject({ status: "applied" });
		}

		expect(
			await Effect.runPromise(
				dictionary.addNewNote({
					draft: {
						reading: laufenReading,
						note: emptyNote,
						relations: [
							{
								relation: "hypernym",
								target: { kind: "existing", lemma: gehenLemma },
							},
							{
								target: {
									kind: "pending",
									pending: {
										relation: "antonym",
										target: {
											language: "de",
											canonicalForm: "fahren",
											family: "Lexeme",
											kind: "VERB",
										},
									},
								},
							},
						],
					},
				}),
			),
		).toMatchObject({ status: "applied" });
		expect(
			await Effect.runPromise(
				dictionary.applyGeneratedKnowledge({
					reading: laufenReading,
					changes: [
						{
							kind: "Contribute",
							aspect: "definition",
							value: "sich laufend fortbewegen",
						},
					],
					pendingRelations: [],
				}),
			),
		).toMatchObject({ status: "applied" });

		const sourceReadingId = await readingIdFor(t, laufenReading);
		const targetReadingId = await readingIdFor(t, gehenReading);

		expect(
			(await tableRows(t, "accumulatedKnowledge")).find(
				({ ownerReadingKey }) =>
					ownerReadingKey === readingFingerprint(laufenReading),
			),
		).toMatchObject({
			knowledge: { definition: "sich laufend fortbewegen" },
			status: "Partial",
		});
		expect(await tableRows(t, "semanticRelationEdges")).toEqual([
			expect.objectContaining({
				sourceReadingId,
				relation: "hypernym",
			}),
		]);
		expect(
			await t.run((ctx) => loadRelationProjections(ctx, targetReadingId)),
		).toMatchObject({
			fingerprints: [
				{
					relation: "hyponym",
					targetCanonicalForm: "laufen",
					provenance: "inferred",
				},
			],
		});

		expect(await tableRows(t, "pendingSemanticRelations")).toHaveLength(1);
		expect(await tableRows(t, "shadows")).toHaveLength(1);
		expect(
			(
				await t.run((ctx) =>
					loadRelationProjections(ctx, sourceReadingId),
				)
			).fingerprints,
		).toEqual([
			expect.objectContaining({
				relation: "hypernym",
				targetCanonicalForm: "gehen",
				provenance: "direct",
			}),
		]);
		for (const reading of [fahrenReading, prefixedFahrenReading] as const) {
			const readingId = await readingIdFor(t, reading);
			expect(
				(await t.run((ctx) => loadRelationProjections(ctx, readingId)))
					.fingerprints,
			).toEqual([]);
		}
	});
});

test("submission retries reuse exact segmentation despite a fresh generated sentence ID", async () => {
	const t = createTestConvex();
	const input = {
		submissionKey: "retry",
		sourceText: "Banken",
		sentences: [
			{
				segmentedSentenceId: "first",
				position: 0,
				paragraph: 0,
				language: "de" as const,
				stitchedText: "Banken",
				segments: [{ kind: "ResolvableText" as const, text: "Banken" }],
			},
		],
	};
	const [sentence] = input.sentences;
	if (!sentence) throw new Error("Expected a Sentence input.");
	const first = await t.mutation(
		internal.persistence.persistSubmittedText,
		input,
	);
	const second = await t.mutation(internal.persistence.persistSubmittedText, {
		...input,
		sentences: [{ ...sentence, segmentedSentenceId: "fresh" }],
	});
	expect(second).toEqual({ ...first, deduplicated: true });
	const sentences = await tableRows(t, "sentences");
	expect(sentences).toHaveLength(1);
	expect(sentences[0]).toMatchObject({ segmentedSentenceId: "first" });
});

test("an active Visitor Encounter is not replayed as an Unresolved result", async () => {
	const t = createTestConvex();
	const { sentenceIds } = await submitText(t, [["Banken"]]);
	const sentenceId = sentenceIds[0];
	if (!sentenceId) throw new Error("Expected a stored Sentence.");
	const input = {
		requestId: "request-1",
		visitorId: "visitor-1",
		sentenceId,
		clickedSegmentIndex: 0,
	};
	await t.mutation(api.resolutionSessions.selectSegment, {
		...input,
		routeNoteRequested: false,
	});

	expect(
		(await t.query(internal.resolutionContext.load, input)).recorded,
	).toBeNull();
	const [click] = await tableRows(t, "visitorClicks");
	await t.run(async (ctx) => {
		const session = await ctx.db
			.query("resolutionSessions")
			.withIndex("by_request_id", (q) => q.eq("requestId", "request-1"))
			.unique();
		if (!session) throw new Error("Expected an active session.");
		await ctx.db.patch(session._id, {
			lifecycle: {
				state: "Terminal",
				progress: "RouteAvailable",
				outcome: "Unresolved",
			},
		});
	});
	expect(
		(await t.query(internal.resolutionContext.load, input)).recorded,
	).toEqual({ clickId: click?._id, status: "Unresolved" });
});
