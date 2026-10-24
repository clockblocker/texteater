import { describeStorageConformance } from "../../../src/testing";
import { createInMemoryTestStorage } from "../../support/in-memory-store";

describeStorageConformance("The in-memory store", () => {
	const storage = createInMemoryTestStorage("de");
	return {
		commitChanges: async (request) => storage.commitChanges(request),
		loadReadingEntryContext: async (request) =>
			storage.loadReadingEntryContext(request),
		loadCleanupRelationsContext: async (request) =>
			storage.loadCleanupRelationsContext(request),
		loadReevaluateShadowsContext: async (request) =>
			storage.loadReevaluateShadowsContext(request),
		loadOccurrenceSlice: async (request) =>
			storage.loadOccurrenceSlice(request),
		loadRekeySurfacesSlice: async (request) =>
			storage.loadRekeySurfacesSlice(request),
		removeLemma: async (lemma) => storage.removeLemma(lemma),
	};
});
