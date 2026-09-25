import type * as Dumling from "dumling/types";

import * as Effect from "effect/Effect";
import { lookupStoredReadings } from "../core/lookup";
import { validateStoredReadingsSlice } from "../core/validate-slice";
import type {
	DumdictInvalidInput,
	FindStoredReadingsRequest,
	FindStoredReadingsResult,
} from "../public";
import type { CreateDumdictServiceOptions } from "../storage";

export function findStoredReadings<L extends Dumling.Language>(
	options: CreateDumdictServiceOptions<L>,
	request: FindStoredReadingsRequest<L>,
): Effect.Effect<
	FindStoredReadingsResult<L>,
	DumdictInvalidInput | import("../public").DumdictStorageFailure
> {
	if (request.lemma.language !== options.language)
		return Effect.fail({
			_tag: "DumdictInvalidInput",
			expectedLanguage: options.language,
			actualLanguage: request.lemma.language,
			message: `Expected dumdict language ${options.language}, got ${request.lemma.language}`,
		});
	return options.storage.findStoredReadings(request).pipe(
		Effect.map((slice) => {
			validateStoredReadingsSlice(options.language, slice, request.lemma);
			return lookupStoredReadings(slice);
		}),
	);
}
