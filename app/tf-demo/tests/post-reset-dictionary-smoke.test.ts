import { afterEach, beforeEach, describe, expect, jest, test } from "bun:test";
import { api, internal } from "../convex/_generated/api";
import { resetDemoTableNames } from "../convex/demoReset";
import { defaultKnowledgeSettings } from "../convex/knowledgeSettings";
import { loadRelationProjections } from "../convex/modules/notes/relations";
import { readingIdentityKey } from "../server/linguisticIdentity";
import { createTestConvex } from "./support/convex";
import { enableDeploymentFlags } from "./support/deploymentFlags";
import {
	emptyNote,
	fahrenReading,
	gehenLemma,
	gehenReading,
	insertReading,
	inTransaction,
	laufenReading,
	prefixedFahrenReading,
	readingIdFor,
	tableRows,
} from "./support/post-reset";

enableDeploymentFlags();

beforeEach(() => {
	// A Segment Selection schedules its Resolution Session; nothing here runs it.
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

describe("tf-demo post-reset contract", () => {
	test("reset batches spend one transaction-wide budget and expose continuation", async () => {
		const t = createTestConvex();
		const { readingId } = await insertReading(t, "reading-key-1");
		await t.run(async (ctx) => {
			// One row more than a batch, so the table is left unfinished.
			for (let index = 0; index < 401; index += 1) {
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

		for (const reading of [
			gehenReading,
			fahrenReading,
			prefixedFahrenReading,
		] as const) {
			expect(
				await inTransaction(t, (dictionary) =>
					dictionary.addNewNote({
						draft: { reading, note: emptyNote },
					}),
				),
			).toMatchObject({ status: "committed" });
		}

		expect(
			await inTransaction(t, (dictionary) =>
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
		).toMatchObject({ status: "committed" });
		expect(
			await inTransaction(t, (dictionary) =>
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
		).toMatchObject({ status: "committed" });

		const sourceReadingId = await readingIdFor(t, laufenReading);
		const targetReadingId = await readingIdFor(t, gehenReading);

		expect(
			(await tableRows(t, "accumulatedKnowledge")).find(
				({ ownerReadingKey }) =>
					ownerReadingKey === readingIdentityKey(laufenReading),
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
			resolved: [
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
			).resolved,
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
					.resolved,
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
				units: [{ segments: [0], route: "Unresolved" as const }],
			},
		],
	};
	const [sentence] = input.sentences;
	if (!sentence) throw new Error("Expected a Sentence input.");
	const first = await t.mutation(
		internal.persistence.persistSubmittedScroll,
		input,
	);
	const second = await t.mutation(
		internal.persistence.persistSubmittedScroll,
		{
			...input,
			sentences: [{ ...sentence, segmentedSentenceId: "fresh" }],
		},
	);
	expect(second).toEqual({ ...first, deduplicated: true });
	const sentences = await tableRows(t, "sentences");
	expect(sentences).toHaveLength(1);
	expect(sentences[0]).toMatchObject({ segmentedSentenceId: "first" });
});
