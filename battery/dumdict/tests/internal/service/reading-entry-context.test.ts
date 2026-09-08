import { describe, expect, test } from "bun:test";
import type { Surface } from "dumling/types";
import * as Effect from "effect/Effect";
import { createFullSliceValidation } from "../../../src/service/full-slice-validation";
import { loadReadingEntryContext } from "../../../src/service/load-reading-entry-context";
import { createInMemoryTestStorage } from "../../../src/testing/in-memory-storage";
import {
	englishRunDraft,
	englishWalkLemma,
	englishWalkReading,
	englishWalkReadingEntry,
	enSerializedNotes,
	getBootedUpDumdict,
} from "./helpers";

const walkSurface = {
	language: "en",
	lemma: englishWalkLemma,
	normalizedSurface: "walk",
	spelling: "Canonical",
	surfaceKind: "Citation",
	surfaceFeatures: null,
} satisfies Surface<"en">;

describe("Reading Entry context load", () => {
	test("shapes one intent request, calls storage once, and validates the matching result", async () => {
		const delegate = createInMemoryTestStorage("en", enSerializedNotes);
		const requests: unknown[] = [];
		const storage = {
			...delegate,
			loadReadingEntryContext(
				request: Parameters<typeof delegate.loadReadingEntryContext>[0],
			) {
				requests.push(request);
				return delegate.loadReadingEntryContext(request);
			},
		};

		const result = await Effect.runPromise(
			loadReadingEntryContext(
				{
					language: "en",
					storage,
					sliceValidation: createFullSliceValidation("en"),
				},
				{
					intent: "ensureReadingEntry",
					request: { entry: englishWalkReadingEntry() },
				},
			),
		);

		expect(requests).toEqual([
			{ intent: "ensureReadingEntry", reading: englishWalkReading },
		]);
		expect(result.intent).toBe("ensureReadingEntry");
		expect(result.revision).toBe("mem-1");
	});

	test("rejects a response for another intent before the caller can plan", async () => {
		const delegate = createInMemoryTestStorage("en", enSerializedNotes);
		const storage = {
			...delegate,
			loadReadingEntryContext() {
				return Effect.succeed({
					intent: "ensureOwnedSurface",
					revision: "mem-1",
					existingOwnedSurfaces: [],
				} as never);
			},
		};

		await expect(
			Effect.runPromise(
				loadReadingEntryContext(
					{
						language: "en",
						storage,
						sliceValidation: createFullSliceValidation("en"),
					},
					{
						intent: "ensureReadingEntry",
						request: { entry: englishWalkReadingEntry() },
					},
				),
			),
		).rejects.toThrow("Reading Entry context intent does not match");
	});

	test("identity-only intents do not read relation inventory or pending records", async () => {
		const readingEntry = getBootedUpDumdict("en", enSerializedNotes);
		await Effect.runPromise(
			readingEntry.dict.ensureReadingEntry({
				entry: englishWalkReadingEntry(),
			}),
		);
		expect(readingEntry.storage.readingEntryContextReads()).toEqual([
			"existingReading",
			"existingLemma",
		]);

		const ownedSurface = getBootedUpDumdict("en", enSerializedNotes);
		await Effect.runPromise(
			ownedSurface.dict.ensureOwnedSurface({
				reading: englishWalkReading,
				ownedSurface: {
					surface: walkSurface,
					note: {
						attestedTranslations: [],
						attestations: [],
						notes: "",
					},
				},
			}),
		);
		expect(ownedSurface.storage.readingEntryContextReads()).toEqual([
			"existingReading",
			"existingLemma",
			"requestedOwnedSurfaces",
		]);
	});

	test("relation-aware intents retain exact pending and relation inventory reads", async () => {
		const add = getBootedUpDumdict("en");
		await Effect.runPromise(
			add.dict.addNewNote({ draft: englishRunDraft }),
		);
		expect(add.storage.readingEntryContextReads()).toEqual([
			"existingReading",
			"existingLemma",
			"requestedOwnedSurfaces",
			"explicitLemmaTargets",
			"exactPendingRelations",
			"pendingRelationsMatchingLemma",
			"relationLemmas",
			"relationReadings",
		]);

		const generated = getBootedUpDumdict("en", enSerializedNotes);
		await Effect.runPromise(
			generated.dict.applyGeneratedKnowledge({
				reading: englishWalkReading,
				changes: [],
				pendingRelations: [],
			}),
		);
		expect(generated.storage.readingEntryContextReads()).toEqual([
			"existingReading",
			"exactPendingRelations",
			"relationLemmas",
			"relationReadings",
		]);
	});
});
