import { describeStorageConformance } from "../../../src/testing";
import { createInMemoryTestStorage } from "../../../src/testing/in-memory-storage";

describeStorageConformance("The in-memory store", () =>
	createInMemoryTestStorage("de"),
);
