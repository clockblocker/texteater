import type {
	germanKnowledgeAnalysisSchema,
	germanKnowledgeGenerationInputSchema,
} from "../../../../../../knowledge-generation/de/schemas";
import { assertGermanKnowledgeAnalysisMirrorsRequest } from "../../../../../../knowledge-generation/de/schemas";
import type { ExperimentEvaluation } from "../../../../../assembly";
import { stableJson } from "../../../../../assembly";

export type CombinedGermanKnowledgeEvaluation = Readonly<{
	contractPass: boolean;
	requestShapePass: boolean;
	transcriptionPass: boolean;
	definitionPass: boolean;
	translationPass: boolean;
	relationKindsPass: boolean;
	relationTargetsPass: boolean;
	crossAspectConsistencyPass: boolean;
}>;

export const evaluateCombinedGermanKnowledge: ExperimentEvaluation<
	typeof germanKnowledgeGenerationInputSchema,
	typeof germanKnowledgeAnalysisSchema,
	CombinedGermanKnowledgeEvaluation
> = ({ input, idealOutput, output }) => {
	let requestShapePass = true;
	try {
		assertGermanKnowledgeAnalysisMirrorsRequest(input, output);
	} catch {
		requestShapePass = false;
	}

	const transcriptionPass =
		output.transcription === idealOutput.transcription;
	const definitionPass = nullableCandidatePass(
		output.definition,
		idealOutput.definition,
	);
	const translationPass =
		output.translations?.en === idealOutput.translations?.en;
	const relationKindsPass =
		stableJson(Object.keys(output.semanticRelations ?? {}).sort()) ===
		stableJson(Object.keys(idealOutput.semanticRelations ?? {}).sort());
	const relationTargetsPass =
		relationTargets(output.semanticRelations) ===
		relationTargets(idealOutput.semanticRelations);
	const crossAspectConsistencyPass =
		transcriptionPass &&
		definitionPass &&
		translationPass &&
		relationKindsPass;

	return Object.freeze({
		contractPass: requestShapePass && crossAspectConsistencyPass,
		requestShapePass,
		transcriptionPass,
		definitionPass,
		translationPass,
		relationKindsPass,
		relationTargetsPass,
		crossAspectConsistencyPass,
	});
};

function nullableCandidatePass(
	actual: string | null | undefined,
	expected: string | null | undefined,
): boolean {
	if (expected === undefined) return actual === undefined;
	if (expected === null) return actual === null;
	return typeof actual === "string" && actual.length > 0;
}

function relationTargets(
	relations:
		| Readonly<Record<string, readonly object[] | null | undefined>>
		| undefined,
): string {
	return stableJson(
		Object.fromEntries(
			Object.entries(relations ?? {}).map(([relation, targets]) => [
				relation,
				targets === null || targets === undefined
					? null
					: targets.map(stableJson).sort(),
			]),
		),
	);
}
