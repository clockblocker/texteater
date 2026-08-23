import type { Lemma, Reading, SupportedLanguage } from "dumling/types";
import type {
	KnowledgeChange,
	LexemeUnitShadow,
	ReadingKnowledge,
	SemanticRelations,
} from "dumrel/types";
import type { ReadingEntry, ReadingKnowledgeChange } from "../dto";
import {
	parseKnowledgeChangeForDumdictRuntime,
	parseReadingKnowledgeForDumdictRuntime,
	unwrapDumdictParse,
} from "../parsing/lightweight-parsers";
import { sameLemma, sameReading } from "./identity";

export function applyDumdictKnowledgeChange<L extends SupportedLanguage>(
	record: ReadingEntry<L>,
	envelope: ReadingKnowledgeChange<L>,
): ReadingEntry<L>;
export function applyDumdictKnowledgeChange<L extends SupportedLanguage>(
	record: ReadingEntry<L>,
	envelope: ReadingKnowledgeChange<L>,
): ReadingEntry<L> {
	if (!sameReading(record.reading, envelope.reading)) {
		throw new Error(
			"Knowledge Change Reading does not match the Reading Entry.",
		);
	}
	const change = envelope.change;
	if (
		change.aspect === "semanticRelations" &&
		"value" in change &&
		(change.targetKind === "reading"
			? change.value.some((target) => sameReading(record.reading, target))
			: change.value.some((target) =>
					sameLemma(record.reading.lemma, target),
				))
	)
		throw new Error(
			"Reading Knowledge cannot contain a direct same-Lemma relation.",
		);
	const knowledge = applyKnowledgeChangeForDumdictRuntime(
		record.knowledge as
			| ReadingKnowledge<string, Lemma<L>, LexemeUnitShadow, Reading<L>>
			| undefined,
		envelope.change,
	);
	const { knowledge: _existing, ...withoutKnowledge } = record;
	return Object.keys(knowledge).length === 0
		? withoutKnowledge
		: {
				...withoutKnowledge,
				knowledge: knowledge as ReadingKnowledge<
					string,
					Lemma<L>,
					LexemeUnitShadow,
					Reading<L>
				>,
			};
}

function applyKnowledgeChangeForDumdictRuntime(
	existing: ReadingKnowledge | undefined,
	change: KnowledgeChange,
): ReadingKnowledge {
	const parsedChange = unwrapDumdictParse(
		parseKnowledgeChangeForDumdictRuntime(change),
	);
	const result =
		existing === undefined
			? {}
			: unwrapDumdictParse(
					parseReadingKnowledgeForDumdictRuntime(existing),
				);
	switch (parsedChange.aspect) {
		case "translations":
			applyLanguageBucket(result, parsedChange);
			break;
		case "semanticRelations":
			applyRelationBucket(result, parsedChange);
			break;
		case "definition":
		case "transcription":
		case "morphologicalTree":
		case "lexicalBreakdown":
			applyAtomicAspect(result, parsedChange);
			break;
	}
	// Both inputs have been parsed above. Every branch only removes fields or
	// installs normalized values from the parsed change, so the result remains a
	// canonical ReadingKnowledge without a second interpreter pass.
	return result;
}

type LanguageBucketChange = Extract<
	KnowledgeChange,
	{ aspect: "translations" }
>;

function applyLanguageBucket(
	knowledge: ReadingKnowledge,
	change: LanguageBucketChange,
): void {
	const aspect = change.aspect;
	const buckets = (Reflect.get(knowledge, aspect) ?? {}) as Record<
		string,
		string[]
	>;
	if (change.kind === "Retract") {
		delete buckets[change.language];
		if (Object.keys(buckets).length === 0)
			Reflect.deleteProperty(knowledge, aspect);
		else Reflect.set(knowledge, aspect, buckets);
		return;
	}

	const existing = buckets[change.language];
	buckets[change.language] =
		change.kind === "Correct"
			? stableUnique(change.value)
			: appendUnique(existing ?? [], change.value);
	Reflect.set(knowledge, aspect, buckets);
}

type RelationBucketChange = Extract<
	KnowledgeChange,
	{ aspect: "semanticRelations" }
>;

function applyRelationBucket(
	knowledge: ReadingKnowledge,
	change: RelationBucketChange,
): void {
	const targetKind = change.targetKind ?? "lemma";
	const existing = knowledge.semanticRelations;
	const existingTargetKind =
		existing?.targetKind === "reading" ? "reading" : "lemma";
	if (existing !== undefined && existingTargetKind !== targetKind)
		throw new Error(
			"One Reading Knowledge value cannot mix Lemma- and Reading-targeted Semantic Relations.",
		);
	const relations: Record<string, unknown> = {
		...existing,
		...(targetKind === "reading" ? { targetKind: "reading" } : {}),
	};
	if (change.kind === "Retract") {
		delete relations[change.relation];
		if (targetKind === "lemma" && Object.keys(relations).length === 0)
			delete knowledge.semanticRelations;
		else knowledge.semanticRelations = relations as SemanticRelations;
		return;
	}

	const existingTargets = Array.isArray(relations[change.relation])
		? (relations[change.relation] as unknown[])
		: [];
	relations[change.relation] =
		change.kind === "Correct"
			? stableUnique(change.value as readonly unknown[])
			: appendUnique(existingTargets, change.value as readonly unknown[]);
	knowledge.semanticRelations = relations as SemanticRelations;
}

type AtomicChange = Extract<
	KnowledgeChange,
	{
		aspect:
			| "transcription"
			| "definition"
			| "morphologicalTree"
			| "lexicalBreakdown";
	}
>;

function applyAtomicAspect(
	knowledge: ReadingKnowledge,
	change: AtomicChange,
): void {
	if (change.kind === "Retract") {
		delete knowledge[change.aspect];
		return;
	}

	const existing = knowledge[change.aspect];
	if (
		change.kind === "Contribute" &&
		existing !== undefined &&
		stableFingerprint(existing) !== stableFingerprint(change.value)
	) {
		throw new Error(
			`Contribute conflicts with existing ${change.aspect}; use Correct to replace it.`,
		);
	}
	Reflect.set(knowledge, change.aspect, structuredClone(change.value));
}

function appendUnique<Value>(
	existing: readonly Value[],
	additions: readonly Value[],
): Value[] {
	const result = existing.map((value) => structuredClone(value));
	const fingerprints = new Set(result.map(stableFingerprint));
	for (const value of additions) {
		const fingerprint = stableFingerprint(value);
		if (fingerprints.has(fingerprint)) continue;
		result.push(structuredClone(value));
		fingerprints.add(fingerprint);
	}
	return result;
}

function stableUnique<Value>(values: readonly Value[]): Value[] {
	return appendUnique([], values);
}

function stableFingerprint(value: unknown): string {
	return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(sortValue);
	if (value !== null && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value)
				.sort(([left], [right]) => compareStrings(left, right))
				.map(([key, child]) => [key, sortValue(child)]),
		);
	}
	return value;
}

function compareStrings(left: string, right: string): number {
	return left < right ? -1 : left > right ? 1 : 0;
}
