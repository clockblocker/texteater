import { expect, test } from "bun:test";
import * as Atom from "effect/reactivity/Atom";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import { morphemePinAtom } from "../src/notes/universal/blocks/renderers/reading/breakdown/morpheme-pin-atoms";

/** Lets the registry run the node removals it schedules. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

test("a line starts with no pin and keeps the one it is given", () => {
	const registry = AtomRegistry.make();
	expect(registry.get(morphemePinAtom("Einkauf"))).toBeNull();

	registry.set(morphemePinAtom("Einkauf"), 1);
	expect(registry.get(morphemePinAtom("Einkauf"))).toBe(1);

	registry.set(morphemePinAtom("Einkauf"), null);
	expect(registry.get(morphemePinAtom("Einkauf"))).toBeNull();
});

test("the family hands out one atom per owner", () => {
	expect(morphemePinAtom("Einkauf")).toBe(morphemePinAtom("Einkauf"));
	expect(morphemePinAtom("Einkauf")).not.toBe(morphemePinAtom("Verkauf"));

	const registry = AtomRegistry.make();
	registry.set(morphemePinAtom("Einkauf"), 0);
	expect(registry.get(morphemePinAtom("Verkauf"))).toBeNull();
});

test("subscribers hear a new pin and not a repeated one", () => {
	const registry = AtomRegistry.make();
	const heard: (number | null)[] = [];
	const unsubscribe = registry.subscribe(morphemePinAtom("Einkauf"), (pin) =>
		heard.push(pin),
	);

	registry.set(morphemePinAtom("Einkauf"), 2);
	registry.set(morphemePinAtom("Einkauf"), 2);
	registry.set(morphemePinAtom("Einkauf"), null);
	unsubscribe();
	registry.set(morphemePinAtom("Einkauf"), 0);

	expect(heard).toEqual([2, null]);
});

test("a pin survives its line unmounting", async () => {
	const registry = AtomRegistry.make();
	const unmount = registry.mount(morphemePinAtom("Einkauf"));
	registry.set(morphemePinAtom("Einkauf"), 1);
	unmount();
	await settle();

	expect(registry.get(morphemePinAtom("Einkauf"))).toBe(1);
});

test("without keepAlive the same state would reset once unmounted", async () => {
	const registry = AtomRegistry.make();
	const transient = Atom.make<number | null>(null);
	const unmount = registry.mount(transient);
	registry.set(transient, 1);
	unmount();
	await settle();

	expect(registry.get(transient)).toBeNull();
});

test("each registry holds its own pins", () => {
	const first = AtomRegistry.make();
	const second = AtomRegistry.make();
	first.set(morphemePinAtom("Einkauf"), 1);

	expect(second.get(morphemePinAtom("Einkauf"))).toBeNull();
});
