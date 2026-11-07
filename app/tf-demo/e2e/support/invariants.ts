import { expect } from "@playwright/test";
import type { BodyFrame, Frame, Rect } from "./frames";

/**
 * The invariants every tabletop move is held to, judged on a frame log
 * (`frames.ts`). Each returns the violations it found, so a spec can assert
 * them empty and read what broke.
 */

/** One frame at 60 Hz, in ms. */
const FRAME_MS = 1000 / 60;

type Series = {
	readonly name: string;
	readonly t: readonly number[];
	readonly v: readonly (number | null)[];
	/** Frames the hand held the Body in: it moves 1:1 there, unjudged. */
	readonly hand: readonly boolean[];
	/** Below which a step counts as no step, in the series' unit. */
	readonly floor: number;
	/** Whether the hand's own speed may carry on past a release. */
	readonly carried: boolean;
	/** The least travel a step is judged against: a share's whole range is 1. */
	readonly range?: number;
};

function overlap(a: Rect, b: Rect): number {
	const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
	const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
	return w > 0.5 && h > 0.5 ? w * h : 0;
}

/** Whether `a` is drawn above `b`: a higher seat z, or later among equals. */
function above(a: BodyFrame, b: BodyFrame): boolean {
	return a.z === b.z ? a.order > b.order : a.z > b.z;
}

/**
 * How much `over` shows where it overlaps `under`: drawn above it, its veil
 * over `under` (1 unveiled); drawn below, whatever `under`'s veil lets
 * through. A crossing moves this from 1 to 0 or back; a z flag flips it.
 */
function showsOver(over: BodyFrame, under: BodyFrame): number {
	if (above(over, under)) return over.veils[under.id] ?? 1;
	return 1 - (under.veils[over.id] ?? 1);
}

function seen(body: BodyFrame | undefined): body is BodyFrame {
	return !!body && body.opacity > 0.05;
}

function seriesOf(frames: readonly Frame[], id: string): Series[] {
	const t = frames.map((frame) => frame.t);
	const hand = frames.map((frame) => frame.bodies[id]?.mode === "hand");
	const of = (
		name: string,
		floor: number,
		read: (body: BodyFrame) => number | null,
		carried = false,
	): Series => ({
		name: `${id} ${name}`,
		t,
		hand,
		floor,
		carried,
		v: frames.map((frame) => {
			const body = frame.bodies[id];
			return seen(body) ? read(body) : null;
		}),
	});
	const series = [
		of("centre x", 3, (b) => b.cx, true),
		of("centre y", 3, (b) => b.cy, true),
		of("width", 3, (b) => b.w),
		of("height", 3, (b) => b.h),
		of("rotate", 1, (b) => b.rotate),
		of("scale", 0.01, (b) => b.scale),
		of("lean", 0.5, (b) => b.lean),
	];
	/* a Part moves with its box: centred content shifts as the box grows */
	const boxTravel = Math.max(
		...series.map((each) => {
			const values = each.v.filter((v): v is number => v !== null);
			return values.length && each.floor >= 3
				? Math.max(...values) - Math.min(...values)
				: 0;
		}),
	);
	const partIds = new Set(
		frames.flatMap((frame) =>
			(frame.bodies[id]?.parts ?? []).map((part) => part.id),
		),
	);
	for (const part of partIds)
		for (const axis of ["x", "y"] as const)
			series.push({
				...of(`part ${part} ${axis}`, 3, (b) => {
					const p = b.parts.find((it) => it.id === part);
					if (!p?.rect || p.opacity < 0.05) return null;
					return p.rect[axis];
				}),
				range: boxTravel,
			});
	return series;
}

/** For each pair of Bodies that overlap, how much the first shows over the second. */
function stackingSeries(frames: readonly Frame[], ids: readonly string[]) {
	const out: Series[] = [];
	for (const a of ids)
		for (const b of ids) {
			if (a >= b) continue;
			const v = frames.map((frame) => {
				const x = frame.bodies[a];
				const y = frame.bodies[b];
				if (!seen(x) || !seen(y)) return null;
				if (overlap(x.bounds, y.bounds) < 4) return null;
				return showsOver(x, y);
			});
			if (v.some((value) => value !== null))
				out.push({
					name: `${a} over ${b}`,
					t: frames.map((f) => f.t),
					hand: frames.map(() => false),
					v,
					floor: 0.02,
					carried: false,
					range: 1,
				});
		}
	return out;
}

/**
 * Continuity: no step between two frames is bigger than the move could
 * take in that time. A step may cover at most `share` of the series' whole
 * travel per 60 Hz frame (a 300 ms tween's steepest frame is 8%, the morph
 * spring's 12%, the hand's settle 16%); a release may also carry on at up
 * to 1.5 times the hand's last speed. Steps under the series' floor pass.
 * Frames where the Body is hidden are left out (a dissolve jumps while it
 * can't be seen), as are steps between two frames in the hand, which moves
 * 1:1 with the pointer.
 */
export function jumps(
	frames: readonly Frame[],
	ids: readonly string[],
	{
		share = 0.3,
		stackingCuts = false,
	}: { readonly share?: number; readonly stackingCuts?: boolean } = {},
): string[] {
	const found: string[] = [];
	const check = (series: Series) => {
		const values = series.v.filter((v): v is number => v !== null);
		if (values.length < 2) return;
		const travel = Math.max(
			series.range ?? 0,
			Math.max(...values) - Math.min(...values),
		);
		let handRate = 0;
		for (let i = 1; i < series.v.length; i++) {
			const a = series.v[i - 1];
			const b = series.v[i];
			const dt = Math.max(1, (series.t[i] ?? 0) - (series.t[i - 1] ?? 0));
			if (a == null || b == null) continue;
			const step = Math.abs(b - a);
			if (series.hand[i - 1] && series.hand[i]) {
				handRate = step / dt;
				continue;
			}
			const allowed = Math.max(
				series.floor,
				(share * travel * dt) / FRAME_MS,
				series.carried ? 1.5 * handRate * dt : 0,
			);
			if (step > allowed)
				found.push(
					`${series.name}: ${a.toFixed(2)} → ${b.toFixed(2)} in one frame (frame ${i}, allowed ${allowed.toFixed(2)})`,
				);
		}
	};
	for (const id of ids)
		for (const series of seriesOf(frames, id)) check(series);
	if (!stackingCuts)
		for (const series of stackingSeries(frames, ids)) check(series);
	return found;
}

