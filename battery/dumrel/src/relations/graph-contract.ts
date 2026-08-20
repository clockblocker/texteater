import type {
	DirectSemanticRelation,
	DirectSemanticRelationGraphEdge,
	SemanticRelationGraph,
	SemanticRelationGraphReading,
} from "../types.js";
import { directSemanticRelationValues } from "../vocabulary.js";

const directSemanticRelations = new Set<string>(directSemanticRelationValues);

function fail(path: string, message: string): never {
	throw new Error(path.length === 0 ? message : `${path}: ${message}`);
}

function strictRecord(
	value: unknown,
	keys: readonly string[],
	path: string,
): Record<string, unknown> {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		return fail(path, "Expected an object.");
	}
	const record = value as Record<string, unknown>;
	for (const key of Object.keys(record)) {
		if (!keys.includes(key)) fail(`${path}.${key}`, "Unknown key.");
	}
	return record;
}

function normalizedNonEmptyString(value: unknown, path: string): string {
	if (typeof value !== "string") return fail(path, "Expected a string.");
	const normalized = value.trim().normalize("NFC");
	if (normalized.length === 0)
		return fail(path, "Expected a non-empty string.");
	return normalized;
}

function parseReading(
	value: unknown,
	index: number,
): SemanticRelationGraphReading {
	const path = `readings.${index}`;
	const record = strictRecord(value, ["reading", "lemma"], path);
	return {
		reading: normalizedNonEmptyString(record.reading, `${path}.reading`),
		lemma: normalizedNonEmptyString(record.lemma, `${path}.lemma`),
	};
}

function parseEdge(
	value: unknown,
	index: number,
): DirectSemanticRelationGraphEdge {
	const path = `edges.${index}`;
	const record = strictRecord(
		value,
		["sourceReading", "relation", "targetLemma"],
		path,
	);
	const relation = record.relation;
	if (
		typeof relation !== "string" ||
		!directSemanticRelations.has(relation)
	) {
		return fail(`${path}.relation`, "Expected a direct Semantic Relation.");
	}
	return {
		sourceReading: normalizedNonEmptyString(
			record.sourceReading,
			`${path}.sourceReading`,
		),
		relation: relation as DirectSemanticRelation,
		targetLemma: normalizedNonEmptyString(
			record.targetLemma,
			`${path}.targetLemma`,
		),
	};
}

/**
 * Validates and normalizes the small graph contract used by relation algebra.
 * This deliberately has no dependency on Dumling or the broad Dumrel schemas.
 */
export function parseSemanticRelationGraph(
	input: unknown,
): SemanticRelationGraph {
	const graph = strictRecord(input, ["readings", "edges"], "");
	if (!Array.isArray(graph.readings)) fail("readings", "Expected an array.");
	if (!Array.isArray(graph.edges)) fail("edges", "Expected an array.");

	const readings = graph.readings.map(parseReading);
	const edges = graph.edges.map(parseEdge);
	const readingOwners = new Map<string, string>();
	for (const [index, node] of readings.entries()) {
		const existing = readingOwners.get(node.reading);
		if (existing !== undefined) {
			fail(
				`readings.${index}.reading`,
				existing === node.lemma
					? "Relation graph Reading identities must be unique."
					: "A relation graph Reading cannot belong to two Lemmas.",
			);
		}
		readingOwners.set(node.reading, node.lemma);
	}
	for (const [index, edge] of edges.entries()) {
		if (!readingOwners.has(edge.sourceReading)) {
			fail(
				`edges.${index}.sourceReading`,
				"A relation edge source must be a declared Reading.",
			);
		}
	}
	return { readings, edges };
}
