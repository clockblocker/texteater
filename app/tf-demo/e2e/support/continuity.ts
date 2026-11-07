import type { BodyFrame, Frame } from "./frames";

/**
 * What a reader sees of each Body from one frame to the next, judged on a
 * frame log (`frames.ts`): it never shows up anywhere it hasn't travelled
 * to, never drops out of sight for a frame, and nothing but the Table's
 * own frame loop moves it. Each returns the violations it found, naming
 * the frame, so a spec can assert them empty and read what broke (#1322).
 */

/** A gap between two frames this long is a stall: nothing travels across it. */
const STALL_MS = 100;
/** A step this far, out and straight back, is a Body shown for one frame where it never was. */
const SPIKE_PX = 6;
/** Below this share of its width a turned Body shows no face. */
const EDGE_ON = 0.1;

function shown(body: BodyFrame | undefined): body is BodyFrame {
	return !!body && body.opacity > 0.05;
}

const at = (body: BodyFrame) => `(${body.cx}, ${body.cy})`;

function distance(a: BodyFrame, b: BodyFrame): number {
	return Math.hypot(b.cx - a.cx, b.cy - a.cy);
}

/**
 * No teleport: no Body is shown, for even one frame, at a place it has not
 * travelled to. It isn't shown away from both the frame before and the
 * one after while they agree (a flash of a place it never went), and it
 * doesn't travel across a stall, a gap of over 100 ms in which the reader
 * saw it stand still before it jumped (a cut). The pace of each step is
 * `jumps`' to judge.
 */
export function teleports(
	frames: readonly Frame[],
	ids: readonly string[],
): string[] {
	const found: string[] = [];
	for (const id of ids)
		for (let i = 1; i < frames.length; i++) {
			const a = frames[i - 1]?.bodies[id];
			const b = frames[i]?.bodies[id];
			if (!shown(a) || !shown(b) || b.mode === "hand") continue;
			const step = distance(a, b);
			const dt = (frames[i]?.t ?? 0) - (frames[i - 1]?.t ?? 0);
			if (dt > STALL_MS && step > 3)
				found.push(
					`${id}: ${at(a)} → ${at(b)} across a ${Math.round(dt)} ms stall (frame ${i})`,
				);
			const c = frames[i + 1]?.bodies[id];
			if (!shown(c) || c.mode === "hand") continue;
			const back = distance(b, c);
			if (
				step > SPIKE_PX &&
				back > SPIKE_PX &&
				distance(a, c) < Math.min(step, back) / 2
			)
				found.push(
					`${id}: at ${at(b)} for one frame, between ${at(a)} and ${at(c)} (frame ${i})`,
				);
		}
	return found;
}

/**
 * No vanish: a mounted Body the reader should see never drops out of sight
 * for a frame. It isn't unmounted for a frame, never drawn edge on (a
 * turn that shows no face), never dips from seen to unseen and back within
 * a frame or two (a dissolve fades over many), and never leaves the
 * viewport for a frame.
 */
export function vanishes(
	frames: readonly Frame[],
	ids: readonly string[],
): string[] {
	const found: string[] = [];
	for (const id of ids)
		for (let i = 1; i < frames.length - 1; i++) {
			const a = frames[i - 1]?.bodies[id];
			const b = frames[i]?.bodies[id];
			const c = frames[i + 1]?.bodies[id];
			if (a && c && !b) {
				found.push(`${id}: unmounted for a frame (frame ${i})`);
				continue;
			}
			if (!a || !b || !c) continue;
			if (shown(b) && b.face < EDGE_ON)
				found.push(
					`${id}: drawn edge on, ${Math.round(b.face * 100)}% of its width (frame ${i})`,
				);
			const back = frames[i + 2]?.bodies[id] ?? c;
			if (
				a.opacity - b.opacity > 0.5 &&
				Math.max(c.opacity, back.opacity) - b.opacity > 0.5
			)
				found.push(
					`${id}: opacity ${a.opacity} → ${b.opacity} → ${c.opacity} (frame ${i})`,
				);
			if (a.inView && c.inView && !b.inView)
				found.push(`${id}: out of view for a frame (frame ${i})`);
		}
	return found;
}

/**
 * One clock: no CSS transition or animation runs on any element the Table
 * moves, in any frame. A page-wide rule (reduced motion's 0.01 ms on `*`)
 * otherwise draws layout a frame behind the compositor.
 */
export function secondClocks(frames: readonly Frame[]): string[] {
	const first = new Map<string, number>();
	frames.forEach((frame, index) => {
		for (const clock of frame.clocks) {
			const property = clock.slice(clock.lastIndexOf(" ") + 1);
			if (![...first.keys()].some((it) => it.endsWith(` ${property}`)))
				first.set(clock, index);
		}
	});
	const count = frames.filter((frame) => frame.clocks.length > 0).length;
	return [...first].map(
		([clock, index]) =>
			`${clock} transitions (first in frame ${index}; ${count} frames run CSS clocks)`,
	);
}

/**
 * Tricks queue: a commit that changes Cards' rests comes only in a frame
 * after every Card has landed from the trick before, never while one is
 * still on its way, as deck-of-cards runs one trick after another.
 */
export function cutTricks(
	frames: readonly Frame[],
	ids: readonly string[],
): string[] {
	const found: string[] = [];
	for (let i = 1; i < frames.length; i++) {
		const before = frames[i - 1]?.bodies ?? {};
		const now = frames[i]?.bodies ?? {};
		const rested = ids.filter((id) => {
			const a = before[id];
			const b = now[id];
			return (
				a?.mode === "rest" &&
				b?.mode === "rest" &&
				(Math.abs(a.rest.x - b.rest.x) > 0.5 ||
					Math.abs(a.rest.y - b.rest.y) > 0.5 ||
					a.restZ !== b.restZ)
			);
		});
		if (rested.length === 0) continue;
		const flying = ids.filter(
			(id) =>
				before[id]?.mode === "rest" && (before[id]?.offset ?? 0) > 1,
		);
		if (flying.length > 0)
			found.push(
				`frame ${i}: ${rested.length} Cards took new rests while ${flying.slice(0, 4).join(", ")} were still on their way`,
			);
	}
	return found;
}
