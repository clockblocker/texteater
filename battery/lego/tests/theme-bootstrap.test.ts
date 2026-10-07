import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
	applyTheme,
	COLOR_SCHEME_QUERY,
	getSystemTheme,
	initializeTheme,
	isTheme,
	readStoredTheme,
	writeStoredTheme,
} from "../src/theme/bootstrap";

// No DOM environment (#907): each test stubs the few globals bootstrap.ts
// touches on globalThis, and the originals come back afterwards.
const stubbedGlobals = ["document", "localStorage", "window"] as const;
type StubbedGlobal = (typeof stubbedGlobals)[number];

const originalDescriptors = new Map<
	StubbedGlobal,
	PropertyDescriptor | undefined
>();

function installGlobal(name: StubbedGlobal, value: unknown): void {
	Object.defineProperty(globalThis, name, {
		configurable: true,
		value,
		writable: true,
	});
}

function removeGlobal(name: StubbedGlobal): void {
	Reflect.deleteProperty(globalThis, name);
}

type FakeStorage = {
	entries: Map<string, string>;
	failing: boolean;
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
};

function fakeStorage(initial: Record<string, string> = {}): FakeStorage {
	return {
		entries: new Map(Object.entries(initial)),
		failing: false,
		getItem(key) {
			if (this.failing) throw new Error("storage unavailable");
			return this.entries.get(key) ?? null;
		},
		setItem(key, value) {
			if (this.failing) throw new Error("storage unavailable");
			this.entries.set(key, value);
		},
	};
}

type FakeRoot = {
	classes: Set<string>;
	classList: { add(name: string): void; remove(...names: string[]): void };
	style: { colorScheme: string };
};

function fakeRoot(initialClasses: string[] = []): FakeRoot {
	const classes = new Set(initialClasses);
	return {
		classes,
		classList: {
			add: (name) => {
				classes.add(name);
			},
			remove: (...names) => {
				for (const name of names) classes.delete(name);
			},
		},
		style: { colorScheme: "" },
	};
}

type FakeWindow = {
	prefersDark: boolean;
	queries: string[];
	matchMedia(query: string): { matches: boolean };
};

function fakeWindow(prefersDark: boolean): FakeWindow {
	return {
		prefersDark,
		queries: [],
		matchMedia(query) {
			this.queries.push(query);
			return {
				matches: query === COLOR_SCHEME_QUERY && this.prefersDark,
			};
		},
	};
}

let storage: FakeStorage;
let root: FakeRoot;
let browserWindow: FakeWindow;

function useStorage(initial: Record<string, string>): void {
	storage = fakeStorage(initial);
	installGlobal("localStorage", storage);
}

beforeEach(() => {
	for (const name of stubbedGlobals) {
		originalDescriptors.set(
			name,
			Object.getOwnPropertyDescriptor(globalThis, name),
		);
	}
	useStorage({});
	root = fakeRoot();
	installGlobal("document", { documentElement: root });
	browserWindow = fakeWindow(false);
	installGlobal("window", browserWindow);
});

afterEach(() => {
	for (const name of stubbedGlobals) {
		const descriptor = originalDescriptors.get(name);
		if (descriptor === undefined) removeGlobal(name);
		else Object.defineProperty(globalThis, name, descriptor);
	}
	originalDescriptors.clear();
});

describe("isTheme", () => {
	test("accepts exactly dark, light and system", () => {
		expect(isTheme("dark")).toBe(true);
		expect(isTheme("light")).toBe(true);
		expect(isTheme("system")).toBe(true);
	});

	test("rejects a missing, empty, miscased or unknown value", () => {
		expect(isTheme(null)).toBe(false);
		expect(isTheme("")).toBe(false);
		expect(isTheme("Dark")).toBe(false);
		expect(isTheme("sepia")).toBe(false);
	});
});

