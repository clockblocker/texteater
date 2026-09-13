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

/**
 * Projects direct and inferred relations with root-entrypoint validation.
 *
 * @remarks
 * Lemma-targeted claims allow every supplied Reading of the target Lemma to
 * participate, including unrelated Readings. This is an interim optimization
 * to avoid extra LLM calls for each newly added word, not the long-term semantic
 * model. A separate LLM workflow will resolve exact target Readings; projection
 * itself remains deterministic and makes no model calls.
 *
 * @see {@link https://github.com/clockblocker/texteater/issues/176 | Smart Shadow Pickup}
 */
export function projectRelations(
	graph: SemanticRelationGraph,
): SemanticRelationGraphProjection[] {
	return projectLeanRelations(
		unwrapDumrelParse(parseAsSemanticRelationGraph(graph)),
	);
}
