import { parseSemanticRelationGraph } from "./relations/graph-contract.js";
import type {
	SemanticRelation,
	SemanticRelationGraph,
	SemanticRelationGraphEdge,
	SemanticRelationGraphProjection,
	SemanticRelationGraphReading,
} from "./types.js";
import { semanticRelationValues } from "./vocabulary.js";

const relationAlgebra = {
	synonym: { inverse: "synonym", substitutesThroughSynonyms: true },
	nearSynonym: {
		inverse: "nearSynonym",
		substitutesThroughSynonyms: false,
	},
	antonym: { inverse: "antonym", substitutesThroughSynonyms: true },
	nearAntonym: {
		inverse: "nearAntonym",
		substitutesThroughSynonyms: false,
	},
	hypernym: { inverse: "hyponym", substitutesThroughSynonyms: true },
	hyponym: { inverse: "hypernym", substitutesThroughSynonyms: true },
	meronym: { inverse: "holonym", substitutesThroughSynonyms: true },
	holonym: { inverse: "meronym", substitutesThroughSynonyms: true },
} as const satisfies Record<
	SemanticRelation,
	{
		inverse: SemanticRelation;
		substitutesThroughSynonyms: boolean;
	}
>;

const relationOrder = new Map(
	semanticRelationValues.map((relation, index) => [relation, index]),
);

export function inverseRelationFor(
	relation: SemanticRelation,
): SemanticRelation {
	return relationAlgebra[relation].inverse;
}

/**
 * Derives one-level inverses plus exact-Synonym closure and substitution.
 *
 * The Reading inventory is intentionally caller-supplied: Dumrel understands
 * only the pure graph algebra, while a dictionary-owning caller decides which
 * Readings currently belong to each Lemma. Inferred edges are read views only.
 */
export function propagateRelations(
	graph: SemanticRelationGraph,
): SemanticRelationGraphEdge[] {
	const parsed = parseSemanticRelationGraph(graph);
	const readingLemma = new Map(
		parsed.readings.map(({ reading, lemma }) => [reading, lemma]),
	);
	const relationTargetKind = new Map(
		parsed.readings.map(({ reading, relationTargetKind }) => [
			reading,
			relationTargetKind ?? "lemma",
		]),
	);
	const readingsByLemma = groupReadingsByLemma(parsed.readings);
	const direct = deduplicate(parsed.edges);
	const directKeys = new Set(direct.map(edgeKey));
	const base = new Map<string, SemanticRelationGraphEdge>(
		direct.map((edge) => [edgeKey(edge), edge]),
	);

	// Every kind has exactly one inverse. This is intentionally one level: an
	// inverse inferred here is not fed back into recursive inference.
	for (const edge of direct) {
		const sourceLemma = readingLemma.get(edge.sourceReading);
		if (sourceLemma === undefined) continue;
		for (const targetReading of targetReadingsFor(edge, readingsByLemma)) {
			const inverse = encodeTargetForSource(
				targetReading,
				inverseRelationFor(edge.relation),
				edge.sourceReading,
				readingLemma,
				relationTargetKind,
			);
			if (inverse) addEdge(base, inverse);
		}
	}

	const baseEdges = [...base.values()];
	const synonymComponents = buildSynonymComponents(
		parsed.readings,
		baseEdges,
		readingsByLemma,
	);
	const closure = new Map(base);

	for (const edge of baseEdges) {
		if (!relationAlgebra[edge.relation].substitutesThroughSynonyms) {
			continue;
		}
		const sourceReadings =
			synonymComponents.get(edge.sourceReading) ??
			new Set([edge.sourceReading]);
		const directTargetReadings = targetReadingsFor(edge, readingsByLemma);
		for (const sourceReading of sourceReadings) {
			if (
				directTargetReadings.length === 0 &&
				edge.targetKind !== "reading"
			) {
				if (relationTargetKind.get(sourceReading) !== "reading") {
					addEdge(closure, {
						sourceReading,
						relation: edge.relation,
						targetLemma: edge.targetLemma,
					});
				}
				continue;
			}
			for (const directTargetReading of directTargetReadings) {
				for (const targetReading of synonymComponents.get(
					directTargetReading,
				) ?? [directTargetReading]) {
					const inferred = encodeTargetForSource(
						sourceReading,
						edge.relation,
						targetReading,
						readingLemma,
						relationTargetKind,
					);
					if (inferred) addEdge(closure, inferred);
				}
			}
		}
	}

	return [...closure.values()]
		.filter(
			(edge) =>
				!isSelfEdge(edge, readingLemma) &&
				!directKeys.has(edgeKey(edge)),
		)
		.sort(compareEdges);
}

/**
 * Projects direct claims together with every deterministic inferred view.
 * Direct claims win provenance when an inference reaches the same edge.
 */
