import {
	inverseRelationFor,
	projectRelations as projectLeanRelations,
	propagateRelations as propagateLeanRelations,
} from "./rules.js";
import { semanticRelationGraphSchema } from "./schema.js";
import type {
	SemanticRelationGraph,
	SemanticRelationGraphEdge,
	SemanticRelationGraphProjection,
} from "./types.js";

export { inverseRelationFor };

/** Compatibility facade retaining the root entrypoint's Zod validation. */
export function propagateRelations(
	graph: SemanticRelationGraph,
): SemanticRelationGraphEdge[] {
	return propagateLeanRelations(semanticRelationGraphSchema.parse(graph));
}

/** Compatibility facade retaining the root entrypoint's Zod validation. */
export function projectRelations(
	graph: SemanticRelationGraph,
): SemanticRelationGraphProjection[] {
	return projectLeanRelations(semanticRelationGraphSchema.parse(graph));
}
