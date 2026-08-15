import {
	knowledgeChangeSchema,
	lemmaKnowledgeSchema,
	readingKnowledgeSchema,
} from "./schema.js";
import type {
	KnowledgeChange,
	LemmaKnowledge,
	LexemeUnitShadow,
	ReadingKnowledge,
	ReadingReference,
} from "./types.js";

type SetTranscriptions<Language extends string> = Extract<
	KnowledgeChange<Language>,
	{ aspect: "transcriptions"; kind: "Contribute" | "Correct" }
>;

type RetractTranscriptions<Language extends string> = Extract<
	KnowledgeChange<Language>,
	{ aspect: "transcriptions"; kind: "Retract" }
>;

type SetTranslations<
	Language extends string,
	Reading extends ReadingReference,
	LexicalShadow extends LexemeUnitShadow,
> = Extract<
	KnowledgeChange<Language, Reading, LexicalShadow>,
	{ aspect: "translations"; kind: "Contribute" | "Correct" }
>;

type RetractTranslations<
	Language extends string,
	Reading extends ReadingReference,
	LexicalShadow extends LexemeUnitShadow,
> = Extract<
	KnowledgeChange<Language, Reading, LexicalShadow>,
	{ aspect: "translations"; kind: "Retract" }
>;

type NonLanguageReadingChange<
	Reading extends ReadingReference,
	LexicalShadow extends LexemeUnitShadow,
> = Exclude<
	KnowledgeChange<string, Reading, LexicalShadow>,
	{ aspect: "transcriptions" | "translations" }
>;

export function applyKnowledgeChange<Language extends string>(
	existing: undefined,
	change: SetTranscriptions<Language>,
): LemmaKnowledge<Language>;
export function applyKnowledgeChange<
	ExistingLanguage extends string,
	Language extends string,
>(
	existing: LemmaKnowledge<ExistingLanguage>,
	change: SetTranscriptions<Language>,
): LemmaKnowledge<ExistingLanguage | Language>;
export function applyKnowledgeChange<
	ExistingLanguage extends string,
	Language extends string,
>(
	existing: LemmaKnowledge<ExistingLanguage> | undefined,
	change: SetTranscriptions<Language>,
): LemmaKnowledge<ExistingLanguage | Language> | LemmaKnowledge<Language>;

export function applyKnowledgeChange<Language extends string>(
	existing: undefined,
	change: RetractTranscriptions<Language>,
): LemmaKnowledge<never>;
export function applyKnowledgeChange<
	ExistingLanguage extends string,
	Language extends string,
>(
	existing: LemmaKnowledge<ExistingLanguage>,
	change: RetractTranscriptions<Language>,
): LemmaKnowledge<Exclude<ExistingLanguage, Language>>;
export function applyKnowledgeChange<
	ExistingLanguage extends string,
	Language extends string,
>(
	existing: LemmaKnowledge<ExistingLanguage> | undefined,
	change: RetractTranscriptions<Language>,
): LemmaKnowledge<Exclude<ExistingLanguage, Language>> | LemmaKnowledge<never>;

export function applyKnowledgeChange<Language extends string>(
	existing: undefined,
	change: SetTranslations<Language, ReadingReference, LexemeUnitShadow>,
): ReadingKnowledge<Language>;
export function applyKnowledgeChange<
	ExistingLanguage extends string,
	Language extends string,
	Reading extends ReadingReference,
	LexicalShadow extends LexemeUnitShadow,
>(
	existing: ReadingKnowledge<ExistingLanguage, Reading, LexicalShadow>,
	change: SetTranslations<Language, Reading, LexicalShadow>,
): ReadingKnowledge<ExistingLanguage | Language, Reading, LexicalShadow>;
export function applyKnowledgeChange<
	ExistingLanguage extends string,
	Language extends string,
	Reading extends ReadingReference,
	LexicalShadow extends LexemeUnitShadow,
>(
	existing:
		| ReadingKnowledge<ExistingLanguage, Reading, LexicalShadow>
		| undefined,
	change: SetTranslations<Language, Reading, LexicalShadow>,
):
	| ReadingKnowledge<ExistingLanguage | Language, Reading, LexicalShadow>
	| ReadingKnowledge<Language, Reading, LexicalShadow>;

export function applyKnowledgeChange<Language extends string>(
	existing: undefined,
	change: RetractTranslations<Language, ReadingReference, LexemeUnitShadow>,
): ReadingKnowledge<never>;
export function applyKnowledgeChange<
	ExistingLanguage extends string,
	Language extends string,
	Reading extends ReadingReference,
	LexicalShadow extends LexemeUnitShadow,
>(
	existing: ReadingKnowledge<ExistingLanguage, Reading, LexicalShadow>,
	change: RetractTranslations<Language, Reading, LexicalShadow>,
): ReadingKnowledge<
	Exclude<ExistingLanguage, Language>,
	Reading,
	LexicalShadow
>;
export function applyKnowledgeChange<
	ExistingLanguage extends string,
	Language extends string,
	Reading extends ReadingReference,
	LexicalShadow extends LexemeUnitShadow,
