import type {
	LemmaFamilyFor,
	LemmaKindFor,
	SupportedLanguage,
} from "dumling/types";
import type { SemanticRelation } from "./relation-vocabulary.js";

/** An identityless grammatical sketch. Its containing structure owns context. */
export type UnitShadow<
	L extends SupportedLanguage = SupportedLanguage,
	F extends LemmaFamilyFor<L> = LemmaFamilyFor<L>,
> = {
	language: L;
	canonicalForm: string;
	family: F;
	kind: LemmaKindFor<L, F>;
};

export type LexicalUnitShadow<L extends SupportedLanguage = SupportedLanguage> =
	| UnitShadow<L, Extract<LemmaFamilyFor<L>, "Lexeme">>
	| UnitShadow<L, Extract<LemmaFamilyFor<L>, "Phraseme">>;

export type LexemeUnitShadow<L extends SupportedLanguage = SupportedLanguage> =
	UnitShadow<L, Extract<LemmaFamilyFor<L>, "Lexeme">>;

/**
 * A Morphological Tree stores only hierarchy and component pointers. Dumling's
 * Lemma DTO on a resolved Morpheme Reading owns its grammatical distinctions.
 */
export type MorphologicalTreeNode<MorphemeReading, LexicalShadow> =
	| { nodeKind: "morphemeReading"; reading: MorphemeReading }
	| { nodeKind: "unitShadow"; unitShadow: LexicalShadow }
	| MorphologicalTreeStructure<MorphemeReading, LexicalShadow>;

export type MorphologicalTreeStructure<MorphemeReading, LexicalShadow> = {
	nodeKind: "structure";
	/** Runtime schemas require this ordered array to be non-empty. */
	children: MorphologicalTreeNode<MorphemeReading, LexicalShadow>[];
};

export type MorphologicalTree<MorphemeReading, LexicalShadow> = {
	root: MorphologicalTreeStructure<MorphemeReading, LexicalShadow>;
};

export type MorphologicalTreeContribution<MorphemeReading, LexicalShadow> =
	MorphologicalTree<MorphemeReading, LexicalShadow>;

/** Order and repetition are represented only by list position and entries. */
export type LexicalBreakdown<LexemeShadow> = LexemeShadow[];

export type LexicalBreakdownContribution<LexemeShadow> =
	LexicalBreakdown<LexemeShadow>;

export type ReadingKnowledge<MorphemeReading, LexicalShadow> = {
	definition?: string;
	translations?: Translation[];
	morphologicalTree?: MorphologicalTree<MorphemeReading, LexicalShadow>;
	lexicalBreakdown?: LexicalBreakdown<LexicalShadow>;
	semanticRelations?: Partial<Record<SemanticRelation, MorphemeReading[]>>;
};

export type ReadingKnowledgeContribution<MorphemeReading, LexicalShadow> = {
	definition?: string;
	translations?: Translation[];
	morphologicalTree?: MorphologicalTreeContribution<
		MorphemeReading,
		LexicalShadow
	>;
	lexicalBreakdown?: LexicalBreakdownContribution<LexicalShadow>;
	semanticRelations?: Partial<Record<SemanticRelation, MorphemeReading[]>>;
};

export type Translation = {
	targetLanguage: string;
	text: string;
};

export type LemmaKnowledge = {
	transcription: string;
};

/** Knowledge values are identityless; the owner kind is supplied externally. */
export type Knowledge<
	Owner extends "Lemma" | "Reading",
	Reading = never,
	Shadow = never,
> = Owner extends "Lemma" ? LemmaKnowledge : ReadingKnowledge<Reading, Shadow>;

/** Phrasemes and learner-useful verbal Lexemes admit Lexical Breakdown. */
export function admitsLexicalBreakdown(owner: {
	readonly family: string;
	readonly kind: string;
}): boolean {
	return (
		owner.family === "Phraseme" ||
		(owner.family === "Lexeme" && owner.kind === "VERB")
	);
}

