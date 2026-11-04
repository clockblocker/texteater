import { afterEach, expect, test } from "bun:test";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import { anonymousVisitorIdAtom } from "./anonymous-visitor-atoms";

const STORAGE_KEY = "tf-demo:anonymous-visitor:v1";
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

test("a stored Visitor ID is the one every reader gets", () => {
	useStorage(
		new Map([[STORAGE_KEY, JSON.stringify({ id: "visitor-stored" })]]),
	);
	expect(AtomRegistry.make().get(anonymousVisitorIdAtom)).toBe(
		"visitor-stored",
	);
});

test("a first visit creates a Visitor ID and stores it", () => {
	const entries = new Map<string, string>();
	useStorage(entries);

	const id = AtomRegistry.make().get(anonymousVisitorIdAtom);

	expect(id.length).toBeGreaterThan(0);
	expect(JSON.parse(entries.get(STORAGE_KEY) ?? "null")).toEqual({ id });
});

test("a malformed stored visitor is replaced", () => {
	const entries = new Map([[STORAGE_KEY, JSON.stringify({ id: "  " })]]);
	useStorage(entries);

	const id = AtomRegistry.make().get(anonymousVisitorIdAtom);

	expect(id.trim().length).toBeGreaterThan(0);
	expect(JSON.parse(entries.get(STORAGE_KEY) ?? "null")).toEqual({ id });
});

test("every reader shares one Visitor ID when Storage is unavailable", async () => {
	Reflect.set(globalThis, "localStorage", {
		getItem: () => {
			throw new Error("Storage is disabled");
		},
		setItem: () => {
			throw new Error("Storage is disabled");
		},
	});
	const registry = AtomRegistry.make();

	const first = registry.get(anonymousVisitorIdAtom);
	// With no subscriber in between, a disposable atom would be rebuilt here.
	await new Promise((resolve) => setTimeout(resolve, 20));
	const second = registry.get(anonymousVisitorIdAtom);

	expect(first.length).toBeGreaterThan(0);
	expect(second).toBe(first);
});

test("a registry can be seeded with a Visitor ID", () => {
	useStorage(new Map());
	const registry = AtomRegistry.make({
		initialValues: [[anonymousVisitorIdAtom, "visitor-seeded"]],
	});
	expect(registry.get(anonymousVisitorIdAtom)).toBe("visitor-seeded");
});