export function projectRelations(
	graph: SemanticRelationGraph,
): SemanticRelationGraphProjection[] {
	const parsed = parseSemanticRelationGraph(graph);
	const projections = new Map<string, SemanticRelationGraphProjection>();
	for (const edge of deduplicate(parsed.edges).sort(compareEdges)) {
		projections.set(edgeKey(edge), { ...edge, provenance: "direct" });
	}
	for (const edge of propagateRelations(parsed)) {
		if (!projections.has(edgeKey(edge))) {
			projections.set(edgeKey(edge), { ...edge, provenance: "inferred" });
		}
	}
	return [...projections.values()].sort(compareEdges);
}

function groupReadingsByLemma(
	readings: readonly SemanticRelationGraphReading[],
): Map<string, string[]> {
	const result = new Map<string, string[]>();
	for (const { reading, lemma } of readings) {
		const members = result.get(lemma);
		if (members === undefined) result.set(lemma, [reading]);
		else members.push(reading);
	}
	return result;
}

function buildSynonymComponents(
	readings: readonly SemanticRelationGraphReading[],
	edges: readonly SemanticRelationGraphEdge[],
	readingsByLemma: ReadonlyMap<string, readonly string[]>,
): Map<string, ReadonlySet<string>> {
	const neighbors = new Map<string, Set<string>>(
		readings.map(({ reading }) => [reading, new Set([reading])]),
	);
	for (const edge of edges) {
		if (edge.relation !== "synonym") continue;
		for (const targetReading of targetReadingsFor(edge, readingsByLemma)) {
			neighbors.get(edge.sourceReading)?.add(targetReading);
			neighbors.get(targetReading)?.add(edge.sourceReading);
		}
	}

	const components = new Map<string, ReadonlySet<string>>();
	const visited = new Set<string>();
	for (const { reading } of readings) {
		if (visited.has(reading)) continue;
		const members = new Set<string>();
		const pending = [reading];
		while (pending.length > 0) {
			const member = pending.pop();
			if (member === undefined || visited.has(member)) continue;
			visited.add(member);
			members.add(member);
			for (const neighbor of neighbors.get(member) ?? []) {
				if (!visited.has(neighbor)) pending.push(neighbor);
			}
		}
		for (const member of members) components.set(member, members);
	}
	return components;
}

function targetReadingsFor(
	edge: SemanticRelationGraphEdge,
	readingsByLemma: ReadonlyMap<string, readonly string[]>,
): readonly string[] {
	return edge.targetKind === "reading"
		? [edge.targetReading]
		: (readingsByLemma.get(edge.targetLemma) ?? []);
}

function encodeTargetForSource(
	sourceReading: string,
	relation: SemanticRelation,
	targetReading: string,
	readingLemma: ReadonlyMap<string, string>,
	relationTargetKind: ReadonlyMap<string, "lemma" | "reading">,
): SemanticRelationGraphEdge | undefined {
	if (relationTargetKind.get(sourceReading) === "reading") {
		return {
			sourceReading,
			relation,
			targetKind: "reading",
			targetReading,
		};
	}
	const targetLemma = readingLemma.get(targetReading);
	return targetLemma === undefined
		? undefined
		: { sourceReading, relation, targetLemma };
}

function isSelfEdge(
	edge: SemanticRelationGraphEdge,
	readingLemma: ReadonlyMap<string, string>,
): boolean {
	return edge.targetKind === "reading"
		? edge.sourceReading === edge.targetReading
		: readingLemma.get(edge.sourceReading) === edge.targetLemma;
}

function deduplicate(
	edges: readonly SemanticRelationGraphEdge[],
): SemanticRelationGraphEdge[] {
	return [...new Map(edges.map((edge) => [edgeKey(edge), edge])).values()];
}

function addEdge(
	edges: Map<string, SemanticRelationGraphEdge>,
	edge: SemanticRelationGraphEdge,
): boolean {
	const key = edgeKey(edge);
	if (edges.has(key)) return false;
	edges.set(key, edge);
	return true;
}

function edgeKey(edge: SemanticRelationGraphEdge): string {
	return edge.targetKind === "reading"
		? JSON.stringify([
				edge.sourceReading,
				edge.relation,
				"reading",
				edge.targetReading,
			])
		: JSON.stringify([
				edge.sourceReading,
				edge.relation,
				"lemma",
				edge.targetLemma,
			]);
}

function compareEdges(
	left: SemanticRelationGraphEdge,
	right: SemanticRelationGraphEdge,
): number {
	return (
		compareStrings(left.sourceReading, right.sourceReading) ||
		(relationOrder.get(left.relation) ?? 0) -
			(relationOrder.get(right.relation) ?? 0) ||
		compareStrings(targetKindFor(left), targetKindFor(right)) ||
		compareStrings(targetKeyFor(left), targetKeyFor(right))
	);
}

function targetKindFor(edge: SemanticRelationGraphEdge): "lemma" | "reading" {
	return edge.targetKind ?? "lemma";
}

function targetKeyFor(edge: SemanticRelationGraphEdge): string {
	return edge.targetKind === "reading"
		? edge.targetReading
		: edge.targetLemma;
}

function compareStrings(left: string, right: string): number {
	return left < right ? -1 : left > right ? 1 : 0;
}
