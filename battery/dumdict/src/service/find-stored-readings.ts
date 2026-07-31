import { lookupStoredReadings } from "../core/lookup";
import { validateStoredReadingsSlice } from "../core/validate-slice";
import type { SupportedLanguage } from "../dumling";
import type {
	FindStoredReadingsRequest,
	FindStoredReadingsResult,
} from "../public";
import type { CreateDumdictServiceOptions } from "../storage";
import { assertLanguageMatches } from "./language-guard";

export async function findStoredReadings<L extends SupportedLanguage>(
	options: CreateDumdictServiceOptions<L>,
	request: FindStoredReadingsRequest<L>,
): Promise<FindStoredReadingsResult<L>> {
	assertLanguageMatches(options.language, request.lemma.language);
	const slice = await options.storage.findStoredReadings(request);
	validateStoredReadingsSlice(options.language, slice, request.lemma);
	return lookupStoredReadings(slice);
}
