import type { Equal, Expect } from "common-utils";
import type {
	knowledgeChangeSchema,
	pendingSemanticRelationSchema,
	readingKnowledgeSchema,
} from "dumrel/schema";
import type * as Dumrel from "dumrel/types";
import type { z } from "zod";

type KnowledgeShape = z.output<typeof readingKnowledgeSchema>;
type ChangeShape = z.output<typeof knowledgeChangeSchema>;
type PendingShape = z.output<typeof pendingSemanticRelationSchema>;
export type CanonicalKnowledge = Expect<
	KnowledgeShape extends Dumrel.ReadingKnowledge ? true : false
>;
export type CanonicalChange = Expect<
	ChangeShape extends Dumrel.KnowledgeChange ? true : false
>;
export type CanonicalPending = Expect<
	PendingShape extends Dumrel.PendingSemanticRelation ? true : false
>;

import type { canonicalDumdictValidationSchemas } from "./validation-artifacts.js";
export type DumdictValidationRouteKey =
	keyof typeof canonicalDumdictValidationSchemas;
export type CanonicalDumdictValidationSchemaForRoute<
	K extends DumdictValidationRouteKey,
> = (typeof canonicalDumdictValidationSchemas)[K];
export type DumdictValidationRouteInputMap = {
	[K in DumdictValidationRouteKey]: z.input<
		CanonicalDumdictValidationSchemaForRoute<K>
	>;
};
export type ActualDumdictValidationRouteOutputMap = {
	[K in DumdictValidationRouteKey]: z.output<
		CanonicalDumdictValidationSchemaForRoute<K>
	>;
};
export type { DumdictValidationRouteOutputMap } from "../src/parsing/validation-route-types.js";

export type ProveCanonicalDumdictValidationSchemaRoute<
	Key extends DumdictValidationRouteKey,
	Schema extends z.ZodType<ActualDumdictValidationRouteOutputMap[Key]>,
> = Equal<z.output<Schema>, ActualDumdictValidationRouteOutputMap[Key]>;
