import { ParsingError } from "common-utils/validation";
import {
	foldCase,
	lemmaIdentityKey,
	parseUnit,
	readingIdentityKey,
} from "dumling";
import type * as Dumling from "dumling/types";
import {
	parseBreakdown,
	parseBreakdownPieces,
	parseSourceLink,
	sourceAndConstituentsIssue,
} from "./breakdown-context.js";
import { structuralKeys } from "./fingerprint.js";
import { issue, type Path } from "./issue.js";
import type {
	DirectSemanticRelation,
	KnowledgeChange,
	ReadingKnowledge,
	SemanticRelations,
	ValencyComplement,
	ValencyFrame,
	ValencySlot,
} from "./types.js";
import { allowedComplementKinds } from "./valency-policy.js";
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
	if (!parsed.success)
		return new ParsingError(
			parsed.error.issues.map((entry) => ({
				...entry,
				path: [...path, ...entry.path],
			})),
		);
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
 * A complement the source's route allows. A Preposition complement names an
 * ADP Lemma of the source Language. A German one names an oblique case, and
 * dumcorpus checks it against the ADP Case Table (ADR 0041). A Hebrew or
 * English one names no case (`סמך על`, `depend on`). A German Reflexive names
 * its case, another language's none. A Reflexive that is the object of a
 * fixed phrase's preposition names that ADP Lemma too, and the preposition is
 * a word of the source's Canonical Form, since the phrase holds it (`außer
 * sein` for `außer sich sein`); dumcorpus checks its case as a Preposition's
 * (ADR 0052).
 */
function parseValencyComplement<R extends Dumling.Reading>(
	source: R,
	complement: ValencyComplement,
	path: Path,
): ValencyComplement | ParsingError {
	const { family, kind, language } = source.lemma;
	if (!allowedComplementKinds(source.lemma).includes(complement.kind))
		return issue(
			[...path, "kind"],
			`${family} ${kind} Readings take no ${complement.kind} complement`,
		);
	if (
		complement.kind === "Reflexive" &&
		"governedCase" in complement !== (language === "de")
	)
		return issue(
			path,
			"A German Reflexive names its case; another language's names none",
		);
	if (!("preposition" in complement) || complement.preposition === undefined)
		return complement;
	const preposition = parsePreposition(source, complement.preposition, [
		...path,
		"preposition",
	]);
	if (preposition instanceof ParsingError) return preposition;
	if (
		complement.kind === "Reflexive" &&
		!source.lemma.canonicalForm
			.split(" ")
			.some(
				(word) =>
					foldCase(word, language) ===
					foldCase(preposition.canonicalForm, language),
			)
	)
		return issue(
			[...path, "preposition"],
			"A Reflexive's preposition is a word of its Reading's Canonical Form",
		);
	// parseUnit keeps the input's Language, so the parsed ADP Lemma fits the
	// variant complement came from; TypeScript can't correlate the two unions.
	return { ...complement, preposition } as ValencyComplement;
}

/** A complement's preposition: an ADP Lemma of the source Language. */
function parsePreposition<R extends Dumling.Reading>(
	source: R,
	value: unknown,
	path: Path,
): Dumling.Lemma | ParsingError {
	const parsed = parseUnit(value);
	if (!parsed.success)
		return new ParsingError(
			parsed.error.issues.map((entry) => ({
				...entry,
				path: [...path, ...entry.path],
			})),
		);
	const { chain } = parsed;
	if (
		chain.unitKind !== "Lemma" ||
		chain.family !== "Lexeme" ||
		chain.kind !== "ADP"
	)
		return issue(path, "A governed preposition must be an ADP Lemma");
	if (chain.value.language !== source.lemma.language)
		return issue(
			[...path, "language"],
			"A governed preposition must use the source Language",
		);
	return chain.value;
}

/** A Reflexive alone in its Slot, at most one per frame (ADR 0052). */
function reflexiveIssue(
	frame: ValencyFrame,
	path: Path,
): ParsingError | undefined {
	let seen = false;
	for (const [index, { complements }] of frame.entries()) {
		const at = complements.findIndex(({ kind }) => kind === "Reflexive");
		if (at === -1) continue;
		const complementPath = [...path, index, "complements", at];
		if (complements.length > 1)
			return issue(
				complementPath,
				"A Reflexive is the only complement of its Slot",
			);
		if (seen)
			return issue(
				complementPath,
				"A Valency Frame has at most one Reflexive",
			);
		seen = true;
	}
	return undefined;
}

/**
 * A frame whose complements the source's route allows. A complement with a
 * referent (a Case or Preposition, or a Hebrew or English Subject or object)
 * appears once in the frame, its referent telling it apart from its
 * namesakes. An Adverbial, Predicative or Clause appears once per Slot but may
 * recur in another: `Dass er kommt, bedeutet, dass …` has a Clause Dass in its
 * Nom Slot and in its Acc Slot. Which complements belong in one Slot is the
 * proposal's call; only the correlate is checked: a Clause with a correlate
 * takes its `da(r)-` from the Slot's preposition, so a Slot that holds one has
 * at most one Preposition (ADR 0034). A Reflexive is the only complement of
 * its Slot, and a frame has at most one (ADR 0052).
 */
function parseValencyFrame<R extends Dumling.Reading>(
	source: R,
	frame: ValencyFrame,
	path: Path,
): ValencyFrame | ParsingError {
	const key = structuralKeys();
	const slots: ValencySlot[] = [];
	const inFrame = new Set<string>();
	const reflexive = reflexiveIssue(frame, path);
	if (reflexive) return reflexive;
	for (const [index, slot] of frame.entries()) {
		const complements: ValencyComplement[] = [];
		const inSlot = new Set<string>();
		for (const [alternative, value] of slot.complements.entries()) {
			const complementPath = [...path, index, "complements", alternative];
			const complement = parseValencyComplement(
				source,
				value,
				complementPath,
			);
			if (complement instanceof ParsingError) return complement;
			const identity = key(complement);
			if (inSlot.has(identity))
				return issue(
					complementPath,
					"A Slot lists each complement once",
				);
			inSlot.add(identity);
			if ("referent" in complement) {
				if (inFrame.has(identity))
					return issue(
						complementPath,
						"A Valency Frame lists each Case or Preposition complement once, across all its Slots",
					);
				inFrame.add(identity);
			}
			complements.push(complement);
		}
		const correlated = complements.findIndex(
			(complement) =>
				complement.kind === "Clause" &&
				complement.correlate !== undefined,
		);
		const prepositions = complements.filter(
			({ kind }) => kind === "Preposition",
		).length;
		if (correlated !== -1 && prepositions > 1)
			return issue(
				[...path, index, "complements", correlated, "correlate"],
				"A Clause with a correlate in a Preposition Slot needs exactly one Preposition alternative there",
			);
		slots.push({ status: slot.status, complements });
	}
	return slots;
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

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complexity baseline (#994): decompose to remove
export function contextualizeKnowledge<R extends Dumling.Reading>(
	source: R,
	knowledge: ReadingKnowledge,
): ReadingKnowledge | ParsingError {
	const result = structuredClone(knowledge);
	for (const aspect of Object.keys(routeAspects))
		if (isRouteAspect(aspect) && result[aspect] !== undefined) {
			const failure = routeAspectIssue(source, aspect, [
				"knowledge",
				aspect,
			]);
			if (failure) return failure;
		}
	if (result.locutionType) {
		const failure = locutionTypeIssue(source, result.locutionType, [
			"knowledge",
			"locutionType",
		]);
		if (failure) return failure;
	}
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
	const relations = result.semanticRelations;
	if (!relations) return result;
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
		const failure = endonymIssue(source, relations.endonym, {
			source: path,
			targets: path,
		});
		if (failure) return failure;
	}
	return result;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complexity baseline (#994): decompose to remove
export function contextualizeChange<R extends Dumling.Reading>(
	source: R,
	change: KnowledgeChange,
): KnowledgeChange | ParsingError {
	if (isRouteAspect(change.aspect) && change.kind !== "Retract") {
		const failure = routeAspectIssue(source, change.aspect, [
			"change",
			"aspect",
		]);
		if (failure) return failure;
	}
	if (change.aspect === "locutionType" && change.kind !== "Retract") {
		const failure = locutionTypeIssue(source, change.value, [
			"change",
			"value",
		]);
		if (failure) return failure;
	}
	if (change.aspect === "source" && change.kind !== "Retract") {
		const link = parseSourceLink(source, change.value, ["change", "value"]);
		if (link instanceof ParsingError) return link;
		return { ...change, value: link };
	}
	if (change.aspect === "breakdown" && change.kind !== "Retract") {
		const pieces = parseBreakdownPieces(source, change.part, change.value, [
			"change",
			"value",
		]);
		if (pieces instanceof ParsingError) return pieces;
		return { ...change, value: pieces };
	}
	if (change.aspect === "valency") {
		if (change.kind !== "Retract") {
			const frame = parseValencyFrame(source, change.value, [
				"change",
				"value",
			]);
			if (frame instanceof ParsingError) return frame;
			return { ...change, value: frame };
		}
		if (!change.complement) return change;
		const complement = parseValencyComplement(source, change.complement, [
			"change",
			"complement",
		]);
		if (complement instanceof ParsingError) return complement;
		return { ...change, complement };
	}
	if (change.aspect !== "semanticRelations" || change.kind === "Retract")
		return change;
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
