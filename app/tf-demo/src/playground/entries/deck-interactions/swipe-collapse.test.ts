import { afterEach, describe, expect, spyOn, test } from "bun:test";
import {
	animate,
	frameData,
	frameSteps,
	type MotionValue,
	motionValue,
} from "motion/react";
import type { Slot } from "./geometry";
import { type Binding, bindDeck } from "./swipe-collapse";
import type { CardValues } from "./use-deck";

/* Motion's frame loop, run by hand. Bun has no requestAnimationFrame, so
   Motion only queues its frames; each test runs them on a stubbed clock,
   with the hand's pointer events a sliver of a frame before them, where a
   browser dispatches them. */
const STEPS = [
	"setup",
	"read",
	"resolveKeyframes",
	"preUpdate",
	"update",
	"preRender",
	"render",
	"postRender",
] as const;
const FRAME_MS = 1000 / 60;
const SLIVER_MS = 0.5;
const SETTLE = { type: "spring", stiffness: 632, damping: 50 } as const;
const KEYS = ["u", "v", "s"] as const;

let clock = 0;
let frameAt = 1000;
const cleanups: (() => void)[] = [];

afterEach(() => {
	for (const cleanup of cleanups.splice(0)) cleanup();
});

/** Motion keeps one time per synchronous run: a microtask lets it move on. */
const settled = () => Promise.resolve();

async function pointerEvent(act: () => void) {
	await settled();
	clock = frameAt + FRAME_MS - SLIVER_MS;
	act();
}

async function nextFrame() {
	await settled();
	frameAt += FRAME_MS;
	clock = frameAt;
	frameData.timestamp = frameAt;
	frameData.delta = FRAME_MS;
	frameData.isProcessing = true;
	for (const step of STEPS) frameSteps[step].process(frameData);
	frameData.isProcessing = false;
	await settled();
}

function cardValues(at: Slot, z: number): CardValues {
	const value = (n: number) => motionValue(n);
	return {
		u: value(at.u),
		v: value(at.v),
		w: value(at.w),
		h: value(at.h),
		r: value(at.r),
		s: value(at.s),
		lift: value(0),
		o: value(1),
		z: value(z),
		stamp: value(0),
		glow: value(0),
	};
}

type Pile = ReturnType<typeof makePile>;

/** A Deck of three, front last at the open scale, each Card drawn `from` its slot. */
function makePile(from: Record<string, Partial<Slot>>) {
	const now = spyOn(performance, "now").mockImplementation(() => clock);
	cleanups.push(() => now.mockRestore());
	return ["back", "middle", "front"].map((id, index) => {
		const slot: Slot = {
			u: 100,
			v: 100 + index * 40,
			w: 300,
			h: 400,
			r: 0,
			s: index === 2 ? 1.05 : 1,
		};
		const values = cardValues({ ...slot, ...from[id] }, 10 + index);
		return { id, slot, values };
	});
}

/** Binds `lead` from the hand's pointer event, for a pull along the inline axis. */
async function bindPile(
	pile: Pile,
	lead: string,
	settle: (value: MotionValue<number>, to: number, velocity: number) => void,
) {
	const order = pile.map((card) => card.id);
	const slots = pile.map((card) => card.slot);
	const of = (id: string) => {
		const card = pile.find((other) => other.id === id);
		if (!card) throw new Error(`No Card ${id}`);
		return card.values;
	};
	const pull = motionValue(0);
	let binding: Binding | null = null;
	await pointerEvent(() => {
		binding = bindDeck(
			{
				order,
				slots,
				slotOf: (id) => slots[order.indexOf(id)],
				valuesOf: of,
				release: () => {},
				place: () => {
					throw new Error("Nothing here scatters the Deck");
				},
			},
			lead,
			"inline",
			pull,
			{ threshold: 96, curve: "linear", settle },
		);
	});
	cleanups.push(() => {
		binding?.stop();
		pull.stop();
		for (const { values } of pile)
			for (const key of KEYS) values[key].stop();
	});
	return { pull };
}

/**
 * The two Cards behind still springing to their slots from where a
 * scatter left them, as the hand takes the front one toward Close deck.
 */