>(
	existing:
		| ReadingKnowledge<ExistingLanguage, Reading, LexicalShadow>
		| undefined,
	change: RetractTranslations<Language, Reading, LexicalShadow>,
):
	| ReadingKnowledge<
			Exclude<ExistingLanguage, Language>,
			Reading,
			LexicalShadow
	  >
	| ReadingKnowledge<never, Reading, LexicalShadow>;

export function applyKnowledgeChange<
	Reading extends ReadingReference = ReadingReference,
	LexicalShadow extends LexemeUnitShadow = LexemeUnitShadow,
>(
	existing: undefined,
	change: NonLanguageReadingChange<Reading, LexicalShadow>,
): ReadingKnowledge<never, Reading, LexicalShadow>;
export function applyKnowledgeChange<
	ExistingLanguage extends string,
	Reading extends ReadingReference,
	LexicalShadow extends LexemeUnitShadow,
>(
	existing: ReadingKnowledge<ExistingLanguage, Reading, LexicalShadow>,
	change: NonLanguageReadingChange<Reading, LexicalShadow>,
): ReadingKnowledge<ExistingLanguage, Reading, LexicalShadow>;
export function applyKnowledgeChange<
	ExistingLanguage extends string,
	Reading extends ReadingReference,
	LexicalShadow extends LexemeUnitShadow,
>(
	existing:
		| ReadingKnowledge<ExistingLanguage, Reading, LexicalShadow>
		| undefined,
	change: NonLanguageReadingChange<Reading, LexicalShadow>,
):
	| ReadingKnowledge<ExistingLanguage, Reading, LexicalShadow>
	| ReadingKnowledge<never, Reading, LexicalShadow>;

export function applyKnowledgeChange<
	ExistingLanguage extends string,
	Language extends string,
>(
	existing: LemmaKnowledge<ExistingLanguage> | undefined,
	change: Extract<KnowledgeChange<Language>, { aspect: "transcriptions" }>,
):
	| LemmaKnowledge<ExistingLanguage | Language>
	| LemmaKnowledge<Exclude<ExistingLanguage, Language>>
	| LemmaKnowledge<Language>
	| LemmaKnowledge<never>;

export function applyKnowledgeChange<
	ExistingLanguage extends string,
	Language extends string,
	Reading extends ReadingReference,
	LexicalShadow extends LexemeUnitShadow,
>(
	existing:
		| ReadingKnowledge<ExistingLanguage, Reading, LexicalShadow>
		| undefined,
	change: Exclude<
		KnowledgeChange<Language, Reading, LexicalShadow>,
		{ aspect: "transcriptions" }
	>,
):
	| ReadingKnowledge<ExistingLanguage | Language, Reading, LexicalShadow>
	| ReadingKnowledge<
			Exclude<ExistingLanguage, Language>,
			Reading,
			LexicalShadow
	  >
	| ReadingKnowledge<ExistingLanguage, Reading, LexicalShadow>
	| ReadingKnowledge<Language, Reading, LexicalShadow>
	| ReadingKnowledge<never, Reading, LexicalShadow>;

export function applyKnowledgeChange(
	existing: LemmaKnowledge | ReadingKnowledge | undefined,
	change: KnowledgeChange,
): LemmaKnowledge | ReadingKnowledge {
	const parsedChange = knowledgeChangeSchema.parse(change);
	if (parsedChange.aspect === "transcriptions") {
		const result = lemmaKnowledgeSchema.parse(existing ?? {});
		applyLanguageBucket(result, parsedChange);
		return lemmaKnowledgeSchema.parse(result);
	}

	const result = readingKnowledgeSchema.parse(existing ?? {});
	switch (parsedChange.aspect) {
		case "translations":
			applyLanguageBucket(result, parsedChange);
			break;
		case "semanticRelations":
			applyRelationBucket(result, parsedChange);
			break;
		case "definition":
		case "morphologicalTree":
		case "lexicalBreakdown":
			applyAtomicAspect(result, parsedChange);
			break;
	}
	return readingKnowledgeSchema.parse(result);
}

type LanguageBucketChange = Extract<
	KnowledgeChange,
	{ aspect: "transcriptions" | "translations" }
>;

function applyLanguageBucket(
	knowledge: LemmaKnowledge | ReadingKnowledge,
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
	const relations = { ...knowledge.semanticRelations };
	if (change.kind === "Retract") {
		delete relations[change.relation];
		if (Object.keys(relations).length === 0)
			delete knowledge.semanticRelations;
		else knowledge.semanticRelations = relations;
		return;
	}

	const existing = relations[change.relation] ?? [];
	relations[change.relation] =
		change.kind === "Correct"
			? stableUnique(change.value)
			: appendUnique(existing, change.value);
	knowledge.semanticRelations = relations;
}

type AtomicChange = Extract<
	KnowledgeChange,
	{ aspect: "definition" | "morphologicalTree" | "lexicalBreakdown" }
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
	contribution: readonly Value[],
): Value[] {
	const result = existing.map((value) => structuredClone(value));
	const fingerprints = new Set(result.map(stableFingerprint));
	for (const value of contribution) {
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
