import { readingFingerprint } from "dumling/id";
import type { Lemma, Reading, SupportedLanguage, Surface } from "dumling/types";
import type {
	KnowledgeChange,
	MorphologicalTreeNode,
	ReadingKnowledge,
} from "dumrel/types";
import type { DeepReadonly, PendingEntryId } from "./domain-types.js";
import { makeLemmaId, makeSurfaceId } from "./dumling-id.js";

export function retainDumdictPlan<Value>(value: Value): DeepReadonly<Value> {
	return value as DeepReadonly<Value>;
}

export function retainCommitChangesRequest<
	Value extends { readonly changes: readonly unknown[] },
>(
	value: Value,
): Readonly<{
	[Key in keyof Value]: Key extends "changes"
		? Readonly<Value[Key]>
		: Value[Key];
}> {
	return value as Readonly<{
		[Key in keyof Value]: Key extends "changes"
			? Readonly<Value[Key]>
			: Value[Key];
	}>;
}

function bindPendingEntryIdFor<Language extends SupportedLanguage>(
	value: string,
): PendingEntryId<Language> {
	return value as PendingEntryId<Language>;
}

export const dumdictNamedValidationTransforms = {
	"dumdict.pending-entry-id.de": bindPendingEntryIdFor<"de">,
	"dumdict.pending-entry-id.en": bindPendingEntryIdFor<"en">,
	"dumdict.pending-entry-id.he": bindPendingEntryIdFor<"he">,
} as const;

function lemmaUsesLanguage(lemma: Lemma, language: SupportedLanguage): boolean {
	return lemma.language === language;
}

function sameLemma(left: Lemma, right: Lemma): boolean {
	if (left.language !== right.language) return false;
	return (
		makeLemmaId(left.language, left) === makeLemmaId(right.language, right)
	);
}

function sameReading(left: Reading, right: Reading): boolean {
	return readingFingerprint(left) === readingFingerprint(right);
}

function readingUsesLanguage(
	reading: Reading,
	language: SupportedLanguage,
): boolean {
	return reading.lemma.language === language;
}

function knowledgeUsesLanguage(
	knowledge: ReadingKnowledge,
	language: SupportedLanguage,
): boolean {
	for (const targets of Object.values(knowledge.semanticRelations ?? {})) {
		if (
			(targets ?? []).some(
				(target) => !lemmaUsesLanguage(target, language),
			)
		)
			return false;
	}

	const visitMorphologyNode = (node: MorphologicalTreeNode): boolean => {
		if (node.nodeKind === "morphemeReading")
			return readingUsesLanguage(node.reading, language);
		if (node.nodeKind === "unitShadow")
			return node.unitShadow.language === language;
		return node.children.every(visitMorphologyNode);
	};

	if (
		knowledge.morphologicalTree !== undefined &&
		!visitMorphologyNode(knowledge.morphologicalTree.root)
	)
		return false;
	return (knowledge.lexicalBreakdown ?? []).every(
		(shadow) => shadow.language === language,
	);
}

function knowledgeChangeUsesLanguage(
	change: KnowledgeChange,
	language: SupportedLanguage,
): boolean {
	if (change.aspect === "semanticRelations" && "value" in change)
		return change.value.every((lemma) =>
			lemmaUsesLanguage(lemma, language),
		);
	if (change.aspect === "morphologicalTree" && "value" in change)
		return knowledgeUsesLanguage(
			{ morphologicalTree: change.value },
			language,
		);
	if (change.aspect === "lexicalBreakdown" && "value" in change)
		return change.value.every((shadow) => shadow.language === language);
	return true;
}

type ReadingEntryLike = {
	readonly knowledge?: ReadingKnowledge;
	readonly reading: Reading;
};

type SurfaceEntryLike = {
	readonly id: string;
	readonly ownerLemma: Lemma;
	readonly surface: Surface;
};

type PendingSemanticRelationRecordLike = {
	readonly locator: {
		readonly relation: string;
		readonly sourceReadingKey: string;
	};
	readonly pending: {
		readonly relation: string;
		readonly target: { readonly language: SupportedLanguage };
	};
	readonly sourceReading: Reading;
};

type PendingSemanticRelationLike = {
	readonly target: { readonly language: SupportedLanguage };
};

