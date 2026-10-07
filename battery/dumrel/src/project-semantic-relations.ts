import { ParsingError } from "common-utils/validation";
import { parseUnit } from "dumling";
import type * as Dumling from "dumling/types";
import { issue } from "./context.js";
import { compare, structuralKeys } from "./fingerprint.js";
import type { SemanticRelationProjection } from "./generated/types.js";
import { parseProjectionInventory } from "./projection-inventory.js";
import type { ReadingWithKnowledge, SemanticRelation } from "./types.js";
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
	endonym: "exonym",
	exonym: "endonym",
} as const satisfies Record<SemanticRelation, SemanticRelation>;
const relationOrder = Object.keys(algebra);

type ReadingCount = {
	readonly lemma: Dumling.Lemma;
	readonly readingCount: number;
};

/** Caller-given Reading counts keyed by normalized Lemma. */
function parseReadingCounts(
	counts: readonly ReadingCount[],
	supplied: (lemma: Dumling.Lemma) => number,
	key: (value: unknown) => string,
): Map<string, number> | ParsingError {
	const byLemma = new Map<string, number>();
	for (const [index, { lemma, readingCount }] of counts.entries()) {
		const path = ["readingCounts", index];
		const parsed = parseUnit(lemma);
		if (!parsed.success)
			return new ParsingError(
				parsed.error.issues.map((entry) => ({
					...entry,
					path: [...path, "lemma", ...entry.path],
				})),
			);
		if (parsed.chain.unitKind !== "Lemma")
			return issue([...path, "lemma", "unitKind"], "Expected a Lemma");
		const normalized = parsed.chain.value as Dumling.Lemma;
		const identity = key(normalized);
		if (byLemma.has(identity))
			return issue([...path, "lemma"], "Duplicate Lemma Reading count");
		if (
			!Number.isInteger(readingCount) ||
			readingCount < supplied(normalized)
		)
			return issue(
				[...path, "readingCount"],
				"Reading count must cover the Lemma's supplied Readings",
			);
		byLemma.set(identity, readingCount);
	}
	return byLemma;
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
 * meronym, holonym, endonym, exonym), then structural target key, independently
 * of input order.
 * No inputs are mutated and no extra Readings are invented.
 *
 * With `options.source`, only that Reading's edges are projected: the same
 * edges the whole projection holds for it, without inferring every other
 * source's. The source must be supplied in the inventory.
 *
 * Closure (inverses, synonym components and substitution) follows only links
 * that reach exactly one Reading: an exact target, or a Lemma target whose
 * Lemma has exactly one Reading (ADR 0011). A Lemma target on a homonymous
 * Lemma stays a direct edge and infers nothing. A Lemma counts its supplied
 * Readings unless `options.readingCounts` gives its dictionary-wide count, so a
 * caller holding only part of a Lemma's Readings must supply that count.
 *
 * @remarks
 * Exact targets do not expand to other Readings; inverses encoded in Lemma mode
 * close only over single-Reading Lemmas. Separate LLM disambiguation will
 * resolve Lemma targets to Readings and widen closure; projection performs no
 * model calls or persistence.
 * @see {@link https://github.com/clockblocker/texteater/issues/176 | Smart Shadow Pickup}
 */
export function projectSemanticRelations(
	entries: readonly ReadingWithKnowledge[],
	options: {
		readonly source?: Dumling.Reading;
		readonly readingCounts?: readonly ReadingCount[];
	} = {},
):
	| { success: true; value: readonly SemanticRelationProjection[] }
	| { success: false; error: ParsingError } {
	const key = structuralKeys();
	const parsed = parseProjectionInventory(entries, key);
	if (parsed instanceof ParsingError)
		return { success: false, error: parsed };
	const { inventory, byLemma } = parsed;
	const parsedCounts = parseReadingCounts(
		options.readingCounts ?? [],
		(lemma) => byLemma.get(key(lemma))?.length ?? 0,
		key,
	);
	if (parsedCounts instanceof ParsingError)
		return { success: false, error: parsedCounts };
	const readingCounts = parsedCounts;
	/** Whether closure may follow a link: it reaches exactly one Reading. */
	function closes(target: Dumling.Lemma | Dumling.Reading) {
		if (target.unitKind === "Reading") return true;
		const lemma = key(target);
		return (readingCounts.get(lemma) ?? byLemma.get(lemma)?.length) === 1;
	}
	/** The requested source's structural key, once it is in the inventory. */
	function parseSource(source: Dumling.Reading): string | ParsingError {
		const normalized = parseProjectionShape([
			{ reading: source, knowledge: {} },
		]);
		if (normalized instanceof ParsingError)
			return new ParsingError(
				normalized.issues.map((entry) => ({
					...entry,
					path: ["source", ...entry.path.slice(2)],
				})),
			);
		const reading = normalized[0]?.reading;
		const identity = reading ? key(reading) : undefined;
		return identity !== undefined && inventory.has(identity)
			? identity
			: issue(
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
	for (const [index, { reading, knowledge }] of [
		...inventory.values(),
	].entries()) {
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
						error: issue(
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
	/** The supplied Readings a link reaches, if closure may follow it. */
	function targetsFor(target: Dumling.Lemma | Dumling.Reading) {
		if (!closes(target)) return [];
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
		if (
			edge.relation === "nearSynonym" ||
			edge.relation === "nearAntonym" ||
			!closes(edge.target)
		)
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
