import type { SupportedLanguage } from "../dumling";
import type { DumdictService } from "../public";
import type { CreateDumdictServiceOptions } from "../storage";
import { addAttestation } from "./add-attestation";
import { addNewNote } from "./add-new-note";
import { cleanupRelations } from "./cleanup-relations";
import { ensureOwnedSurface } from "./ensure-owned-surface";
import { findStoredReadings } from "./find-stored-readings";
import { getInfoForRelationsCleanup } from "./get-info-for-relations-cleanup";

export function createDumdictService<L extends SupportedLanguage>(
	options: CreateDumdictServiceOptions<L>,
): DumdictService<L> {
	return {
		findStoredReadings: (request) => findStoredReadings(options, request),
		addAttestation: (request, mutationOptions) =>
			addAttestation(options, request, mutationOptions),
		addNewNote: (request, mutationOptions) =>
			addNewNote(options, request, mutationOptions),
		ensureOwnedSurface: (request, mutationOptions) =>
			ensureOwnedSurface(options, request, mutationOptions),
		getInfoForRelationsCleanup: (request) =>
			getInfoForRelationsCleanup(options, request),
		cleanupRelations: (request, mutationOptions) =>
			cleanupRelations(options, request, mutationOptions),
	};
}
