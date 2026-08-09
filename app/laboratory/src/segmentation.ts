import type {
	Dumgen,
	DumgenModelExchange,
	DumgenSection1Trace,
	Section1Error,
	SegmentationResult,
} from "dumgen";

import type { SegmentationResponse } from "./shared/contract";

const model = "gpt-5.6-luna" as const;
const intakePrompt = "laboratory.intake";

type AcceptedExchange = Extract<
	DumgenModelExchange,
	{ readonly phase: "accepted" }
>;

type OperationRunner = <Result>(
	operation: () => Promise<Result>,
) => Promise<Result>;

export class LaboratorySegmentationError extends Error {
	readonly section1Error: Section1Error;

	constructor(error: Section1Error) {
		super(error.message);
		this.name = "LaboratorySegmentationError";
		this.section1Error = error;
	}
}

function acceptedStage(
	prompt: string,
	modelExchanges: readonly DumgenModelExchange[],
): SegmentationResponse["stages"]["intake"] {
	const exchange = modelExchanges.find(
		(candidate): candidate is AcceptedExchange =>
			candidate.phase === "accepted" && candidate.promptPath === prompt,
	);
	if (!exchange) {
		throw new Error(
			`No accepted model exchange was captured for ${prompt}.`,
		);
	}
	return {
		prompt,
		traceOrigin: "generated",
		input: exchange.modelInput,
		output: exchange.validatedModelOutput,
		result: exchange.result,
	};
}

export function attemptedPromptPaths(
	modelExchanges: readonly DumgenModelExchange[],
): string[] {
	return modelExchanges
		.filter(({ phase }) => phase === "attempted")
		.map(({ promptPath }) => promptPath);
}

export async function segmentForLaboratory(
	dumgen: Pick<Dumgen, "segment">,
	text: string,
	modelExchanges: DumgenModelExchange[],
	section1Traces: DumgenSection1Trace[] = [],
	run: OperationRunner = (operation) => operation(),
): Promise<SegmentationResponse> {
	const result: SegmentationResult = await run(() => dumgen.segment([text]));
	if (!result.ok) throw new LaboratorySegmentationError(result.error);
	const prompts = attemptedPromptPaths(modelExchanges);
	const intake = acceptedStage(intakePrompt, modelExchanges);
	const decision = result.value[0];
	if (!decision)
		throw new Error("Dumgen returned no decision for the lab item.");

	if (decision.decision !== "Accepted") {
		return {
			decision: decision.decision,
			sentence: null,
			stages: { intake },
			generation: { model, prompts },
		};
	}
	const segmentation = section1Traces.find(
		(trace) =>
			trace.phase === "source-segmentation" && trace.itemIndex === 0,
	);
	if (segmentation?.phase !== "source-segmentation") {
		throw new Error(
			"No deterministic Source Segmentation trace was captured.",
		);
	}

	return {
		decision: "Accepted",
		sentence: decision.sentence,
		stages: {
			intake,
			segmentation: {
				prompt: `source-segmentation.${segmentation.language}`,
				traceOrigin: "deterministic",
				input: { stitchedText: segmentation.stitchedText },
				output: {
					segments: segmentation.segments,
					rules: segmentation.rules,
				},
				result: decision.sentence,
			},
		},
		generation: { model, prompts },
	};
}