describe("readStoredTheme", () => {
	test("returns the Theme stored under the key", () => {
		useStorage({ "app-theme": "light", theme: "dark" });
		expect(readStoredTheme("app-theme")).toBe("light");
	});

	test("returns null when nothing is stored under the key", () => {
		useStorage({ theme: "dark" });
		expect(readStoredTheme("app-theme")).toBeNull();
	});

	test("returns null when the stored value is not a Theme", () => {
		useStorage({ theme: "sepia" });
		expect(readStoredTheme("theme")).toBeNull();
	});

	test("swallows a storage failure and returns null", () => {
		useStorage({ theme: "dark" });
		storage.failing = true;
		expect(readStoredTheme("theme")).toBeNull();
	});
});

describe("writeStoredTheme", () => {
	test("stores the Theme under the key", () => {
		writeStoredTheme("app-theme", "system");
		expect(storage.entries.get("app-theme")).toBe("system");
	});

	test("swallows a storage failure", () => {
		storage.failing = true;
		expect(() => writeStoredTheme("theme", "dark")).not.toThrow();
		expect(storage.entries.size).toBe(0);
	});
});

describe("getSystemTheme", () => {
	test("resolves through the prefers-color-scheme media query", () => {
		browserWindow.prefersDark = true;
		expect(getSystemTheme()).toBe("dark");
		browserWindow.prefersDark = false;
		expect(getSystemTheme()).toBe("light");
		expect(browserWindow.queries).toEqual([
			COLOR_SCHEME_QUERY,
			COLOR_SCHEME_QUERY,
		]);
	});

	test("falls back to dark when there is no window", () => {
		removeGlobal("window");
		expect(getSystemTheme()).toBe("dark");
	});
});

describe("applyTheme", () => {
	test("puts an explicit Theme on the root without consulting the media query", () => {
		root.classes.add("dark");
		expect(applyTheme("light")).toBe("light");
		expect([...root.classes]).toEqual(["light"]);
		expect(root.style.colorScheme).toBe("light");
		expect(browserWindow.queries).toEqual([]);
	});

	test("resolves system through the media query", () => {
		browserWindow.prefersDark = true;
		expect(applyTheme("system")).toBe("dark");
		expect([...root.classes]).toEqual(["dark"]);
		expect(root.style.colorScheme).toBe("dark");

		browserWindow.prefersDark = false;
		expect(applyTheme("system")).toBe("light");
		expect([...root.classes]).toEqual(["light"]);
		expect(root.style.colorScheme).toBe("light");
	});

	test("keeps the root's unrelated classes", () => {
		root.classes.add("antialiased");
		applyTheme("dark");
		expect(root.classes).toEqual(new Set(["antialiased", "dark"]));
	});
});

describe("initializeTheme", () => {
	test("applies the stored Theme over the default", () => {
		useStorage({ theme: "light" });
		expect(initializeTheme({ defaultTheme: "dark" })).toBe("light");
		expect([...root.classes]).toEqual(["light"]);
	});

	test("reads the given storage key", () => {
		useStorage({ "app-theme": "dark", theme: "light" });
		expect(initializeTheme({ storageKey: "app-theme" })).toBe("dark");
		expect([...root.classes]).toEqual(["dark"]);
	});

	test("falls back to the default when nothing valid is stored", () => {
		useStorage({ theme: "sepia" });
		expect(initializeTheme({ defaultTheme: "light" })).toBe("light");
		expect([...root.classes]).toEqual(["light"]);
	});

	test("falls back to the default when storage fails", () => {
		useStorage({ theme: "light" });
		storage.failing = true;
		expect(initializeTheme({ defaultTheme: "dark" })).toBe("dark");
		expect([...root.classes]).toEqual(["dark"]);
	});

	test("defaults to system, resolved through the media query, and does not persist it", () => {
		browserWindow.prefersDark = true;
		expect(initializeTheme()).toBe("system");
		expect([...root.classes]).toEqual(["dark"]);
		expect(root.style.colorScheme).toBe("dark");
		expect(storage.entries.size).toBe(0);
	});
});
