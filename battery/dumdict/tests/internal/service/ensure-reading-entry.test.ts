import { describe, expect, test } from "bun:test";
import type { ReadingEntry } from "../../../src";
import {
	createPlannedDictionary,
	englishSwimReading,
	englishWalkLemma,
	getBootedUpDumdict,
	type StoreRevision,
	stubStore,
} from "./helpers";

const fixedEntry = (): ReadingEntry<"en"> => ({
	reading: englishSwimReading,
	knowledge: {
		translations: { en: ["swim"] },
	},
	attestedTranslations: [],
	attestations: [],
	notes: "",
});

describe("ensureReadingEntry", () => {
	test("rejects a mismatched storage context before planning or commit", async () => {
		let commitCalls = 0;
		const storage = stubStore("en", {
			loadReadingEntryContext() {
				return {
					intent: "ensureReadingEntry" as const,
					revision: "mismatched-slice" as StoreRevision,
					existingLemma: { lemma: englishWalkLemma },
				};
			},
			commitChanges() {
				commitCalls += 1;
				throw new Error("Unexpected commit");
			},
		});
		const dict = createPlannedDictionary("en", storage);

		expect(() => dict.ensureReadingEntry({ entry: fixedEntry() })).toThrow(
			"existing Lemma does not match the requested Reading identity",
		);
		expect(commitCalls).toBe(0);
	});

	test("creates an ordinary Reading Entry and an exact rerun is a no-op", async () => {
		const { dict, storage } = getBootedUpDumdict("en");

		const created = dict.ensureReadingEntry({ entry: fixedEntry() });
		const afterCreate = storage.loadAll();
		const rerun = dict.ensureReadingEntry({ entry: fixedEntry() });

		expect(created).toMatchObject({
			status: "applied",
			baseRevision: "mem-1",
			nextRevision: "mem-2",
		});
		expect(afterCreate[0]?.readingEntries[0]).toEqual(fixedEntry());
		expect(rerun).toMatchObject({
			status: "applied",
			baseRevision: "mem-2",
			nextRevision: "mem-2",
		});
		expect(storage.loadAll()).toEqual(afterCreate);
	});

	test("rejects an incompatible entry at the same Reading identity", async () => {
		const { dict, storage } = getBootedUpDumdict("en");
		dict.ensureReadingEntry({ entry: fixedEntry() });
		const beforeConflict = storage.loadAll();

		const result = dict.ensureReadingEntry({
			entry: { ...fixedEntry(), notes: "different" },
		});

		expect(result).toMatchObject({
			status: "rejected",
			code: "readingEntryConflict",
		});
		expect(storage.loadAll()).toEqual(beforeConflict);
	});

	test("rejects relation-bearing Knowledge instead of bypassing relation planning", async () => {
		const { dict, storage } = getBootedUpDumdict("en");
		const entry = fixedEntry();

		const result = dict.ensureReadingEntry({
			entry: {
				...entry,
				knowledge: {
					...entry.knowledge,
					semanticRelations: { synonym: [englishWalkLemma] },
				},
			},
		});

		expect(result).toMatchObject({
			status: "rejected",
			code: "invalidRequest",
		});
		expect(storage.loadAll()).toEqual([]);
	});
});
