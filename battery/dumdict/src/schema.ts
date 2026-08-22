import { supportedLanguages } from "dumling";
import { getDangerouslyHeavySchemaTreeForAbout100MiBRss as getSchemaTreeFor } from "dumling/dangerously-heavy-schema-tree";
import { readingSchema } from "dumling/schema";
import type { Lemma, Reading, SupportedLanguage, Surface } from "dumling/types";
import {
	directSemanticRelationSchema,
	knowledgeChangeSchema,
	pendingSemanticRelationSchema,
	readingKnowledgeSchema,
} from "dumrel/schema";
import type {
	KnowledgeChange,
	ReadingKnowledge,
	UnitShadow,
} from "dumrel/types";
import { type ZodType, z } from "zod/v4";
import type {
	ChangePrecondition,
	CommitChangesRequest,
	DumdictPlan,
	LemmaRecord,
	PendingEntryId,
	PendingSemanticRelationLocator,
	PendingSemanticRelationRecord,
	PlannedChangeOp,
	ReadingEntry,
	ReadingPatchOp,
	StoreRevision,
	SurfaceEntry,
} from "./domain-types.js";
import type { SurfaceId } from "./dumling";
import {
	dumdictNamedValidationErrors,
	dumdictNamedValidationPredicates,
	dumdictNamedValidationTransforms,
	retainCommitChangesRequest,
	retainDumdictPlan,
} from "./validation-semantics";

type SchemaGetter = () => ZodType;

type ObjectSchemaWithField<
	Output,
	Key extends string,
	FieldOutput,
> = ZodType<Output> &
	Readonly<{
		shape: Readonly<Record<Key, ZodType<FieldOutput>>>;
	}>;

type ExtendableObjectSchemaWithField<
	Output,
	Key extends string,
	FieldOutput,
> = ZodType<Output> &
	Pick<z.ZodObject<{ [Field in Key]: ZodType<FieldOutput> }>, "extend">;

function collectSchemas(tree: unknown): ZodType[] {
	if (typeof tree === "function") return [(tree as SchemaGetter)()];
	return Object.values(tree as Record<string, unknown>).flatMap(
		collectSchemas,
	);
}

/**
 * Dumling's public registry is a nested object rather than a schema tuple, so
 * this adapter is the one place where its leaf union must be re-associated
 * with the entity type owned by Dumling.
 */
function unionOf<T>(schemas: ZodType[]): ZodType<T> {
	const [first, second, ...rest] = schemas;
	if (first === undefined)
		throw new Error("Dumling exposes no schemas for this entity.");
	if (second === undefined) return first as ZodType<T>;
	return z.union([first, second, ...rest]) as ZodType<T>;
}

function namedValidationPredicate<Value>(
	name: keyof typeof dumdictNamedValidationPredicates,
): (value: Value) => unknown {
	return dumdictNamedValidationPredicates[name] as (value: Value) => unknown;
}

function namedValidationError(
	name: keyof typeof dumdictNamedValidationErrors,
): { readonly error: () => string } {
	return { error: dumdictNamedValidationErrors[name] };
}

function pendingEntryIdTransform<L extends SupportedLanguage>(
	language: L,
): (value: string) => PendingEntryId<L> {
	return dumdictNamedValidationTransforms[
		`dumdict.pending-entry-id.${language}`
	] as (value: string) => PendingEntryId<L>;
}

export type DumdictSchemasFor<L extends SupportedLanguage> = Readonly<{
	lemmaRecordSchema: ExtendableObjectSchemaWithField<
		LemmaRecord<L>,
		"lemma",
		Lemma<L>
	>;
	readingEntrySchema: ObjectSchemaWithField<
		ReadingEntry<L>,
		"reading",
		Reading<L>
	>;
	surfaceEntrySchema: ObjectSchemaWithField<
		SurfaceEntry<L>,
		"surface",
		Surface<L>
	>;
	pendingSemanticRelationLocatorSchema: ZodType<
		PendingSemanticRelationLocator<L>
	>;
	pendingSemanticRelationRecordSchema: ZodType<
		PendingSemanticRelationRecord<L>
	>;
	changePreconditionSchema: ZodType<ChangePrecondition<L>>;
	readingPatchOpSchema: ZodType<ReadingPatchOp<L>>;
	plannedChangeOpSchema: ZodType<PlannedChangeOp<L>>;
	dumdictPlanSchema: ZodType<DumdictPlan<L>>;
	commitChangesRequestSchema: ZodType<CommitChangesRequest<L>>;
}>;

