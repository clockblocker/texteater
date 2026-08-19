import { type AiSdk, buildAiSdk } from "../ai-sdk/ai-sdk";
import type { ModelExchange } from "../generator/generator";
import {
	createKnowledgeDumgen,
	type KnowledgeDumgen,
} from "../knowledge-generation/build";
import { buildDumgenRuntime } from "../runtime";
import type { DumgenSection1Trace } from "./implementation";

type BuildDumgenOptions = {
	readonly apiKey?: string;
	readonly sdk?: AiSdk;
	readonly onModelExchange?: (exchange: ModelExchange) => void;
	readonly onSection1Trace?: (trace: DumgenSection1Trace) => void;
};

export function createDumgen(options: BuildDumgenOptions) {
	const sdk = options.sdk ?? buildAiSdk({ apiKey: options.apiKey });
	let knowledgeDumgen: KnowledgeDumgen | undefined;
	return buildDumgenRuntime({
		async generateKnowledge(language, input) {
			knowledgeDumgen ??= createKnowledgeDumgen({
				sdk,
				onModelExchange: options.onModelExchange,
			});
			return knowledgeDumgen.generate.knowledge(language, input);
		},
		sdk,
		onModelExchange: options.onModelExchange,
		onSection1Trace: options.onSection1Trace,
	});
}
