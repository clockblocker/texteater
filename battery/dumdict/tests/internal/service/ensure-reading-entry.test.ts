import { describe, expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import type { ReadingEntry } from "../../../src";
import {
	createDumdictService,
	englishSwimReading,
	englishWalkLemma,
	getBootedUpDumdict,
	type StoreRevision,
	withUnusedCleanupStorageMethods,
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
		const storage = withUnusedCleanupStorageMethods({
			findStoredReadings() {
				return Effect.die("Unexpected storage call");
			},
			loadReadingForPatch() {
				return Effect.die("Unexpected storage call");
			},
			loadReadingEntryContext() {
				return Effect.succeed({
					intent: "ensureReadingEntry" as const,
					revision: "mismatched-slice" as StoreRevision,
					existingLemma: { lemma: englishWalkLemma },
				});
			},
			commitChanges() {
				commitCalls += 1;
				return Effect.die("Unexpected commit");
			},
		});
		const dict = createDumdictService({ language: "en", storage });

		await expect(
			Effect.runPromise(dict.ensureReadingEntry({ entry: fixedEntry() })),
		).rejects.toThrow(
			"existing Lemma does not match the requested Reading identity",
		);
		expect(commitCalls).toBe(0);
	});

	test("creates an ordinary Reading Entry and an exact rerun is a no-op", async () => {
		const { dict, storage } = getBootedUpDumdict("en");

		const created = await Effect.runPromise(
			dict.ensureReadingEntry({ entry: fixedEntry() }),
		);
		const afterCreate = storage.loadAll();
		const rerun = await Effect.runPromise(
			dict.ensureReadingEntry({ entry: fixedEntry() }),
		);

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
		await Effect.runPromise(
			dict.ensureReadingEntry({ entry: fixedEntry() }),
		);
		const beforeConflict = storage.loadAll();

		const result = await Effect.runPromise(
			Effect.either(
				dict.ensureReadingEntry({
					entry: { ...fixedEntry(), notes: "different" },
				}),
			),
		);

		expect(result).toMatchObject({
			_tag: "Left",
			left: {
				_tag: "DumdictRejection",
				code: "readingEntryConflict",
			},
		});
		expect(storage.loadAll()).toEqual(beforeConflict);
	});

	test("rejects relation-bearing Knowledge instead of bypassing relation planning", async () => {
		const { dict, storage } = getBootedUpDumdict("en");
		const entry = fixedEntry();

		const result = await Effect.runPromise(
			Effect.either(
				dict.ensureReadingEntry({
					entry: {
						...entry,
						knowledge: {
							...entry.knowledge,
							semanticRelations: { synonym: [englishWalkLemma] },
						},
					},
				}),
			),
		);

		expect(result).toMatchObject({
			_tag: "Left",
			left: {
				_tag: "DumdictRejection",
				code: "invalidRequest",
			},
		});
		expect(storage.loadAll()).toEqual([]);
	});
});
