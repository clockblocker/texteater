import type {
	KnowledgeChange,
	PendingSemanticRelation,
	UnitShadow,
} from "dumrel";
import {
	knowledgeChangeSchema,
	pendingSemanticRelationSchema,
	semanticRelationValues,
} from "dumrel";

import { knowledgeGenerationResultSchema } from "../../schemas/public-schemas";
import type { KnowledgeGenerationResult } from "../contracts";
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
	for (const relation of semanticRelationValues) {
		const targets = analysis.semanticRelations?.[relation];
		if (targets === undefined || targets === null) continue;
		const uniqueTargets = new Map<string, UnitShadow<"de">>();
		for (const rawTarget of targets) {
			const parsed = pendingSemanticRelationSchema.parse({
				relation,
				target: rawTarget,
			}) as PendingSemanticRelation;
			const target = parsed.target as unknown as UnitShadow<"de">;
			uniqueTargets.set(targetKey(target), target);
		}
		for (const target of [...uniqueTargets.values()].sort(compareTargets)) {
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

function targetKey(target: UnitShadow<"de">): string {
	return JSON.stringify([
		target.language,
		target.family,
		target.kind,
		target.canonicalForm,
	]);
}

function compareTargets(
	left: UnitShadow<"de">,
	right: UnitShadow<"de">,
): number {
	const leftKey = targetKey(left);
	const rightKey = targetKey(right);
	if (leftKey < rightKey) return -1;
	if (leftKey > rightKey) return 1;
	return 0;
}
