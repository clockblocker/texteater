import {
	parseAsKnowledgeChange,
	parseAsReadingKnowledge,
	unwrapDumrelParse,
} from "./parsing/lightweight-parsers.js";
import type {
	KnowledgeChange,
	LemmaReference,
	LexemeUnitShadow,
	ReadingKnowledge,
	SemanticRelations,
} from "./types.js";

type SetTranslations<
	Language extends string,
	Lemma extends LemmaReference,
	LexicalShadow extends LexemeUnitShadow,
> = Extract<
	KnowledgeChange<Language, Lemma, LexicalShadow>,
	{ aspect: "translations"; kind: "Contribute" | "Correct" }
>;

type RetractTranslations<
	Language extends string,
	Lemma extends LemmaReference,
	LexicalShadow extends LexemeUnitShadow,
> = Extract<
	KnowledgeChange<Language, Lemma, LexicalShadow>,
	{ aspect: "translations"; kind: "Retract" }
>;

type NonLanguageReadingChange<
	Lemma extends LemmaReference,
	LexicalShadow extends LexemeUnitShadow,
> = Exclude<
	KnowledgeChange<string, Lemma, LexicalShadow>,
	{ aspect: "translations" }
>;

export function applyKnowledgeChange<Language extends string>(
	existing: undefined,
	change: SetTranslations<Language, LemmaReference, LexemeUnitShadow>,
): ReadingKnowledge<Language>;
export function applyKnowledgeChange<
	ExistingLanguage extends string,
	Language extends string,
	Lemma extends LemmaReference,
	LexicalShadow extends LexemeUnitShadow,
>(
	existing: ReadingKnowledge<ExistingLanguage, Lemma, LexicalShadow>,
	change: SetTranslations<Language, Lemma, LexicalShadow>,
): ReadingKnowledge<ExistingLanguage | Language, Lemma, LexicalShadow>;
export function applyKnowledgeChange<
	ExistingLanguage extends string,
	Language extends string,
	Lemma extends LemmaReference,
	LexicalShadow extends LexemeUnitShadow,
>(
	existing:
		| ReadingKnowledge<ExistingLanguage, Lemma, LexicalShadow>
		| undefined,
	change: SetTranslations<Language, Lemma, LexicalShadow>,
):
	| ReadingKnowledge<ExistingLanguage | Language, Lemma, LexicalShadow>
	| ReadingKnowledge<Language, Lemma, LexicalShadow>;

export function applyKnowledgeChange<Language extends string>(
	existing: undefined,
	change: RetractTranslations<Language, LemmaReference, LexemeUnitShadow>,
): ReadingKnowledge<never>;
export function applyKnowledgeChange<
	ExistingLanguage extends string,
	Language extends string,
	Lemma extends LemmaReference,
	LexicalShadow extends LexemeUnitShadow,
>(
	existing: ReadingKnowledge<ExistingLanguage, Lemma, LexicalShadow>,
	change: RetractTranslations<Language, Lemma, LexicalShadow>,
): ReadingKnowledge<Exclude<ExistingLanguage, Language>, Lemma, LexicalShadow>;
export function applyKnowledgeChange<
	ExistingLanguage extends string,
	Language extends string,
	Lemma extends LemmaReference,
	LexicalShadow extends LexemeUnitShadow,
>(
	existing:
		| ReadingKnowledge<ExistingLanguage, Lemma, LexicalShadow>
		| undefined,
	change: RetractTranslations<Language, Lemma, LexicalShadow>,
):
	| ReadingKnowledge<
			Exclude<ExistingLanguage, Language>,
			Lemma,
			LexicalShadow
	  >
	| ReadingKnowledge<never, Lemma, LexicalShadow>;

export function applyKnowledgeChange<
	Lemma extends LemmaReference = LemmaReference,
	LexicalShadow extends LexemeUnitShadow = LexemeUnitShadow,
>(
	existing: undefined,
	change: NonLanguageReadingChange<Lemma, LexicalShadow>,
): ReadingKnowledge<never, Lemma, LexicalShadow>;
export function applyKnowledgeChange<
	ExistingLanguage extends string,
	Lemma extends LemmaReference,
	LexicalShadow extends LexemeUnitShadow,
>(
	existing: ReadingKnowledge<ExistingLanguage, Lemma, LexicalShadow>,
	change: NonLanguageReadingChange<Lemma, LexicalShadow>,
): ReadingKnowledge<ExistingLanguage, Lemma, LexicalShadow>;
export function applyKnowledgeChange<
	ExistingLanguage extends string,
	Lemma extends LemmaReference,
	LexicalShadow extends LexemeUnitShadow,
>(
	existing:
		| ReadingKnowledge<ExistingLanguage, Lemma, LexicalShadow>
		| undefined,
	change: NonLanguageReadingChange<Lemma, LexicalShadow>,
):
	| ReadingKnowledge<ExistingLanguage, Lemma, LexicalShadow>
	| ReadingKnowledge<never, Lemma, LexicalShadow>;

export function applyKnowledgeChange<
	ExistingLanguage extends string,
	Language extends string,
	Lemma extends LemmaReference,
	LexicalShadow extends LexemeUnitShadow,
>(
	existing:
		| ReadingKnowledge<ExistingLanguage, Lemma, LexicalShadow>
		| undefined,
	change: KnowledgeChange<Language, Lemma, LexicalShadow>,
):
	| ReadingKnowledge<ExistingLanguage | Language, Lemma, LexicalShadow>
	| ReadingKnowledge<
			Exclude<ExistingLanguage, Language>,
			Lemma,
			LexicalShadow
	  >
	| ReadingKnowledge<ExistingLanguage, Lemma, LexicalShadow>
	| ReadingKnowledge<Language, Lemma, LexicalShadow>
	| ReadingKnowledge<never, Lemma, LexicalShadow>;

export function applyKnowledgeChange(
	existing: ReadingKnowledge | undefined,
	change: KnowledgeChange,
): ReadingKnowledge {
	const parsedChange = unwrapDumrelParse(parseAsKnowledgeChange(change));
	const result = unwrapDumrelParse(parseAsReadingKnowledge(existing ?? {}));
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
	return unwrapDumrelParse(parseAsReadingKnowledge(result));
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
	const requestedTargetKind = change.targetKind ?? "lemma";
	const existingRelations = knowledge.semanticRelations;
	const existingTargetKind =
		existingRelations !== undefined &&
		"targetKind" in existingRelations &&
		existingRelations.targetKind === "reading"
			? "reading"
			: "lemma";
	if (
		knowledge.semanticRelations !== undefined &&
		existingTargetKind !== requestedTargetKind
	) {
		throw new Error(
			"One Reading Knowledge value cannot mix Lemma- and Reading-targeted Semantic Relations.",
		);
	}
	const relations: Record<string, unknown> = {
		...knowledge.semanticRelations,
		...(requestedTargetKind === "reading"
			? { targetKind: "reading" as const }
			: {}),
	};
	if (change.kind === "Retract") {
		delete relations[change.relation];
		if (
			requestedTargetKind === "lemma" &&
			Object.keys(relations).length === 0
		)
			delete knowledge.semanticRelations;
		else knowledge.semanticRelations = relations as SemanticRelations;
		return;
	}

	const existing = Array.isArray(relations[change.relation])
		? (relations[change.relation] as unknown[])
		: [];
	relations[change.relation] =
		change.kind === "Correct"
			? stableUnique(change.value as readonly unknown[])
			: appendUnique(existing, change.value as readonly unknown[]);
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
