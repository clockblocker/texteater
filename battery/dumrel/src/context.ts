import { ParsingError } from "common-utils/validation";
import { lemmaIdentityKey, parseUnit, readingIdentityKey } from "dumling";
import type * as Dumling from "dumling/types";
import {
	parseBreakdown,
	parseBreakdownPieces,
	parseSourceLink,
	sourceAndConstituentsIssue,
} from "./breakdown-context.js";
import { issue, type Path, prefixIssues } from "./issue.js";
import type {
	DirectSemanticRelation,
	KnowledgeChange,
	ReadingKnowledge,
	SemanticRelations,
} from "./types.js";
import {
	checkValencyFrameInvariants,
	parseValencyComplement,
	parseValencyFrame,
} from "./valency-context.js";
import { directSemanticRelationValues } from "./vocabulary.js";

export function parseSource<R extends Dumling.Reading>(
	source: R,
): R | ParsingError {
	const parsed = parseUnit(source);
	if (!parsed.success) return parsed.error;
	if (parsed.chain.unitKind !== "Reading")
		return issue(["source", "unitKind"], "Expected a Dumling Reading");
	// A generic R reaches parseUnit's typed overload only through its
	// constraint, so the chain's value is every Reading, not this caller's R.
	return parsed.chain.value as R;
}

function parseRelatedUnit<R extends Dumling.Reading>(
	source: R,
	value: unknown,
	unitKind: "Lemma" | "Reading",
	path: Path,
): Dumling.Lemma | Dumling.Reading | ParsingError {
	const parsed = parseUnit(value);
	if (!parsed.success) return prefixIssues(parsed.error, path);
	const { chain } = parsed;
	const target =
		unitKind === "Lemma"
			? chain.unitKind === "Lemma"
				? chain.value
				: undefined
			: chain.unitKind === "Reading"
				? chain.value
				: undefined;
	if (!target)
		return issue([...path, "unitKind"], `Expected a Dumling ${unitKind}`);
	const lemma = target.unitKind === "Lemma" ? target : target.lemma;
	if (lemma.language !== source.lemma.language)
		return issue(
			[...path, "language"],
			"A Semantic Relation target must use the source Language",
		);
	if (relationSpace(lemma.family) !== relationSpace(source.lemma.family))
		return issue(
			[...path, "family"],
			"A Semantic Relation target must share the source's relation space: Lexeme and Locution relate to each other, a Saying only to Sayings, a Morpheme only to Morphemes",
		);
	return target;
}

/** Each target parsed by {@link parseRelatedUnit}, or the first failure. */
function parseRelatedUnits<R extends Dumling.Reading>(
	source: R,
	targets: readonly unknown[],
	unitKind: "Lemma",
	path: Path,
): Dumling.Lemma[] | ParsingError;
function parseRelatedUnits<R extends Dumling.Reading>(
	source: R,
	targets: readonly unknown[],
	unitKind: "Reading",
	path: Path,
): Dumling.Reading[] | ParsingError;
function parseRelatedUnits<R extends Dumling.Reading>(
	source: R,
	targets: readonly unknown[],
	unitKind: "Lemma" | "Reading",
	path: Path,
): (Dumling.Lemma | Dumling.Reading)[] | ParsingError {
	const values: (Dumling.Lemma | Dumling.Reading)[] = [];
	for (const [index, target] of targets.entries()) {
		const parsed = parseRelatedUnit(source, target, unitKind, [
			...path,
			index,
		]);
		if (parsed instanceof ParsingError) return parsed;
		values.push(parsed);
	}
	return values;
}

/**
 * Lexeme and Locution share one relation space (`ins Gras beißen` ↔
 * `sterben`); every other Family relates only within itself (ADR 0039).
 */
function relationSpace(family: Dumling.Family): Dumling.Family {
	return family === "Locution" ? "Lexeme" : family;
}

type RouteAspect = "locutionType" | "sayingType" | "formulaRole";
/**
 * The routes each type aspect belongs to (ADR 0039): Locution Type to a
 * Locution, Saying Type to a Saying, and Formula Role to a Lexeme or Locution
 * INTJ. The Kind alone never decides, since Lexeme and Locution share Kinds.
 */
const routeAspects: Readonly<
	Record<
		RouteAspect,
		{
			applies: (lemma: Dumling.Lemma) => boolean;
			message: string;
		}
	>
> = {
	locutionType: {
		applies: (lemma) => lemma.family === "Locution",
		message: "Only a Locution Reading has a Locution Type",
	},
	sayingType: {
		applies: (lemma) => lemma.family === "Saying",
		message: "Only a Saying Reading has a Saying Type",
	},
	formulaRole: {
		applies: (lemma) =>
			lemma.kind === "INTJ" &&
			(lemma.family === "Lexeme" || lemma.family === "Locution"),
		message: "Only an INTJ Reading has a Formula Role",
	},
};

