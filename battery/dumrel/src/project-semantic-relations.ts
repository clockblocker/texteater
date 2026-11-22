import { ParsingError } from "common-utils/validation";
import { parseUnit } from "dumling";
import type * as Dumling from "dumling/types";
import { compare, structuralKeys } from "./fingerprint.js";
import type { SemanticRelationProjection } from "./generated/types.js";
import { issue, prefixIssues } from "./issue.js";
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

const relationRank: Readonly<Record<SemanticRelation, number>> = {
	synonym: 0,
	nearSynonym: 1,
	antonym: 2,
	nearAntonym: 3,
	hypernym: 4,
	hyponym: 5,
	meronym: 6,
	holonym: 7,
	endonym: 8,
	exonym: 9,
};

type ReadingCount = {
	readonly lemma: Dumling.Lemma;
	readonly readingCount: number;
};

type StructuralKey = (value: unknown) => string;

type ProjectionContext = {
	readonly inventory: ReadonlyMap<string, ReadingWithKnowledge>;
	readonly byLemma: ReadonlyMap<string, readonly Dumling.Reading[]>;
	readonly readingCounts: ReadonlyMap<string, number>;
	readonly key: StructuralKey;
	readonly edges: Map<string, SemanticRelationProjection>;
	readonly add: (edge: SemanticRelationProjection) => void;
	readonly closes: (target: Dumling.Lemma | Dumling.Reading) => boolean;
	readonly targetsFor: (
		target: Dumling.Lemma | Dumling.Reading,
	) => readonly Dumling.Reading[];
	readonly targetsReadings: (source: Dumling.Reading) => boolean;
	readonly infer: (
		source: Dumling.Reading,
		relation: SemanticRelation,
		target: Dumling.Reading,
	) => void;
};

/** Caller-given Reading counts keyed by normalized Lemma. */
function parseReadingCounts(
	counts: readonly ReadingCount[],
	supplied: (lemma: Dumling.Lemma) => number,
	key: StructuralKey,
): Map<string, number> | ParsingError {
	const byLemma = new Map<string, number>();
	for (const [index, { lemma, readingCount }] of counts.entries()) {
		const path = ["readingCounts", index];
		const parsed = parseUnit(lemma);
		if (!parsed.success)
			return prefixIssues(parsed.error, [...path, "lemma"]);
		if (parsed.chain.unitKind !== "Lemma")
			return issue([...path, "lemma", "unitKind"], "Expected a Lemma");
		const normalized = parsed.chain.value;
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

/** The requested source's structural key, once it is in the inventory. */
function parseRequestedSource(
	source: Dumling.Reading,
	inventory: ReadonlyMap<string, ReadingWithKnowledge>,
	key: StructuralKey,
): string | ParsingError {
	const normalized = parseProjectionShape([
		{ reading: source, knowledge: {} },
	]);
	if (normalized instanceof ParsingError)
		return prefixIssues(normalized, ["source"], 2);
	const reading = normalized[0]?.reading;
	const identity = reading ? key(reading) : undefined;
	return identity !== undefined && inventory.has(identity)
		? identity
		: issue(
				["source"],
				"Projection source must be supplied in the inventory",
			);
}

function collectEntryDirectEdges(
	context: ProjectionContext,
	index: number,
	{ reading, knowledge }: ReadingWithKnowledge,
): ParsingError | undefined {
	const relations = knowledge.semanticRelations;
	if (!relations) return undefined;
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
				!context.inventory.has(context.key(target))
			)
				return issue(
					[
						index,
						"knowledge",
						"semanticRelations",
						relation,
						targetIndex,
					],
					"Exact target Reading must be supplied in the inventory",
				);
			context.add({
				source: reading,
				relation,
				target,
				provenance: "direct",
			});
		}
	}
	return undefined;
}

function collectDirectEdges(
	context: ProjectionContext,
): ParsingError | undefined {
	let index = 0;
	for (const entry of context.inventory.values()) {
		const failure = collectEntryDirectEdges(context, index, entry);
		if (failure) return failure;
		index += 1;
	}
	return undefined;
}

function buildSynonymComponents(
	context: ProjectionContext,
	base: readonly SemanticRelationProjection[],
): Map<string, Dumling.Reading[]> {
	const neighbors = new Map<string, Set<string>>(
		[...context.inventory.keys()].map((identity) => [
			identity,
			new Set([identity]),
		]),
	);
	for (const edge of base) {
		if (edge.relation !== "synonym") continue;
		const sourceKey = context.key(edge.source);
		for (const target of context.targetsFor(edge.target)) {
			const targetKey = context.key(target);
			neighbors.get(sourceKey)?.add(targetKey);
			neighbors.get(targetKey)?.add(sourceKey);
		}
	}
	const components = new Map<string, Dumling.Reading[]>();
	for (const identity of context.inventory.keys()) {
		if (components.has(identity)) continue;
		const members = new Set<string>();
		const pending = [identity];
		while (pending.length) {
			const member = pending.pop();
			if (member === undefined || members.has(member)) continue;
			members.add(member);
			for (const neighbor of neighbors.get(member) ?? [])
				pending.push(neighbor);
		}
		const readings = [...members].map((member) => {
			const entry = context.inventory.get(member);
			if (!entry)
				throw new Error(
					"Projection index contains an undeclared Reading",
				);
			return entry.reading;
		});
		for (const member of members) components.set(member, readings);
	}
	return components;
}

