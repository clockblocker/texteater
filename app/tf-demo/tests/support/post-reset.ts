import { api } from "../../convex/_generated/api";
import type { Doc, Id, TableNames } from "../../convex/_generated/dataModel";
import type { MutationCtx } from "../../convex/_generated/server";
import type { resetDemoTableNames } from "../../convex/demoReset";
import { defaultKnowledgeSettings } from "../../convex/knowledgeSettings";
import {
	createDumdictTransaction,
	type DumdictTransaction,
} from "../../convex/model/dumdictTransaction";
import tfDemoSchema from "../../convex/schema";
import {
	foldedCanonicalForm,
	readingIdentityKey,
} from "../../server/linguisticIdentity";
import type { TestConvexDb } from "./convex";

/*
 * The fixtures and table inventories the post-reset contract tests share.
 */

const verbFeatures = {
	lexicallyReflexive: null,
	hasSepPrefix: null,
} as const;

export const gehenLemma = {
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

export const gehenReading = {
	unitKind: "Reading",
	lemma: gehenLemma,
	emojiDescription: "🚶",
} as const;
export const laufenReading = {
	unitKind: "Reading",
	lemma: laufenLemma,
	emojiDescription: "🏃",
} as const;
export const fahrenReading = {
	unitKind: "Reading",
	lemma: fahrenLemma,
	emojiDescription: "🚗",
} as const;
export const prefixedFahrenReading = {
	unitKind: "Reading",
	lemma: prefixedFahrenLemma,
	emojiDescription: "🚙",
} as const;

export const emptyNote = {
	attestedTranslations: [],
	attestationLinks: [],
	notes: "",
};

/** Runs one Dictionary workflow the way a host mutation does. */
export function inTransaction<Result>(
	t: TestConvexDb,
	run: (dictionary: DumdictTransaction) => Promise<Result>,
) {
	return t.run((ctx) => run(createDumdictTransaction(ctx)));
}

export async function readingIdFor(
	t: TestConvexDb,
	reading: Parameters<typeof readingIdentityKey>[0],
): Promise<Id<"readings">> {
	const row = await t.run((ctx) =>
		ctx.db
			.query("readings")
			.withIndex("by_reading_key", (q) =>
				q.eq("readingKey", readingIdentityKey(reading)),
			)
			.unique(),
	);
	if (!row) throw new Error("Expected a stored Reading.");
	return row._id;
}

export async function tableRows<
	Table extends (typeof resetDemoTableNames)[number],
>(t: TestConvexDb, table: Table): Promise<Doc<Table>[]> {
	return t.run((ctx) => ctx.db.query(table).collect());
}

/** Inserts a bare Lemma and Reading, as the dictionary stores them. */
export async function insertReading(t: TestConvexDb, readingKey: string) {
	return t.run(async (ctx) => {
		const lemmaId = await ctx.db.insert("lemmas", {
			lemmaKey: `lemma:${readingKey}`,
			language: "de",
			family: "Lexeme",
			kind: "VERB",
			canonicalForm: readingKey,
			foldedCanonicalForm: foldedCanonicalForm({
				language: "de",
				canonicalForm: readingKey,
			}),
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
			spelling: { kind: "Canonical" },
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

export const fingerprints = {
	prompt: "prompt",
	schema: "schema",
	evaluator: "evaluator",
	model: "model",
	policy: "policy",
};

type SeededReading = Awaited<ReturnType<typeof insertReading>>;

/** Fields that tie a row to a Reading, directly or through its attempt. */
export const readingOwnershipFields = [
	"readingId",
	"readingKey",
	"ownerReadingKey",
	"sourceReadingId",
	"sourceReadingKey",
	"targetReadingId",
	"targetReadingKey",
	"attemptKey",
];

/** Fields that tie a row to a Lemma. */
export const lemmaOwnershipFields = ["lemmaId", "targetLemmaId"];

/** Knowledge production runs belong to their attempt's Reading and Visitor. */
export const ownedThroughAttempt = ["knowledgeProductionRuns"];

/** An owned-Surface entry belongs to its Surface's Lemma. */
export const ownedThroughSurface = ["ownedSurfaces"];

/**
 * Schema tables owned through `fields`, or through a row in `ownedThrough`,
 * less the exempt ones.
 */
export function ownedTables(
	fields: readonly string[],
	exemptions: Readonly<Record<string, string | undefined>>,
	ownedThrough: readonly string[],
): string[] {
	return Object.entries(tfDemoSchema.tables)
		.filter(([tableName, table]) => {
			if (tableName in exemptions) return false;
			if (ownedThrough.includes(tableName)) return true;
			const tableFields = Object.keys(
				(table.validator as { fields?: Record<string, unknown> })
					.fields ?? {},
			);
			return tableFields.some((field) => fields.includes(field));
		})
		.map(([tableName]) => tableName)
		.sort();
}

/** The tables a cleanup phase list deletes from. */
export function sweptTables(
	phases: readonly (
		| { readonly table: string }
		| { readonly tables?: readonly string[] }
	)[],
): string[] {
	return [
		...new Set(
			phases.flatMap((phase) =>
				"table" in phase ? [phase.table] : (phase.tables ?? []),
			),
		),
	].sort();
}

export async function existingIds(
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
 * phase in `READING_CLEANUP_PHASES`, or the sweep test fails.
 */
export const readingOwnedRows: Record<
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
			targetFoldedCanonicalForm: "laufen",
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
 * Visitor-owned table needs a builder here and a phase in
 * `VISITOR_CLEANUP_PHASES`, or the clear test fails.
 */
export const visitorOwnedRows: Record<
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
		});
		return (await tableRows(t, "resolutionSessions"))
			.filter((row) => row.visitorId === visitorId)
			.map(({ _id }) => _id);
	},
	visitorEncounters: async (t, visitorId) =>
		(await tableRows(t, "visitorEncounters"))
			.filter((row) => row.visitorId === visitorId)
			.map(({ _id }) => _id),
	scrollProgress: (t, visitorId, _reading, sentenceId) =>
		t.run(async (ctx) => {
			const sentence = await ctx.db.get(sentenceId);
			if (!sentence) throw new Error("The seeded Sentence is gone.");
			return [
				await ctx.db.insert("scrollProgress", {
					visitorId,
					scrollId: sentence.scrollId,
					status: "InProgress",
					position: 0,
				}),
			];
		}),
	sectionProgress: (t, visitorId, _reading, sentenceId) =>
		t.run(async (ctx) => {
			const sentence = await ctx.db.get(sentenceId);
			if (!sentence) throw new Error("The seeded Sentence is gone.");
			const sectionId = await ctx.db.insert("sections", {
				title: "Book",
				scrollCount: 1,
			});
			return [
				await ctx.db.insert("sectionProgress", {
					visitorId,
					sectionId,
					lastScrollId: sentence.scrollId,
					doneScrolls: 0,
				}),
			];
		}),
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