function routeAspectIssue<R extends Dumling.Reading>(
	source: R,
	aspect: RouteAspect,
	path: Path,
): ParsingError | undefined {
	const { applies, message } = routeAspects[aspect];
	return applies(source.lemma) ? undefined : issue(path, message);
}

/**
 * A Collocation's verb only supports its noun or adjective predicate (`eine
 * Entscheidung treffen`), so only a VERB Locution is one. An Idiom may be any
 * Kind (`weißer Rabe`, `unter vier Augen`).
 */
function locutionTypeIssue<R extends Dumling.Reading>(
	source: R,
	value: string,
	path: Path,
): ParsingError | undefined {
	return value === "Collocation" && source.lemma.kind !== "VERB"
		? issue(path, "Only a VERB Locution is a Collocation")
		: undefined;
}

function isRouteAspect(aspect: string): aspect is RouteAspect {
	return Object.hasOwn(routeAspects, aspect);
}

function isProperNoun(lemma: Dumling.Lemma): boolean {
	return lemma.family === "Lexeme" && lemma.kind === "PROPN";
}

/**
 * An endonym names, from a PROPN Reading, the local name of the place it
 * names (`Pressburg`: `Bratislava`), so both ends are Lexeme PROPN. The local
 * name's `exonym` is projected, never stored.
 */
function endonymIssue(
	source: Dumling.Reading,
	targets: readonly (Dumling.Lemma | Dumling.Reading)[],
	paths: { source: Path; targets: Path },
): ParsingError | undefined {
	if (!isProperNoun(source.lemma))
		return issue(paths.source, "Only a PROPN Reading has an endonym");
	for (const [index, target] of targets.entries())
		if (target.unitKind !== "Lemma" || !isProperNoun(target))
			return issue(
				[...paths.targets, index],
				"An endonym is a PROPN Lemma",
			);
	return undefined;
}

/**
 * A Reading names each target once across all its Semantic Relations: twice
 * in one list says nothing more, and under two relations the claims contradict
 * each other (`synonym` and `nearSynonym`, `synonym` and `antonym`), as
 * Dumdict's `relationConflict` refuses (ADR 0011). Relations are read in
 * vocabulary order, so the later one is named. A Lemma counts by its
 * `lemmaIdentityKey`, an exact Reading by its `readingIdentityKey`, so two
 * Readings of one Lemma are two targets.
 */
function repeatedTargetIssue(
	relations: SemanticRelations,
	path: Path,
): ParsingError | undefined {
	const named = new Map<string, string>();
	const lists: Partial<
		Record<
			DirectSemanticRelation,
			readonly (Dumling.Lemma | Dumling.Reading)[]
		>
	> = relations;
	for (const relation of directSemanticRelationValues) {
		for (const [index, target] of (lists[relation] ?? []).entries()) {
			const identity =
				target.unitKind === "Lemma"
					? lemmaIdentityKey(target)
					: readingIdentityKey(target);
			const earlier = named.get(identity);
			if (earlier === undefined) {
				named.set(identity, relation);
				continue;
			}
			const unit = target.unitKind;
			return issue(
				[...path, relation, index],
				earlier === relation
					? `A Semantic Relation lists each ${unit} once: this ${unit} is already a ${relation}`
					: `A Reading relates to each ${unit} under one Semantic Relation: this ${unit} is already a ${earlier}, so it cannot also be a ${relation}`,
			);
		}
	}
	return undefined;
}

/**
 * Validates cross-aspect and cross-slot invariants on a Reading Knowledge
 * whose individual aspects have already been checked against its source,
 * without re-parsing unchanged Dumling units.
 */
export function checkKnowledgeInvariants(
	knowledge: ReadingKnowledge,
): ParsingError | undefined {
	const both = sourceAndConstituentsIssue(knowledge, ["knowledge"]);
	if (both) return both;
	if (knowledge.valency) {
		const valencyFailure = checkValencyFrameInvariants(knowledge.valency, [
			"knowledge",
			"valency",
		]);
		if (valencyFailure) return valencyFailure;
	}
	if (knowledge.semanticRelations) {
		const repeated = repeatedTargetIssue(knowledge.semanticRelations, [
			"knowledge",
			"semanticRelations",
		]);
		if (repeated) return repeated;
	}
	return undefined;
}

function checkRouteAspects<R extends Dumling.Reading>(
	source: R,
	knowledge: ReadingKnowledge,
): ParsingError | undefined {
	for (const aspect of Object.keys(routeAspects)) {
		if (isRouteAspect(aspect) && knowledge[aspect] !== undefined) {
			const failure = routeAspectIssue(source, aspect, [
				"knowledge",
				aspect,
			]);
			if (failure) return failure;
		}
	}
	return knowledge.locutionType
		? locutionTypeIssue(source, knowledge.locutionType, [
				"knowledge",
				"locutionType",
			])
		: undefined;
}