function substituteThroughSynonyms(
	context: ProjectionContext,
	base: readonly SemanticRelationProjection[],
	components: ReadonlyMap<string, Dumling.Reading[]>,
	only: string | undefined,
): void {
	const requestedSource =
		only === undefined ? undefined : context.inventory.get(only)?.reading;
	const requestedComponent =
		only === undefined ? undefined : components.get(only);
	for (const edge of base) {
		if (
			edge.relation === "nearSynonym" ||
			edge.relation === "nearAntonym" ||
			!context.closes(edge.target)
		)
			continue;
		const component = components.get(context.key(edge.source)) ?? [];
		const sources =
			only === undefined
				? component
				: requestedSource && requestedComponent === component
					? [requestedSource]
					: [];
		const targets = context.targetsFor(edge.target);
		for (const source of sources)
			inferSubstitutedTargets(context, edge, source, targets, components);
	}
}

function inferSubstitutedTargets(
	context: ProjectionContext,
	edge: SemanticRelationProjection,
	source: Dumling.Reading,
	targets: readonly Dumling.Reading[],
	components: ReadonlyMap<string, Dumling.Reading[]>,
): void {
	const readingMode = context.targetsReadings(source);
	if (
		targets.length === 0 &&
		edge.target.unitKind === "Lemma" &&
		!readingMode
	)
		context.add({ ...edge, source, provenance: "inferred" });
	// Members of one component, or Readings of one Lemma in Lemma mode, infer
	// the same edge; each is inferred once.
	const seenComponents = new Set<Dumling.Reading[]>();
	const seenLemmas = new Set<string>();
	for (const target of targets) {
		const component = components.get(context.key(target)) ?? [];
		if (seenComponents.has(component)) continue;
		seenComponents.add(component);
		for (const member of component) {
			if (!readingMode) {
				const lemma = context.key(member.lemma);
				if (seenLemmas.has(lemma)) continue;
				seenLemmas.add(lemma);
			}
			context.infer(source, edge.relation, member);
		}
	}
}

function createProjectionContext(
	inventory: ReadonlyMap<string, ReadingWithKnowledge>,
	byLemma: ReadonlyMap<string, readonly Dumling.Reading[]>,
	readingCounts: ReadonlyMap<string, number>,
	key: StructuralKey,
): ProjectionContext {
	const edges = new Map<string, SemanticRelationProjection>();
	const add = (edge: SemanticRelationProjection) => {
		const identity = JSON.stringify([
			key(edge.source),
			edge.relation,
			key(edge.target),
		]);
		if (!edges.has(identity)) edges.set(identity, edge);
	};
	const closes = (target: Dumling.Lemma | Dumling.Reading) => {
		if (target.unitKind === "Reading") return true;
		const lemma = key(target);
		return (readingCounts.get(lemma) ?? byLemma.get(lemma)?.length) === 1;
	};
	const targetsFor = (target: Dumling.Lemma | Dumling.Reading) => {
		if (!closes(target)) return [];
		return target.unitKind === "Reading"
			? [target]
			: (byLemma.get(key(target)) ?? []);
	};
	const targetsReadings = (source: Dumling.Reading) =>
		inventory.get(key(source))?.knowledge.semanticRelations?.targetKind ===
		"reading";
	const infer = (
		source: Dumling.Reading,
		relation: SemanticRelation,
		target: Dumling.Reading,
	) => {
		add({
			source,
			relation,
			target: targetsReadings(source) ? target : target.lemma,
			provenance: "inferred",
		});
	};
	return {
		inventory,
		byLemma,
		readingCounts,
		key,
		edges,
		add,
		closes,
		targetsFor,
		targetsReadings,
		infer,
	};
}

function isSelfEdge(
	edge: SemanticRelationProjection,
	key: StructuralKey,
): boolean {
	return edge.target.unitKind === "Reading"
		? key(edge.source) === key(edge.target)
		: key(edge.source.lemma) === key(edge.target);
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
	const readingCounts = parseReadingCounts(
		options.readingCounts ?? [],
		(lemma) => byLemma.get(key(lemma))?.length ?? 0,
		key,
	);
	if (readingCounts instanceof ParsingError)
		return { success: false, error: readingCounts };
	const only = options.source
		? parseRequestedSource(options.source, inventory, key)
		: undefined;
	if (only instanceof ParsingError) return { success: false, error: only };

	const context = createProjectionContext(
		inventory,
		byLemma,
		readingCounts,
		key,
	);
	const directFailure = collectDirectEdges(context);
	if (directFailure) return { success: false, error: directFailure };

	for (const edge of [...context.edges.values()])
		for (const target of context.targetsFor(edge.target))
			context.infer(target, algebra[edge.relation], edge.source);

	const base = [...context.edges.values()];
	const components = buildSynonymComponents(context, base);
	substituteThroughSynonyms(context, base, components, only);

	return {
		success: true,
		value: [...context.edges.values()]
			.filter(
				(edge) =>
					(only === undefined || key(edge.source) === only) &&
					(edge.provenance === "direct" || !isSelfEdge(edge, key)),
			)
			.sort(
				(left, right) =>
					compare(key(left.source), key(right.source)) ||
					relationRank[left.relation] -
						relationRank[right.relation] ||
					compare(key(left.target), key(right.target)),
			),
	};
}
