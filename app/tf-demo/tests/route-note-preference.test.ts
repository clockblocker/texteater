import { expect, test } from "bun:test";

import {
	readRouteNotePreference,
	writeRouteNotePreference,
} from "../src/lib/route-note-preference";

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
