import * as Effect from "effect/Effect";
import { describeStorageConformance } from "../../../src/testing";
import { createInMemoryTestStorage } from "../../support/in-memory-store";

describeStorageConformance("The in-memory store", () => {
	const storage = createInMemoryTestStorage("de");
	return {
		commitChanges: (request) =>
			Effect.sync(() => storage.commitChanges(request)),
		loadReadingEntryContext: (request) =>
			Effect.sync(() => storage.loadReadingEntryContext(request)),
	};
});
