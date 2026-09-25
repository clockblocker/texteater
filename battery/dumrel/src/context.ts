import { ParsingError } from "common-utils";
import { parseUnit } from "dumling";
import type * as Dumling from "dumling/types";
import { fingerprint } from "./fingerprint.js";
import type {
	KnowledgeChange,
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
 * ADP Lemma of the source Language; one whose Lemma fixes its case (`für` +
 * Acc) cannot take another case, while a two-way preposition (`auf`, governed
 * case null) takes the construction's case.
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
	const fixed = Reflect.get(preposition.coreFeatures, "governedCase");
	if (fixed != null && fixed !== complement.case)
		return issue(
			[...path, "case"],
			`${preposition.canonicalForm} always governs ${fixed}`,
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
 * Lemma of the same Language (ADR 0035).
 */
function parseParticipleSource<R extends Dumling.Reading>(
	source: R,
	value: unknown,
	path: Path,
): Dumling.Lemma | ParsingError {
	if (source.lemma.family !== "Lexeme" || source.lemma.kind !== "ADJ")
		return issue(path, "Only an ADJ Reading has a Participle Source");
	const parsed = parseUnit(value);
	if (!parsed.success)
		return new ParsingError(
			parsed.error.issues.map((entry) => ({
				...entry,
				path: [...path, ...entry.path],
			})),
		);
	const verb = parsed.chain.value as Dumling.Lemma;
	if (
		parsed.chain.unitKind !== "Lemma" ||
		verb.family !== "Lexeme" ||
		verb.kind !== "VERB"
	)
		return issue(path, "A Participle Source must be a VERB Lemma");
	if (verb.language !== source.lemma.language)
		return issue(
			[...path, "language"],
			"A Participle Source must use the source Language",
		);
	return verb;
}

export function contextualizeKnowledge<R extends Dumling.Reading>(
	source: R,
	knowledge: ReadingKnowledge,
): ReadingKnowledge<R> | ParsingError {
	const result = structuredClone(knowledge) as ReadingKnowledge;
	if (result.participleSource) {
		const verb = parseParticipleSource(source, result.participleSource, [
			"knowledge",
			"participleSource",
		]);
		if (verb instanceof ParsingError) return verb;
		result.participleSource = verb as typeof result.participleSource;
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
	if (change.aspect === "participleSource" && change.kind !== "Retract") {
		const verb = parseParticipleSource(source, change.value, [
			"change",
			"value",
		]);
		if (verb instanceof ParsingError) return verb;
		return { ...change, value: verb } as KnowledgeChange<R>;
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
