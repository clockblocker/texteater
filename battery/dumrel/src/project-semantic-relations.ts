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

/**
 * Structural indexing private to one projection, not a persistent ID codec.
 * Keys are cached by object identity, which holds because a projection never
 * mutates the values it indexes.
 */
function structuralKeys() {
	const cache = new WeakMap<object, string>();
	function key(value: unknown): string {
		if (value === null || typeof value !== "object")
			return JSON.stringify(value);
		const known = cache.get(value);
		if (known !== undefined) return known;
		const computed = Array.isArray(value)
			? `[${value.map(key).join(",")}]`
			: `{${Object.entries(value)
					.filter(([, member]) => member !== undefined)
					.sort(([left], [right]) => compare(left, right))
					.map(
						([name, member]) =>
							`${JSON.stringify(name)}:${key(member)}`,
					)
					.join(",")}}`;
		cache.set(value, computed);
		return computed;
	}
	return key;
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
 * With `options.source`, only that Reading's edges are projected: the same
 * edges the whole projection holds for it, without inferring every other
 * source's. The source must be supplied in the inventory.
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
	options: { readonly source?: Dumling.Reading } = {},
):
	| { success: true; value: readonly SemanticRelationProjection[] }
	| { success: false; error: ParsingError } {
	const key = structuralKeys();
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
	/** The requested source's structural key, once it is in the inventory. */
	function parseSource(source: Dumling.Reading): string | ParsingError {
		const normalized = parseProjectionShape([
			{ reading: source, knowledge: {} },
		]);
		if (normalized instanceof ParsingError)
			return new ParsingError(
				normalized.issues.map((issue) => ({
					...issue,
					path: ["source", ...issue.path.slice(2)],
				})),
			);
		const reading = normalized[0]?.reading;
		const identity = reading ? key(reading) : undefined;
		return identity !== undefined && inventory.has(identity)
			? identity
			: conflict(
					["source"],
					"Projection source must be supplied in the inventory",
				);
	}
	const requested = options.source ? parseSource(options.source) : undefined;
	if (requested instanceof ParsingError)
		return { success: false, error: requested };
	const only: string | undefined = requested;
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
	function targetsReadings(source: Dumling.Reading) {
		return (
			inventory.get(key(source))?.knowledge.semanticRelations
				?.targetKind === "reading"
		);
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
			target: targetsReadings(source) ? target : target.lemma,
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
	/** The substitution sources of an edge: its synonym component, or just the requested source. */
	function sourcesFor(edge: SemanticRelationProjection) {
		const component = components.get(key(edge.source)) ?? [];
		if (only === undefined) return component;
		const source = inventory.get(only)?.reading;
		return source && components.get(only) === component ? [source] : [];
	}
	for (const edge of base) {
		if (edge.relation === "nearSynonym" || edge.relation === "nearAntonym")
			continue;
		const targets = targetsFor(edge.target);
		for (const source of sourcesFor(edge)) {
			const readingMode = targetsReadings(source);
			if (
				targets.length === 0 &&
				edge.target.unitKind === "Lemma" &&
				!readingMode
			)
				add({ ...edge, source, provenance: "inferred" });
			// Members of one component, or Readings of one Lemma in Lemma
			// mode, infer the same edge; each is inferred once.
			const seenComponents = new Set<Dumling.Reading[]>();
			const seenLemmas = new Set<string>();
			for (const target of targets) {
				const component = components.get(key(target)) ?? [];
				if (seenComponents.has(component)) continue;
				seenComponents.add(component);
				for (const member of component) {
					if (!readingMode) {
						const lemma = key(member.lemma);
						if (seenLemmas.has(lemma)) continue;
						seenLemmas.add(lemma);
					}
					infer(source, edge.relation, member);
				}
			}
		}
	}
	return {
		success: true,
		value: [...edges.values()]
			.filter(
				(edge) =>
					(only === undefined || key(edge.source) === only) &&
					(edge.provenance === "direct" || !isSelf(edge)),
			)
			.sort(
				(left, right) =>
					compare(key(left.source), key(right.source)) ||
					relationOrder.indexOf(left.relation) -
						relationOrder.indexOf(right.relation) ||
					compare(key(left.target), key(right.target)),
			),
	};
}
