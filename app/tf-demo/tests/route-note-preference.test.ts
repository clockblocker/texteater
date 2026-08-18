import { expect, test } from "bun:test";

import {
	readRouteNotePreference,
	shouldRequestRouteNote,
	writeRouteNotePreference,
} from "../src/lib/route-note-preference";

test("Route Note preference and one-shot modifier follow the OR truth table", () => {
	expect([
		shouldRequestRouteNote(false, false),
		shouldRequestRouteNote(false, true),
		shouldRequestRouteNote(true, false),
		shouldRequestRouteNote(true, true),
	]).toEqual([false, true, true, true]);
});

test("Route Note preference is client-local and optional", () => {
	const values = new Map<string, string>();
	const storage = {
		getItem(key: string) {
			return values.get(key) ?? null;
		},
		setItem(key: string, value: string) {
			values.set(key, value);
		},
	};
	expect(readRouteNotePreference(storage)).toBe(false);
	writeRouteNotePreference(true, storage);
	expect(readRouteNotePreference(storage)).toBe(true);
	writeRouteNotePreference(false, storage);
	expect(readRouteNotePreference(storage)).toBe(false);
});
