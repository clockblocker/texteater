import { parseUnit } from "dumling";
import type * as Dumling from "dumling/types";
import { ParsingError } from "dumval/runtime";
import { structuralKeys } from "./fingerprint.js";
import type {
	ConjugationClasses,
	KnowledgeChange,
	NounPlural,
	ParticipleSource,
	ReadingKnowledge,
	ValencyComplement,
	ValencyFrame,
	ValencySlot,
} from "./types.js";
import { allowedComplementKinds } from "./valency-policy.js";

type Path = (number | string)[];

export function issue(path: Path, message: string): ParsingError {
	return new ParsingError([{ code: "custom", path, message }]);
}

export function parseSource<R extends Dumling.Reading>(
	source: R,
): R | ParsingError {
	const parsed = parseUnit(source);
	if (!parsed.success) return parsed.error;
	if (parsed.chain.unitKind !== "Reading")
		return issue(["source", "unitKind"], "Expected a Dumling Reading");
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
	if (parsed.chain.unitKind !== unitKind)
		return issue([...path, "unitKind"], `Expected a Dumling ${unitKind}`);
	const target = parsed.chain.value as Dumling.Lemma | Dumling.Reading;
	const lemma =
		unitKind === "Lemma"
			? (target as Dumling.Lemma)
			: (target as Dumling.Reading).lemma;
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
 * dumspec checks it against the ADP Case Table (ADR 0041). A Hebrew or
 * English one names no case (`סמך על`, `depend on`).
 */
function parseValencyComplement<R extends Dumling.Reading>(
	source: R,
	complement: ValencyComplement,
	path: Path,
): ValencyComplement | ParsingError {
	const { family, kind } = source.lemma;
	if (!allowedComplementKinds(source.lemma).includes(complement.kind))
		return issue(
			[...path, "kind"],
			`${family} ${kind} Readings take no ${complement.kind} complement`,
		);
	if (complement.kind !== "Preposition") return complement;
	const parsed = parseUnit(complement.preposition);
	if (!parsed.success)
		return new ParsingError(
			parsed.error.issues.map((entry) => ({
				...entry,
				path: [...path, "preposition", ...entry.path],
			})),
		);
	const preposition = parsed.chain.value as Dumling.Lemma;
	if (
		parsed.chain.unitKind !== "Lemma" ||
		preposition.family !== "Lexeme" ||
		preposition.kind !== "ADP"
	)
		return issue(
			[...path, "preposition"],
			"A governed preposition must be an ADP Lemma",
		);
	if (preposition.language !== source.lemma.language)
		return issue(
			[...path, "preposition", "language"],
			"A governed preposition must use the source Language",
		);
	return { ...complement, preposition } as ValencyComplement;
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
 * at most one Preposition (ADR 0034).
 */
function parseValencyFrame<R extends Dumling.Reading>(
	source: R,
	frame: ValencyFrame,
	path: Path,
): ValencyFrame | ParsingError {
	const key = structuralKeys();
	const slots: ValencySlot[] = [];
	const inFrame = new Set<string>();
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
		slots.push({ status: slot.status, complements } as ValencySlot);
	}
	return slots as ValencyFrame;
}

/**
 * A Participle Source belongs to a Lexeme ADJ Reading and names a Lexeme VERB
 * Lemma of the same Language (ADR 0036).
 */
function parseParticipleSource<R extends Dumling.Reading>(
	source: R,
	value: ParticipleSource,
	path: Path,
): ParticipleSource | ParsingError {
	if (source.lemma.family !== "Lexeme" || source.lemma.kind !== "ADJ")
		return issue(path, "Only an ADJ Reading has a Participle Source");
	const verbPath = [...path, "verb"];
	const parsed = parseUnit(value.verb);
	if (!parsed.success)
		return new ParsingError(
			parsed.error.issues.map((entry) => ({
				...entry,
				path: [...verbPath, ...entry.path],
			})),
		);
	const verb = parsed.chain.value as Dumling.Lemma;
	if (
		parsed.chain.unitKind !== "Lemma" ||
		verb.family !== "Lexeme" ||
		verb.kind !== "VERB"
	)
		return issue(verbPath, "A Participle Source must be a VERB Lemma");
	if (verb.language !== source.lemma.language)
		return issue(
			[...verbPath, "language"],
			"A Participle Source must use the source Language",
		);
	return { ...value, verb } as ParticipleSource;
}

/**
 * A plural belongs to a German NOUN Reading, and each plural form appears
 * once (#657).
 */
function parseNounPlural<R extends Dumling.Reading>(
	source: R,
	value: NounPlural,
	path: Path,
): NounPlural | ParsingError {
	const { language, family, kind } = source.lemma;
	if (language !== "de" || family !== "Lexeme" || kind !== "NOUN")
		return issue(path, "Only a German NOUN Reading has a plural");
	if (typeof value !== "string" && new Set(value).size !== value.length)
		return issue(path, "A plural lists each form once");
	return value;
}

/**
 * Conjugation classes belong to a German VERB Reading, and each class appears
 * once (ADR 0038).
 */
function parseConjugationClasses<R extends Dumling.Reading>(
	source: R,
	value: ConjugationClasses,
	path: Path,
): ConjugationClasses | ParsingError {
	const { language, family, kind } = source.lemma;
	if (language !== "de" || family !== "Lexeme" || kind !== "VERB")
		return issue(
			path,
			"Only a German VERB Reading has a conjugation class",
		);
	if (new Set(value).size !== value.length)
		return issue(path, "A conjugation lists each class once");
	return value;
}

export function contextualizeKnowledge<R extends Dumling.Reading>(
	source: R,
	knowledge: ReadingKnowledge,
): ReadingKnowledge<R> | ParsingError {
	const result = structuredClone(knowledge) as ReadingKnowledge;
	for (const aspect of Object.keys(routeAspects) as RouteAspect[])
		if (result[aspect] !== undefined) {
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
	if (result.plural) {
		const plural = parseNounPlural(source, result.plural, [
			"knowledge",
			"plural",
		]);
		if (plural instanceof ParsingError) return plural;
	}
	if (result.conjugationClass) {
		const classes = parseConjugationClasses(
			source,
			result.conjugationClass,
			["knowledge", "conjugationClass"],
		);
		if (classes instanceof ParsingError) return classes;
	}
	if (result.participleSource) {
		const participle = parseParticipleSource(
			source,
			result.participleSource,
			["knowledge", "participleSource"],
		);
		if (participle instanceof ParsingError) return participle;
		result.participleSource = participle;
	}
	if (result.valency) {
		const frame = parseValencyFrame(source, result.valency, [
			"knowledge",
			"valency",
		]);
		if (frame instanceof ParsingError) return frame;
		result.valency = frame;
	}
	const relations = result.semanticRelations;
	if (!relations) return result as ReadingKnowledge<R>;
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
	if (relations.targetKind !== "reading" && relations.endonym) {
		const path = ["knowledge", "semanticRelations", "endonym"];
		const failure = endonymIssue(source, relations.endonym, {
			source: path,
			targets: path,
		});
		if (failure) return failure;
	}
	return result as ReadingKnowledge<R>;
}

export function contextualizeChange<R extends Dumling.Reading>(
	source: R,
	change: KnowledgeChange,
): KnowledgeChange<R> | ParsingError {
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
	if (change.aspect === "plural" && change.kind !== "Retract") {
		const plural = parseNounPlural(source, change.value, [
			"change",
			"value",
		]);
		if (plural instanceof ParsingError) return plural;
	}
	if (change.aspect === "conjugationClass" && change.kind !== "Retract") {
		const classes = parseConjugationClasses(source, change.value, [
			"change",
			"value",
		]);
		if (classes instanceof ParsingError) return classes;
	}
	if (change.aspect === "participleSource" && change.kind !== "Retract") {
		const participle = parseParticipleSource(source, change.value, [
			"change",
			"value",
		]);
		if (participle instanceof ParsingError) return participle;
		return { ...change, value: participle } as KnowledgeChange<R>;
	}
	if (change.aspect === "valency") {
		if (change.kind !== "Retract") {
			const frame = parseValencyFrame(source, change.value, [
				"change",
				"value",
			]);
			if (frame instanceof ParsingError) return frame;
			return { ...change, value: frame } as KnowledgeChange<R>;
		}
		if (!change.complement) return change as KnowledgeChange<R>;
		const complement = parseValencyComplement(source, change.complement, [
			"change",
			"complement",
		]);
		if (complement instanceof ParsingError) return complement;
		return { ...change, complement } as KnowledgeChange<R>;
	}
	if (change.aspect !== "semanticRelations" || change.kind === "Retract")
		return change as KnowledgeChange<R>;
	const targetKind = change.targetKind === "reading" ? "Reading" : "Lemma";
	const values: Array<Dumling.Lemma | Dumling.Reading> = [];
	for (const [index, target] of change.value.entries()) {
		const parsed = parseRelatedUnit(source, target, targetKind, [
			"change",
			"value",
			index,
		]);
		if (parsed instanceof ParsingError) return parsed;
		values.push(parsed);
	}
	if (change.relation === "endonym") {
		const failure = endonymIssue(source, values, {
			source: ["change", "relation"],
			targets: ["change", "value"],
		});
		if (failure) return failure;
	}
	return { ...change, value: values } as KnowledgeChange<R>;
}
