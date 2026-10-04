import { describe, expect, test } from "bun:test";
import { readingIdentityKey } from "dumling";
import { makeSurfaceId, type StoreRevision } from "../../src";
import {
	commitChangesResultSchema,
	dumdictPlanSchema,
	getDumdictSchemasFor,
	lemmaRecordSchema,
} from "../../src/schema";
import { germanHausLemma } from "../attested-entities/de/lemmas";
import { germanHausCitationSurface } from "../attested-entities/de/surfaces";
import { germanGehenLemma, germanGehenReading } from "../fixtures/de-notes";
import { englishRunReading } from "../fixtures/en-notes";
import { hebrewKatavReading } from "../fixtures/he-notes";

const revision = "schema-test-1" as StoreRevision;

describe("public storage-facing schemas", () => {
	test("aggregate and language-scoped schemas parse supported Lemma records", () => {
		expect(lemmaRecordSchema.parse({ lemma: germanHausLemma })).toEqual({
			lemma: germanHausLemma,
		});
		expect(
			lemmaRecordSchema.safeParse({
				lemma: germanHausLemma,
				knowledge: { transcription: "haʊs" },
			}).success,
		).toBe(false);
		expect(
			getDumdictSchemasFor("de").lemmaRecordSchema.safeParse({
				lemma: { ...germanHausLemma, language: "en" },
			}).success,
		).toBe(false);
	});

	test("language-scoped Reading Entries reject cross-language values", () => {
		const schema = getDumdictSchemasFor("de").readingEntrySchema;
		const note = {
			attestedTranslations: [],
			attestations: [],
			notes: "",
		};

		expect(
			schema.safeParse({ reading: germanGehenReading, ...note }).success,
		).toBe(true);
		expect(
			schema.safeParse({ reading: englishRunReading, ...note }).success,
		).toBe(false);
	});

	test("Reading relation buckets target Lemmas and reject same-Lemma edges", () => {
		const schema = getDumdictSchemasFor("de").readingEntrySchema;
		const note = {
			reading: germanGehenReading,
			attestedTranslations: [],
			attestations: [],
			notes: "",
		};
		expect(
			schema.safeParse({
				...note,
				knowledge: {
					semanticRelations: { nearSynonym: [germanHausLemma] },
				},
			}).success,
		).toBe(true);
		expect(
			schema.safeParse({
				...note,
				knowledge: {
					semanticRelations: { nearSynonym: [germanGehenReading] },
				},
			}).success,
		).toBe(false);
		expect(
			schema.safeParse({
				...note,
				knowledge: {
					semanticRelations: { nearSynonym: [germanGehenLemma] },
				},
			}).success,
		).toBe(false);
	});

	test("language-scoped Reading validation returns failure for cross-language relation targets", () => {
		const result = getDumdictSchemasFor("de").readingEntrySchema.safeParse({
			reading: germanGehenReading,
			attestedTranslations: [],
			attestations: [],
			notes: "",
			knowledge: {
				semanticRelations: {
					nearSynonym: [englishRunReading.lemma],
				},
			},
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues).toEqual([
				{
					code: "custom",
					message: "Reading Knowledge references must use de.",
					path: ["knowledge"],
				},
			]);
		}
	});

	test("Reading Knowledge checks every Preposition alternative against the ADP Case Table", () => {
		const schema = getDumdictSchemasFor("de").readingEntrySchema;
		const preposition = (canonicalForm: string, governedCase: string) => ({
			kind: "Preposition",
			preposition: {
				unitKind: "Lemma",
				language: "de",
				family: "Lexeme",
				kind: "ADP",
				canonicalForm,
				coreFeatures: {},
			},
			governedCase,
			referent: "Either",
		});
		const entry = (...complements: unknown[]) => ({
			reading: germanGehenReading,
			attestedTranslations: [],
			attestations: [],
			notes: "",
			knowledge: { valency: [{ status: "Optional", complements }] },
		});
		expect(schema.safeParse(entry(preposition("auf", "Acc"))).success).toBe(
			true,
		);
		expect(schema.safeParse(entry(preposition("auf", "Dat"))).success).toBe(
			true,
		);
		expect(
			schema.safeParse(
				entry(preposition("über", "Acc"), preposition("von", "Dat")),
			).success,
		).toBe(true);
		for (const rejected of [
			schema.safeParse(entry(preposition("für", "Dat"))),
			schema.safeParse(
				entry(preposition("über", "Acc"), preposition("für", "Dat")),
			),
			// The table does not list `à`, so it takes no case.
			schema.safeParse(entry(preposition("à", "Dat"))),
		]) {
			expect(rejected.success).toBe(false);
			if (!rejected.success)
				expect(rejected.error.issues[0]?.message).toBe(
					"Each Preposition complement must name a preposition the ADP Case Table lists and a case it allows.",
				);
		}
	});

	test("German Reading Knowledge holds the complements without a referent", () => {
		const schema = getDumdictSchemasFor("de").readingEntrySchema;
		const entry = (...complements: unknown[]) => ({
			reading: germanGehenReading,
			attestedTranslations: [],
			attestations: [],
			notes: "",
			knowledge: {
				valency: [
					{
						status: "Required",
						complements: [
							{
								kind: "Case",
								governedCase: "Nom",
								referent: "Someone",
							},
						],
					},
					{ status: "Required", complements },
				],
			},
		});
		for (const complements of [
			[{ kind: "Adverbial", standIn: "Irgendwohin" }],
			[{ kind: "Predicative", of: "Subject", marker: "Als" }],
			[
				{ kind: "Case", governedCase: "Acc", referent: "Something" },
				{ kind: "Clause", form: "Dass", correlate: "Optional" },
			],
		])
			expect(schema.safeParse(entry(...complements)).success).toBe(true);
		for (const complements of [
			[],
			[{ kind: "Case", case: "Acc", referent: "Something" }],
			[{ kind: "Adverbial", standIn: "Irgendwo", referent: "Something" }],
		])
			expect(schema.safeParse(entry(...complements)).success).toBe(false);
	});

	test("Hebrew Reading Knowledge holds caseless Hebrew complements", () => {
		const schema = getDumdictSchemasFor("he").readingEntrySchema;
		const al = {
			unitKind: "Lemma",
			language: "he",
			family: "Lexeme",
			kind: "ADP",
			canonicalForm: "על",
			coreFeatures: { abbr: null, case: null },
		};
		const entry = (complement: unknown) => ({
			reading: hebrewKatavReading,
			attestedTranslations: [],
			attestations: [],
			notes: "",
			knowledge: {
				valency: [{ status: "Required", complements: [complement] }],
			},
		});
		expect(
			schema.safeParse(entry({ kind: "Subject", referent: "Someone" }))
				.success,
		).toBe(true);
		expect(
			schema.safeParse(
				entry({
					kind: "Preposition",
					preposition: al,
					referent: "Either",
				}),
			).success,
		).toBe(true);
		expect(
			schema.safeParse(
				entry({
					kind: "Preposition",
					preposition: al,
					governedCase: "Acc",
					referent: "Either",
				}),
			).success,
		).toBe(false);
	});

	test("English Reading Knowledge holds caseless English complements", () => {
		const schema = getDumdictSchemasFor("en").readingEntrySchema;
		const on = {
			unitKind: "Lemma",
			language: "en",
			family: "Lexeme",
			kind: "ADP",
			canonicalForm: "on",
			coreFeatures: { abbr: null, extPos: null },
		};
		const entry = (complement: unknown) => ({
			reading: englishRunReading,
			attestedTranslations: [],
			attestations: [],
			notes: "",
			knowledge: {
				valency: [{ status: "Required", complements: [complement] }],
			},
		});
		for (const complement of [
			{ kind: "IndirectObject", referent: "Someone" },
			{ kind: "Preposition", preposition: on, referent: "Something" },
		])
			expect(schema.safeParse(entry(complement)).success).toBe(true);
		for (const complement of [
			{
				kind: "Preposition",
				preposition: on,
				governedCase: "Acc",
				referent: "Either",
			},
			{
				kind: "Preposition",
				preposition: {
					...on,
					language: "he",
					coreFeatures: { abbr: null, case: null },
				},
				referent: "Either",
			},
		])
			expect(schema.safeParse(entry(complement)).success).toBe(false);
	});

	test("Surface Entries compose Dumling's concrete Surface schemas", () => {
		const schema = getDumdictSchemasFor("de").surfaceEntrySchema;
		const entry = {
			id: makeSurfaceId("de", germanHausCitationSurface),
			surface: germanHausCitationSurface,
			ownerLemma: germanHausLemma,
			attestedTranslations: [],
			attestations: [],
			notes: "",
		};

		expect(schema.parse(entry)).toEqual(entry);
		expect(
			schema.safeParse({
				...entry,
				surface: { ...entry.surface, unexpected: true },
			}).success,
		).toBe(false);
	});

	test("plans accept singular Reading transcription changes", () => {
		const plan = {
			baseRevision: revision,
			changes: [
				{
					type: "patchReading",
					reading: germanGehenReading,
					ops: [
						{
							kind: "applyKnowledgeChange",
							envelope: {
								reading: germanGehenReading,
								change: {
									kind: "Correct",
									aspect: "transcription",
									value: "ɡeːən",
								},
							},
						},
					],
					preconditions: [],
				},
			],
		};

		expect(dumdictPlanSchema.safeParse(plan).success).toBe(true);
		const legacyPlan = structuredClone(plan);
		const operation = legacyPlan.changes[0]?.ops[0];
		if (!operation) throw new Error("Expected Knowledge Change operation.");
		operation.envelope.change = {
			kind: "Retract",
			aspect: "transcriptions",
			language: "de",
		} as never;
		expect(dumdictPlanSchema.safeParse(legacyPlan).success).toBe(false);
	});

	test("schema-inferred plan branches remain strict at runtime", () => {
		const schema = getDumdictSchemasFor("de").dumdictPlanSchema;
		const plan = {
			baseRevision: revision,
			changes: [
				{
					type: "createLemma" as const,
					record: { lemma: germanHausLemma },
					preconditions: [
						{ kind: "revisionMatches" as const, revision },
						{
							kind: "lemmaMissing" as const,
							lemma: germanHausLemma,
						},
					],
				},
			],
		};

		expect(schema.safeParse(plan).success).toBe(true);
		expect(
			schema.safeParse({
				...plan,
				changes: [{ ...plan.changes[0], undeclaredField: true }],
			}).success,
		).toBe(false);
	});

	test("Pending Semantic Relation records compose Dumrel and verify locators", () => {
		const schema =
			getDumdictSchemasFor("de").pendingSemanticRelationRecordSchema;
		const record = {
			sourceReading: germanGehenReading,
			pending: {
				relation: "nearSynonym" as const,
				target: {
					language: "de" as const,
					canonicalForm: "laufen",
					family: "Lexeme" as const,
					kind: "VERB" as const,
				},
			},
			locator: {
				sourceReadingKey: readingIdentityKey(germanGehenReading),
				relation: "nearSynonym" as const,
				targetPendingId: "pending-laufen",
			},
		};

		expect(schema.safeParse(record).success).toBe(true);
		expect(
			schema.safeParse({
				...record,
				locator: { ...record.locator, relation: "antonym" },
			}).success,
		).toBe(false);
	});

	test("commit results are strict and revision-bearing", () => {
		expect(
			commitChangesResultSchema.parse({
				status: "committed",
				nextRevision: "schema-test-2",
			}),
		).toEqual({ status: "committed", nextRevision: "schema-test-2" });
		expect(
			commitChangesResultSchema.safeParse({
				status: "conflict",
				code: "unknownConflict",
			}).success,
		).toBe(false);
	});
});
