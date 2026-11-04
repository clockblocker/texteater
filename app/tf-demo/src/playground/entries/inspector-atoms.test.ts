import { afterEach, expect, test } from "bun:test";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import { inspectorOpenAtom } from "./inspector-atoms";

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

test("an inspector is open until it is closed", () => {
	useStorage(new Map());
	expect(AtomRegistry.make().get(inspectorOpenAtom("Breakdowns"))).toBe(true);
});

test("each prototype remembers its own inspector", () => {
	const entries = new Map([
		["tf-demo:playground:breakdowns:inspector-open", "false"],
	]);
	useStorage(entries);
	const registry = AtomRegistry.make();

	registry.set(inspectorOpenAtom("Palette"), false);

	expect(registry.get(inspectorOpenAtom("Breakdowns"))).toBe(false);
	expect(registry.get(inspectorOpenAtom("Notes"))).toBe(true);
	expect(entries.get("tf-demo:playground:palette:inspector-open")).toBe(
		"false",
	);
});
