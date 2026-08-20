import type {
	KnowledgeChange,
	LexicalUnitShadow,
	PendingSemanticRelation,
} from "dumrel";
import { knowledgeChangeSchema, pendingSemanticRelationSchema } from "dumrel";

import { knowledgeGenerationResultSchema } from "../../schemas/public-schemas";
import type { KnowledgeGenerationResult } from "../contracts";
import {
	type RequestableRelation,
	requestableRelationSchema,
} from "../relations";
import type {
	GermanKnowledgeAnalysis,
	GermanKnowledgeGenerationInput,
} from "./schemas";
import {
	assertGermanKnowledgeAnalysisMirrorsRequest,
	germanKnowledgeAnalysisSchema,
	germanKnowledgeGenerationInputSchema,
} from "./schemas";

export type GeneratedKnowledgeUpdate = KnowledgeGenerationResult;

export const generatedKnowledgeUpdateSchema = knowledgeGenerationResultSchema;

export const EMPTY_GENERATED_KNOWLEDGE_UPDATE =
	generatedKnowledgeUpdateSchema.parse({
		changes: [],
		pendingRelations: [],
	});

/** Pure conversion from one validated private analysis to Dumrel DTOs. */
export function projectGermanKnowledgeUpdate(
	rawInput: GermanKnowledgeGenerationInput,
	rawAnalysis: GermanKnowledgeAnalysis,
): GeneratedKnowledgeUpdate {
	const input = germanKnowledgeGenerationInputSchema.parse(rawInput);
	const analysis = germanKnowledgeAnalysisSchema.parse(rawAnalysis);
	assertGermanKnowledgeAnalysisMirrorsRequest(input, analysis);

	const changes: KnowledgeChange<"en">[] = [];
	if (
		analysis.transcription !== undefined &&
		analysis.transcription !== null
	) {
		changes.push(
			knowledgeChangeSchema.parse({
				kind: "Contribute",
				aspect: "transcription",
				value: analysis.transcription,
			}) as KnowledgeChange<"en">,
		);
	}
	if (analysis.definition !== undefined && analysis.definition !== null) {
		changes.push(
			knowledgeChangeSchema.parse({
				kind: "Contribute",
				aspect: "definition",
				value: analysis.definition,
			}) as KnowledgeChange<"en">,
		);
	}
	if (
		analysis.translations?.en !== undefined &&
		analysis.translations.en !== null
	) {
		changes.push(
			knowledgeChangeSchema.parse({
				kind: "Contribute",
				aspect: "translations",
				language: "en",
				value: [analysis.translations.en],
			}) as KnowledgeChange<"en">,
		);
	}

	const pendingRelations: PendingSemanticRelation[] = [];
	const relationByTarget = new Map<string, RequestableRelation>();
	for (const relation of requestableRelationSchema.options) {
		const targets = analysis.semanticRelations?.[relation];
		if (targets === undefined || targets === null) continue;
		const uniqueTargets = new Map<string, LexicalUnitShadow<"de">>();
		for (const rawTarget of targets) {
			const parsed = pendingSemanticRelationSchema.parse({
				relation,
				target: rawTarget,
			}) as PendingSemanticRelation;
			const target = parsed.target as unknown as LexicalUnitShadow<"de">;
			if (isOwnerTarget(input, target)) {
				throw new Error(
					"A Semantic Relation cannot target its source Reading.",
				);
			}
			uniqueTargets.set(targetKey(target), target);
		}
		for (const target of [...uniqueTargets.values()].sort(compareTargets)) {
			const key = targetKey(target);
			const existingRelation = relationByTarget.get(key);
			if (existingRelation !== undefined) {
				if (
					existingRelation === "synonym" &&
					relation === "nearSynonym"
				) {
					continue;
				}
				if (
					existingRelation === "nearSynonym" &&
					relation === "synonym"
				) {
					const existingIndex = pendingRelations.findIndex(
						(pending) =>
							pending.relation === "nearSynonym" &&
							targetKey(pending.target) === key,
					);
					if (existingIndex >= 0)
						pendingRelations.splice(existingIndex, 1);
				} else {
					throw new Error(
						`A relation target cannot appear under both ${existingRelation} and ${relation}.`,
					);
				}
			}
			relationByTarget.set(key, relation);
			pendingRelations.push(
				pendingSemanticRelationSchema.parse({ relation, target }),
			);
		}
	}

	return generatedKnowledgeUpdateSchema.parse({
		changes,
		pendingRelations,
	});
}

function targetKey(target: {
	readonly language: string;
	readonly family: string;
	readonly kind: string;
	readonly canonicalForm: string;
}): string {
	return JSON.stringify([
		target.language,
		target.family,
		target.kind,
		target.canonicalForm,
	]);
}

function compareTargets(
	left: LexicalUnitShadow<"de">,
	right: LexicalUnitShadow<"de">,
): number {
	const leftKey = targetKey(left);
	const rightKey = targetKey(right);
	if (leftKey < rightKey) return -1;
	if (leftKey > rightKey) return 1;
	return 0;
}

function isOwnerTarget(
	input: GermanKnowledgeGenerationInput,
	target: LexicalUnitShadow<"de">,
): boolean {
	const owner = input.reading.lemma;
	return (
		owner.language === target.language &&
		owner.family === target.family &&
		owner.kind === target.kind &&
		owner.canonicalForm === target.canonicalForm
	);
}
