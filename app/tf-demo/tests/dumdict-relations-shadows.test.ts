import { afterEach, beforeEach, describe, expect, jest, test } from "bun:test";
import type { DumdictPlan, StoreRevision } from "dumdict";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { projectPendingRelations } from "../convex/modules/notes/pendingRelations";
import {
	commitInTransaction,
	gehenReading,
	insertDictionaryLemma,
	insertReading,
	inTransaction,
	laufenLemma,
	laufenReading,
	note,
	readingKnowledge,
	rows,
	seededDictionary,
	snapshot,
	springenReading,
	verbFeatures,
} from "./support/dumdict-relations";

beforeEach(() => {
	// Scheduled work, such as Definition Text materialization, never runs here.
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

describe("tf-demo Dumdict Shadow relations", () => {
	test("Shadow cleanup commits only the exact pending locator in its own mutation", async () => {
		const { t } = await seededDictionary();
		await inTransaction(t, (dictionary) =>
			dictionary.addNewNote({
				draft: {
					reading: springenReading,
					note,
					relations: [
						{
							target: {
								kind: "pending",
								pending: {
									relation: "nearSynonym",
									target: {
										language: "de",
										canonicalForm: "laufen",
										family: "Lexeme",
										kind: "VERB",
									},
								},
							},
						},
						{
							target: {
								kind: "pending",
								pending: {
									relation: "antonym",
									target: {
										language: "de",
										canonicalForm: "laufen",
										family: "Lexeme",
										kind: "VERB",
									},
								},
							},
						},
					],
				},
			}),
		);
		// The target Lemma appears outside the dictionary workflow, leaving the
		// pending relations for cleanup to resolve.
		await insertReading(
			t,
			await insertDictionaryLemma(t, laufenLemma),
			laufenReading,
		);

		expect(await rows(t, "pendingSemanticRelations")).toHaveLength(2);
		const pending = (await rows(t, "pendingSemanticRelations")).find(
			({ record }) =>
				(record as { pending: { relation: string } }).pending
					.relation === "nearSynonym",
		);
		if (!pending?.shadowId) throw new Error("Expected a pending relation.");
		const cleanup = () =>
			t.mutation(api.shadowResolution.cleanupPendingRelation, {
				shadowId: pending.shadowId as Id<"shadows">,
				locatorKey: pending.locatorKey,
			});
		expect(await cleanup()).toEqual({
			status: "applied",
			message: "Resolved 1 relation.",
		});
		// Only the antonym stays pending; the resolved nearSynonym keeps its
		// Shadow beside its claim (system ADR 0011).
		expect(await rows(t, "pendingSemanticRelations")).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					record: expect.objectContaining({
						pending: expect.objectContaining({
							relation: "antonym",
						}),
					}),
				}),
				expect.objectContaining({
					record: expect.objectContaining({
						pending: expect.objectContaining({
							relation: "nearSynonym",
						}),
						resolvedLemma: expect.anything(),
					}),
				}),
			]),
		);
		// Only the antonym still projects as a pending relation.
		expect(
			projectPendingRelations(await rows(t, "pendingSemanticRelations")),
		).toEqual([expect.objectContaining({ relation: "antonym" })]);
		expect(
			(await readingKnowledge(t, springenReading))?.semanticRelations
				?.nearSynonym,
		).toEqual([laufenLemma]);
		expect(
			(await readingKnowledge(t, laufenReading))?.semanticRelations
				?.nearSynonym,
		).toBeUndefined();

		const before = await snapshot(t);
		expect(await cleanup()).toEqual({
			status: "conflict",
			message: "The exact pending Shadow reference no longer exists.",
		});
		expect(await snapshot(t)).toEqual(before);
	});

	test("resolves pending Shadows automatically when their exact Lemma appears", async () => {
		const { t } = await seededDictionary();
		const relation = {
			target: {
				kind: "pending" as const,
				pending: {
					relation: "nearSynonym" as const,
					target: {
						language: "de" as const,
						canonicalForm: "laufen",
						family: "Lexeme" as const,
						kind: "VERB" as const,
					},
				},
			},
		};
		await inTransaction(t, (dictionary) =>
			dictionary.addNewNote({
				draft: {
					reading: springenReading,
					note,
					relations: [relation],
				},
			}),
		);
		expect(await rows(t, "pendingSemanticRelations")).toHaveLength(1);
		expect(
			await inTransaction(t, (dictionary) =>
				dictionary.addNewNote({
					draft: { reading: laufenReading, note },
				}),
			),
		).toMatchObject({
			status: "committed",
		});
		const [resolved, ...others] = await rows(t, "pendingSemanticRelations");
		expect(others).toEqual([]);
		expect(resolved?.record).toMatchObject({ resolvedLemma: laufenLemma });
		expect(
			projectPendingRelations([resolved].flatMap((row) => row ?? [])),
		).toEqual([]);
		expect(
			(await readingKnowledge(t, springenReading))?.semanticRelations
				?.nearSynonym,
		).toEqual([laufenLemma]);
		expect(
			(await readingKnowledge(t, laufenReading))?.semanticRelations
				?.nearSynonym,
		).toBeUndefined();
	});

	test("keeps an ambiguous multi-Lemma Shadow pending and inert", async () => {
		const { t } = await seededDictionary();
		const alternativeLemma = {
			...laufenLemma,
			coreFeatures: { ...verbFeatures, hasSepPrefix: "mit" },
		} as const;
		const alternativeReading = {
			unitKind: "Reading",
			lemma: alternativeLemma,
			emojiDescription: "🏃‍♀",
		} as const;
		await inTransaction(t, (dictionary) =>
			dictionary.addNewNote({ draft: { reading: laufenReading, note } }),
		);
		await inTransaction(t, (dictionary) =>
			dictionary.addNewNote({
				draft: { reading: alternativeReading, note },
			}),
		);

		const result = await inTransaction(t, (dictionary) =>
			dictionary.addNewNote({
				draft: {
					reading: springenReading,
					note,
					relations: [
						{
							target: {
								kind: "pending",
								pending: {
									relation: "nearSynonym",
									target: {
										language: "de",
										canonicalForm: "laufen",
										family: "Lexeme",
										kind: "VERB",
									},
								},
							},
						},
					],
				},
			}),
		);
		expect(result).toMatchObject({ status: "committed" });
		expect(await rows(t, "pendingSemanticRelations")).toHaveLength(1);
		const forward = (await readingKnowledge(t, springenReading))
			?.semanticRelations?.nearSynonym as unknown[];
		expect(forward).toBeUndefined();
		expect(
			(await readingKnowledge(t, laufenReading))?.semanticRelations
				?.nearSynonym,
		).toBeUndefined();
		expect(
			(await readingKnowledge(t, alternativeReading))?.semanticRelations
				?.nearSynonym,
		).toBeUndefined();
	});

	test("does not backfill an inverse edge when a later Reading joins the target Lemma", async () => {
		const { t } = await seededDictionary();
		await inTransaction(t, (dictionary) =>
			dictionary.addNewNote({ draft: { reading: laufenReading, note } }),
		);
		await inTransaction(t, (dictionary) =>
			dictionary.addNewNote({
				draft: {
					reading: springenReading,
					note,
					relations: [
						{
							relation: "hypernym",
							target: { kind: "existing", lemma: laufenLemma },
						},
					],
				},
			}),
		);
		const laterReading = {
			...laufenReading,
			emojiDescription: "🏃‍♀",
		} as const;
		expect(
			await inTransaction(t, (dictionary) =>
				dictionary.addNewNote({
					draft: { reading: laterReading, note },
				}),
			),
		).toMatchObject({
			status: "committed",
		});
		expect(
			(await readingKnowledge(t, laterReading))?.semanticRelations
				?.hyponym,
		).toBeUndefined();
	});

	test("rolls relation-edge writes back when a later planned change fails", async () => {
		const { t } = await seededDictionary();
		const before = await snapshot(t);
		const missingLemma = {
			...laufenLemma,
			canonicalForm: "fehlen",
		} as const;
		const plan: DumdictPlan<"de"> = {
			baseRevision: "convex-0" as StoreRevision,
			changes: [
				{
					type: "patchReading",
					reading: gehenReading,
					ops: [
						{
							kind: "applyKnowledgeChange",
							envelope: {
								reading: gehenReading,
								change: {
									kind: "Contribute",
									aspect: "semanticRelations",
									relation: "antonym",
									value: [missingLemma],
								},
							},
						},
					],
					preconditions: [
						{
							kind: "revisionMatches",
							revision: "convex-0" as StoreRevision,
						},
						{ kind: "readingExists", reading: gehenReading },
					],
				},
			],
		};
		await expect(commitInTransaction(t, plan)).rejects.toThrow(
			"target Lemma is missing",
		);
		expect(await snapshot(t)).toEqual(before);
	});
});
