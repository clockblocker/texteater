import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Engine } from "./engine";

/**
 * A Table whose frames the test steps: `frame(ms)` moves its clock to `ms`
 * and runs the frame the engine asked for, if it asked for one.
 */
function bench() {
	let now = 0;
	let asked: ((timestamp: number) => void) | null = null;
	globalThis.requestAnimationFrame = (callback) => {
		asked = callback;
		return 1;
	};
	const engine = new Engine((commit) => commit(), { now: () => now });
	return {
		engine,
		frame(ms: number) {
			now = ms;
			const run = asked;
			asked = null;
			run?.(ms);
		},
		waiting: () => asked !== null,
	};
}

const raf = globalThis.requestAnimationFrame;

describe("a cue", () => {
	beforeEach(() => {
		globalThis.requestAnimationFrame = raf;
	});
	afterEach(() => {
		globalThis.requestAnimationFrame = raf;
	});

	test("is called once the Table's clock has run its length, in a frame", () => {
		const { engine, frame } = bench();
		const calls: number[] = [];
		engine.cue(300, () => calls.push(1));
		frame(0);
		frame(17);
		frame(290);
		expect(calls).toHaveLength(0);
		frame(320);
		expect(calls).toHaveLength(1);
		frame(340);
		expect(calls).toHaveLength(1);
	});

	test("is only ever called in a frame, so never ahead of what the Table has drawn", () => {
		const { engine, frame, waiting } = bench();
		const calls: number[] = [];
		engine.cue(300, () => calls.push(1));
		frame(0);
		frame(17);
		/* a hidden tab: no frame runs, and the cue waits for the next one */
		expect(waiting()).toBe(true);
		expect(calls).toHaveLength(0);
		frame(5_000);
		expect(calls).toHaveLength(1);
		expect(waiting()).toBe(false);
	});
});
