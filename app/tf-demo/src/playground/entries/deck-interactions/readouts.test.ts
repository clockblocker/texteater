import { expect, test } from "bun:test";
import { createReadouts } from "./readouts";

test("a write lands at once for `get`, and subscribers are shown it only after the frame", () => {
	const readouts = createReadouts();
	readouts.set({ phase: "carrying", velocity: { x: 1, y: 0 } });
	expect(readouts.get().phase).toBe("carrying");
	expect(readouts.shown().phase).toBe("rest");
});

test("a write that changes nothing leaves the readouts as they were", () => {
	const readouts = createReadouts();
	readouts.set({ zone: "dismiss", velocity: { x: 1, y: 2 } });
	const before = readouts.get();
	readouts.set({ zone: "dismiss", velocity: { x: 1, y: 2 } });
	expect(readouts.get()).toBe(before);
	readouts.set({ velocity: { x: 1, y: 3 } });
	expect(readouts.get()).not.toBe(before);
});