function contextualizeSemanticRelations<R extends Dumling.Reading>(
	source: R,
	relations: SemanticRelations,
): ParsingError | undefined {
	const targetKind = relations.targetKind === "reading" ? "Reading" : "Lemma";
	for (const [relation, targets] of Object.entries(relations)) {
		if (relation === "targetKind" || !Array.isArray(targets)) continue;
		for (const [index, target] of targets.entries()) {
			const parsed = parseRelatedUnit(source, target, targetKind, [
				"knowledge",
				"semanticRelations",
				relation,
				index,
			]);
			if (parsed instanceof ParsingError) return parsed;
			targets[index] = parsed;
		}
	}
	const repeated = repeatedTargetIssue(relations, [
		"knowledge",
		"semanticRelations",
	]);
	if (repeated) return repeated;
	if (relations.targetKind !== "reading" && relations.endonym) {
		const path = ["knowledge", "semanticRelations", "endonym"];
		return endonymIssue(source, relations.endonym, {
			source: path,
			targets: path,
		});
	}
	return undefined;
}

export function contextualizeKnowledge<R extends Dumling.Reading>(
	source: R,
	knowledge: ReadingKnowledge,
): ReadingKnowledge | ParsingError {
	const result = structuredClone(knowledge);
	const routeFailure = checkRouteAspects(source, result);
	if (routeFailure) return routeFailure;
	if (result.source) {
		const link = parseSourceLink(source, result.source, [
			"knowledge",
			"source",
		]);
		if (link instanceof ParsingError) return link;
		result.source = link;
	}
	if (result.breakdown) {
		const breakdown = parseBreakdown(source, result.breakdown, [
			"knowledge",
			"breakdown",
		]);
		if (breakdown instanceof ParsingError) return breakdown;
		result.breakdown = breakdown;
	}
	const both = sourceAndConstituentsIssue(result, ["knowledge"]);
	if (both) return both;
	if (result.valency) {
		const frame = parseValencyFrame(source, result.valency, [
			"knowledge",
			"valency",
		]);
		if (frame instanceof ParsingError) return frame;
		result.valency = frame;
	}
	if (result.semanticRelations) {
		const relationsFailure = contextualizeSemanticRelations(
			source,
			result.semanticRelations,
		);
		if (relationsFailure) return relationsFailure;
	}
	return result;
}

function contextualizeValencyChange<R extends Dumling.Reading>(
	source: R,
	change: Extract<KnowledgeChange, { aspect: "valency" }>,
): KnowledgeChange | ParsingError {
	if (change.kind !== "Retract") {
		const frame = parseValencyFrame(source, change.value, [
			"change",
			"value",
		]);
		return frame instanceof ParsingError
			? frame
			: { ...change, value: frame };
	}
	if (!change.complement) return change;
	const complement = parseValencyComplement(source, change.complement, [
		"change",
		"complement",
	]);
	return complement instanceof ParsingError
		? complement
		: { ...change, complement };
}

function contextualizeRelationChange<R extends Dumling.Reading>(
	source: R,
	change: Extract<KnowledgeChange, { aspect: "semanticRelations" }>,
): KnowledgeChange | ParsingError {
	if (change.kind === "Retract") return change;
	const path = ["change", "value"];
	if (change.targetKind === "reading") {
		const readings = parseRelatedUnits(
			source,
			change.value,
			"Reading",
			path,
		);
		return readings instanceof ParsingError
			? readings
			: { ...change, value: readings };
	}
	const values = parseRelatedUnits(source, change.value, "Lemma", path);
	if (values instanceof ParsingError) return values;
	if (change.relation === "endonym") {
		const failure = endonymIssue(source, values, {
			source: ["change", "relation"],
			targets: ["change", "value"],
		});
		if (failure) return failure;
	}
	return { ...change, value: values };
}

export function contextualizeChange<R extends Dumling.Reading>(
	source: R,
	change: KnowledgeChange,
): KnowledgeChange | ParsingError {
	switch (change.aspect) {
		case "locutionType":
		case "sayingType":
		case "formulaRole": {
			if (change.kind === "Retract") return change;
			const failure = routeAspectIssue(source, change.aspect, [
				"change",
				"aspect",
			]);
			if (failure) return failure;
			if (change.aspect === "locutionType") {
				const typeFailure = locutionTypeIssue(source, change.value, [
					"change",
					"value",
				]);
				if (typeFailure) return typeFailure;
			}
			return change;
		}
		case "source": {
			if (change.kind === "Retract") return change;
			const link = parseSourceLink(source, change.value, [
				"change",
				"value",
			]);
			return link instanceof ParsingError
				? link
				: { ...change, value: link };
		}
		case "breakdown": {
			if (change.kind === "Retract") return change;
			const pieces = parseBreakdownPieces(
				source,
				change.part,
				change.value,
				["change", "value"],
			);
			return pieces instanceof ParsingError
				? pieces
				: { ...change, value: pieces };
		}
		case "valency":
			return contextualizeValencyChange(source, change);
		case "semanticRelations":
			return contextualizeRelationChange(source, change);
		default:
			return change;
	}
}
