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
import { pathnameAtom } from "./pathname-atoms";

beforeAll(() => {
	GlobalRegistrator.register({ url: "http://localhost/" });
});

afterAll(async () => {
	await GlobalRegistrator.unregister();
});

/** Lets the registry run the node removals it schedules. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

beforeEach(() => {
	window.history.replaceState(null, "", "/");
});

// Each test's registry drops its atom, and the listener, on a later tick.
afterEach(settle);

/** What Back or Forward does: the URL changes, then `popstate` fires. */
function travelTo(pathname: string) {
	window.history.replaceState(null, "", pathname);
	window.dispatchEvent(new PopStateEvent("popstate"));
}

test("the atom reads the pathname the page opened at", () => {
	window.history.replaceState(null, "", "/playground/notes");
	expect(AtomRegistry.make().get(pathnameAtom)).toBe("/playground/notes");
});

test("setting the atom pushes a history entry and tells readers", () => {
	const registry = AtomRegistry.make();
	const heard: string[] = [];
	const unsubscribe = registry.subscribe(pathnameAtom, (pathname) =>
		heard.push(pathname),
	);
	const entries = window.history.length;

	registry.set(pathnameAtom, { pathname: "/playground" });
	unsubscribe();

	expect(window.location.pathname).toBe("/playground");
	expect(window.history.length).toBe(entries + 1);
	expect(heard).toEqual(["/playground"]);
});

test("a replacing move rewrites the current entry", () => {
	const registry = AtomRegistry.make();
	const entries = window.history.length;

	registry.set(pathnameAtom, {
		pathname: "/playground/notes",
		replace: true,
	});

	expect(registry.get(pathnameAtom)).toBe("/playground/notes");
	expect(window.location.pathname).toBe("/playground/notes");
	expect(window.history.length).toBe(entries);
});

test("moving to the current pathname changes nothing", () => {
	const registry = AtomRegistry.make();
	const heard: string[] = [];
	const unsubscribe = registry.subscribe(pathnameAtom, (pathname) =>
		heard.push(pathname),
	);
	const entries = window.history.length;

	registry.set(pathnameAtom, { pathname: "/" });
	unsubscribe();

	expect(window.history.length).toBe(entries);
	expect(heard).toEqual([]);
});

test("Back and Forward reach readers through popstate", () => {
	const registry = AtomRegistry.make();
	const heard: string[] = [];
	const unsubscribe = registry.subscribe(pathnameAtom, (pathname) =>
		heard.push(pathname),
	);

	travelTo("/playground/breakdowns");
	travelTo("/");
	unsubscribe();

	expect(heard).toEqual(["/playground/breakdowns", "/"]);
});

test("the popstate listener goes with the last reader and comes back with the next", async () => {
	const added = spyOn(window, "addEventListener");
	const removed = spyOn(window, "removeEventListener");
	const popstateCalls = (spy: typeof added) =>
		spy.mock.calls.filter(([type]) => type === "popstate").length;
	try {
		const registry = AtomRegistry.make();
		registry.subscribe(pathnameAtom, () => {})();
		await settle();
		expect(popstateCalls(added)).toBe(1);
		expect(popstateCalls(removed)).toBe(1);

		// With no reader the atom is gone, so the next reader starts from the URL.
		travelTo("/playground/palette");
		const heard: string[] = [];
		const unsubscribe = registry.subscribe(pathnameAtom, (pathname) =>
			heard.push(pathname),
		);
		expect(registry.get(pathnameAtom)).toBe("/playground/palette");
		travelTo("/playground/loading");
		unsubscribe();
		expect(heard).toEqual(["/playground/loading"]);
		expect(popstateCalls(added)).toBe(2);
	} finally {
		added.mockRestore();
		removed.mockRestore();
	}
});
