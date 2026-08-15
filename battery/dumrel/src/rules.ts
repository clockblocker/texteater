import { semanticRelationGraphEdgeSchema } from "./schema.js";
import type { SemanticRelation, SemanticRelationGraphEdge } from "./types.js";
import { semanticRelationValues } from "./vocabulary.js";

const inverseRelations = {
	synonym: "synonym",
	nearSynonym: "nearSynonym",
	antonym: "antonym",
	hypernym: "hyponym",
	hyponym: "hypernym",
	meronym: "holonym",
	holonym: "meronym",
} as const satisfies Record<SemanticRelation, SemanticRelation>;

const symmetricRelations = new Set<SemanticRelation>([
	"synonym",
	"nearSynonym",
	"antonym",
]);

const transitiveRelations = new Set<SemanticRelation>([
	"synonym",
	"hypernym",
	"hyponym",
]);

const relationOrder = new Map(
	semanticRelationValues.map((relation, index) => [relation, index]),
);

export function inverseRelationFor(
	relation: SemanticRelation,
): SemanticRelation {
	return inverseRelations[relation];
}

export function propagateRelations(
	graph: readonly SemanticRelationGraphEdge[],
): SemanticRelationGraphEdge[] {
	const direct = deduplicate(
		graph.map((edge) => semanticRelationGraphEdgeSchema.parse(edge)),
	);
	const directKeys = new Set(direct.map(edgeKey));
	const closure = new Map(direct.map((edge) => [edgeKey(edge), edge]));
	const nodes = new Set(direct.flatMap((edge) => [edge.source, edge.target]));

	let changed = true;
	while (changed) {
		changed = false;
		const edges = [...closure.values()];
		const synonymComponents = buildSynonymComponents(nodes, edges);

		for (const edge of edges) {
			const sources = synonymComponents.get(edge.source) ?? [edge.source];
			const targets = synonymComponents.get(edge.target) ?? [edge.target];
			for (const source of sources) {
				for (const target of targets) {
					changed =
						addEdge(closure, {
							source,
							relation: edge.relation,
							target,
						}) || changed;
				}
			}
			if (symmetricRelations.has(edge.relation)) {
				changed =
					addEdge(closure, {
						source: edge.target,
						relation: edge.relation,
						target: edge.source,
					}) || changed;
			}
		}

		const current = [...closure.values()];
		for (const left of current) {
			if (!transitiveRelations.has(left.relation)) continue;
			for (const right of current) {
				if (
					left.relation !== right.relation ||
					left.target !== right.source
				) {
					continue;
				}
				changed =
					addEdge(closure, {
						source: left.source,
						relation: left.relation,
						target: right.target,
					}) || changed;
			}
		}
	}

	return [...closure.values()]
		.filter(
			(edge) =>
				edge.source !== edge.target && !directKeys.has(edgeKey(edge)),
		)
		.sort(compareEdges);
}

function buildSynonymComponents(
	nodes: ReadonlySet<string>,
	edges: readonly SemanticRelationGraphEdge[],
): Map<string, string[]> {
	const neighbors = new Map<string, Set<string>>(
		[...nodes].map((node) => [node, new Set([node])]),
	);
	for (const edge of edges) {
		if (edge.relation !== "synonym") continue;
		neighbors.get(edge.source)?.add(edge.target);
		neighbors.get(edge.target)?.add(edge.source);
	}

	const components = new Map<string, string[]>();
	const visited = new Set<string>();
	for (const node of nodes) {
		if (visited.has(node)) continue;
		const members: string[] = [];
		const pending = [node];
		while (pending.length > 0) {
			const member = pending.pop();
			if (member === undefined || visited.has(member)) continue;
			visited.add(member);
			members.push(member);
			for (const neighbor of neighbors.get(member) ?? []) {
				if (!visited.has(neighbor)) pending.push(neighbor);
			}
		}
		for (const member of members) components.set(member, members);
	}
	return components;
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
	return JSON.stringify([edge.source, edge.relation, edge.target]);
}

function compareEdges(
	left: SemanticRelationGraphEdge,
	right: SemanticRelationGraphEdge,
): number {
	return (
		compareStrings(left.source, right.source) ||
		(relationOrder.get(left.relation) ?? 0) -
			(relationOrder.get(right.relation) ?? 0) ||
		compareStrings(left.target, right.target)
	);
}

function compareStrings(left: string, right: string): number {
	return left < right ? -1 : left > right ? 1 : 0;
}
