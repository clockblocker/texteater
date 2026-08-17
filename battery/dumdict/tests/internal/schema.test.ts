import { describe, expect, test } from "bun:test";
import { readingFingerprint } from "dumling";
import {
	commitChangesResultSchema,
	dumdictPlanSchema,
	getDumdictSchemasFor,
	lemmaRecordSchema,
	makeSurfaceId,
	type StoreRevision,
} from "../../src";
import { germanHausLemma } from "../attested-entities/de/lemmas";
import { germanHausCitationSurface } from "../attested-entities/de/surfaces";
import { germanGehenReading } from "../fixtures/de-notes";
import { englishRunReading } from "../fixtures/en-notes";

const revision = "schema-test-1" as StoreRevision;

describe("public storage-facing schemas", () => {
	test("aggregate and language-scoped schemas parse supported Lemma records", () => {
		expect(lemmaRecordSchema.parse({ lemma: germanHausLemma })).toEqual({
			lemma: germanHausLemma,
		});
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

	test("plans reject Reading-only transcription changes", () => {
		const invalidPlan = {
			baseRevision: revision,
			changes: [
				{
					type: "patchReading",
					reading: germanGehenReading,
					ops: [
						{
							kind: "applyKnowledgeChange",
							envelope: {
								owner: {
									kind: "Reading",
									reading: germanGehenReading,
								},
								change: {
									kind: "Retract",
									aspect: "transcriptions",
									language: "de",
								},
							},
						},
					],
					preconditions: [],
				},
			],
		};

		expect(dumdictPlanSchema.safeParse(invalidPlan).success).toBe(false);
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
				sourceReadingKey: readingFingerprint(germanGehenReading),
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
