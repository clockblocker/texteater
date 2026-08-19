import type { SerializedDictionaryNote } from "../dto";
import type { SupportedLanguage } from "../dumling";
import type { DumdictService } from "../public";
import { createDumdictService } from "../service/create-dumdict-service";
import {
	createInMemoryTestStorage,
	type InMemoryTestStorage,
} from "./in-memory-storage";

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
