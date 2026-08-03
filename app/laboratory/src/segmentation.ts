import type { Dumgen, DumgenModelExchange, SegmentationResult } from "dumgen";

import type { SegmentationResponse } from "./shared/contract";

const model = "gpt-5-nano" as const;
const intakePrompt = "laboratory.intake";
const segmentationPrompt = "laboratory.segmentation.de";

type AcceptedExchange = Extract<
	DumgenModelExchange,
	{ readonly phase: "accepted" }
>;

type OperationRunner = <Result>(
	operation: () => Promise<Result>,
) => Promise<Result>;

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
	run: OperationRunner = (operation) => operation(),
): Promise<SegmentationResponse> {
	const result: SegmentationResult = await run(() => dumgen.segment(text));
	const prompts = attemptedPromptPaths(modelExchanges);
	const intake = acceptedStage(intakePrompt, modelExchanges);

	if (result.outcome === "Unavailable") {
		return {
			decision: result.reason,
			sentence: null,
			stages: { intake },
			generation: { model, prompts },
		};
	}

	return {
		decision: "Accepted",
		sentence: result.sentence,
		stages: {
			intake,
			segmentation: acceptedStage(segmentationPrompt, modelExchanges),
		},
		generation: { model, prompts },
	};
}
