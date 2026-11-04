import { afterEach, expect, test } from "bun:test";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import { variantsAtom } from "./variants-atoms";

const STORAGE_KEY = "deck-motion-variants-v1";
const originalStorage = Reflect.get(globalThis, "localStorage");

afterEach(() => {
	Reflect.set(globalThis, "localStorage", originalStorage);
});

/** A localStorage over `entries`. */
function useStorage(entries: Map<string, string>) {
	Reflect.set(globalThis, "localStorage", {
		getItem: (key: string) => entries.get(key) ?? null,
		setItem: (key: string, value: string) => entries.set(key, value),
	});
}

test("there are no variants until one is saved", () => {
	useStorage(new Map());
	expect(AtomRegistry.make().get(variantsAtom)).toEqual([]);
});

test("saved variants come back with their knobs", () => {
	const saved = [
		{ id: "a", name: "Larger selection", motion: { openScale: 1.18 } },
		{ id: "b", name: "Stiff", motion: { stiffness: 900, damping: 40 } },
	];
	useStorage(new Map([[STORAGE_KEY, JSON.stringify(saved)]]));
	expect(AtomRegistry.make().get(variantsAtom)).toEqual(saved);
});

test("a knob outside its range or unknown is dropped and the variant stays", () => {
	useStorage(
		new Map([
			[
				STORAGE_KEY,
				JSON.stringify([
					{
						id: "a",
						name: "Drifted",
						motion: { openScale: 9, damping: 40, retired: 3 },
					},
				]),
			],
		]),
	);
	expect(AtomRegistry.make().get(variantsAtom)).toEqual([
		{ id: "a", name: "Drifted", motion: { damping: 40 } },
	]);
});

test("a list holding something that is not a variant reads as empty", () => {
	useStorage(
		new Map([[STORAGE_KEY, JSON.stringify([{ id: 1, motion: {} }])]]),
	);
	expect(AtomRegistry.make().get(variantsAtom)).toEqual([]);
});

test("a saved list is stored as the JSON array it is", () => {
	const entries = new Map<string, string>();
	useStorage(entries);
	const variants = [{ id: "a", name: "Slow", motion: { durationScale: 2 } }];

	AtomRegistry.make().set(variantsAtom, variants);

	expect(JSON.parse(entries.get(STORAGE_KEY) ?? "null")).toEqual(variants);
});
