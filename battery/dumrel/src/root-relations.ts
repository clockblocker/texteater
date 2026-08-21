import {
	parseAsSemanticRelationGraph,
	unwrapDumrelParse,
} from "./parsing/lightweight-parsers.js";
import {
	inverseRelationFor,
	projectRelations as projectLeanRelations,
	propagateRelations as propagateLeanRelations,
} from "./rules.js";
import type {
	SemanticRelationGraph,
	SemanticRelationGraphEdge,
	SemanticRelationGraphProjection,
} from "./types.js";

export { inverseRelationFor };

/** Compatibility facade retaining root-entrypoint validation. */
export function propagateRelations(
	graph: SemanticRelationGraph,
): SemanticRelationGraphEdge[] {
	return propagateLeanRelations(
		unwrapDumrelParse(parseAsSemanticRelationGraph(graph)),
	);
}

/** Compatibility facade retaining root-entrypoint validation. */
export function projectRelations(
	graph: SemanticRelationGraph,
): SemanticRelationGraphProjection[] {
	return projectLeanRelations(
		unwrapDumrelParse(parseAsSemanticRelationGraph(graph)),
	);
}
