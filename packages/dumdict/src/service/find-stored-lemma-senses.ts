import { lookupStoredLemmaSenses } from "../core/lookup";
import { validateStoredLemmaSensesSlice } from "../core/validate-slice";
import type { SupportedLanguage } from "../dumling";
import type {
	FindStoredLemmaSensesRequest,
	FindStoredLemmaSensesResult,
} from "../public";
import type { CreateDumdictServiceOptions } from "../storage";
import { assertLanguageMatches } from "./language-guard";

export async function findStoredLemmaSenses<L extends SupportedLanguage>(
	options: CreateDumdictServiceOptions<L>,
	request: FindStoredLemmaSensesRequest<L>,
): Promise<FindStoredLemmaSensesResult<L>> {
	assertLanguageMatches(options.language, request.lemmaDescription.language);

	const slice = await options.storage.findStoredLemmaSenses(request);
	validateStoredLemmaSensesSlice(
		options.language,
		slice,
		request.lemmaDescription,
	);
	return lookupStoredLemmaSenses(slice);
}
