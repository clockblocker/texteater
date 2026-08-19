import { semanticRelationGraphSchema } from "./schema.js";
import type {
	SemanticRelation,
	SemanticRelationGraph,
	SemanticRelationGraphEdge,
	SemanticRelationGraphReading,
} from "./types.js";
import { semanticRelationValues } from "./vocabulary.js";

const relationAlgebra = {
	synonym: { inverse: "synonym", substitutesThroughSynonyms: true },
	nearSynonym: {
		inverse: "nearSynonym",
		substitutesThroughSynonyms: true,
	},
	antonym: { inverse: "antonym", substitutesThroughSynonyms: true },
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
 * Readings currently belong to each Lemma and whether inferred edges are
 * materialized.
 */
export function propagateRelations(
	graph: SemanticRelationGraph,
): SemanticRelationGraphEdge[] {
	const parsed = semanticRelationGraphSchema.parse(graph);
	const readingLemma = new Map(
		parsed.readings.map(({ reading, lemma }) => [reading, lemma]),
	);
	const readingsByLemma = groupReadingsByLemma(parsed.readings);
	const direct = deduplicate(parsed.edges);
	const directKeys = new Set(direct.map(edgeKey));
	const base = new Map(direct.map((edge) => [edgeKey(edge), edge]));

	// Every kind has exactly one inverse. This is intentionally one level: an
	// inverse inferred here is not fed back into inverse materialization.
	for (const edge of direct) {
		const sourceLemma = readingLemma.get(edge.sourceReading);
		if (sourceLemma === undefined) continue;
		for (const targetReading of readingsByLemma.get(edge.targetLemma) ??
			[]) {
			addEdge(base, {
				sourceReading: targetReading,
				relation: inverseRelationFor(edge.relation),
				targetLemma: sourceLemma,
			});
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
		const targetLemmas = equivalentTargetLemmas(
			edge.targetLemma,
			readingsByLemma,
			synonymComponents,
			readingLemma,
		);
		for (const sourceReading of sourceReadings) {
			for (const targetLemma of targetLemmas) {
				addEdge(closure, {
					sourceReading,
					relation: edge.relation,
					targetLemma,
				});
			}
		}
	}

	return [...closure.values()]
		.filter(
			(edge) =>
				readingLemma.get(edge.sourceReading) !== edge.targetLemma &&
				!directKeys.has(edgeKey(edge)),
		)
		.sort(compareEdges);
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
		for (const targetReading of readingsByLemma.get(edge.targetLemma) ??
			[]) {
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

function equivalentTargetLemmas(
	targetLemma: string,
	readingsByLemma: ReadonlyMap<string, readonly string[]>,
	synonymComponents: ReadonlyMap<string, ReadonlySet<string>>,
	readingLemma: ReadonlyMap<string, string>,
): Set<string> {
	const result = new Set([targetLemma]);
	for (const targetReading of readingsByLemma.get(targetLemma) ?? []) {
		for (const equivalentReading of synonymComponents.get(
			targetReading,
		) ?? [targetReading]) {
			const lemma = readingLemma.get(equivalentReading);
			if (lemma !== undefined) result.add(lemma);
		}
	}
	return result;
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
	return JSON.stringify([
		edge.sourceReading,
		edge.relation,
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
		compareStrings(left.targetLemma, right.targetLemma)
	);
}

function compareStrings(left: string, right: string): number {
	return left < right ? -1 : left > right ? 1 : 0;
}