export function assertReadingKnowledgeForOwner(
	owner:
		| { readonly family: string; readonly kind: string }
		| {
				readonly lemma: {
					readonly family: string;
					readonly kind: string;
				};
		  },
	knowledge: { readonly lexicalBreakdown?: unknown },
): void {
	const descriptor = "lemma" in owner ? owner.lemma : owner;
	if (
		knowledge.lexicalBreakdown !== undefined &&
		!admitsLexicalBreakdown(descriptor)
	) {
		throw new Error(
			`${descriptor.family}/${descriptor.kind} does not admit a Lexical Breakdown.`,
		);
	}
}

export function mergeReadingKnowledge<Reading, Shadow>(
	existing: ReadingKnowledge<Reading, Shadow> | undefined,
	contribution: ReadingKnowledgeContribution<Reading, Shadow>,
): ReadingKnowledge<Reading, Shadow> {
	const merged: ReadingKnowledge<Reading, Shadow> = {
		...(existing?.definition === undefined
			? {}
			: { definition: existing.definition }),
		...(existing?.translations === undefined
			? {}
			: { translations: existing.translations }),
		...(existing?.morphologicalTree === undefined
			? {}
			: { morphologicalTree: existing.morphologicalTree }),
		...(existing?.lexicalBreakdown === undefined
			? {}
			: { lexicalBreakdown: existing.lexicalBreakdown }),
		...(existing?.semanticRelations === undefined
			? {}
			: { semanticRelations: existing.semanticRelations }),
	};

	if (contribution.definition !== undefined) {
		if (
			existing?.definition !== undefined &&
			existing.definition !== contribution.definition
		) {
			throw new Error(
				"A conflicting Definition requires an explicit correction, not an additive Knowledge Contribution.",
			);
		}
		merged.definition = contribution.definition;
	}
	if (contribution.translations !== undefined) {
		merged.translations = mergeUniqueValues(
			existing?.translations,
			contribution.translations,
		);
	}
	if (contribution.morphologicalTree !== undefined) {
		merged.morphologicalTree = mergeExactAspect(
			existing?.morphologicalTree,
			contribution.morphologicalTree,
			"Morphological Tree",
		);
	}
	if (contribution.lexicalBreakdown !== undefined) {
		merged.lexicalBreakdown = mergeExactAspect(
			existing?.lexicalBreakdown,
			contribution.lexicalBreakdown,
			"Lexical Breakdown",
		);
	}
	if (contribution.semanticRelations !== undefined) {
		merged.semanticRelations = mergeSemanticRelations(
			existing?.semanticRelations,
			contribution.semanticRelations,
		);
	}

	return deepFreeze(merged);
}

function mergeExactAspect<Value>(
	existing: Value | undefined,
	contribution: Value,
	label: string,
): Value {
	if (
		existing !== undefined &&
		stableFingerprint(existing) !== stableFingerprint(contribution)
	) {
		throw new Error(
			`A different ${label} requires an explicit correction, not an additive Knowledge Contribution.`,
		);
	}
	return existing ?? contribution;
}

function mergeSemanticRelations<Reading>(
	existing: Partial<Record<SemanticRelation, Reading[]>> | undefined,
	contribution: Partial<Record<SemanticRelation, Reading[]>>,
): Partial<Record<SemanticRelation, Reading[]>> {
	const merged = { ...existing };
	for (const [relation, targets] of Object.entries(contribution) as [
		SemanticRelation,
		Reading[],
	][]) {
		merged[relation] = mergeUniqueValues(existing?.[relation], targets);
	}
	return merged;
}

function mergeUniqueValues<Value>(
	existing: Value[] | undefined,
	contribution: Value[],
): Value[] {
	const merged = existing === undefined ? [] : [...existing];
	const fingerprints = new Set(merged.map(stableFingerprint));
	for (const value of contribution) {
		const fingerprint = stableFingerprint(value);
		if (!fingerprints.has(fingerprint)) {
			merged.push(value);
			fingerprints.add(fingerprint);
		}
	}
	return merged;
}

function stableFingerprint(value: unknown): string {
	return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(sortValue);
	if (value !== null && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value)
				.sort(([left], [right]) => left.localeCompare(right))
				.map(([key, child]) => [key, sortValue(child)]),
		);
	}
	return value;
}

function deepFreeze<T>(value: T): T {
	if (
		value !== null &&
		typeof value === "object" &&
		!Object.isFrozen(value)
	) {
		Object.freeze(value);
		for (const child of Object.values(value)) deepFreeze(child);
	}
	return value;
}
