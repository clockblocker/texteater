import { lookupRelationsCleanupInfo } from "../core/lookup";
import { validateRelationsCleanupInfoSlice } from "../core/validate-slice";
import type { SupportedLanguage } from "../dumling";
import type {
	GetInfoForRelationsCleanupRequest,
	GetInfoForRelationsCleanupResult,
} from "../public";
import type { CreateDumdictServiceOptions } from "../storage";

export async function getInfoForRelationsCleanup<L extends SupportedLanguage>(
	options: CreateDumdictServiceOptions<L>,
	request: GetInfoForRelationsCleanupRequest<L>,
): Promise<GetInfoForRelationsCleanupResult<L>> {
	const canonicalForm = request.canonicalForm.trim();
	if (!canonicalForm) {
		throw new Error("canonicalForm is required.");
	}

	const slice = await options.storage.getInfoForRelationsCleanup({
		canonicalForm,
	});
	validateRelationsCleanupInfoSlice(options.language, slice, canonicalForm);
	return lookupRelationsCleanupInfo(slice);
}
