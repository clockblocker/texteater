import { describe, expect, test } from "bun:test";
import { getFunctionName } from "convex/server";
import { createDumdictService, type DumdictStoragePort } from "dumdict";
import * as Effect from "effect/Effect";
import {
	clearLemmaDataBatch,
	clearReadingDataBatch,
	clearResolutionInspectionBatch,
	clearVisitorDataBatch,
	getTextAnalysisCandidates,
	listTextIds,
	resetDemoDataBatch,
	resetDemoTableNames,
	stripAllAnalyses,
	stripTextAnalysisGraphBatch,
} from "../convex/demoReset";
import { loadRelationProjections } from "../convex/modules/notes/relations";
import { persistSubmittedText } from "../convex/persistence";
import { load as loadResolutionContext } from "../convex/resolutionContext";
import tfDemoSchema from "../convex/schema";
import { readingIdentityKey as readingFingerprint } from "../server/linguisticIdentity";
import { createTestConvexDumdictStorage } from "./support/dumdict-storage";
import {
	IndexedTestDb,
	runTestMutation,
	runTestQuery,
} from "./support/indexed-db";

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

function storageFor(db: IndexedTestDb): DumdictStoragePort<"de"> {
	return createTestConvexDumdictStorage({
		runQuery: (implementation, args) =>
			runTestQuery(db, implementation, args),
		runMutation: (implementation, args) =>
			runTestMutation(db, implementation, args),
	});
}

