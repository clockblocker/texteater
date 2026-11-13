import { afterEach, expect, test } from "bun:test";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import { DEFAULTS, readKnobs } from "./knobs";
import { deckInteractionSettingsAtom, settingsOf } from "./settings-atoms";

const STORAGE_KEY = "tf-demo:playground:deck-interactions:settings-v1";
const originalStorage = Reflect.get(globalThis, "localStorage");

afterEach(() => {
	Reflect.set(globalThis, "localStorage", originalStorage);
});

function useStorage(entries: Map<string, string>) {
	Reflect.set(globalThis, "localStorage", {
		getItem: (key: string) => entries.get(key) ?? null,
		setItem: (key: string, value: string) => entries.set(key, value),
	});
}

test("the page opens on D with full motion, real time and LTR", () => {
	useStorage(new Map());
	expect(
		settingsOf(AtomRegistry.make().get(deckInteractionSettingsAtom)),
	).toEqual({
		variant: "swipe",
		reducedMotion: "off",
		timeScale: 1,
		rtl: false,
		width: "auto",
		knobs: {},
	});
});

test("a stored field that no longer decodes falls back alone", () => {
	useStorage(
		new Map([
			[
				STORAGE_KEY,
				JSON.stringify({
					variant: "retired",
					rtl: true,
					timeScale: 3,
					width: "tablet",
				}),
			],
		]),
	);
	const settings = settingsOf(
		AtomRegistry.make().get(deckInteractionSettingsAtom),
	);
	expect(settings.variant).toBe("swipe");
	expect(settings.rtl).toBe(true);
	expect(settings.timeScale).toBe(1);
	expect(settings.width).toBe("auto");
});

test("Storage that throws reads as the defaults", () => {
	Reflect.set(globalThis, "localStorage", {
		getItem: () => {
			throw new Error("denied");
		},
		setItem: () => {
			throw new Error("denied");
		},
	});
	expect(
		settingsOf(AtomRegistry.make().get(deckInteractionSettingsAtom))
			.variant,
	).toBe("swipe");
});

test("a knob out of range or of the wrong type keeps its default", () => {
	expect(
		readKnobs("swipe", { threshold: 9999, haptic: "yes", tint: 0.3 }),
	).toEqual({ ...DEFAULTS.swipe, tint: 0.3 });
	expect(readKnobs("swipe", { collapseCurve: "ease-in" }).collapseCurve).toBe(
		"ease-in",
	);
});