type PlannedChangeLike = {
	readonly ops?: readonly {
		readonly envelope?: { readonly reading: Reading };
		readonly kind: string;
	}[];
	readonly reading?: Reading;
	readonly type: string;
};

function readingEntryHasNoDirectSameLemma(entry: ReadingEntryLike): boolean {
	return Object.values(entry.knowledge?.semanticRelations ?? {}).every(
		(targets) =>
			(targets ?? []).every(
				(target) => !sameLemma(entry.reading.lemma, target),
			),
	);
}

function surfaceOwnerMatches(entry: SurfaceEntryLike): boolean {
	return sameLemma(entry.ownerLemma, entry.surface.lemma);
}

function surfaceIdMatches(entry: SurfaceEntryLike): boolean {
	return entry.id === makeSurfaceId(entry.surface.language, entry.surface);
}

function pendingLocatorIdentifiesSource(
	record: PendingSemanticRelationRecordLike,
): boolean {
	return (
		record.locator.sourceReadingKey ===
		readingFingerprint(record.sourceReading)
	);
}

function pendingLocatorMatchesRelation(
	record: PendingSemanticRelationRecordLike,
): boolean {
	return record.locator.relation === record.pending.relation;
}

function knowledgeChangeReadingMatchesPatched(
	change: PlannedChangeLike,
): boolean {
	return (
		change.type !== "patchReading" ||
		(change.ops ?? []).every(
			(operation) =>
				operation.kind !== "applyKnowledgeChange" ||
				(operation.envelope !== undefined &&
					change.reading !== undefined &&
					sameReading(change.reading, operation.envelope.reading)),
		)
	);
}

function forLanguage<Value>(
	language: SupportedLanguage,
	predicate: (value: Value, language: SupportedLanguage) => boolean,
): (value: unknown) => boolean {
	return (value) => predicate(value as Value, language);
}

function namedPredicate<Value>(
	predicate: (value: Value) => boolean,
): (value: unknown) => boolean {
	return (value) => predicate(value as Value);
}

const predicateNames = [
	"dumdict.knowledge-change.language.de",
	"dumdict.knowledge-change.language.en",
	"dumdict.knowledge-change.language.he",
	"dumdict.knowledge-change.reading-matches-patched",
	"dumdict.pending.locator-matches-relation",
	"dumdict.pending.locator-source",
	"dumdict.pending.target-language.de",
	"dumdict.pending.target-language.en",
	"dumdict.pending.target-language.he",
	"dumdict.reading-entry.no-same-lemma",
	"dumdict.reading-knowledge.language.de",
	"dumdict.reading-knowledge.language.en",
	"dumdict.reading-knowledge.language.he",
	"dumdict.reading.language.de",
	"dumdict.reading.language.en",
	"dumdict.reading.language.he",
	"dumdict.surface.id-matches",
	"dumdict.surface.owner-matches",
] as const;

type PredicateName = (typeof predicateNames)[number];
type NamedPredicate = (value: unknown) => boolean;

function lazyNamedRegistry<Value>(
	names: readonly string[],
	construct: (name: never) => Value,
): Readonly<Record<string, Value>> {
	const cache: Record<string, Value> = Object.create(null);
	return new Proxy(cache, {
		get(target, property) {
			if (typeof property !== "string") return undefined;
			const cached = target[property];
			if (cached !== undefined) return cached;
			if (!names.includes(property))
				throw new ReferenceError(
					`Unknown Dumdict validation name: ${property}.`,
				);
			const value = construct(property as never);
			target[property] = value;
			return value;
		},
		getOwnPropertyDescriptor: (_target, property) =>
			typeof property === "string" && names.includes(property)
				? { configurable: true, enumerable: true }
				: undefined,
		ownKeys: () => [...names],
	});
}

