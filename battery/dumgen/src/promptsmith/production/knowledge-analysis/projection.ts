import type {
	LexicalBreakdownContribution,
	MorphologicalTreeContribution,
	MorphologicalTreeNode,
	UnitShadow,
} from "dumrel";
import { unitShadowSchema } from "dumrel";
import type { output, ZodType } from "zod";

import {
	lexicalResolutionOutputSchema,
	morphemeReadingDraftSchema,
	type morphologicalResolutionOutputSchema,
} from "./schemas";

export type MorphemeReadingDraft = output<typeof morphemeReadingDraftSchema>;

/** The owning context supplies Reading identity and its complete endpoint schema. */
export type ReadingProjectionEndpoint<Draft, ReadingSchema extends ZodType> = {
	readingSchema: ReadingSchema;
	resolveReading: (draft: Draft) => unknown;
};

/**
 * Projects only Morpheme drafts. Lexical leaves already are Unit Shadows and
 * no prompt-time segmentation metadata crosses into Dumrel Knowledge.
 */
export function projectMorphologicalTreeContribution<
	ReadingSchema extends ZodType,
>(
	draft: output<typeof morphologicalResolutionOutputSchema>,
	endpoint: ReadingProjectionEndpoint<MorphemeReadingDraft, ReadingSchema>,
): MorphologicalTreeContribution<output<ReadingSchema>, UnitShadow> {
	return { root: projectStructureNode(draft.root, endpoint) };
}

/** Lexical Breakdown is already the final ordered list of Lexeme shadows. */
export function projectLexicalBreakdownContribution(
	draft: output<typeof lexicalResolutionOutputSchema>,
): LexicalBreakdownContribution<UnitShadow> {
	return lexicalResolutionOutputSchema.parse(draft);
}

function projectStructureNode<ReadingSchema extends ZodType>(
	value: unknown,
	endpoint: ReadingProjectionEndpoint<MorphemeReadingDraft, ReadingSchema>,
): Extract<
	MorphologicalTreeNode<output<ReadingSchema>, UnitShadow>,
	{ nodeKind: "structure" }
> {
	const node = asRecord(value, "Morphological structure node");
	if (node.nodeKind !== "structure" || !Array.isArray(node.children)) {
		throw new Error("Expected a Morphological structure node.");
	}
	return {
		nodeKind: "structure",
		children: node.children.map((child) => projectNode(child, endpoint)),
	};
}

function projectNode<ReadingSchema extends ZodType>(
	value: unknown,
	endpoint: ReadingProjectionEndpoint<MorphemeReadingDraft, ReadingSchema>,
): MorphologicalTreeNode<output<ReadingSchema>, UnitShadow> {
	const node = asRecord(value, "Morphological node");
	if (node.nodeKind === "structure") {
		return projectStructureNode(node, endpoint);
	}
	if (node.nodeKind === "morphemeReading") {
		return {
			nodeKind: "morphemeReading",
			reading: resolveAndValidateReading(
				endpoint,
				morphemeReadingDraftSchema.parse(node.reading),
			),
		};
	}
	if (node.nodeKind === "unitShadow") {
		return {
			nodeKind: "unitShadow",
			unitShadow: unitShadowSchema.parse(node.unitShadow),
		};
	}
	throw new Error("Unknown Morphological Tree node.");
}

function resolveAndValidateReading<Draft, ReadingSchema extends ZodType>(
	endpoint: ReadingProjectionEndpoint<Draft, ReadingSchema>,
	draft: Draft,
): output<ReadingSchema> {
	return endpoint.readingSchema.parse(endpoint.resolveReading(draft));
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		throw new Error(`${label} must be an object.`);
	}
	return value as Record<string, unknown>;
}
