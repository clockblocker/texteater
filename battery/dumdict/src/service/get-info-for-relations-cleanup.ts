import type * as Dumling from "dumling/types";

import * as Effect from "effect/Effect";
import { lookupRelationsCleanupInfo } from "../core/lookup";
import { validateRelationsCleanupInfoSlice } from "../core/validate-slice";
import type {
	DumdictInvalidInput,
	GetInfoForRelationsCleanupRequest,
	GetInfoForRelationsCleanupResult,
} from "../public";
import type { CreateDumdictServiceOptions } from "../storage";

export function getInfoForRelationsCleanup<L extends Dumling.Language>(
	options: CreateDumdictServiceOptions<L>,
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
	return options.storage.getInfoForRelationsCleanup({ canonicalForm }).pipe(
		Effect.map((slice) => {
			validateRelationsCleanupInfoSlice(
				options.language,
				slice,
				canonicalForm,
			);
			return lookupRelationsCleanupInfo(slice);
		}),
	);
}