/**
 * No overshoot: from frame `from` to the last, no centre, size, rotation or
 * scale of a Body passes where it ends by more than a sixth of its floor
 * (0.5 px, 0.17°), on the far side from where it was at `from`. A move the
 * app turns back (`from`) may carry its speed on past its turning point:
 * that is momentum, not overshoot. For moves with no scripted waypoints.
 */
function overshoots(
	frames: readonly Frame[],
	ids: readonly string[],
	from = 0,
) {
	const found: string[] = [];
	for (const id of ids)
		for (const series of seriesOf(frames, id)) {
			if (series.name.includes(" lean") || series.name.includes(" part "))
				continue;
			/* a move the hand let go of starts where the hand let go */
			const start = Math.max(from, series.hand.lastIndexOf(true) + 1);
			const values = series.v
				.slice(start)
				.filter((v): v is number => v !== null);
			const first = values[0];
			const end = values.at(-1);
			if (first === undefined || end === undefined) continue;
			const tolerance = series.floor / 6;
			const worst = values.find((v) =>
				end >= first ? v > end + tolerance : v < end - tolerance,
			);
			if (worst !== undefined)
				found.push(
					`${series.name}: ${worst.toFixed(2)} outside ${first.toFixed(2)}…${end.toFixed(2)}`,
				);
		}
	return found;
}

/** No two texts of one Body overlap in any frame where both can be seen. */
function textOverlaps(frames: readonly Frame[], ids: readonly string[]) {
	const found = new Set<string>();
	frames.forEach((frame, index) => {
		for (const id of ids) {
			const body = frame.bodies[id];
			if (!seen(body)) continue;
			const texts = body.parts.filter(
				(part) => part.text && part.rect && part.opacity >= 0.1,
			);
			for (let i = 0; i < texts.length; i++)
				for (let j = i + 1; j < texts.length; j++) {
					const a = texts[i];
					const b = texts[j];
					if (a?.rect && b?.rect && overlap(a.rect, b.rect) > 2)
						found.add(
							`${id}: ${a.id} over ${b.id} (frame ${index})`,
						);
				}
		}
	});
	return [...found];
}

/** No Body leans out of the screen's plane in a frame whose size differs from the last one's. */
function leansWhileResizing(frames: readonly Frame[], ids: readonly string[]) {
	const found: string[] = [];
	for (let i = 1; i < frames.length; i++)
		for (const id of ids) {
			const a = frames[i - 1]?.bodies[id];
			const b = frames[i]?.bodies[id];
			if (!a || !b) continue;
			const resized =
				Math.abs(a.size.w - b.size.w) > 0.5 ||
				Math.abs(a.size.h - b.size.h) > 0.5;
			if (resized && b.lean > 0.05)
				found.push(
					`${id}: leans ${b.lean}° while resizing (frame ${i})`,
				);
		}
	return found;
}

/**
 * A drop in place changes nothing after the release: from the last frame
 * the hand showed `id` in, its centre and size move under 0.5 px, its
 * rotation under 0.1° and its scale under 0.2%.
 */
export function changesAfterDrop(frames: readonly Frame[], id: string) {
	const held = frames.findLastIndex(
		(frame) => frame.bodies[id]?.mode === "hand",
	);
	const last = frames[held]?.bodies[id];
	if (held < 0 || !last) return ["never in the hand"];
	const found = new Set<string>();
	for (const frame of frames.slice(held + 1)) {
		const body = frame.bodies[id];
		if (!body) continue;
		const moved = Math.max(
			Math.abs(body.cx - last.cx),
			Math.abs(body.cy - last.cy),
			Math.abs(body.w - last.w),
			Math.abs(body.h - last.h),
		);
		if (moved > 0.5) found.add(`moved ${moved.toFixed(2)} px`);
		if (Math.abs(body.rotate - last.rotate) > 0.1)
			found.add(`rotation ${last.rotate}° → ${body.rotate}°`);
		if (Math.abs(body.scale - last.scale) > 0.002)
			found.add(`scale ${last.scale} → ${body.scale}`);
	}
	return [...found].slice(0, 6);
}

/** Every frame invariant at once for a move of `ids`, as one readable soft failure. */
export function expectMove(
	frames: readonly Frame[],
	ids: readonly string[],
	{
		scripted = false,
		from = 0,
		label,
	}: {
		readonly scripted?: boolean;
		readonly from?: number;
		readonly label: string;
	},
) {
	expect.soft(frames.length, `${label}: frames logged`).toBeGreaterThan(10);
	const broken = {
		jumps: jumps(frames, ids, { stackingCuts: scripted }).slice(0, 6),
		overshoots: scripted ? [] : overshoots(frames, ids, from).slice(0, 6),
		textOverlaps: textOverlaps(frames, ids).slice(0, 6),
		leansWhileResizing: leansWhileResizing(frames, ids).slice(0, 6),
	};
	expect.soft(broken, label).toEqual({
		jumps: [],
		overshoots: [],
		textOverlaps: [],
		leansWhileResizing: [],
	});
}