function createSchemasFor<const L extends SupportedLanguage>(
	language: L,
): DumdictSchemasFor<L> {
	const entitySchemas = getSchemaTreeFor(language).entity;
	const lemmaSchema = unionOf<Lemma<L>>(collectSchemas(entitySchemas.Lemma));
	const surfaceSchema = unionOf<Surface<L>>(
		collectSchemas(entitySchemas.Surface),
	);

	// These casts narrow schemas owned by Dumling and Dumrel after a runtime
	// language refinement. Local Dumdict object and union outputs remain inferred.
	const languageReadingSchema = (
		readingSchema as unknown as ZodType<Reading<L>>
	).refine(
		namedValidationPredicate<Reading<L>>(
			`dumdict.reading.language.${language}`,
		),
		namedValidationError(`dumdict.reading.language.${language}`),
	);
	const languageReadingKnowledgeSchema = (
		readingKnowledgeSchema as unknown as ZodType<
			ReadingKnowledge<string, Lemma<L>>
		>
	).refine(
		namedValidationPredicate<ReadingKnowledge<string, Lemma<L>>>(
			`dumdict.reading-knowledge.language.${language}`,
		),
		namedValidationError(`dumdict.reading-knowledge.language.${language}`),
	);
	const languagePendingSemanticRelationSchema = (
		pendingSemanticRelationSchema as unknown as ZodType<{
			relation: z.output<typeof directSemanticRelationSchema>;
			target: UnitShadow<L>;
		}>
	).refine(
		namedValidationPredicate<{
			relation: z.output<typeof directSemanticRelationSchema>;
			target: UnitShadow<L>;
		}>(`dumdict.pending.target-language.${language}`),
		namedValidationError(`dumdict.pending.target-language.${language}`),
	);

	const stringArraySchema = z.array(z.string());
	// Host IDs are opaque branded strings. These are the only local leaf-schema
	// casts; every containing contract is inferred from the schema expression.
	const storeRevisionSchema = z.string().min(1) as ZodType<StoreRevision>;
	const surfaceIdSchema = z.string().min(1) as unknown as ZodType<
		SurfaceId<L>
	>;
	const pendingEntryIdSchema = z
		.string()
		.min(1)
		.transform(pendingEntryIdTransform(language));

	const lemmaRecordSchema = z.strictObject({
		lemma: lemmaSchema,
	});
	const readingEntrySchema = z
		.strictObject({
			reading: languageReadingSchema,
			knowledge: languageReadingKnowledgeSchema.optional(),
			attestedTranslations: stringArraySchema,
			attestations: stringArraySchema,
			notes: z.string(),
		})
		.refine(
			namedValidationPredicate("dumdict.reading-entry.no-same-lemma"),
			namedValidationError("dumdict.reading-entry.no-same-lemma"),
		);
	const surfaceEntrySchema = z
		.strictObject({
			id: surfaceIdSchema,
			surface: surfaceSchema,
			ownerLemma: lemmaSchema,
			attestedTranslations: stringArraySchema,
			attestations: stringArraySchema,
			notes: z.string(),
		})
		.refine(
			namedValidationPredicate("dumdict.surface.owner-matches"),
			namedValidationError("dumdict.surface.owner-matches"),
		)
		.refine(
			namedValidationPredicate("dumdict.surface.id-matches"),
			namedValidationError("dumdict.surface.id-matches"),
		);
	const pendingSemanticRelationLocatorSchema = z.strictObject({
		sourceReadingKey: z.string().min(1),
		relation: directSemanticRelationSchema,
		targetPendingId: pendingEntryIdSchema,
	});
	const pendingSemanticRelationRecordSchema = z
		.strictObject({
			sourceReading: languageReadingSchema,
			pending: languagePendingSemanticRelationSchema,
			locator: pendingSemanticRelationLocatorSchema,
		})
		.refine(
			namedValidationPredicate("dumdict.pending.locator-source"),
			namedValidationError("dumdict.pending.locator-source"),
		)
		.refine(
			namedValidationPredicate(
				"dumdict.pending.locator-matches-relation",
			),
			namedValidationError("dumdict.pending.locator-matches-relation"),
		);

	const changePreconditionSchema = z.discriminatedUnion("kind", [
		z.strictObject({
			kind: z.literal("revisionMatches"),
			revision: storeRevisionSchema,
		}),
		z.strictObject({ kind: z.literal("lemmaExists"), lemma: lemmaSchema }),
		z.strictObject({ kind: z.literal("lemmaMissing"), lemma: lemmaSchema }),
		z.strictObject({
			kind: z.literal("readingExists"),
			reading: languageReadingSchema,
		}),
		z.strictObject({
			kind: z.literal("readingMissing"),
			reading: languageReadingSchema,
		}),
		z.strictObject({
			kind: z.literal("surfaceExists"),
			surfaceId: surfaceIdSchema,
		}),
		z.strictObject({
			kind: z.literal("surfaceMissing"),
			surfaceId: surfaceIdSchema,
		}),
		z.strictObject({
			kind: z.literal("pendingRelationExists"),
			record: pendingSemanticRelationRecordSchema,
		}),
		z.strictObject({
			kind: z.literal("pendingRelationMissing"),
			record: pendingSemanticRelationRecordSchema,
		}),
		z.strictObject({
			kind: z.literal("readingAttestationMissing"),
			reading: languageReadingSchema,
			value: z.string(),
		}),
	]);

	const languageReadingKnowledgeChangeValueSchema =
		knowledgeChangeSchema.refine(
			namedValidationPredicate<KnowledgeChange>(
				`dumdict.knowledge-change.language.${language}`,
			),
			namedValidationError(
				`dumdict.knowledge-change.language.${language}`,
			),
		) as unknown as ZodType<KnowledgeChange<string, Lemma<L>>>;
	const readingKnowledgeChangeSchema = z.strictObject({
		reading: languageReadingSchema,
		change: languageReadingKnowledgeChangeValueSchema,
	});
	const readingPatchOpSchema = z.discriminatedUnion("kind", [
		z.strictObject({
			kind: z.literal("addAttestation"),
			value: z.string(),
		}),
		z.strictObject({
			kind: z.literal("applyKnowledgeChange"),
			envelope: readingKnowledgeChangeSchema,
		}),
	]);
	const preconditionsSchema = z.array(changePreconditionSchema);
	const plannedChangeOpSchema = z
		.discriminatedUnion("type", [
			z.strictObject({
				type: z.literal("createLemma"),
				record: lemmaRecordSchema,
				preconditions: preconditionsSchema,
			}),
			z.strictObject({
				type: z.literal("createReading"),
				entry: readingEntrySchema,
				preconditions: preconditionsSchema,
			}),
			z.strictObject({
				type: z.literal("patchReading"),
				reading: languageReadingSchema,
				ops: z.array(readingPatchOpSchema),
				preconditions: preconditionsSchema,
			}),
			z.strictObject({
				type: z.literal("createOwnedSurface"),
				entry: surfaceEntrySchema,
				preconditions: preconditionsSchema,
			}),
			z.strictObject({
				type: z.literal("createPendingSemanticRelation"),
				record: pendingSemanticRelationRecordSchema,
				preconditions: preconditionsSchema,
			}),
			z.strictObject({
				type: z.literal("deletePendingSemanticRelation"),
				record: pendingSemanticRelationRecordSchema,
				preconditions: preconditionsSchema,
			}),
		])
		.refine(
			namedValidationPredicate(
				"dumdict.knowledge-change.reading-matches-patched",
			),
			namedValidationError(
				"dumdict.knowledge-change.reading-matches-patched",
			),
		);
	const commitChangesRequestInputSchema = z.strictObject({
		baseRevision: storeRevisionSchema,
		changes: z.array(plannedChangeOpSchema),
	});
	const commitChangesRequestSchema =
		commitChangesRequestInputSchema.transform(retainCommitChangesRequest);
	const dumdictPlanSchema =
		commitChangesRequestInputSchema.transform(retainDumdictPlan);

	return {
		lemmaRecordSchema,
		readingEntrySchema,
		surfaceEntrySchema,
		pendingSemanticRelationLocatorSchema,
		pendingSemanticRelationRecordSchema,
		changePreconditionSchema,
		readingPatchOpSchema,
		plannedChangeOpSchema,
		dumdictPlanSchema,
		commitChangesRequestSchema,
	};
}

