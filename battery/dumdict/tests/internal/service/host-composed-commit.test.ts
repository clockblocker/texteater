import { describe, expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import {
	englishRunDraft,
	englishWalkLemma,
	englishWalkReading,
	enSerializedNotes,
	getBootedUpDumdict,
} from "./helpers";

describe("host-composed Dumdict commits", () => {
	test("prepares a plan without publishing dictionary changes", async () => {
		const { dict, storage } = getBootedUpDumdict("en", enSerializedNotes);
		const dictionaryBefore = storage.loadAll();
		const prepared = await Effect.runPromise(
			dict.prepare.addNewNote({ draft: englishRunDraft }),
		);
		expect(prepared.plan.changes.length).toBeGreaterThan(0);
		expect(storage.loadAll()).toEqual(dictionaryBefore);
	});
});

test("plans an unseen Surface and treats an existing Surface as a no-op", async () => {
	const { dict, storage } = getBootedUpDumdict("en", enSerializedNotes);
	const ownedSurface = {
		surface: {
			unitKind: "Surface" as const,
			language: "en",
			lemma: englishWalkLemma,
			normalizedSurface: "walked",
			spelling: "Canonical",

			surfaceFeatures: null,
			inflectionalFeatures: {
				tense: "Past",
				verbForm: "Fin",
				voice: null,
				person: null,
				number: null,
				mood: null,
			},
		} as const,
		note: { attestedTranslations: [], attestations: [], notes: "" },
	};
	const prepared = await Effect.runPromise(
		dict.prepare.ensureOwnedSurface({
			reading: englishWalkReading,
			ownedSurface,
		}),
	);
	expect(prepared.plan.changes.map(({ type }) => type)).toEqual([
		"createOwnedSurface",
	]);
	expect(storage.loadAll()[0]?.ownedSurfaceEntries).toEqual([]);
	await Effect.runPromise(
		dict.ensureOwnedSurface({ reading: englishWalkReading, ownedSurface }),
	);
	const revisionAfterCreate = (
		await Effect.runPromise(
			storage.findStoredReadings({ lemma: englishWalkLemma }),
		)
	).revision;
	const noOp = await Effect.runPromise(
		dict.prepare.ensureOwnedSurface({
			reading: englishWalkReading,
			ownedSurface,
		}),
	);
	expect(noOp.plan.changes).toEqual([]);
	await Effect.runPromise(
		dict.ensureOwnedSurface({ reading: englishWalkReading, ownedSurface }),
	);
	expect(
		(
			await Effect.runPromise(
				storage.findStoredReadings({ lemma: englishWalkLemma }),
			)
		).revision,
	).toBe(revisionAfterCreate);
});
