import type { ExperimentEvaluation } from "../../../assembly";
import { stableJson } from "../../../assembly";
import type {
	inputSchema,
	outputSchema,
} from "../../../production/unit-shadow-classification/schemas";

export type UnitShadowClassificationEvaluation = Readonly<{
	contractPass: boolean;
	decisionPass: boolean;
	familyPass: boolean;
	kindPass: boolean;
}>;

export const evaluateUnitShadowClassification: ExperimentEvaluation<
	typeof inputSchema,
	typeof outputSchema,
	UnitShadowClassificationEvaluation
> = ({ idealOutput, output }) => {
	const decisionPass = output.decision === idealOutput.decision;
	const familyPass = output.target?.family === idealOutput.target?.family;
	const kindPass = output.target?.kind === idealOutput.target?.kind;
	return Object.freeze({
		contractPass: stableJson(output) === stableJson(idealOutput),
		decisionPass,
		familyPass,
		kindPass,
	});
};
