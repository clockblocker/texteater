import {
	getLanguageApi,
	readingFingerprint,
	supportedLanguages,
} from "dumling";
import { getSchemaTreeFor, readingSchema } from "dumling/schema";
import type { Lemma, Reading, SupportedLanguage, Surface } from "dumling/types";
import type {
	KnowledgeChange,
	MorphologicalTreeNode,
	ReadingKnowledge,
	UnitShadow,
} from "dumrel";
import {
	knowledgeChangeSchema,
	pendingSemanticRelationSchema,
	readingKnowledgeSchema,
	semanticRelationSchema,
} from "dumrel";
import { type ZodType, z } from "zod/v4";
import { makeSurfaceId, type SurfaceId } from "./dumling";

export type PendingEntryId<L extends SupportedLanguage> = string & {
	readonly __pendingEntryIdBrand?: unique symbol;
	readonly __language?: L;
};

export type StoreRevision = string & {
	readonly __storeRevisionBrand?: unique symbol;
};

type SchemaGetter = () => ZodType;

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

function readingUsesLanguage<L extends SupportedLanguage>(
	reading: Reading,
	language: L,
): boolean {
	return reading.lemma.language === language;
}

function lemmaUsesLanguage<L extends SupportedLanguage>(
	lemma: Lemma,
	language: L,
): boolean {
	return lemma.language === language;
}

function sameLemma<L extends SupportedLanguage>(
	left: Lemma<L>,
	right: Lemma<L>,
): boolean {
	const id = getLanguageApi(left.language).id.encode.asCsv;
	return id(left) === id(right);
}

function sameReading<L extends SupportedLanguage>(
	left: Reading<L>,
	right: Reading<L>,
): boolean {
	return readingFingerprint(left) === readingFingerprint(right);
}

function knowledgeUsesLanguage<L extends SupportedLanguage>(
	knowledge: ReadingKnowledge,
	language: L,
): boolean {
	for (const targets of Object.values(knowledge.semanticRelations ?? {})) {
		if (
			(targets ?? []).some(
				(target) => !lemmaUsesLanguage(target, language),
			)
		)
			return false;
	}

	const visitMorphologyNode = (node: MorphologicalTreeNode): boolean => {
		if (node.nodeKind === "morphemeReading")
			return readingUsesLanguage(node.reading, language);
		if (node.nodeKind === "unitShadow")
			return node.unitShadow.language === language;
		return node.children.every(visitMorphologyNode);
	};

	if (
		knowledge.morphologicalTree !== undefined &&
		!visitMorphologyNode(knowledge.morphologicalTree.root)
	)
		return false;
	return (knowledge.lexicalBreakdown ?? []).every(
		(shadow) => shadow.language === language,
	);
}

function knowledgeChangeUsesLanguage<L extends SupportedLanguage>(
	change: KnowledgeChange,
	language: L,
): boolean {
	if (change.aspect === "semanticRelations" && "value" in change)
		return change.value.every((lemma) =>
			lemmaUsesLanguage(lemma, language),
		);
	if (change.aspect === "morphologicalTree" && "value" in change)
		return knowledgeUsesLanguage(
			{ morphologicalTree: change.value },
			language,
		);
	if (change.aspect === "lexicalBreakdown" && "value" in change)
		return change.value.every((shadow) => shadow.language === language);
	return true;
}