const schemasByLanguage = {
	de: createSchemasFor("de"),
	en: createSchemasFor("en"),
	he: createSchemasFor("he"),
} satisfies { [L in SupportedLanguage]: DumdictSchemasFor<L> };

export function getDumdictSchemasFor<L extends SupportedLanguage>(
	language: L,
): DumdictSchemasFor<L> {
	// Generic indexed access widens this to the map's concrete-language union;
	// the map is exhaustive and each value was created with its matching key.
	return schemasByLanguage[language] as unknown as DumdictSchemasFor<L>;
}

type DumdictSchemaKey = keyof DumdictSchemasFor<SupportedLanguage>;
type AggregateSchemaOutput<Key extends DumdictSchemaKey> = {
	[L in SupportedLanguage]: z.output<DumdictSchemasFor<L>[Key]>;
}[SupportedLanguage];

function aggregateSchema<Key extends DumdictSchemaKey>(
	key: Key,
): ZodType<AggregateSchemaOutput<Key>> {
	const schemas = supportedLanguages.map(
		(language) => schemasByLanguage[language][key] as ZodType,
	);
	const [first, second, ...rest] = schemas;
	if (first === undefined)
		throw new Error("Dumling exposes no supported languages.");
	if (second === undefined)
		return first as ZodType<AggregateSchemaOutput<Key>>;
	return z.union([first, second, ...rest]) as ZodType<
		AggregateSchemaOutput<Key>
	>;
}

