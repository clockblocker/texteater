import { ParsingError } from "common-utils";
import { parseUnit } from "dumling";
import type * as Dumling from "dumling/types";
import type { KnowledgeChange, ReadingKnowledge } from "./types.js";

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

export function contextualizeKnowledge<R extends Dumling.Reading>(
	source: R,
	knowledge: ReadingKnowledge,
): ReadingKnowledge<R> | ParsingError {
	const result = structuredClone(knowledge) as ReadingKnowledge;
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
