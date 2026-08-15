import type { SerializedDictionaryNote } from "../dto";
import type { SupportedLanguage } from "../dumling";
import {
	migrateSerializedDictionaryNotesV0ToV1,
	type SerializedDictionaryNoteV0,
} from "../migration/v0-to-v1";
import type { DumdictService } from "../public";
import { createDumdictService } from "../service/create-dumdict-service";
import {
	createInMemoryTestStorage,
	type InMemoryTestStorage,
} from "./in-memory-storage";

export function getBootedUpDumdict<L extends SupportedLanguage>(
	language: L,
	notes: Array<
		SerializedDictionaryNote<L> | SerializedDictionaryNoteV0<L>
	> = [],
): {
	dict: DumdictService<L>;
	storage: InMemoryTestStorage<L>;
} {
	const migratedNotes = notes.every(
		(note): note is SerializedDictionaryNote<L> => "schemaVersion" in note,
	)
		? notes
		: migrateSerializedDictionaryNotesV0ToV1(
				notes as SerializedDictionaryNoteV0<L>[],
			);
	const storage = createInMemoryTestStorage(language, migratedNotes);
	return {
		dict: createDumdictService({ language, storage }),
		storage,
	};
}
