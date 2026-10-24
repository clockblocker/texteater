import { afterEach, beforeEach, describe, expect, jest, test } from "bun:test";
import { type DumdictPlan, makeSurfaceId, type StoreRevision } from "dumdict";
import { loadCleanupRelationsSlice } from "../convex/model/dumdictTransaction";
import { loadRelationProjections } from "../convex/modules/notes/relations";
import {
	lemmaIdentityKey,
	readingIdentityKey,
} from "../server/linguisticIdentity";
import {
	accumulatedKnowledgeFor,
	commitInTransaction,
	gehenLemma,
	gehenReading,
	inTransaction,
	laufenReading,
	note,
	readingEntry,
	readingEntryContext,
	readingIdFor,
	readingKnowledge,
	rows,
	seededDictionary,
	snapshot,
	springenReading,
	surface,
} from "./support/dumdict-relations";

beforeEach(() => {
	// Scheduled work, such as Definition Text materialization, never runs here.
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

describe("tf-demo Dumdict relation storage", () => {
	test("rejects over-budget and duplicate-heavy slices before planning while admitting the exact transaction boundary", async () => {
		const { t } = await seededDictionary();
		const newNoteArgs = {
			intent: "addNewNote" as const,
			lemmaKey: lemmaIdentityKey(gehenLemma),
			proposedLemma: gehenLemma,
			readingKey: readingIdentityKey(gehenReading),
			surfaceKeys: Array.from(
				{ length: 16 },
				(_, index) => `surface-${index}`,
			),
			explicitLemmaTargetKeys: Array.from(
				{ length: 16 },
				(_, index) => `reading-${index}`,
			),
			pendingLocatorKeys: Array.from(
				{ length: 16 },
				(_, index) => `pending-${index}`,
			),
			pendingTargetCanonicalForms: [],
		};
		await expect(
			readingEntryContext(t, newNoteArgs),
		).resolves.toMatchObject({ revision: "convex" });
		await expect(
			readingEntryContext(t, {
				...newNoteArgs,
				pendingLocatorKeys: [
					...newNoteArgs.pendingLocatorKeys,
					"overflow",
				],
			}),
		).rejects.toThrow(
			"New-note context can produce at most 50 planned changes",
		);
		await expect(
			readingEntryContext(t, {
				intent: "addNewNote",
				lemmaKey: lemmaIdentityKey(gehenLemma),
				proposedLemma: gehenLemma,
				readingKey: readingIdentityKey(gehenReading),
				surfaceKeys: [],
				explicitLemmaTargetKeys: Array.from({ length: 49 }, () =>
					lemmaIdentityKey(gehenLemma),
				),
				pendingLocatorKeys: [],
				pendingTargetCanonicalForms: [],
			}),
		).rejects.toThrow(
			"New-note context can produce at most 50 planned changes",
		);

		await expect(
			t.run((ctx) =>
				loadCleanupRelationsSlice(
					ctx,
					Array.from(
						{ length: 16 },
						(_, index) => `locator-${index}`,
					),
				),
			),
		).resolves.toMatchObject({ revision: "convex" });
		await expect(
			t.run((ctx) =>
				loadCleanupRelationsSlice(
					ctx,
					Array.from(
						{ length: 51 },
						(_, index) => `locator-${index}`,
					),
				),
			),
		).rejects.toThrow(
			"Relations-cleanup context can produce at most 50 planned changes",
		);

		const { t: boundary } = await seededDictionary();
		const duplicateDirectRelation = {
			relation: "nearSynonym" as const,
			target: { kind: "existing" as const, lemma: gehenLemma },
		};
		expect(
			await inTransaction(boundary, (dictionary) =>
				dictionary.addNewNote({
					draft: {
						reading: laufenReading,
						note,
						relations: Array.from(
							{ length: 48 },
							() => duplicateDirectRelation,
						),
					},
				}),
			),
		).toMatchObject({ status: "committed" });
		expect(
			(await readingKnowledge(boundary, gehenReading))?.semanticRelations
				?.nearSynonym,
		).toBeUndefined();
	});

	test("loads every requested owned Surface and explicit existing Lemma target", async () => {
		const { t } = await seededDictionary();
		const result = (await readingEntryContext(t, {
			intent: "addNewNote",
			lemmaKey: lemmaIdentityKey(gehenLemma),
			proposedLemma: gehenLemma,
			readingKey: readingIdentityKey({
				unitKind: "Reading",
				lemma: gehenLemma,
				emojiDescription: "🥾",
			}),
			surfaceKeys: [
				makeSurfaceId("de", surface("gehen")),
				makeSurfaceId("de", surface("ging")),
			],
			explicitLemmaTargetKeys: [lemmaIdentityKey(gehenLemma)],
			pendingLocatorKeys: [],
			pendingTargetCanonicalForms: [],
		})) as {
			existingOwnedSurfaces: unknown[];
			explicitExistingLemmaTargets: unknown[];
		};

		expect(result.existingOwnedSurfaces).toHaveLength(2);
		expect(result.explicitExistingLemmaTargets).toEqual([
			{ lemma: gehenLemma },
		]);
	});

	test("authors only direct Knowledge, deduplicates pending proposals, and survives a repeated encounter", async () => {
		const { t } = await seededDictionary();

		expect(
			await inTransaction(t, (dictionary) =>
				dictionary.addNewNote({
					draft: {
						reading: laufenReading,
						note,
						relations: [
							{
								relation: "nearSynonym",
								target: {
									kind: "existing",
									lemma: gehenLemma,
								},
							},
						],
					},
				}),
			),
		).toMatchObject({ status: "committed" });
		expect(
			(await readingKnowledge(t, laufenReading))?.semanticRelations
				?.nearSynonym,
		).toEqual([gehenLemma]);
		expect(
			(await readingKnowledge(t, gehenReading))?.semanticRelations
				?.nearSynonym,
		).toBeUndefined();
		const gehenReadingId = await readingIdFor(t, gehenReading);
		expect(
			await t.run((ctx) => loadRelationProjections(ctx, gehenReadingId)),
		).toMatchObject({
			resolved: [
				{
					relation: "nearSynonym",
					targetCanonicalForm: "laufen",
					provenance: "inferred",
				},
			],
		});
		expect(
			(await rows(t, "accumulatedKnowledge"))
				.filter(({ ownerReadingKey }) =>
					[
						readingIdentityKey(laufenReading),
						readingIdentityKey(gehenReading),
					].includes(String(ownerReadingKey)),
				)
				.map(({ ownerReadingKey, status }) => ({
					ownerReadingKey,
					status,
				})),
		).toEqual(
			expect.arrayContaining([
				{
					ownerReadingKey: readingIdentityKey(laufenReading),
					status: "Partial",
				},
			]),
		);

		const pending = {
			target: {
				kind: "pending" as const,
				pending: {
					relation: "nearSynonym" as const,
					target: {
						language: "de" as const,
						canonicalForm: "flitzen",
						family: "Lexeme" as const,
						kind: "VERB" as const,
					},
				},
			},
		};
		expect(
			await inTransaction(t, (dictionary) =>
				dictionary.addNewNote({
					draft: {
						reading: springenReading,
						note,
						relations: [pending, pending],
					},
				}),
			),
		).toMatchObject({ status: "committed" });
		expect(await rows(t, "pendingSemanticRelations")).toHaveLength(1);
		expect(await accumulatedKnowledgeFor(t, springenReading)).toMatchObject(
			{ status: "Partial", knowledge: {} },
		);
		expect(
			await inTransaction(t, (dictionary) =>
				dictionary.addNewNote({
					draft: {
						reading: springenReading,
						note,
						relations: [pending],
					},
				}),
			),
		).toMatchObject({
			status: "rejected",
			code: "readingAlreadyExists",
		});
		expect(await rows(t, "pendingSemanticRelations")).toHaveLength(1);
	});

	test("persists exact Reading targets and navigates to the target Reading Note", async () => {
		const { t } = await seededDictionary();
		expect(
			await inTransaction(t, (dictionary) =>
				dictionary.addNewNote({
					draft: { reading: laufenReading, note },
				}),
			),
		).toMatchObject({ status: "committed" });
		expect(
			await commitInTransaction(t, {
				baseRevision: "convex-1" as StoreRevision,
				changes: [
					{
						type: "patchReading",
						reading: laufenReading,
						ops: [
							{
								kind: "applyKnowledgeChange",
								envelope: {
									reading: laufenReading,
									change: {
										kind: "Contribute",
										aspect: "semanticRelations",
										relation: "synonym",
										targetKind: "reading",
										value: [gehenReading],
									},
								},
							},
						],
						preconditions: [
							{
								kind: "revisionMatches",
								revision: "convex-1" as StoreRevision,
							},
							{
								kind: "readingExists",
								reading: laufenReading,
							},
						],
					},
				],
			} satisfies DumdictPlan<"de">),
		).toMatchObject({ status: "committed" });

		const sourceId = await readingIdFor(t, laufenReading);
		const targetId = await readingIdFor(t, gehenReading);
		expect(await rows(t, "semanticRelationEdges")).toContainEqual(
			expect.objectContaining({
				sourceReadingId: sourceId,
				targetKind: "reading",
				targetReadingId: targetId,
				relation: "synonym",
			}),
		);
		expect(await readingEntry(t, laufenReading)).toMatchObject({
			knowledge: {
				semanticRelations: {
					targetKind: "reading",
					synonym: [gehenReading],
				},
			},
		});
		expect(
			await t.run((ctx) => loadRelationProjections(ctx, sourceId)),
		).toMatchObject({
			resolved: [
				{
					relation: "synonym",
					target: {
						kind: "Reading",
						readingId: targetId,
					},
				},
			],
		});
	});

	test("removing the last exact target preserves the Reading relation mode in storage", async () => {
		const { t } = await seededDictionary();
		await inTransaction(t, (dictionary) =>
			dictionary.addNewNote({ draft: { reading: laufenReading, note } }),
		);
		await inTransaction(t, (dictionary) =>
			dictionary.applyGeneratedKnowledge({
				reading: laufenReading,
				changes: [
					{
						kind: "Contribute",
						aspect: "semanticRelations",
						relation: "synonym",
						targetKind: "reading",
						value: [gehenReading],
					},
				],
				pendingRelations: [],
			}),
		);
		await inTransaction(t, (dictionary) =>
			dictionary.applyGeneratedKnowledge({
				reading: laufenReading,
				changes: [
					{
						kind: "Retract",
						aspect: "semanticRelations",
						relation: "synonym",
						targetKind: "reading",
					},
				],
				pendingRelations: [],
			}),
		);
		expect(await rows(t, "semanticRelationEdges")).toHaveLength(0);
		expect(await readingEntry(t, laufenReading)).toMatchObject({
			knowledge: { semanticRelations: { targetKind: "reading" } },
		});
		const before = await snapshot(t);
		await expect(
			inTransaction(t, (dictionary) =>
				dictionary.applyGeneratedKnowledge({
					reading: laufenReading,
					changes: [
						{
							kind: "Contribute",
							aspect: "semanticRelations",
							relation: "nearSynonym",
							value: [gehenReading.lemma],
						},
					],
					pendingRelations: [],
				}),
			),
		).resolves.toMatchObject({
			status: "rejected",
			code: "invalidRequest",
			message: expect.stringContaining(
				"cannot mix Lemma and Reading Semantic Relation targets",
			),
		});
		expect(await snapshot(t)).toEqual(before);
	});

	test("applies graph-wide direct target conflicts atomically at the Convex seam", async () => {
		const { t } = await seededDictionary();
		await inTransaction(t, (dictionary) =>
			dictionary.addNewNote({
				draft: {
					reading: laufenReading,
					note,
					relations: [
						{
							relation: "nearSynonym",
							target: { kind: "existing", lemma: gehenLemma },
						},
					],
				},
			}),
		);
		expect(
			await inTransaction(t, (dictionary) =>
				dictionary.applyGeneratedKnowledge({
					reading: laufenReading,
					changes: [],
					pendingRelations: [
						{
							relation: "synonym",
							target: {
								language: "de",
								canonicalForm: "gehen",
								family: "Lexeme",
								kind: "VERB",
							},
						},
					],
				}),
			),
		).toMatchObject({ status: "committed" });
		const sourceId = await readingIdFor(t, laufenReading);
		expect(
			(await rows(t, "semanticRelationEdges"))
				.filter((edge) => edge.sourceReadingId === sourceId)
				.map(({ relation }) => relation),
		).toEqual(["synonym"]);

		expect(
			await inTransaction(t, (dictionary) =>
				dictionary.applyGeneratedKnowledge({
					reading: laufenReading,
					changes: [
						{
							kind: "Contribute",
							aspect: "definition",
							value: "sich gehend fortbewegen",
						},
					],
					pendingRelations: [
						{
							relation: "antonym",
							target: {
								language: "de",
								canonicalForm: "gehen",
								family: "Lexeme",
								kind: "VERB",
							},
						},
					],
				}),
			),
		).toMatchObject({ status: "rejected", code: "relationConflict" });
		expect(
			(await accumulatedKnowledgeFor(t, laufenReading))?.knowledge,
		).not.toMatchObject({ definition: "sich gehend fortbewegen" });
	});
});