export const lemmaRecordSchema = aggregateSchema("lemmaRecordSchema");
export const readingEntrySchema = aggregateSchema("readingEntrySchema");
export const surfaceEntrySchema = aggregateSchema("surfaceEntrySchema");
export const pendingSemanticRelationLocatorSchema = aggregateSchema(
	"pendingSemanticRelationLocatorSchema",
);
export const pendingSemanticRelationRecordSchema = aggregateSchema(
	"pendingSemanticRelationRecordSchema",
);
export const changePreconditionSchema = aggregateSchema(
	"changePreconditionSchema",
);
export const readingPatchOpSchema = aggregateSchema("readingPatchOpSchema");
export const plannedChangeOpSchema = aggregateSchema("plannedChangeOpSchema");
export const dumdictPlanSchema = aggregateSchema("dumdictPlanSchema");
export const commitChangesRequestSchema = aggregateSchema(
	"commitChangesRequestSchema",
);

export const commitConflictCodeSchema = z.enum([
	"revisionConflict",
	"semanticPreconditionFailed",
]);
export const commitChangesResultSchema = z.discriminatedUnion("status", [
	z.strictObject({
		status: z.literal("committed"),
		nextRevision: z.string().min(1) as ZodType<StoreRevision>,
	}),
	z.strictObject({
		status: z.literal("conflict"),
		code: commitConflictCodeSchema,
		latestRevision: (
			z.string().min(1) as ZodType<StoreRevision>
		).optional(),
		message: z.string().optional(),
	}),
]);

export type {
	ChangePrecondition,
	CommitChangesRequest,
	CommitChangesResult,
	CommitConflictCode,
	DumdictPendingSemanticRelation,
	DumdictPlan,
	LemmaRecord,
	PendingEntryId,
	PendingSemanticRelationLocator,
	PendingSemanticRelationRecord,
	PlannedChangeOp,
	ReadingEntry,
	ReadingPatchOp,
	StoreRevision,
	SurfaceEntry,
} from "./domain-types.js";
