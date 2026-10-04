import { describe, expect, test } from "bun:test";
import {
	englishRunDraft,
	englishWalkLemma,
	englishWalkReading,
	enSerializedNotes,
	getBootedUpDumdict,
	plannedOf,
} from "./helpers";

describe("host-composed Dumdict commits", () => {
	test("plans without publishing dictionary changes", () => {
		const booted = getBootedUpDumdict("en", enSerializedNotes);
		const dictionaryBefore = booted.storage.loadAll();
		const planned = plannedOf(
			booted.dict.plan.addNewNote({ draft: englishRunDraft }),
		);
		expect(planned.plan.changes.length).toBeGreaterThan(0);
		expect(booted.storage.loadAll()).toEqual(dictionaryBefore);
	});
});

test("plans an unseen Surface and treats an existing Surface as a no-op", () => {
	const { dict, storage } = getBootedUpDumdict("en", enSerializedNotes);
	const ownedSurface = {
		surface: {
			unitKind: "Surface" as const,
			language: "en",
			lemma: englishWalkLemma,
			normalizedSurface: "walked",
			spelling: { kind: "Canonical" },

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
	const request = { reading: englishWalkReading, ownedSurface };
	const planned = plannedOf(dict.plan.ensureOwnedSurface(request));
	expect(planned.plan.changes.map(({ type }) => type)).toEqual([
		"createOwnedSurface",
	]);
	expect(storage.loadAll()[0]?.ownedSurfaceEntries).toEqual([]);
	dict.ensureOwnedSurface(request);
	const revisionAfterCreate = storage.revision();
	const noOp = plannedOf(dict.plan.ensureOwnedSurface(request));
	expect(noOp.plan.changes).toEqual([]);
	dict.ensureOwnedSurface(request);
	expect(storage.revision()).toBe(revisionAfterCreate);
});
