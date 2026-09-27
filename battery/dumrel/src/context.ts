import { ParsingError } from "common-utils";
import { germanAdpositionAllows, parseUnit } from "dumling";
import type * as Dumling from "dumling/types";
import { fingerprint } from "./fingerprint.js";
import type {
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

function issue(path: Path, message: string): ParsingError {
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
	if (lemma.family !== source.lemma.family)
		return issue(
			[...path, "family"],
			"A Semantic Relation target must use the source Family",
		);
	return target;
}

/**
 * A complement the source's route allows. A Preposition complement names an
 * ADP Lemma of the source Language. A German one takes a case the ADP Case
 * Table allows it: `warten` `auf` + Acc and `bestehen` `auf` + Dat, never
 * `für` + Dat. A Hebrew or English one names no case (`סמך על`, `depend
 * on`).
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
	// Hebrew and English mark no case, so only German checks the ADP Case Table.
	if (
		"case" in complement &&
		!germanAdpositionAllows(
			preposition as typeof complement.preposition,
			complement.case,
		)
	)
		return issue(
			[...path, "case"],
			`${preposition.canonicalForm} does not take ${complement.case}`,
		);
	return { ...complement, preposition } as ValencyComplement;
}

/** A frame whose Slots the source's route allows, each complement listed once. */
function parseValencyFrame<R extends Dumling.Reading>(
	source: R,
	frame: ValencyFrame,
	path: Path,
): ValencyFrame | ParsingError {
	const slots: ValencySlot[] = [];
	const seen = new Set<string>();
	for (const [index, slot] of frame.entries()) {
		const complement = parseValencyComplement(source, slot.complement, [
			...path,
			index,
			"complement",
		]);
		if (complement instanceof ParsingError) return complement;
		const identity = fingerprint(complement);
		if (seen.has(identity))
			return issue(
				[...path, index, "complement"],
				"A Valency Frame lists each complement once",
			);
		seen.add(identity);
		slots.push({ status: slot.status, complement });
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
 * A plural belongs to a German NOUN Reading, and each Plural Pattern appears
 * once (#597).
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
		return issue(path, "A plural lists each Plural Pattern once");
	return value;
}

export function contextualizeKnowledge<R extends Dumling.Reading>(
	source: R,
	knowledge: ReadingKnowledge,
): ReadingKnowledge<R> | ParsingError {
	const result = structuredClone(knowledge) as ReadingKnowledge;
	if (result.pluralPattern) {
		const plural = parseNounPlural(source, result.pluralPattern, [
			"knowledge",
			"pluralPattern",
		]);
		if (plural instanceof ParsingError) return plural;
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
	return result as ReadingKnowledge<R>;
}

export function contextualizeChange<R extends Dumling.Reading>(
	source: R,
	change: KnowledgeChange,
): KnowledgeChange<R> | ParsingError {
	if (change.aspect === "pluralPattern" && change.kind !== "Retract") {
		const plural = parseNounPlural(source, change.value, [
			"change",
			"value",
		]);
		if (plural instanceof ParsingError) return plural;
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
	return { ...change, value: values } as KnowledgeChange<R>;
}

export function conflict(path: Path, message: string): ParsingError {
	return issue(path, message);
}