describe("tf-demo post-reset contract", () => {
	test("Strip analyses covers every Text and clears Resolution Inspector data", async () => {
		const db = new IndexedTestDb({
			texts: [
				{ _id: "texts-one", sourceText: "Eins." },
				{ _id: "texts-two", sourceText: "Zwei." },
			],
			sentences: [
				{
					_id: "sentences-one",
					textId: "texts-one",
					position: 0,
				},
				{
					_id: "sentences-two",
					textId: "texts-two",
					position: 0,
				},
			],
			segments: [
				{
					_id: "segments-one",
					sentenceId: "sentences-one",
					index: 0,
				},
				{
					_id: "segments-two",
					sentenceId: "sentences-two",
					index: 0,
				},
			],
			inspectionPayloads: [{ _id: "inspectionPayloads-one" }],
			inspectionSteps: [{ _id: "inspectionSteps-one" }],
			inspectionClicks: [{ _id: "inspectionClicks-one" }],
		});
		const queryFunctions = new Map<string, unknown>([
			["demoReset:listTextIds", listTextIds],
			["demoReset:getTextAnalysisCandidates", getTextAnalysisCandidates],
		]);
		const mutationFunctions = new Map<string, unknown>([
			[
				"demoReset:stripTextAnalysisGraphBatch",
				stripTextAnalysisGraphBatch,
			],
			["demoReset:clearReadingDataBatch", clearReadingDataBatch],
			["demoReset:clearLemmaDataBatch", clearLemmaDataBatch],
			[
				"demoReset:clearResolutionInspectionBatch",
				clearResolutionInspectionBatch,
			],
		]);
		const result = await stripAllAnalyses({
			runQuery: (reference, args) => {
				const fn = queryFunctions.get(getFunctionName(reference));
				if (!fn)
					throw new Error(
						`Unexpected query ${getFunctionName(reference)}`,
					);
				return runTestQuery(db, fn, args);
			},
			runMutation: (reference, args) => {
				const fn = mutationFunctions.get(getFunctionName(reference));
				if (!fn) {
					throw new Error(
						`Unexpected mutation ${getFunctionName(reference)}`,
					);
				}
				return runTestMutation(db, fn, args);
			},
		} as never);

		expect(result).toEqual({
			strippedTexts: 2,
			removed: 2,
			deletedReadings: 0,
			deletedLemmas: 0,
			removedInspectionRecords: 3,
		});
		expect(db.rows("texts")).toHaveLength(2);
		expect(db.rows("sentences")).toHaveLength(2);
		expect(db.rows("segments")).toEqual([]);
		expect(db.rows("inspectionPayloads")).toEqual([]);
		expect(db.rows("inspectionSteps")).toEqual([]);
		expect(db.rows("inspectionClicks")).toEqual([]);
	});

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

	test("visitor reset removes Reading layouts without touching another visitor", async () => {
		const db = new IndexedTestDb({
			knowledgeSettings: [
				{ _id: "knowledge-1", visitorId: "visitor-1" },
				{ _id: "knowledge-2", visitorId: "visitor-2" },
			],
			readingLanguageLayouts: [
				{
					_id: "language-layout-1",
					visitorId: "visitor-1",
					targetLanguage: "de",
				},
				{
					_id: "language-layout-2",
					visitorId: "visitor-2",
					targetLanguage: "de",
				},
			],
			readingFamilyKindLayouts: [
				{
					_id: "family-kind-layout-1",
					visitorId: "visitor-1",
					targetLanguage: "de",
					family: "Lexeme",
					kind: "NOUN",
				},
				{
					_id: "family-kind-layout-2",
					visitorId: "visitor-2",
					targetLanguage: "de",
					family: "Lexeme",
					kind: "NOUN",
				},
			],
		});
		let phase:
			| "KnowledgeSettings"
			| "ReadingLanguageLayouts"
			| "ReadingFamilyKindLayouts"
			| "VisitorClicks"
			| "Done" = "KnowledgeSettings";
		for (let step = 0; step < 5 && phase !== "Done"; step += 1) {
			const result = (await runTestMutation(db, clearVisitorDataBatch, {
				visitorId: "visitor-1",
				phase,
			})) as { nextPhase: typeof phase };
			phase = result.nextPhase;
		}

		expect(phase).toBe("Done");
		for (const tableName of [
			"knowledgeSettings",
			"readingLanguageLayouts",
			"readingFamilyKindLayouts",
		] as const) {
			expect(
				db.rows(tableName).map(({ visitorId }) => visitorId),
			).toEqual(["visitor-2"]);
		}
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

test("submission retries reuse exact segmentation despite a fresh generated sentence ID", async () => {
	const db = new IndexedTestDb();
	const input = {
		submissionKey: "retry",
		sourceText: "Banken",
		sentences: [
			{
				segmentedSentenceId: "first",
				position: 0,
				paragraph: 0,
				language: "de",
				stitchedText: "Banken",
				segments: [{ kind: "ResolvableText", text: "Banken" }],
			},
		],
	};
	const first = await runTestMutation(db, persistSubmittedText, input);
	const second = await runTestMutation(db, persistSubmittedText, {
		...input,
		sentences: [{ ...input.sentences[0], segmentedSentenceId: "fresh" }],
	});
	expect(second).toMatchObject({ ...(first as object), deduplicated: true });
	expect(db.rows("sentences")).toHaveLength(1);
	expect(db.rows("sentences")[0]?.segmentedSentenceId).toBe("first");
});
test("an active Visitor Encounter is not replayed as an Unresolved result", async () => {
	const db = new IndexedTestDb({
		texts: [{ _id: "text-1" }],
		sentences: [{ _id: "sentence-1", textId: "text-1" }],
		segments: [
			{
				_id: "segment-1",
				sentenceId: "sentence-1",
				index: 0,
				kind: "ResolvableText",
				text: "Banken",
			},
		],
		visitorClicks: [
			{
				_id: "click-1",
				requestId: "request-1",
				visitorId: "visitor-1",
				segmentId: "segment-1",
			},
		],
		resolutionSessions: [
			{
				_id: "session-1",
				requestId: "request-1",
				lifecycle: {
					state: "Active",
					progress: "RouteAvailable",
					activity: "Running",
				},
			},
		],
	});
	const input = {
		requestId: "request-1",
		visitorId: "visitor-1",
		sentenceId: "sentence-1",
		clickedSegmentIndex: 0,
	};
	expect(
		(await runTestQuery(db, loadResolutionContext, input)).recorded,
	).toBeNull();
	await db.patch("session-1", {
		lifecycle: {
			state: "Terminal",
			progress: "RouteAvailable",
			outcome: "Unresolved",
		},
	});
	expect(
		(await runTestQuery(db, loadResolutionContext, input)).recorded,
	).toEqual({
		clickId: "click-1",
		status: "Unresolved",
	});
});
