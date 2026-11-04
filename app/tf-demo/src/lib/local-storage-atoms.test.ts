import { afterEach, expect, test } from "bun:test";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import * as Schema from "effect/Schema";
import { localStorageAtom } from "./local-storage-atoms";

const originalStorage = Reflect.get(globalThis, "localStorage");

afterEach(() => {
	Reflect.set(globalThis, "localStorage", originalStorage);
});

/** A localStorage over `entries`. */
function useStorage(entries: Map<string, string>) {
	Reflect.set(globalThis, "localStorage", {
		getItem: (key: string) => entries.get(key) ?? null,
		setItem: (key: string, value: string) => entries.set(key, value),
		removeItem: (key: string) => entries.delete(key),
	});
}

const KEY = "tf-demo:test:level";
const levelAtom = localStorageAtom({
	key: KEY,
	schema: Schema.Literals(["low", "high"]),
	defaultValue: () => "low" as const,
});

test("a stored value is what the atom reads", () => {
	useStorage(new Map([[KEY, JSON.stringify("high")]]));
	expect(AtomRegistry.make().get(levelAtom)).toBe("high");
});

test("the first read of a missing key stores the default as JSON", () => {
	const entries = new Map<string, string>();
	useStorage(entries);

	expect(AtomRegistry.make().get(levelAtom)).toBe("low");
	expect(entries.get(KEY)).toBe('"low"');
});

test("a write is stored as JSON and reaches readers", () => {
	const entries = new Map<string, string>();
	useStorage(entries);
	const registry = AtomRegistry.make();
	const heard: string[] = [];
	const unsubscribe = registry.subscribe(levelAtom, (level) =>
		heard.push(level),
	);

	registry.set(levelAtom, "high");
	unsubscribe();

	expect(entries.get(KEY)).toBe('"high"');
	expect(heard).toEqual(["high"]);
});

test("a stored value that does not decode reads as the default and stays", () => {
	const entries = new Map([[KEY, "high"]]);
	useStorage(entries);

	expect(AtomRegistry.make().get(levelAtom)).toBe("low");
	expect(entries.get(KEY)).toBe("high");
});

test("with Storage disabled the atom reads the default and still takes writes", () => {
	Reflect.set(globalThis, "localStorage", {
		getItem: () => {
			throw new Error("Storage is disabled");
		},
		setItem: () => {
			throw new Error("Storage is disabled");
		},
	});
	const registry = AtomRegistry.make();
	const unsubscribe = registry.subscribe(levelAtom, () => {});

	expect(registry.get(levelAtom)).toBe("low");
	registry.set(levelAtom, "high");
	expect(registry.get(levelAtom)).toBe("high");
	unsubscribe();
});
