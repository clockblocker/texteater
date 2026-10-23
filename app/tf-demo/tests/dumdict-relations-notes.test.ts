import { afterEach, beforeEach, describe, expect, jest, test } from "bun:test";
import type * as Dumling from "dumling/types";
import * as Effect from "effect/Effect";
import { api, internal } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { attachPendingShadowReference } from "../convex/model/shadows";
import { loadRelationProjections } from "../convex/modules/notes/relations";
import {
	lemmaIdentityKey,
	readingIdentityKey,
} from "../server/linguisticIdentity";
import {
	createTfDemoOrchestrator,
	type OrchestrationPersistence,
} from "../server/linguisticOrchestration";
import type { ResolvedGrammar } from "../server/resolutionGrammar";
import { createTestConvex } from "./support/convex";
import {
	gehenLemma,
	gehenReading,
	insertDictionaryLemma,
	insertReading,
	laufenLemma,
	laufenReading,
	locatorKey,
	note,
	rows,
	seededDictionary,
	springenLemma,
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

describe("tf-demo Dumdict relation orchestration", () => {
	test("repeated orchestration encounters through the real Convex adapter preserve direct and pending relations", async () => {
		const directKnowledge = {
			semanticRelations: { nearSynonym: [laufenReading.lemma] },
		};
		const { t, gehenReadingId } = await seededDictionary({
			gehenRecord: { ...note, knowledge: directKnowledge },
		});
		const pendingRecord = {
			sourceReading: gehenReading,
			pending: {
				relation: "antonym",
				target: {
					language: "de",
					canonicalForm: "laufen",
					family: "Lexeme",
					kind: "VERB",
				},
			},
			locator: {
				sourceReadingKey: readingIdentityKey(gehenReading),
				relation: "antonym",
				targetPendingId: "pending-entry:v2:de:Lexeme:VERB:laufen",
			},
		} as const;
		await t.run(async (ctx) => {
			await ctx.db.insert("accumulatedKnowledge", {
				ownerReadingKey: readingIdentityKey(gehenReading),
				knowledge: directKnowledge,
				status: "Partial",
				updatedAt: 1,
			});
			await ctx.db.insert("pendingSemanticRelations", {
				locatorKey: locatorKey(pendingRecord.locator),
				sourceReadingKey: readingIdentityKey(gehenReading),
				targetFoldedCanonicalForm: "laufen",
				shadowId: await attachPendingShadowReference(
					ctx,
					pendingRecord,
				),
				record: pendingRecord,
			});
		});
		const decisions: ("New" | "Reuse")[] = [];
		const citation = surface("gehen");
		const grammatical: ResolvedGrammar = {
			decision: "Resolved",
			language: "de",
			encounter: {
				sentence: {
					id: "segmented-1",
					language: "de",
					segments: [
						{ kind: "ResolvableText", text: "Wir" },
						{ kind: "Whitespace", text: " " },
						{ kind: "ResolvableText", text: "gehen" },
						{ kind: "Punctuation", text: "." },
					],
				},
				target: {
					family: "Lexeme",
					kind: "VERB",
					memberSegmentIndices: [2],
				},
			},
			attestation: {
				unitKind: "Attestation",
				members: [{ attested: "gehen", orthography: "Standard" }],
				realizationCoverage: "Full",
				surface: citation,
				expletiveEvidence: null,
				valencyEvidence: [],
			},
		};
		const persistence: OrchestrationPersistence = {
			async loadResolutionContext() {
				return {
					reusable: null,
					lemmaCandidates: [],
					sentence: {
						sentenceId: "sentence-1",
						scrollId: "text-1",
						segmentedSentenceId: "segmented-1",
						language: "de",
						stitchedText: "Wir gehen.",
						segments: [
							{ index: 0, kind: "ResolvableText", text: "Wir" },
							{ index: 1, kind: "Whitespace", text: " " },
							{ index: 2, kind: "ResolvableText", text: "gehen" },
							{ index: 3, kind: "Punctuation", text: "." },
						],
					},
				};
			},
			async persistResolvedClick(input) {
				decisions.push(input.readingDecision);
				return {
					status: "Committed",
					encounterId: `click-${decisions.length}`,
					attestationId: `attestation-${decisions.length}`,
					readingId: gehenReadingId,
					deduplicated: false,
					occurrence: {
						attestationId: `attestation-${decisions.length}`,
						grammatical,
						reading: gehenReading,
					},
				};
			},
			async persistReusedResolvedClick() {
				throw new Error("Occurrences are intentionally distinct.");
			},
			async persistUnresolvedClick() {
				throw new Error("Expected a resolved click.");
			},
		};
		const orchestrator = createTfDemoOrchestrator({
			resolution: {
				grammar: () => Effect.succeed(grammatical),
				reading: () =>
					Effect.succeed({
						decision: "Reuse" as const,
						emojiDescription: gehenReading.emojiDescription,
					}),
			},
			findStoredReadings: async (lemma) =>
				(await t.query(
					internal.dumdictStorage.queries.findStoredReadings,
					{
						lemmaKey: lemmaIdentityKey(lemma),
					},
				)) as Dumling.Reading<"de">[],
			persistence,
		});

		for (const requestId of ["encounter-1", "encounter-2"]) {
			await Effect.runPromise(
				orchestrator.resolveSegment({
					requestId,
					visitorId: "visitor-1",
					sentenceId: "sentence-1",
					clickedSegmentIndex: 2,
				}),
			);
		}

		expect(decisions).toEqual(["Reuse", "Reuse"]);
		expect((await rows(t, "readingEntries"))[0]?.record).toMatchObject({
			knowledge: directKnowledge,
		});
		expect(await rows(t, "pendingSemanticRelations")).toEqual([
			expect.objectContaining({ record: pendingRecord }),
		]);
	});
});

describe("Reading Note relation neighbourhood caps", () => {
	const verb = (canonicalForm: string) =>
		({ ...gehenLemma, canonicalForm }) as const;
	const readingOf = (
		lemma: Dumling.Lemma<"de", "Lexeme", "VERB">,
		emojiDescription: string,
	) => ({ unitKind: "Reading", lemma, emojiDescription }) as const;

	test("a target Lemma with more Readings than the cap truncates the note instead of throwing", async () => {
		const t = createTestConvex();
		const sourceId = await insertReading(
			t,
			await insertDictionaryLemma(t, gehenLemma),
			gehenReading,
		);
		const targetLemmaId = await insertDictionaryLemma(t, laufenLemma);
		for (let index = 0; index < 60; index++)
			await insertReading(
				t,
				targetLemmaId,
				// Sixty distinct animal emoji, 🐀 onwards.
				readingOf(laufenLemma, String.fromCodePoint(0x1f400 + index)),
			);
		await t.run((ctx) =>
			ctx.db.insert("semanticRelationEdges", {
				sourceReadingId: sourceId,
				targetLemmaId,
				relation: "synonym",
			}),
		);

		expect(
			await t.query(api.readingNotes.get, {
				readingId: sourceId,
				visitorId: "visitor-1",
			}),
		).toMatchObject({
			relationsTruncated: true,
			relations: expect.arrayContaining([
				expect.objectContaining({
					relation: "synonym",
					target: { kind: "Lemma", lemmaId: targetLemmaId },
				}),
			]),
		});
	});

	test("a neighbourhood with more edges than the cap truncates the note instead of throwing", async () => {
		const t = createTestConvex();
		const sourceId = await insertReading(
			t,
			await insertDictionaryLemma(t, gehenLemma),
			gehenReading,
		);
		// The source's ten hypernyms and five synonyms, each synonym with 49
		// hypernyms of its own, stay under every per-Reading cap, while the
		// synonym component holds 10 + 5 + 5 × 49 = 260 edges.
		const hypernyms = async (
			sourceReadingId: Id<"readings">,
			prefix: string,
			count: number,
		) => {
			for (let index = 0; index < count; index++) {
				const targetLemmaId = await insertDictionaryLemma(
					t,
					verb(`${prefix}${index}`),
				);
				await t.run((ctx) =>
					ctx.db.insert("semanticRelationEdges", {
						sourceReadingId,
						targetLemmaId,
						relation: "hypernym",
					}),
				);
			}
		};
		await hypernyms(sourceId, "quelle", 10);
		for (let synonym = 0; synonym < 5; synonym++) {
			const lemma = verb(`synonym${synonym}`);
			const targetLemmaId = await insertDictionaryLemma(t, lemma);
			const readingId = await insertReading(
				t,
				targetLemmaId,
				readingOf(lemma, "🔁"),
			);
			await t.run((ctx) =>
				ctx.db.insert("semanticRelationEdges", {
					sourceReadingId: sourceId,
					targetLemmaId,
					relation: "synonym",
				}),
			);
			await hypernyms(readingId, `ober${synonym}-`, 49);
		}

		const loaded = await t.run((ctx) =>
			loadRelationProjections(ctx, sourceId),
		);
		expect(loaded.truncated).toBe(true);
		expect(loaded.resolved.length).toBeGreaterThan(0);
		expect(loaded.resolved.length).toBeLessThanOrEqual(50);
	});
});

describe("Reading Note relation closure", () => {
	test("closure counts a Lemma's Readings outside the loaded neighbourhood", async () => {
		const t = createTestConvex();
		const gehenLemmaId = await insertDictionaryLemma(t, gehenLemma);
		const gehenId = await insertReading(t, gehenLemmaId, gehenReading);
		const laufenLemmaId = await insertDictionaryLemma(t, laufenLemma);
		const laufenId = await insertReading(t, laufenLemmaId, laufenReading);
		const springenLemmaId = await insertDictionaryLemma(t, springenLemma);
		const springenId = await insertReading(
			t,
			springenLemmaId,
			springenReading,
		);
		await t.run(async (ctx) => {
			await ctx.db.insert("semanticRelationEdges", {
				sourceReadingId: gehenId,
				targetLemmaId: laufenLemmaId,
				relation: "hypernym",
			});
			await ctx.db.insert("semanticRelationEdges", {
				sourceReadingId: laufenId,
				targetLemmaId: springenLemmaId,
				relation: "synonym",
			});
		});
		// springen gets laufen's inferred hyponym gehen through their synonym
		// link, which the Lemma-mode inverse carries to gehen's Lemma.
		const hyponyms = async () =>
			(
				await t.run((ctx) => loadRelationProjections(ctx, springenId))
			).resolved.filter(
				(projection) => projection.relation === "hyponym",
			);
		expect(await hyponyms()).toEqual([
			expect.objectContaining({
				targetCanonicalForm: "gehen",
				provenance: "inferred",
			}),
		]);
		// springen's note never loads this second gehen Reading, but it makes
		// gehen homonymous, so the inverse no longer substitutes.
		await insertReading(t, gehenLemmaId, {
			...gehenReading,
			emojiDescription: "🧭",
		});
		expect(await hyponyms()).toEqual([]);
	});
});