async function swipeTowardClose() {
	const pile = makePile({
		back: { u: 84, v: 92, s: 1.02 },
		middle: { u: 92, v: 136 },
	});
	const behind = pile.slice(0, -1);
	for (const { slot, values } of behind)
		for (const key of KEYS) animate(values[key], slot[key], SETTLE);
	await nextFrame();
	await nextFrame();
	const { pull } = await bindPile(pile, "front", (value, to, velocity) => {
		animate(value, to, { ...SETTLE, velocity });
	});
	return { pull, behind: behind.map((card) => card.values) };
}

type Seen = { value: MotionValue<number>; at: number; was: number };

/** Every value of the Cards behind, as the last frame drew it. */
function look(behind: readonly CardValues[]): Seen[] {
	return behind.flatMap((card) =>
		KEYS.map((key) => ({
			value: card[key],
			at: frameAt,
			was: card[key].get(),
		})),
	);
}

/** Motion's speed of each value against how far it moved since `seen`, frame to frame. */
function expectFrameSpeeds(seen: readonly Seen[]) {
	for (const { value, at, was } of seen) {
		const real = ((value.get() - was) / (frameAt - at)) * 1000;
		expect(value.getVelocity()).toBeCloseTo(real, 3);
	}
}

describe("D's fold, on Motion's frame loop", () => {
	test("a pull from the hand moves the Cards behind on the next frame, not from its pointer event", async () => {
		const { pull, behind } = await swipeTowardClose();
		await nextFrame();
		for (const step of [1, 2, 3, 4]) {
			const drawn = look(behind);
			await pointerEvent(() => pull.set(-14 * step));
			for (const { value, was } of drawn) expect(value.get()).toBe(was);
			await nextFrame();
		}
	});

	test("the speed Motion reads off each Card behind is its speed frame to frame, toward Close deck and on the way home", async () => {
		const { pull, behind } = await swipeTowardClose();
		let seen = look(behind);
		await nextFrame();
		expectFrameSpeeds(seen);
		for (const step of [1, 2, 3, 4, 5, 6]) {
			seen = look(behind);
			await pointerEvent(() => pull.set(-14 * step));
			await nextFrame();
			expectFrameSpeeds(seen);
		}
		/* let go short of the threshold, a little further on, and home */
		seen = look(behind);
		await pointerEvent(() => {
			pull.set(-90);
			animate(pull, 0, {
				type: "spring",
				stiffness: 632,
				damping: 50,
				velocity: -900,
			});
		});
		for (let frame = 0; frame < 12; frame++) {
			await nextFrame();
			expectFrameSpeeds(seen);
			seen = look(behind);
		}
	});
});

describe("D's fold onto a Card from inside the Deck", () => {
	test("the Cards in front come up onto it and the ones behind down, whole at the threshold, and no Card's z-index ever moves", async () => {
		const pile = makePile({});
		const [back, middle, front] = pile.map((card) => card.values);
		if (!back || !middle || !front) throw new Error("Missing a Card");
		const stacked = () => [back, middle, front].map((card) => card.z.get());
		const before = stacked();
		const { pull } = await bindPile(
			pile,
			"middle",
			(value, to, velocity) => {
				animate(value, to, { ...SETTLE, velocity });
			},
		);
		await nextFrame();
		await pointerEvent(() => pull.set(-12));
		await nextFrame();
		expect(front.v.get()).toBeLessThan(180);
		expect(back.v.get()).toBeGreaterThan(100);
		expect(stacked()).toEqual(before);
		await pointerEvent(() => pull.set(-96));
		await nextFrame();
		for (const other of [back, front]) {
			expect(other.u.get()).toBeCloseTo(middle.u.get(), 6);
			expect(other.v.get()).toBeCloseTo(middle.v.get(), 6);
			expect(other.s.get()).toBeCloseTo(1, 6);
		}
		expect(stacked()).toEqual(before);
		/* toward Open the Cards in front rest */
		await pointerEvent(() => pull.set(20));
		await nextFrame();
		expect(front.v.get()).toBe(180);
		expect(front.s.get()).toBe(1.05);
		expect(stacked()).toEqual(before);
	});
});
