import { lookupRelationsCleanupInfo } from "../core/lookup";
import type { SupportedLanguage } from "../dumling";
import type {
	GetInfoForRelationsCleanupRequest,
	GetInfoForRelationsCleanupResult,
} from "../public";
import type { DumdictServiceRuntimeOptions } from "./runtime-options";

export async function getInfoForRelationsCleanup<L extends SupportedLanguage>(
	options: DumdictServiceRuntimeOptions<L>,
	request: GetInfoForRelationsCleanupRequest<L>,
): Promise<GetInfoForRelationsCleanupResult<L>> {
	const canonicalForm = request.canonicalForm.trim().normalize("NFC");
	if (!canonicalForm) {
		throw new Error("canonicalForm is required.");
	}

	const slice = await options.storage.getInfoForRelationsCleanup({
		canonicalForm,
	});
	options.sliceValidation.relationsCleanupInfo(slice, canonicalForm);
	return lookupRelationsCleanupInfo(slice);
}
