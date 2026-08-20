import { semanticRelationSchema } from "dumrel";
import type { z } from "zod";

/** Semantic Relation kinds that a model may generate directly. */
export const requestableRelationSchema = semanticRelationSchema.exclude([
	"hyponym",
	"meronym",
]);

export type RequestableRelation = z.infer<typeof requestableRelationSchema>;
