import { traceStage } from "common-utils/workflow";
import type { SupportedLanguage } from "dumling-old/types";
import * as Effect from "effect/Effect";
import { lookupStoredReadings } from "../core/lookup";
import type {
	DumdictInvalidInput,
	FindStoredReadingsRequest,
	FindStoredReadingsResult,
} from "../public";
import type { DumdictServiceRuntimeOptions } from "./runtime-options";

export function findStoredReadings<L extends SupportedLanguage>(
	options: DumdictServiceRuntimeOptions<L>,
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
	return traceStage(
		"dumdict.findStoredReadings",
		options.storage.findStoredReadings(request).pipe(
			Effect.map((slice) => {
				options.sliceValidation.storedReadings(slice, request.lemma);
				return lookupStoredReadings(slice);
			}),
		),
		request,
	);
}
