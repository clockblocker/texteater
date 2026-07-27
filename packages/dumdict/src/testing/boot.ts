import { createDumdictService } from "../service/create-dumdict-service";
import type { DumdictService } from "../public";
import type { SupportedLanguage } from "../dumling";
import {
	createInMemoryTestStorage,
	type InMemoryTestStorage,
} from "./in-memory-storage";
import type { SerializedDictionaryNote } from "./serialized-note";

export function getBootedUpDumdict<L extends SupportedLanguage>(
	language: L,
	notes: SerializedDictionaryNote<L>[] = [],
): {
	dict: DumdictService<L>;
	storage: InMemoryTestStorage<L>;
} {
	const storage = createInMemoryTestStorage(language, notes);
	return {
		dict: createDumdictService({ language, storage }),
		storage,
	};
}