function constructNamedPredicate(name: PredicateName): NamedPredicate {
	switch (name) {
		case "dumdict.knowledge-change.language.de":
			return forLanguage("de", knowledgeChangeUsesLanguage);
		case "dumdict.knowledge-change.language.en":
			return forLanguage("en", knowledgeChangeUsesLanguage);
		case "dumdict.knowledge-change.language.he":
			return forLanguage("he", knowledgeChangeUsesLanguage);
		case "dumdict.knowledge-change.reading-matches-patched":
			return namedPredicate(knowledgeChangeReadingMatchesPatched);
		case "dumdict.pending.locator-matches-relation":
			return namedPredicate(pendingLocatorMatchesRelation);
		case "dumdict.pending.locator-source":
			return namedPredicate(pendingLocatorIdentifiesSource);
		case "dumdict.pending.target-language.de":
			return forLanguage(
				"de",
				(pending: PendingSemanticRelationLike, language) =>
					pending.target.language === language,
			);
		case "dumdict.pending.target-language.en":
			return forLanguage(
				"en",
				(pending: PendingSemanticRelationLike, language) =>
					pending.target.language === language,
			);
		case "dumdict.pending.target-language.he":
			return forLanguage(
				"he",
				(pending: PendingSemanticRelationLike, language) =>
					pending.target.language === language,
			);
		case "dumdict.reading-entry.no-same-lemma":
			return namedPredicate(readingEntryHasNoDirectSameLemma);
		case "dumdict.reading-knowledge.language.de":
			return forLanguage("de", knowledgeUsesLanguage);
		case "dumdict.reading-knowledge.language.en":
			return forLanguage("en", knowledgeUsesLanguage);
		case "dumdict.reading-knowledge.language.he":
			return forLanguage("he", knowledgeUsesLanguage);
		case "dumdict.reading.language.de":
			return forLanguage("de", readingUsesLanguage);
		case "dumdict.reading.language.en":
			return forLanguage("en", readingUsesLanguage);
		case "dumdict.reading.language.he":
			return forLanguage("he", readingUsesLanguage);
		case "dumdict.surface.id-matches":
			return namedPredicate(surfaceIdMatches);
		case "dumdict.surface.owner-matches":
			return namedPredicate(surfaceOwnerMatches);
	}
}

export const dumdictNamedValidationPredicates = lazyNamedRegistry(
	predicateNames,
	constructNamedPredicate,
) as Readonly<Record<PredicateName, NamedPredicate>>;

function constantError(message: string): () => string {
	return () => message;
}

function constructNamedError(name: PredicateName): () => string {
	switch (name) {
		case "dumdict.knowledge-change.language.de":
			return constantError(
				"Reading Knowledge Change references must use de.",
			);
		case "dumdict.knowledge-change.language.en":
			return constantError(
				"Reading Knowledge Change references must use en.",
			);
		case "dumdict.knowledge-change.language.he":
			return constantError(
				"Reading Knowledge Change references must use he.",
			);
		case "dumdict.knowledge-change.reading-matches-patched":
			return constantError(
				"Knowledge Change Reading must match the patched Reading.",
			);
		case "dumdict.pending.locator-matches-relation":
			return constantError(
				"Pending Semantic Relation locator must match its relation.",
			);
		case "dumdict.pending.locator-source":
			return constantError(
				"Pending Semantic Relation locator must identify its source Reading.",
			);
		case "dumdict.pending.target-language.de":
			return constantError(
				"Pending Semantic Relation target must use de.",
			);
		case "dumdict.pending.target-language.en":
			return constantError(
				"Pending Semantic Relation target must use en.",
			);
		case "dumdict.pending.target-language.he":
			return constantError(
				"Pending Semantic Relation target must use he.",
			);
		case "dumdict.reading-entry.no-same-lemma":
			return constantError(
				"Reading Knowledge cannot contain a direct same-Lemma relation.",
			);
		case "dumdict.reading-knowledge.language.de":
			return constantError("Reading Knowledge references must use de.");
		case "dumdict.reading-knowledge.language.en":
			return constantError("Reading Knowledge references must use en.");
		case "dumdict.reading-knowledge.language.he":
			return constantError("Reading Knowledge references must use he.");
		case "dumdict.reading.language.de":
			return constantError("Reading must use de.");
		case "dumdict.reading.language.en":
			return constantError("Reading must use en.");
		case "dumdict.reading.language.he":
			return constantError("Reading must use he.");
		case "dumdict.surface.id-matches":
			return constantError("Surface Entry id must match its Surface.");
		case "dumdict.surface.owner-matches":
			return constantError(
				"Surface owner Lemma must match the realized Lemma.",
			);
	}
}

export const dumdictNamedValidationErrors = lazyNamedRegistry(
	predicateNames,
	constructNamedError,
) as Readonly<Record<PredicateName, () => string>>;
