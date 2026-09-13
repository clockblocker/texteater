import type { Dumgen, ModelExchange } from "dumgen/types";
import * as Effect from "effect/Effect";
import { generation, operationStage } from "./model-trace";
import type { SegmentationResponse } from "./shared/contract";

export { attemptedPromptPaths } from "./model-trace";

export function segmentForLaboratory(
	dumgen: Pick<Dumgen, "segment">,
	text: string,
	exchanges: ModelExchange[],
) {
	return Effect.gen(function* () {
		const decisions = yield* dumgen.segment({ sourceSentences: [text] });
		const decision = decisions[0];
		if (!decision)
			throw new Error("Dumgen returned no segmentation decision.");
		const intake = {
			...operationStage("segment", { text }, decision, exchanges),
			traceOrigin: "generated" as const,
		};
		if (decision.decision !== "Accepted")
			return {
				decision: decision.decision,
				sentence: null,
				stages: { intake },
				generation: generation(exchanges),
			} satisfies SegmentationResponse;
		if (
			decision.sentence.language !== "de" &&
			decision.sentence.language !== "he"
		)
			throw new Error("Unsupported segmentation language.");
		const sentence = {
			...decision.sentence,
			language: decision.sentence.language,
		};
		return {
			decision: "Accepted",
			sentence,
			stages: {
				intake,
				segmentation: {
					prompt: `source-segmentation.${sentence.language}`,
					traceOrigin: "deterministic",
					input: {
						stitchedText: sentence.segments
							.map((segment) => segment.text)
							.join(""),
					},
					output: { segments: sentence.segments },
					result: sentence,
				},
			},
			generation: generation(exchanges),
		} satisfies SegmentationResponse;
	});
}
