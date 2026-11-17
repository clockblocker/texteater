import { afterAll, afterEach, beforeAll, expect, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import {
	explainerHeldAtom,
	explainerModifierKey,
	hoveredPronounAtom,
	hoveredPronounInAtom,
	pinnedPronounAtom,
	shownPronounAtom,
} from "./pronoun-explainer-atoms";

beforeAll(() => {
	GlobalRegistrator.register({ url: "http://localhost/" });
});

afterAll(async () => {
	await GlobalRegistrator.unregister();
});

// Each test's registry drops its atoms, and the listeners, on a later tick.
afterEach(() => new Promise((resolve) => setTimeout(resolve, 20)));

const key = (type: "keydown" | "keyup") =>
	window.dispatchEvent(
		new KeyboardEvent(type, { key: explainerModifierKey() }),
	);

const er = { sentenceId: "s2", pronoun: [0], segmentIndex: 0 };
const sie = { sentenceId: "s3", pronoun: [4], segmentIndex: 4 };

/** A registry whose explainer atoms are read, so the window listeners are on. */
function mounted() {
	const registry = AtomRegistry.make();
	const shown: unknown[] = [];
	registry.subscribe(shownPronounAtom, (value) => shown.push(value));
	return { registry, shown };
}

test("holding the key shows the hovered pronoun, and letting go hides it", () => {
	const { registry } = mounted();
	registry.set(hoveredPronounAtom, er);
	expect(registry.get(shownPronounAtom)).toBeNull();
	key("keydown");
	expect(registry.get(explainerHeldAtom)).toBe(true);
	expect(registry.get(shownPronounAtom)).toEqual(er);
	key("keyup");
	expect(registry.get(shownPronounAtom)).toBeNull();
});

test("a pinned pronoun shows while nothing is hovered, until the key is let go", () => {
	const { registry } = mounted();
	key("keydown");
	registry.set(pinnedPronounAtom, er);
	expect(registry.get(shownPronounAtom)).toEqual(er);
	registry.set(hoveredPronounAtom, sie);
	expect(registry.get(shownPronounAtom)).toEqual(sie);
	registry.set(hoveredPronounAtom, null);
	expect(registry.get(shownPronounAtom)).toEqual(er);
	window.dispatchEvent(new Event("blur"));
	expect(registry.get(explainerHeldAtom)).toBe(false);
	expect(registry.get(pinnedPronounAtom)).toBeNull();
});

test("a pointer moving without the key lets go of it", () => {
	const { registry } = mounted();
	key("keydown");
	window.dispatchEvent(new PointerEvent("pointermove"));
	expect(registry.get(explainerHeldAtom)).toBe(false);
});

test("each Sentence hears only a pronoun hovered in it", () => {
	const registry = AtomRegistry.make();
	registry.set(hoveredPronounAtom, er);
	expect(registry.get(hoveredPronounInAtom("s2"))).toEqual(er);
	expect(registry.get(hoveredPronounInAtom("s3"))).toBeNull();
});
