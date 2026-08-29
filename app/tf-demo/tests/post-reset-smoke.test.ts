import { describe, expect, test } from "bun:test";
import {
	createDumdictService,
	type DumdictStoragePort,
	makeSurfaceId,
} from "dumdict";
import { derivePendingSemanticRelationLocator } from "dumdict/pending";
import { readingFingerprint } from "dumling";
import {
	clearVisitorDataBatch,
	resetDemoDataBatch,
	resetDemoTableNames,
} from "../convex/demoReset";
import {
	commitDumdictChanges,
	findDumdictStoredReadings,
	getDumdictRelationsCleanupInfo,
	loadDumdictCleanupRelationsContext,
	loadDumdictReadingEntryContext,
	loadDumdictReadingForPatch,
} from "../convex/dumdictStorage";
import { loadRelationProjections } from "../convex/modules/notes/relations";
import tfDemoSchema from "../convex/schema";
import { lemmaIdentityKey } from "../server/linguisticIdentity";
import {
	IndexedTestDb,
	runTestMutation,
	runTestQuery,
} from "./support/indexed-db";

const verbFeatures = {
	verbType: null,
	lexicallyReflexive: null,
	hasSepPrefix: null,
	hasGovPrep: null,
} as const;

const gehenLemma = {
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

const gehenReading = { lemma: gehenLemma, emojiDescription: "🚶" } as const;
const laufenReading = { lemma: laufenLemma, emojiDescription: "🏃" } as const;
const fahrenReading = { lemma: fahrenLemma, emojiDescription: "🚗" } as const;
const prefixedFahrenReading = {
	lemma: prefixedFahrenLemma,
	emojiDescription: "🚙",
} as const;

const emptyNote = {
	attestedTranslations: [],
	attestations: [],
	notes: "",
};

function locatorKey(locator: {
	sourceReadingKey: string;
	relation: string;
	targetPendingId: string;
}): string {
	return JSON.stringify([
		locator.sourceReadingKey,
		locator.relation,
		locator.targetPendingId,
	]);
}

function storageFor(db: IndexedTestDb): DumdictStoragePort<"de"> {
	return {
		async findStoredReadings({ lemma }) {
			return (await runTestQuery(db, findDumdictStoredReadings, {
				lemmaKey: lemmaIdentityKey(lemma),
			})) as never;
		},
		async loadReadingEntryContext(request) {
			const readingKey = readingFingerprint(request.reading);
			if (request.intent === "addNewNote")
				return (await runTestQuery(db, loadDumdictReadingEntryContext, {
					request: {
						intent: request.intent,
						lemmaKey: lemmaIdentityKey(request.reading.lemma),
						proposedLemma: request.reading.lemma,
						readingKey,
						surfaceKeys: request.ownedSurfaces.map((surface) =>
							makeSurfaceId("de", surface),
						),
						explicitLemmaTargetKeys: request.relations.flatMap(
							({ target }) =>
								target.kind === "existing"
									? [lemmaIdentityKey(target.lemma)]
									: [],
						),
						pendingLocatorKeys: request.relations.flatMap(
							({ target }) =>
								target.kind === "pending"
									? [
											locatorKey(
												derivePendingSemanticRelationLocator(
													request.reading,
													target.pending,
												),
											),
										]
									: [],
						),
					},
				})) as never;
			if (request.intent === "applyGeneratedKnowledge")
				return (await runTestQuery(db, loadDumdictReadingEntryContext, {
					request: {
						intent: request.intent,
						readingKey,
						pendingLocatorKeys: request.pendingRelations.map(
							(pending) =>
								locatorKey(
									derivePendingSemanticRelationLocator(
										request.reading,
										pending,
									),
								),
						),
					},
				})) as never;
			throw new Error(
				`Unexpected Reading Entry intent: ${request.intent}`,
			);
		},
		async loadReadingForPatch({ reading }) {
			return (await runTestQuery(db, loadDumdictReadingForPatch, {
				readingKey: readingFingerprint(reading),
			})) as never;
		},
		async getInfoForRelationsCleanup({ canonicalForm }) {
			return (await runTestQuery(db, getDumdictRelationsCleanupInfo, {
				canonicalForm,
			})) as never;
		},
		async loadCleanupRelationsContext({ resolutions }) {
			return (await runTestQuery(db, loadDumdictCleanupRelationsContext, {
				locatorKeys: resolutions.map(({ locator }) =>
					locatorKey(locator),
				),
			})) as never;
		},
		async commitChanges(request) {
			return (await runTestMutation(
				db,
				commitDumdictChanges,
				request,
			)) as never;
		},
	};
}

describe("tf-demo post-reset contract", () => {
	test("the bounded reset inventory stays complete as the schema changes", async () => {
		const schemaTableNames = Object.keys(tfDemoSchema.tables).sort();
		expect([...resetDemoTableNames].sort()).toEqual(schemaTableNames);

		const db = new IndexedTestDb(
			Object.fromEntries(
				resetDemoTableNames.map((tableName) => [
					tableName,
					[{ _id: `${tableName}-old-row` }],
				]),
			),
		);
		let deleted = 0;
		let tableIndex = 0;
		for (
			let batch = 0;
			batch < resetDemoTableNames.length * 2;
			batch += 1
		) {
			const result = (await runTestMutation(db, resetDemoDataBatch, {
				tableIndex,
			})) as {
				deleted: number;
				hasMore: boolean;
				nextTableIndex: number;
			};
			deleted += result.deleted;
			tableIndex = result.nextTableIndex;
			if (!result.hasMore) break;
		}

		expect(deleted).toBe(schemaTableNames.length);
		for (const tableName of schemaTableNames) {
			expect(db.rows(tableName), tableName).toEqual([]);
		}
	});

	test("reset batches spend one transaction-wide budget and expose continuation", async () => {
		const db = new IndexedTestDb({
			resolutionSessions: Array.from({ length: 400 }, (_, index) => ({
				_id: `session-${index}`,
			})),
			resolutionRuns: [{ _id: "run-after-session-phase" }],
		});
		const first = (await runTestMutation(db, resetDemoDataBatch, {
			tableIndex: 0,
		})) as {
			deleted: number;
			hasMore: boolean;
			nextTableIndex: number;
		};
		expect(first).toEqual({
			deleted: 400,
			hasMore: true,
			nextTableIndex: 0,
		});
		expect(db.rows("resolutionRuns")).toHaveLength(1);

		const visitorDb = new IndexedTestDb({
			resolutionSessions: Array.from({ length: 400 }, (_, index) => ({
				_id: `visitor-session-${index}`,
				visitorId: "visitor-1",
				updatedAt: index,
			})),
			knowledgeSettings: [{ _id: "settings-1", visitorId: "visitor-1" }],
			visitorClicks: [
				{
					_id: "click-1",
					visitorId: "visitor-1",
					clickedAt: 1,
				},
			],
		});
		const visitorFirst = (await runTestMutation(
			visitorDb,
			clearVisitorDataBatch,
			{ visitorId: "visitor-1", phase: "ResolutionSessions" },
		)) as {
			deleted: number;
			hasMore: boolean;
			nextPhase: string;
		};
		expect(visitorFirst).toEqual({
			deleted: 400,
			hasMore: true,
			nextPhase: "ResolutionSessions",
		});
		expect(visitorDb.rows("knowledgeSettings")).toHaveLength(1);
		expect(visitorDb.rows("visitorClicks")).toHaveLength(1);
	});

	test("a clean database stores base Knowledge and direct claims while projecting only valid inferred views", async () => {
		const db = new IndexedTestDb();
		const dictionary = createDumdictService({
			language: "de",
			storage: storageFor(db),
		});

		for (const reading of [
			gehenReading,
			fahrenReading,
			prefixedFahrenReading,
		] as const) {
			expect(
				await dictionary.addNewNote({
					draft: { reading, note: emptyNote },
				}),
			).toMatchObject({ status: "applied" });
		}

		expect(
			await dictionary.addNewNote({
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
		).toMatchObject({ status: "applied" });
		expect(
			await dictionary.applyGeneratedKnowledge({
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
		).toMatchObject({ status: "applied" });

		const sourceReadingId = db
			.rows("readings")
			.find(
				({ readingKey }) =>
					readingKey === readingFingerprint(laufenReading),
			)?._id;
		const targetReadingId = db
			.rows("readings")
			.find(
				({ readingKey }) =>
					readingKey === readingFingerprint(gehenReading),
			)?._id;
		if (!sourceReadingId || !targetReadingId) {
			throw new Error("Expected fresh source and target Readings.");
		}

		expect(
			db
				.rows("accumulatedKnowledge")
				.find(
					({ ownerReadingKey }) =>
						ownerReadingKey === readingFingerprint(laufenReading),
				),
		).toMatchObject({
			knowledge: { definition: "sich laufend fortbewegen" },
			status: "Partial",
		});
		expect(db.rows("semanticRelationEdges")).toEqual([
			expect.objectContaining({
				sourceReadingId,
				relation: "hypernym",
			}),
		]);
		expect(
			await loadRelationProjections(
				{ db } as never,
				targetReadingId as never,
			),
		).toMatchObject({
			fingerprints: [
				{
					relation: "hyponym",
					targetCanonicalForm: "laufen",
					provenance: "inferred",
				},
			],
		});

		expect(db.rows("pendingSemanticRelations")).toHaveLength(1);
		expect(db.rows("shadows")).toHaveLength(1);
		expect(
			(
				await loadRelationProjections(
					{ db } as never,
					sourceReadingId as never,
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
			const readingId = db
				.rows("readings")
				.find(
					({ readingKey }) =>
						readingKey === readingFingerprint(reading),
				)?._id;
			if (!readingId)
				throw new Error("Expected ambiguous target Reading.");
			expect(
				(
					await loadRelationProjections(
						{ db } as never,
						readingId as never,
					)
				).fingerprints,
			).toEqual([]);
		}
	});
});
