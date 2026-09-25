import { afterEach, expect, test } from "bun:test";
import { useAnonymousVisitorId } from "../src/hooks/use-anonymous-visitor";

const originalStorage = Reflect.get(globalThis, "localStorage");

afterEach(() => {
	Reflect.set(globalThis, "localStorage", originalStorage);
});

test("every caller shares one Visitor ID when Storage is unavailable", () => {
	Reflect.set(globalThis, "localStorage", {
		getItem: () => {
			throw new Error("Storage is disabled");
		},
		setItem: () => {
			throw new Error("Storage is disabled");
		},
	});

	const first = useAnonymousVisitorId();
	const second = useAnonymousVisitorId();

	expect(first.length).toBeGreaterThan(0);
	expect(second).toBe(first);
});
