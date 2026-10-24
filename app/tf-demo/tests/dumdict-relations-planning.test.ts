import { afterEach, beforeEach, describe, expect, jest, test } from "bun:test";
import {
	authoredReading,
	deriveGrammaticalComponent,
} from "dumcorpus/inventories";
import { type DumdictPlan, makeSurfaceId, type StoreRevision } from "dumdict";
import type { ReadingKnowledgeChange } from "dumdict/planning";
import { createDumdictTransaction } from "../convex/model/dumdictTransaction";
import {
	foldedCanonicalForm,
	lemmaIdentityKey,
	readingIdentityKey,
} from "../server/linguisticIdentity";
import {
	commitInTransaction,
	gehenLemma,
	gehenReading,
	insertDictionaryLemma,
	insertReading,
	laufenLemma,
	laufenReading,
	note,
	readingEntryContext,
	readingKnowledge,
	rows,
	seededDictionary,
	snapshot,
	springenReading,
	surface,
	surfaceNote,
} from "./support/dumdict-relations";

beforeEach(() => {
	// Scheduled work, such as Definition Text materialization, never runs here.
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

describe("tf-demo Dumdict relation planning", () => {
	test("plans relations against their neighbourhood past 150 dictionary Lemmas", async () => {
		const { t } = await seededDictionary();
		const stehenLemma = { ...gehenLemma, canonicalForm: "stehen" } as const;
		const fehlenLemma = { ...gehenLemma, canonicalForm: "fehlen" } as const;
		await insertReading(
			t,
			await insertDictionaryLemma(t, laufenLemma),
			laufenReading,
		);
		await insertDictionaryLemma(t, stehenLemma);
		await t.run(async (ctx) => {
			for (let index = 0; index < 160; index += 1) {
				const lemma = {
					...gehenLemma,
					canonicalForm: `füllen${index}`,
				} as const;
				const { unitKind: _, ...stored } = lemma;
				await ctx.db.insert("dictionaryLemmas", {
					lemmaId: await ctx.db.insert("lemmas", {
						lemmaKey: lemmaIdentityKey(lemma),
						...stored,
						foldedCanonicalForm: foldedCanonicalForm(lemma),
					}),
				});
			}
		});
		expect(await rows(t, "dictionaryLemmas")).toHaveLength(163);
		const transaction = <Result>(
			run: (
				dictionary: ReturnType<typeof createDumdictTransaction>,
			) => Promise<Result>,
		) => t.run((ctx) => run(createDumdictTransaction(ctx)));

		expect(
			await transaction((dictionary) =>
				dictionary.addNewNote({
					draft: { reading: springenReading, note },
				}),
			),
		).toMatchObject({ status: "committed" });
		expect(
			await transaction((dictionary) =>
				dictionary.applyGeneratedKnowledge({
					reading: gehenReading,
					changes: [
						{
							kind: "Contribute",
							aspect: "semanticRelations",
							relation: "nearSynonym",
							value: [laufenLemma],
						},
					],
					pendingRelations: [
						{
							relation: "antonym",
							target: {
								language: "de",
								canonicalForm: "stehen",
								family: "Lexeme",
								kind: "VERB",
							},
						},
					],
				}),
			),
		).toMatchObject({ status: "committed" });
		expect(
			(await readingKnowledge(t, gehenReading))?.semanticRelations,
		).toEqual({ nearSynonym: [laufenLemma], antonym: [stehenLemma] });

		expect(
			await transaction((dictionary) =>
				dictionary.applyGeneratedKnowledge({
					reading: laufenReading,
					changes: [
						{
							kind: "Contribute",
							aspect: "semanticRelations",
							relation: "antonym",
							value: [fehlenLemma],
						},
					],
					pendingRelations: [],
				}),
			),
		).toMatchObject({ status: "rejected", code: "invalidRequest" });
		expect(
			await transaction((dictionary) =>
				dictionary.addNewNote({
					draft: {
						reading: { ...springenReading, emojiDescription: "🐸" },
						note,
						relations: [
							{
								relation: "antonym",
								target: {
									kind: "existing",
									lemma: fehlenLemma,
								},
							},
						],
					},
				}),
			),
		).toMatchObject({ status: "rejected", code: "relationTargetMissing" });
	});

	test("fails relation planning explicitly when a neighbourhood's Lemmas overflow", async () => {
		const { t, gehenReadingId } = await seededDictionary();
		await t.run(async (ctx) => {
			// The source Reading's own Lemma and 100 targets make 101.
			for (let index = 0; index < 100; index += 1) {
				const lemma = {
					...gehenLemma,
					canonicalForm: `ziel${index}`,
				} as const;
				const { unitKind: _, ...stored } = lemma;
				const lemmaId = await ctx.db.insert("lemmas", {
					lemmaKey: lemmaIdentityKey(lemma),
					...stored,
					foldedCanonicalForm: foldedCanonicalForm(lemma),
				});
				await ctx.db.insert("dictionaryLemmas", { lemmaId });
				await ctx.db.insert("semanticRelationEdges", {
					sourceReadingId: gehenReadingId,
					targetLemmaId: lemmaId,
					relation: "nearSynonym",
				});
			}
		});
		await expect(
			readingEntryContext(t, {
				intent: "applyGeneratedKnowledge",
				lemmaKey: lemmaIdentityKey(gehenReading.lemma),
				readingKey: readingIdentityKey(gehenReading),
				pendingLocatorKeys: [],
				pendingTargetCanonicalForms: [],
				relationTargetLemmaKeys: [],
				relationTargetReadingKeys: [readingIdentityKey(gehenReading)],
			}),
		).rejects.toThrow("at most 100 neighbourhood Lemmas");
	});

	test("fails relation planning explicitly when one Reading's edge inventory overflows", async () => {
		const { t, gehenLemmaId, gehenReadingId } = await seededDictionary();
		await t.run(async (ctx) => {
			for (let index = 0; index < 201; index += 1)
				await ctx.db.insert("semanticRelationEdges", {
					sourceReadingId: gehenReadingId,
					targetLemmaId: gehenLemmaId,
					relation: "synonym",
				});
		});
		await expect(
			readingEntryContext(t, {
				intent: "applyGeneratedKnowledge",
				lemmaKey: lemmaIdentityKey(gehenReading.lemma),
				readingKey: readingIdentityKey(gehenReading),
				pendingLocatorKeys: [],
				pendingTargetCanonicalForms: [],
				relationTargetLemmaKeys: [lemmaIdentityKey(laufenLemma)],
				relationTargetReadingKeys: [],
			}),
		).rejects.toThrow("at most 200 Semantic Relation edges");
	});

	test("writes each Reading patch over what the plan's earlier changes stored", async () => {
		const { t } = await seededDictionary();
		await insertDictionaryLemma(t, laufenLemma);
		const revision = "convex-0" as StoreRevision;
		const patch = (
			reading: typeof gehenReading | typeof laufenReading,
			...changes: ReadingKnowledgeChange<"de">["change"][]
		): DumdictPlan<"de">["changes"][number] => ({
			type: "patchReading",
			reading,
			ops: changes.map((change) => ({
				kind: "applyKnowledgeChange",
				envelope: { reading, change },
			})),
			preconditions: [
				{ kind: "revisionMatches", revision },
				{ kind: "readingExists", reading },
			],
		});
		const plan: DumdictPlan<"de"> = {
			baseRevision: revision,
			changes: [
				patch(
					gehenReading,
					{
						kind: "Contribute",
						aspect: "definition",
						value: "motion",
					},
					{
						kind: "Contribute",
						aspect: "semanticRelations",
						relation: "synonym",
						value: [laufenLemma],
					},
				),
				patch(
					gehenReading,
					{ kind: "Correct", aspect: "definition", value: "walking" },
					{
						kind: "Contribute",
						aspect: "translations",
						language: "en",
						value: ["go"],
					},
				),
				{
					type: "createReading",
					entry: {
						reading: laufenReading,
						...note,
						knowledge: { definition: "run" },
					},
					preconditions: [
						{ kind: "revisionMatches", revision },
						{ kind: "readingMissing", reading: laufenReading },
					],
				},
				patch(laufenReading, {
					kind: "Contribute",
					aspect: "translations",
					language: "en",
					value: ["run"],
				}),
			],
		};
		expect(await commitInTransaction(t, plan)).toMatchObject({
			status: "committed",
		});
		expect(await readingKnowledge(t, gehenReading)).toEqual({
			definition: "walking",
			translations: { en: ["go"] },
			semanticRelations: { synonym: [laufenLemma] },
		});
		expect(await readingKnowledge(t, laufenReading)).toEqual({
			definition: "run",
			translations: { en: ["run"] },
		});
	});

	test("applies a Reading patch again when an earlier change rewrote the entry the preflight patched", async () => {
		const { t } = await seededDictionary();
		const gebenLemma = { ...gehenLemma, canonicalForm: "geben" } as const;
		const gibt = {
			...surface("es gibt"),
			lemma: gebenLemma,
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
		const component = deriveGrammaticalComponent(gibt);
		const authored = component && authoredReading(component.reading);
		if (!component || !authored?.knowledge)
			throw new Error("Expected subject es with authored Knowledge.");
		const es = component.reading;
		await insertDictionaryLemma(t, gebenLemma);
		// The es entry is stored without its authored Knowledge, which the
		// Surface's creation completes before the patch writes.
		await insertReading(t, await insertDictionaryLemma(t, es.lemma), es);
		const revision = "convex-0" as StoreRevision;
		const id = makeSurfaceId("de", gibt);
		const plan: DumdictPlan<"de"> = {
			baseRevision: revision,
			changes: [
				{
					type: "createOwnedSurface",
					entry: {
						id,
						ownerLemma: gebenLemma,
						surface: gibt,
						...surfaceNote,
					},
					preconditions: [
						{ kind: "revisionMatches", revision },
						{ kind: "surfaceMissing", surfaceId: id },
					],
				},
				{
					type: "patchReading",
					reading: es,
					ops: [
						{
							kind: "applyKnowledgeChange",
							envelope: {
								reading: es,
								change: {
									kind: "Correct",
									aspect: "translations",
									language: "en",
									value: ["it"],
								},
							},
						},
					],
					preconditions: [
						{ kind: "revisionMatches", revision },
						{ kind: "readingExists", reading: es },
					],
				},
			],
		};
		expect(await commitInTransaction(t, plan)).toMatchObject({
			status: "committed",
		});
		// Authored es has no Semantic Relations, which readingKnowledge reads from edges.
		const { semanticRelations: _, ...knowledge } = authored.knowledge;
		expect(await readingKnowledge(t, es)).toEqual({
			...knowledge,
			translations: { ...knowledge.translations, en: ["it"] },
		});
	});

	test("preflights every Knowledge patch before writes and reports semantic conflicts without partial state", async () => {
		const { t } = await seededDictionary();
		const before = await snapshot(t);
		const revision = "convex-0" as StoreRevision;
		const badPlan: DumdictPlan<"de"> = {
			baseRevision: revision,
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
									aspect: "definition",
									value: "motion",
								},
							},
						},
					],
					preconditions: [
						{ kind: "revisionMatches", revision },
						{ kind: "readingExists", reading: gehenReading },
					],
				},
				{
					type: "patchReading",
					reading: gehenReading,
					ops: [
						{
							kind: "applyKnowledgeChange",
							envelope: {
								reading: laufenReading,
								change: {
									kind: "Contribute",
									aspect: "definition",
									value: "must fail",
								},
							},
						},
					],
					preconditions: [
						{ kind: "revisionMatches", revision },
						{ kind: "readingExists", reading: gehenReading },
					],
				},
			],
		};

		await expect(commitInTransaction(t, badPlan)).rejects.toThrow(
			"Knowledge Change Reading must match the patched Reading",
		);
		expect(await snapshot(t)).toEqual(before);

		const conflictPlan: DumdictPlan<"de"> = {
			baseRevision: revision,
			changes: [
				{
					type: "patchReading",
					reading: gehenReading,
					ops: [],
					preconditions: [
						{ kind: "revisionMatches", revision },
						{ kind: "readingMissing", reading: gehenReading },
					],
				},
			],
		};
		expect(await commitInTransaction(t, conflictPlan)).toMatchObject({
			status: "conflict",
			code: "semanticPreconditionFailed",
		});
		expect(await snapshot(t)).toEqual(before);

		const forgedRecord = {
			sourceReading: gehenReading,
			pending: {
				relation: "synonym",
				target: {
					language: "de",
					canonicalForm: "laufen",
					family: "Lexeme",
					kind: "VERB",
				},
			},
			locator: {
				sourceReadingKey: readingIdentityKey(gehenReading),
				relation: "synonym",
				targetPendingId: "pending-entry:v2:de:Lexeme:VERB:forged",
			},
		} as const;
		const forgedPlan: DumdictPlan<"de"> = {
			baseRevision: revision,
			changes: [
				{
					type: "createPendingSemanticRelation",
					record: forgedRecord,
					preconditions: [
						{ kind: "revisionMatches", revision },
						{ kind: "readingExists", reading: gehenReading },
						{
							kind: "pendingRelationMissing",
							record: forgedRecord,
						},
					],
				},
			],
		};
		await expect(commitInTransaction(t, forgedPlan)).rejects.toThrow(
			"wrong target Pending Entry ID",
		);
		expect(await snapshot(t)).toEqual(before);
	});
});
