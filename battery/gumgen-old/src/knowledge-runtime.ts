import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { type ModelGenerator, ModelGeneratorService } from "./ai-sdk/ai-sdk";
import { installEncodedRuntimePromptData } from "./generated/runtime-prompt-artifacts.js";
import {
	createKnowledgeDumgen,
	type KnowledgeDumgen,
} from "./knowledge-generation/build";

export type KnowledgeDumgenRuntimeOptions = {
	readonly modelGenerator: ModelGenerator;
	readonly runtimePromptData?: string;
};

/** Builds a Knowledge generator from an explicit model boundary. */
export function buildKnowledgeDumgenRuntime(
	options: KnowledgeDumgenRuntimeOptions,
): KnowledgeDumgen {
	if (options.runtimePromptData !== undefined)
		installEncodedRuntimePromptData(options.runtimePromptData);
	return createKnowledgeDumgen(options);
}

export class KnowledgeDumgenService extends Context.Tag(
	"dumgen/KnowledgeDumgen",
)<KnowledgeDumgenService, KnowledgeDumgen>() {}

/** Uses the same model service tag as the main Dumgen layer. */
export const KnowledgeDumgenLive = Layer.effect(
	KnowledgeDumgenService,
	Effect.gen(function* () {
		const modelGenerator = yield* ModelGeneratorService;
		return createKnowledgeDumgen({ modelGenerator });
	}),
);

export type { KnowledgeDumgen, ModelGenerator };
