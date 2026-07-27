import type { SupportedLanguage } from "../dumling";
import type { DumdictService } from "../public";
import type { CreateDumdictServiceOptions } from "../storage";
import { addAttestation } from "./add-attestation";
import { addNewNote } from "./add-new-note";
import { cleanupRelations } from "./cleanup-relations";
import { findStoredLemmaSenses } from "./find-stored-lemma-senses";
import { getInfoForRelationsCleanup } from "./get-info-for-relations-cleanup";

export function createDumdictService<L extends SupportedLanguage>(
	options: CreateDumdictServiceOptions<L>,
): DumdictService<L> {
	return {
		findStoredLemmaSenses: (request) => findStoredLemmaSenses(options, request),
		addAttestation: (request) => addAttestation(options, request),
		addNewNote: (request) => addNewNote(options, request),
		getInfoForRelationsCleanup: (request) =>
			getInfoForRelationsCleanup(options, request),
		cleanupRelations: (request) => cleanupRelations(options, request),
	};
}
