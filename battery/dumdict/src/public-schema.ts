import type * as Dumling from "dumling/types";
import { type ZodType, z } from "zod/v4";
import {
	commitChangesResultSchema,
	commitConflictCodeSchema,
	type DumdictSchemasFor,
	getDumdictSchemasFor,
} from "./schema.js";

const supportedLanguages = ["de", "en", "he"] as const;

type DumdictSchemaKey = keyof DumdictSchemasFor<Dumling.Language>;
type AggregateSchemaOutput<Key extends DumdictSchemaKey> = {
	[L in Dumling.Language]: z.output<DumdictSchemasFor<L>[Key]>;
}[Dumling.Language];

function aggregateSchema<Key extends DumdictSchemaKey>(
	key: Key,
): ZodType<AggregateSchemaOutput<Key>> {
	const schemas: ZodType[] = supportedLanguages.map(
		(language) => getDumdictSchemasFor(language)[key],
	);
	const [first, second, ...rest] = schemas;
	if (first === undefined)
		throw new Error("Dumling exposes no supported languages.");
	const aggregate =
		second === undefined ? first : z.union([first, second, ...rest]);
	// TypeScript can't follow a generic Key through the per-language map; the
	// union holds each language's schema for Key, which is the aggregate output.
	return aggregate as ZodType<AggregateSchemaOutput<Key>>;
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
export type { DumdictSchemasFor };
export { commitChangesResultSchema, commitConflictCodeSchema };
