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
		loadCleanupRelationsContext: (request) =>
			Effect.sync(() => storage.loadCleanupRelationsContext(request)),
		loadReevaluateShadowsContext: (request) =>
			Effect.sync(() => storage.loadReevaluateShadowsContext(request)),
		removeLemma: (lemma) => Effect.sync(() => storage.removeLemma(lemma)),
	};
});