function createSchemasFor<const L extends SupportedLanguage>(language: L) {
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
		(reading) =>
			readingUsesLanguage(reading as unknown as Reading, language),
		`Reading must use ${language}.`,
	);
	const languageReadingKnowledgeSchema = (
		readingKnowledgeSchema as unknown as ZodType<
			ReadingKnowledge<string, Lemma<L>>
		>
	).refine(
		(knowledge) =>
			knowledgeUsesLanguage(knowledge as ReadingKnowledge, language),
		`Reading Knowledge references must use ${language}.`,
	);
	const languagePendingSemanticRelationSchema = (
		pendingSemanticRelationSchema as unknown as ZodType<{
			relation: z.output<typeof semanticRelationSchema>;
			target: UnitShadow<L>;
		}>
	).refine(
		(pending) => pending.target.language === language,
		`Pending Semantic Relation target must use ${language}.`,
	);

	const stringArraySchema = z.array(z.string());
	// Host IDs are opaque branded strings. These are the only local leaf-schema
	// casts; every containing contract is inferred from the schema expression.
	const storeRevisionSchema = z.string().min(1) as ZodType<StoreRevision>;
	const surfaceIdSchema = z.string().min(1) as unknown as ZodType<
		SurfaceId<L>
	>;
	const pendingEntryIdSchema = z.string().min(1) as ZodType<
		PendingEntryId<L>
	>;

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
			(entry) =>
				Object.values(entry.knowledge?.semanticRelations ?? {}).every(
					(targets) =>
						(targets ?? []).every(
							(target) => !sameLemma(entry.reading.lemma, target),
						),
				),
			"Reading Knowledge cannot contain a direct same-Lemma relation.",
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
			(entry) =>
				sameLemma(
					entry.ownerLemma,
					entry.surface.lemma as unknown as Lemma<L>,
				),
			"Surface owner Lemma must match the realized Lemma.",
		)
		.refine(
			(entry) => entry.id === makeSurfaceId(language, entry.surface),
			"Surface Entry id must match its Surface.",
		);
	const pendingSemanticRelationLocatorSchema = z.strictObject({
		sourceReadingKey: z.string().min(1),
		relation: semanticRelationSchema,
		targetPendingId: pendingEntryIdSchema,
	});
	const pendingSemanticRelationRecordSchema = z
		.strictObject({
			sourceReading: languageReadingSchema,
			pending: languagePendingSemanticRelationSchema,
			locator: pendingSemanticRelationLocatorSchema,
		})
		.refine(
			(record) =>
				record.locator.sourceReadingKey ===
				readingFingerprint(record.sourceReading),
			"Pending Semantic Relation locator must identify its source Reading.",
		)
		.refine(
			(record) => record.locator.relation === record.pending.relation,
			"Pending Semantic Relation locator must match its relation.",
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
			(change) => knowledgeChangeUsesLanguage(change, language),
			`Reading Knowledge Change references must use ${language}.`,
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
			(change) =>
				change.type !== "patchReading" ||
				change.ops.every(
					(op) =>
						op.kind !== "applyKnowledgeChange" ||
						sameReading(change.reading, op.envelope.reading),
				),
			"Knowledge Change Reading must match the patched Reading.",
		);
	const commitChangesRequestSchema = z.strictObject({
		baseRevision: storeRevisionSchema,
		changes: z.array(plannedChangeOpSchema),
	});

	return {
		lemmaRecordSchema,
		readingEntrySchema,
		surfaceEntrySchema,
		pendingSemanticRelationLocatorSchema,
		pendingSemanticRelationRecordSchema,
		changePreconditionSchema,
		readingPatchOpSchema,
		plannedChangeOpSchema,
		dumdictPlanSchema: commitChangesRequestSchema,
		commitChangesRequestSchema,
	};
}

export type DumdictSchemasFor<L extends SupportedLanguage> = ReturnType<
	typeof createSchemasFor<L>
>;

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

export type LemmaRecord<L extends SupportedLanguage> = z.output<
	DumdictSchemasFor<L>["lemmaRecordSchema"]
>;
export type ReadingEntry<L extends SupportedLanguage> = z.output<
	DumdictSchemasFor<L>["readingEntrySchema"]
>;
export type SurfaceEntry<L extends SupportedLanguage> = z.output<
	DumdictSchemasFor<L>["surfaceEntrySchema"]
>;
export type PendingSemanticRelationLocator<L extends SupportedLanguage> =
	z.output<DumdictSchemasFor<L>["pendingSemanticRelationLocatorSchema"]>;
export type DumdictPendingSemanticRelation<L extends SupportedLanguage> =
	z.output<
		DumdictSchemasFor<L>["pendingSemanticRelationRecordSchema"]
	>["pending"];
export type PendingSemanticRelationRecord<L extends SupportedLanguage> =
	z.output<DumdictSchemasFor<L>["pendingSemanticRelationRecordSchema"]>;
export type ChangePrecondition<L extends SupportedLanguage> = z.output<
	DumdictSchemasFor<L>["changePreconditionSchema"]
>;
export type ReadingPatchOp<L extends SupportedLanguage> = z.output<
	DumdictSchemasFor<L>["readingPatchOpSchema"]
>;
export type PlannedChangeOp<L extends SupportedLanguage> = z.output<
	DumdictSchemasFor<L>["plannedChangeOpSchema"]
>;

type Primitive = string | number | boolean | bigint | symbol | null | undefined;
type DeepReadonly<T> = T extends Primitive
	? T
	: T extends (...args: never[]) => unknown
		? T
		: T extends readonly unknown[]
			? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
			: T extends object
				? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
				: T;

type ParsedCommitChangesRequest<L extends SupportedLanguage> = z.output<
	DumdictSchemasFor<L>["commitChangesRequestSchema"]
>;
/** A deeply immutable, validated plan handed to a host adapter. */
export type DumdictPlan<L extends SupportedLanguage> = DeepReadonly<
	z.output<DumdictSchemasFor<L>["dumdictPlanSchema"]>
>;
/** A storage request whose change list cannot be replaced or extended. */
export type CommitChangesRequest<L extends SupportedLanguage> = Readonly<{
	[Key in keyof ParsedCommitChangesRequest<L>]: Key extends "changes"
		? Readonly<ParsedCommitChangesRequest<L>[Key]>
		: ParsedCommitChangesRequest<L>[Key];
}>;
export type CommitConflictCode = z.output<typeof commitConflictCodeSchema>;
export type CommitChangesResult = z.output<typeof commitChangesResultSchema>;
