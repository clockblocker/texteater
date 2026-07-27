import { lookupRelationsCleanupInfo } from "../core/lookup";
import { validateRelationsCleanupInfoSlice } from "../core/validate-slice";
import type { SupportedLanguage } from "../dumling";
import type {
	GetInfoForRelationsCleanupRequest,
	GetInfoForRelationsCleanupResult,
} from "../public";
import type { CreateDumdictServiceOptions } from "../storage";

export async function getInfoForRelationsCleanup<
	L extends SupportedLanguage,
>(
	options: CreateDumdictServiceOptions<L>,
	request: GetInfoForRelationsCleanupRequest<L>,
): Promise<GetInfoForRelationsCleanupResult<L>> {
	const canonicalLemma = request.canonicalLemma.trim();
	if (!canonicalLemma) {
		throw new Error("canonicalLemma is required.");
	}

	const slice = await options.storage.getInfoForRelationsCleanup({
		canonicalLemma,
	});
	validateRelationsCleanupInfoSlice(options.language, slice, canonicalLemma);
	return lookupRelationsCleanupInfo(slice);
}
