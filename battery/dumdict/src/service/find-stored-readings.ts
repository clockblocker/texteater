import type { SupportedLanguage } from "dumling/types";
import { lookupStoredReadings } from "../core/lookup";
import type {
	FindStoredReadingsRequest,
	FindStoredReadingsResult,
} from "../public";
import { assertLanguageMatches } from "./language-guard";
import type { DumdictServiceRuntimeOptions } from "./runtime-options";

export async function findStoredReadings<L extends SupportedLanguage>(
	options: DumdictServiceRuntimeOptions<L>,
	request: FindStoredReadingsRequest<L>,
): Promise<FindStoredReadingsResult<L>> {
	assertLanguageMatches(options.language, request.lemma.language);
	const slice = await options.storage.findStoredReadings(request);
	options.sliceValidation.storedReadings(slice, request.lemma);
	return lookupStoredReadings(slice);
}
