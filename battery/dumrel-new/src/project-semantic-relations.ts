import { ParsingError } from "common-utils";
import type * as Dumling from "dumling/types";
import { conflict, contextualizeKnowledge } from "./context.js";
import type {
	ReadingWithKnowledge,
	SemanticRelation,
	SemanticRelationProjection,
} from "./types.js";
import { parseProjectionShape } from "./validation.js";
import { directSemanticRelationValues } from "./vocabulary.js";

const algebra = {
	synonym: "synonym",
	nearSynonym: "nearSynonym",
	antonym: "antonym",
	nearAntonym: "nearAntonym",
	hypernym: "hyponym",
	hyponym: "hypernym",
	meronym: "holonym",
	holonym: "meronym",
} as const satisfies Record<SemanticRelation, SemanticRelation>;
const relationOrder = Object.keys(algebra);

// Structural indexing is private to this projection, not a persistent ID codec.
function key(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(key).join(",")}]`;
	if (value !== null && typeof value === "object")
		return `{${Object.entries(value)
			.filter(([, member]) => member !== undefined)
			.sort(([left], [right]) => compare(left, right))
			.map(([name, member]) => `${JSON.stringify(name)}:${key(member)}`)
			.join(",")}}`;
	return JSON.stringify(value);
}

function compare(left: string, right: string): number {
	return left < right ? -1 : left > right ? 1 : 0;
}

/**
 * Projects direct claims, one-level inverses, and exact-Synonym closure and
 * substitution over a finite dictionary inventory. Near relations get inverses
 * but do not substitute through synonyms. Inputs are normalized with Dumling
 * and Dumrel validation, then compared structurally (object key order is ignored).
 *
 * Duplicate source Readings, missing exact targets, and invalid Knowledge reject
 * the entire projection with ParsingError. An empty-Knowledge pair declares a
 * target Reading. Each source's Knowledge selects its inferred target mode,
 * defaulting to Lemma. Direct self claims survive; inferred self edges do not.
 * Direct claims win provenance. Output is sorted by structural source key,
 * relation order (synonym, nearSynonym, antonym, nearAntonym, hypernym, hyponym,
 * meronym, holonym), then structural target key, independently of input order.
 * No inputs are mutated and no extra Readings are invented.
 *
 * @remarks
 * Lemma targets temporarily allow every supplied Reading of that Lemma to
 * participate, including unrelated Readings. A Lemma without supplied Readings
 * remains a target but produces no inverse source. Exact targets do not themselves expand to other
 * Readings; inverses encoded in Lemma mode retain Lemma participation. Separate LLM disambiguation will replace
 * interim Lemma targeting; projection performs no model calls or persistence.
 * @see {@link https://github.com/clockblocker/texteater/issues/176 | Smart Shadow Pickup}
 */
export function projectSemanticRelations(
	entries: readonly ReadingWithKnowledge[],
):
	| { success: true; value: readonly SemanticRelationProjection[] }
	| { success: false; error: ParsingError } {
	const parsed = parseProjectionShape(entries);
	if (parsed instanceof ParsingError)
		return { success: false, error: parsed };
	const inventory = new Map<string, ReadingWithKnowledge>();
	const byLemma = new Map<string, Dumling.Reading[]>();
	for (const [index, entry] of parsed.entries()) {
		const identity = key(entry.reading);
		if (inventory.has(identity))
			return {
				success: false,
				error: conflict([index, "reading"], "Duplicate source Reading"),
			};
		const knowledge = contextualizeKnowledge(
			entry.reading,
			entry.knowledge,
		);
		if (knowledge instanceof ParsingError)
			return {
				success: false,
				error: new ParsingError(
					knowledge.issues.map((issue) => ({
						...issue,
						path: [index, ...issue.path],
					})),
				),
			};
		inventory.set(identity, { reading: entry.reading, knowledge });
		const lemma = key(entry.reading.lemma);
		byLemma.set(lemma, [...(byLemma.get(lemma) ?? []), entry.reading]);
	}
	const edges = new Map<string, SemanticRelationProjection>();
	const edgeKey = (edge: SemanticRelationProjection) =>
		JSON.stringify([key(edge.source), edge.relation, key(edge.target)]);
	function isSelf(edge: SemanticRelationProjection) {
		return edge.target.unitKind === "Reading"
			? key(edge.source) === key(edge.target)
			: key(edge.source.lemma) === key(edge.target);
	}
	function add(edge: SemanticRelationProjection) {
		const identity = edgeKey(edge);
		if (!edges.has(identity)) edges.set(identity, edge);
	}
	for (const [index, { reading, knowledge }] of parsed.entries()) {
		const relations = knowledge.semanticRelations;
		if (!relations) continue;
		for (const relation of directSemanticRelationValues) {
			const targets =
				relations.targetKind === "reading"
					? relation === "synonym"
						? relations.synonym
						: undefined
					: relations[relation];
			for (const [targetIndex, target] of (targets ?? []).entries()) {
				if (
					target.unitKind === "Reading" &&
					!inventory.has(key(target))
				)
					return {
						success: false,
						error: conflict(
							[
								index,
								"knowledge",
								"semanticRelations",
								relation,
								targetIndex,
							],
							"Exact target Reading must be supplied in the inventory",
						),
					};
				add({
					source: reading,
					relation,
					target,
					provenance: "direct",
				});
			}
		}
	}
	function targetsFor(target: Dumling.Lemma | Dumling.Reading) {
		return target.unitKind === "Reading"
			? [target]
			: (byLemma.get(key(target)) ?? []);
	}
	function infer(
		source: Dumling.Reading,
		relation: SemanticRelation,
		target: Dumling.Reading,
	) {
		add({
			source,
			relation,
			target:
				inventory.get(key(source))?.knowledge.semanticRelations
					?.targetKind === "reading"
					? target
					: target.lemma,
			provenance: "inferred",
		});
	}
	for (const edge of [...edges.values()])
		for (const target of targetsFor(edge.target))
			infer(target, algebra[edge.relation], edge.source);
	const base = [...edges.values()];
	const neighbors = new Map<string, Set<string>>(
		[...inventory.keys()].map((identity) => [
			identity,
			new Set([identity]),
		]),
	);
	for (const edge of base) {
		if (edge.relation !== "synonym") continue;
		for (const target of targetsFor(edge.target)) {
			neighbors.get(key(edge.source))?.add(key(target));
			neighbors.get(key(target))?.add(key(edge.source));
		}
	}
	const components = new Map<string, Dumling.Reading[]>();
	for (const identity of inventory.keys()) {
		if (components.has(identity)) continue;
		const members = new Set<string>();
		const pending = [identity];
		while (pending.length) {
			const member = pending.pop();
			if (member === undefined || members.has(member)) continue;
			members.add(member);
			pending.push(...(neighbors.get(member) ?? []));
		}
		const readings = [...members].map((member) => {
			const entry = inventory.get(member);
			if (!entry)
				throw new Error(
					"Projection index contains an undeclared Reading",
				);
			return entry.reading;
		});
		for (const member of members) components.set(member, readings);
	}
	for (const edge of base) {
		if (edge.relation === "nearSynonym" || edge.relation === "nearAntonym")
			continue;
		const targets = targetsFor(edge.target);
		for (const source of components.get(key(edge.source)) ?? []) {
			if (
				targets.length === 0 &&
				edge.target.unitKind === "Lemma" &&
				inventory.get(key(source))?.knowledge.semanticRelations
					?.targetKind !== "reading"
			)
				add({ ...edge, source, provenance: "inferred" });
			for (const target of targets)
				for (const member of components.get(key(target)) ?? [])
					infer(source, edge.relation, member);
		}
	}
	return {
		success: true,
		value: [...edges.values()]
			.filter((edge) => edge.provenance === "direct" || !isSelf(edge))
			.sort(
				(left, right) =>
					compare(key(left.source), key(right.source)) ||
					relationOrder.indexOf(left.relation) -
						relationOrder.indexOf(right.relation) ||
					compare(key(left.target), key(right.target)),
			),
	};
}
