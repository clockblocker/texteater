import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	expect,
	spyOn,
	test,
} from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import { motionPreferenceAtom } from "./motion-preference-atoms";
import {
	MOTION_PREFERENCE_STORAGE_KEY,
	type MotionPreference,
	readMotionPreference,
} from "./motion-preference-storage";

beforeAll(() => {
	GlobalRegistrator.register({ url: "http://localhost/" });
});

afterAll(async () => {
	await GlobalRegistrator.unregister();
});

/** Lets the registry run the node removals it schedules. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

beforeEach(() => {
	localStorage.clear();
	delete document.documentElement.dataset.motionPreference;
});

// Each test's registry drops its atom, and the listener, on a later tick.
afterEach(settle);

const rootPreference = () => document.documentElement.dataset.motionPreference;

/** What another tab's write looks like here: Storage changes, then `storage` fires. */
function writeInAnotherTab(newValue: string | null) {
	if (newValue === null)
		localStorage.removeItem(MOTION_PREFERENCE_STORAGE_KEY);
	else localStorage.setItem(MOTION_PREFERENCE_STORAGE_KEY, newValue);
	window.dispatchEvent(
		new StorageEvent("storage", {
			key: MOTION_PREFERENCE_STORAGE_KEY,
			newValue,
			storageArea: localStorage,
		}),
	);
}

test("the stored preference is read and applied to the root", () => {
	localStorage.setItem(MOTION_PREFERENCE_STORAGE_KEY, '"ignore"');
	expect(AtomRegistry.make().get(motionPreferenceAtom)).toBe("ignore");
	expect(rootPreference()).toBe("ignore");
});

test("with nothing stored the preference respects the system", () => {
	expect(AtomRegistry.make().get(motionPreferenceAtom)).toBe("respect");
	expect(rootPreference()).toBe("respect");
});

test("setting the preference stores it, applies it and tells readers", () => {
	const registry = AtomRegistry.make();
	const heard: MotionPreference[] = [];
	const unsubscribe = registry.subscribe(motionPreferenceAtom, (preference) =>
		heard.push(preference),
	);

	registry.set(motionPreferenceAtom, "ignore");
	unsubscribe();

	expect(localStorage.getItem(MOTION_PREFERENCE_STORAGE_KEY)).toBe(
		'"ignore"',
	);
	expect(rootPreference()).toBe("ignore");
	expect(heard).toEqual(["ignore"]);
});

test("the pre-paint read sees what the atom stored", () => {
	const registry = AtomRegistry.make();
	for (const preference of ["ignore", "respect"] as const) {
		registry.set(motionPreferenceAtom, preference);
		expect(readMotionPreference()).toBe(preference);
	}
});

test("another tab's change reaches readers and the root", () => {
	const registry = AtomRegistry.make();
	const heard: MotionPreference[] = [];
	const unsubscribe = registry.subscribe(motionPreferenceAtom, (preference) =>
		heard.push(preference),
	);

	writeInAnotherTab('"ignore"');
	expect(rootPreference()).toBe("ignore");
	writeInAnotherTab(null);
	unsubscribe();

	expect(heard).toEqual(["ignore", "respect"]);
	expect(rootPreference()).toBe("respect");
});

test("a change to another key or another Storage is ignored", () => {
	const registry = AtomRegistry.make();
	const heard: MotionPreference[] = [];
	const unsubscribe = registry.subscribe(motionPreferenceAtom, (preference) =>
		heard.push(preference),
	);

	window.dispatchEvent(
		new StorageEvent("storage", {
			key: "tf-demo-theme",
			newValue: '"ignore"',
			storageArea: localStorage,
		}),
	);
	window.dispatchEvent(
		new StorageEvent("storage", {
			key: MOTION_PREFERENCE_STORAGE_KEY,
			newValue: '"ignore"',
			storageArea: sessionStorage,
		}),
	);
	unsubscribe();

	expect(heard).toEqual([]);
});

test("the storage listener goes with the last reader", async () => {
	const added = spyOn(window, "addEventListener");
	const removed = spyOn(window, "removeEventListener");
	const storageCalls = (spy: typeof added) =>
		spy.mock.calls.filter(([type]) => type === "storage").length;
	try {
		const registry = AtomRegistry.make();
		registry.subscribe(motionPreferenceAtom, () => {})();
		await settle();
		expect(storageCalls(added)).toBe(1);
		expect(storageCalls(removed)).toBe(1);
	} finally {
		added.mockRestore();
		removed.mockRestore();
	}
});
