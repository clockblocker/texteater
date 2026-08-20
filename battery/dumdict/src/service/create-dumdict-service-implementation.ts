import type { SupportedLanguage } from "dumling/types";
import type { DumdictService } from "../public";
import { addAttestation } from "./add-attestation";
import { addNewNote } from "./add-new-note";
import { applyGeneratedKnowledge } from "./apply-generated-knowledge";
import { cleanupRelations } from "./cleanup-relations";
import { ensureOwnedSurface } from "./ensure-owned-surface";
import { findStoredReadings } from "./find-stored-readings";
import { getInfoForRelationsCleanup } from "./get-info-for-relations-cleanup";
import type { DumdictServiceRuntimeOptions } from "./runtime-options";

export function createDumdictServiceImplementation<L extends SupportedLanguage>(
	options: DumdictServiceRuntimeOptions<L>,
): DumdictService<L> {
	return {
		findStoredReadings: (request) => findStoredReadings(options, request),
		addAttestation: (request, mutationOptions) =>
			addAttestation(options, request, mutationOptions),
		addNewNote: (request, mutationOptions) =>
			addNewNote(options, request, mutationOptions),
		applyGeneratedKnowledge: (request, mutationOptions) =>
			applyGeneratedKnowledge(options, request, mutationOptions),
		ensureOwnedSurface: (request, mutationOptions) =>
			ensureOwnedSurface(options, request, mutationOptions),
		getInfoForRelationsCleanup: (request) =>
			getInfoForRelationsCleanup(options, request),
		cleanupRelations: (request, mutationOptions) =>
			cleanupRelations(options, request, mutationOptions),
	};
}
