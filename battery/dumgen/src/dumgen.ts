import { type AiSdk, buildAiSdk } from "./ai-sdk/ai-sdk";
import {
	buildGeneratorCatalog,
	type GeneratorCatalog,
} from "./generator/generator";

export {
	DumgenError,
	type DumgenErrorCode,
} from "./generator/generator-error";

import { PROMPT_CATALOG } from "./promtsmith/prompt";

export type DumgenOptions =
	| { readonly apiKey?: string; readonly sdk?: never }
	| { readonly sdk: AiSdk; readonly apiKey?: never };

export function buildDumgen(
	options: DumgenOptions = {},
): GeneratorCatalog<typeof PROMPT_CATALOG> {
	const sdk = options.sdk ?? buildAiSdk({ apiKey: options.apiKey });
	return buildGeneratorCatalog(PROMPT_CATALOG, sdk);
}
