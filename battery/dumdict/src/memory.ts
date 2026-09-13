import type * as Dumling from "dumling/types";
import type { SerializedDictionaryNote } from "./dto";
import type { DumdictStoragePort } from "./storage";
import { createInMemoryTestStorage } from "./testing/in-memory-storage";

/** Isolated, atomic session storage. Snapshots are detached; creating a new store resets the session. */
export function createMemoryStorage<L extends Dumling.Language>(
	language: L,
): DumdictStoragePort<L> & { snapshot(): SerializedDictionaryNote<L>[] } {
	const {
		loadAll,
		readingEntryContextReads: _reads,
		...port
	} = createInMemoryTestStorage(language);
	return { ...port, snapshot: loadAll };
}
