import { afterEach, describe, expect, test } from "bun:test";
import { NO_PARTS } from "../core/move";
import { FOLLOW } from "../core/shape";
import { SPRINGS } from "../core/springs";
import { Engine } from "./engine";

function fakeElement(): HTMLElement {
	return {
		dataset: {},
		style: {
			removeProperty() {},
			setProperty() {},
		},
	} as unknown as HTMLElement;
}

const flushMicrotasks = () =>
	new Promise<void>((resolve) => queueMicrotask(resolve));

describe("Engine lifecycle", () => {
	const savedRaf = Object.getOwnPropertyDescriptor(
		globalThis,
		"requestAnimationFrame",
	);
	const savedCancelRaf = Object.getOwnPropertyDescriptor(
		globalThis,
		"cancelAnimationFrame",
	);

	afterEach(() => {
		if (savedRaf) {
			Object.defineProperty(
				globalThis,
				"requestAnimationFrame",
				savedRaf,
			);
		} else {
			Reflect.deleteProperty(globalThis, "requestAnimationFrame");
		}
		if (savedCancelRaf) {
			Object.defineProperty(
				globalThis,
				"cancelAnimationFrame",
				savedCancelRaf,
			);
		} else {
			Reflect.deleteProperty(globalThis, "cancelAnimationFrame");
		}
	});

	test("evicts BodyState after unmount so engine.bodies.size returns to 0", async () => {
		const engine = new Engine((commit) => commit());
		const seatEl = fakeElement();
		const bodyEl = fakeElement();

		engine.seat("card-1", seatEl);
		engine.attach("card-1", bodyEl);
		expect(engine.bodies.size).toBe(1);
		const state = engine.bodies.get("card-1");
		expect(state?.mounted).toBe(bodyEl);

		engine.detach("card-1", bodyEl);
		engine.seat("card-1", null);

		await flushMicrotasks();

		expect(engine.bodies.size).toBe(0);
		expect(state?.mounted).toBeNull();
	});

	test("preserves BodyState across synchronous React StrictMode same-element re-attach", async () => {
		const engine = new Engine((commit) => commit());
		const seatEl = fakeElement();
		const bodyEl = fakeElement();

		engine.seat("card-1", seatEl);
		engine.attach("card-1", bodyEl);
		const state = engine.body("card-1");
		const move = {
			curve: { kind: "spring" as const, ...SPRINGS.morph, rate: 0 },
			source: "app" as const,
			bornAt: 0,
			delayMs: 0,
			terms: [{ channel: "x" as const, delta: 50, shape: FOLLOW }],
			parts: NO_PARTS,
			crossing: null,
			leaving: null,
		};
		state.moves = [move];

		// StrictMode runs ref cleanups then immediately re-attaches the same DOM nodes.
		engine.detach("card-1", bodyEl);
		engine.seat("card-1", null);
		engine.seat("card-1", seatEl);
		engine.attach("card-1", bodyEl);

		await flushMicrotasks();

		expect(engine.bodies.size).toBe(1);
		expect(engine.bodies.get("card-1")).toBe(state);
		expect(state.mounted).toBe(bodyEl);
		expect(state.el).toBe(bodyEl);
		expect(state.seat).toBe(seatEl);
		expect(state.moves).toEqual([move]);
	});

	test("dispose() cancels pending requestAnimationFrame and drops pending cues", () => {
		const scheduled = new Map<number, FrameRequestCallback>();
		const cancelled: number[] = [];
		let nextId = 1;

		Object.defineProperty(globalThis, "requestAnimationFrame", {
			configurable: true,
			writable: true,
			value: (cb: FrameRequestCallback) => {
				const id = nextId++;
				scheduled.set(id, cb);
				return id;
			},
		});
		Object.defineProperty(globalThis, "cancelAnimationFrame", {
			configurable: true,
			writable: true,
			value: (id: number) => {
				cancelled.push(id);
				scheduled.delete(id);
			},
		});

		const engine = new Engine((commit) => commit());
		const body = engine.body("card-1");
		let cueRan = false;

		engine.activate(body);
		engine.cue(10, () => {
			cueRan = true;
		});

		expect(scheduled.size).toBe(1);
		expect(engine.active.size).toBe(1);

		engine.dispose();

		expect(cancelled).toEqual([1]);
		expect(scheduled.size).toBe(0);
		expect(engine.active.size).toBe(0);
		expect(cueRan).toBe(false);
	});
});
