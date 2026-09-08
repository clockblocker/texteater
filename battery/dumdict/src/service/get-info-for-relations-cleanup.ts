import { traceStage } from "common-utils/workflow";
import type { SupportedLanguage } from "dumling/types";
import * as Effect from "effect/Effect";
import { lookupRelationsCleanupInfo } from "../core/lookup";
import type {
	DumdictInvalidInput,
	GetInfoForRelationsCleanupRequest,
	GetInfoForRelationsCleanupResult,
} from "../public";
import type { DumdictServiceRuntimeOptions } from "./runtime-options";

export function getInfoForRelationsCleanup<L extends SupportedLanguage>(
	options: DumdictServiceRuntimeOptions<L>,
	request: GetInfoForRelationsCleanupRequest<L>,
): Effect.Effect<
	GetInfoForRelationsCleanupResult<L>,
	DumdictInvalidInput | import("../public").DumdictStorageFailure
> {
	const canonicalForm = request.canonicalForm.trim().normalize("NFC");
	if (!canonicalForm)
		return Effect.fail({
			_tag: "DumdictInvalidInput",
			message: "canonicalForm is required.",
		});
	return traceStage(
		"dumdict.getInfoForRelationsCleanup",
		options.storage.getInfoForRelationsCleanup({ canonicalForm }).pipe(
			Effect.map((slice) => {
				options.sliceValidation.relationsCleanupInfo(
					slice,
					canonicalForm,
				);
				return lookupRelationsCleanupInfo(slice);
			}),
		),
		{ canonicalForm },
	);
}
