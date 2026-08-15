import type {
	KnowledgeChange,
	MorphemeReadingReference,
	MorphologicalTree,
	MorphologicalTreeNode,
	PendingSemanticRelation,
} from "dumrel";
import {
	knowledgeChangeSchema,
	lexicalBreakdownSchema,
	lexicalUnitShadowSchema,
	morphemeReadingReferenceSchema,
	morphologicalTreeSchema,
	pendingSemanticRelationSchema,
} from "dumrel";
import type { output } from "zod";

import {
	type lexicalResolutionOutputSchema,
	morphemeReadingDraftSchema,
	type morphologicalResolutionOutputSchema,
	translationAnalysisInputSchema,
	translationAnalysisOutputSchema,
} from "./schemas";

export type MorphemeReadingDraft = output<typeof morphemeReadingDraftSchema>;

type ContributeChange<Change, Aspect> = Change extends {
	aspect: Aspect;
	kind: infer Kind;
}
	? "Contribute" extends Kind
		? Omit<Change, "kind"> & { kind: "Contribute" }
		: never
	: never;

type MorphologicalTreeChange = ContributeChange<
	KnowledgeChange,
	"morphologicalTree"
>;
type LexicalBreakdownChange = ContributeChange<
	KnowledgeChange,
	"lexicalBreakdown"
>;
type TranslationChange = ContributeChange<KnowledgeChange, "translations">;

/**
 * Resolves only private Morpheme drafts, validates the completed pointer-only
 * tree with Dumrel's concrete schema, and wraps it in one Knowledge Change.
 */
export function projectMorphologicalTreeChange(
	draft: output<typeof morphologicalResolutionOutputSchema>,
	resolveMorphemeReading: (draft: MorphemeReadingDraft) => unknown,
): MorphologicalTreeChange {
	const value = morphologicalTreeSchema.parse({
		root: projectStructureNode(draft.root, resolveMorphemeReading),
	});
	return knowledgeChangeSchema.parse({
		kind: "Contribute",
		aspect: "morphologicalTree",
		value,
	}) as MorphologicalTreeChange;
}

/**
 * Validates the final ordered, repeat-preserving Lexeme-shadow list and wraps
 * it in one Knowledge Change.
 */
export function projectLexicalBreakdownChange(
	draft: output<typeof lexicalResolutionOutputSchema>,
): LexicalBreakdownChange {
	const value = lexicalBreakdownSchema.parse(draft);
	return knowledgeChangeSchema.parse({
		kind: "Contribute",
		aspect: "lexicalBreakdown",
		value,
	}) as LexicalBreakdownChange;
}

/** Unresolved relation targets cross the boundary only as validated pending DTOs. */
export function projectPendingSemanticRelation(
	candidate: unknown,
): PendingSemanticRelation {
	return pendingSemanticRelationSchema.parse(candidate);
}

/**
 * Converts the private match-versus-add result into an idempotent Translation
 * contribution. A Covered decision reuses the exact stored literal instead of
 * trusting the model to reproduce its bytes.
 */
export function projectTranslationChange(
	rawInput: output<typeof translationAnalysisInputSchema>,
	rawAnalysis: output<typeof translationAnalysisOutputSchema>,
): TranslationChange {
	const input = translationAnalysisInputSchema.parse(rawInput);
	const analysis = translationAnalysisOutputSchema.parse(rawAnalysis);
	let translation: string;
	if (analysis.decision === "Covered") {
		const existing = input.existingTranslations[analysis.existingIndex];
		if (existing === undefined) {
			throw new Error(
				"Translation Analysis selected a missing existing Translation.",
			);
		}
		translation = existing;
	} else {
		translation = analysis.translation;
	}

	return knowledgeChangeSchema.parse({
		kind: "Contribute",
		aspect: "translations",
		language: input.targetLanguage,
		value: [translation],
	}) as TranslationChange;
}

function projectStructureNode(
	value: unknown,
	resolveMorphemeReading: (draft: MorphemeReadingDraft) => unknown,
): Extract<MorphologicalTree["root"], { nodeKind: "structure" }> {
	const node = asRecord(value, "Morphological structure node");
	if (node.nodeKind !== "structure" || !Array.isArray(node.children)) {
		throw new Error("Expected a Morphological structure node.");
	}
	return {
		nodeKind: "structure",
		children: node.children.map((child) =>
			projectNode(child, resolveMorphemeReading),
		) as MorphologicalTree["root"]["children"],
	};
}

function projectNode(
	value: unknown,
	resolveMorphemeReading: (draft: MorphemeReadingDraft) => unknown,
): MorphologicalTreeNode {
	const node = asRecord(value, "Morphological node");
	if (node.nodeKind === "structure") {
		return projectStructureNode(node, resolveMorphemeReading);
	}
	if (node.nodeKind === "morphemeReading") {
		const draft = morphemeReadingDraftSchema.parse(node.reading);
		return {
			nodeKind: "morphemeReading",
			reading: morphemeReadingReferenceSchema.parse(
				resolveMorphemeReading(draft),
			) as MorphemeReadingReference,
		};
	}
	if (node.nodeKind === "unitShadow") {
		return {
			nodeKind: "unitShadow",
			unitShadow: lexicalUnitShadowSchema.parse(node.unitShadow),
		};
	}
	throw new Error("Unknown Morphological Tree node.");
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		throw new Error(`${label} must be an object.`);
	}
	return value as Record<string, unknown>;
}
