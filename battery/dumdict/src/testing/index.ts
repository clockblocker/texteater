/**
 * Test helpers for Dumdict storage adapters. This entry imports `bun:test`,
 * so only test files load it; no runtime entry point reaches it.
 */
export {
	type ConformanceStorage,
	describeStorageConformance,
	type StorageConformanceOptions,
} from "./storage-conformance/suite";
