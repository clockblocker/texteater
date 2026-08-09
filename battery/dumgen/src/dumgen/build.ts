import { type AiSdk, buildAiSdk } from "../ai-sdk/ai-sdk";
import { PROMPT_CATALOG } from "../catalog/prompt-catalog";
import {
	buildGeneratorCatalog,
	type ModelExchange,
} from "../generator/generator";
import {
	createDumgenImplementation,
	type DumgenSection1Trace,
} from "./implementation";

type BuildDumgenOptions = {
	readonly apiKey?: string;
	readonly sdk?: AiSdk;
	readonly onModelExchange?: (exchange: ModelExchange) => void;
	readonly onSection1Trace?: (trace: DumgenSection1Trace) => void;
};

export function createDumgen(options: BuildDumgenOptions) {
	const sdk = options.sdk ?? buildAiSdk({ apiKey: options.apiKey });
	const generators = buildGeneratorCatalog(PROMPT_CATALOG, sdk, {
		onModelExchange: options.onModelExchange,
	});
	return createDumgenImplementation(generators, {
		onSection1Trace: options.onSection1Trace,
	});
}
