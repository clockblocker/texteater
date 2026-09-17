import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { keyframes as motionKeyframes } from "motion-dom";

import * as SPEC from "../deck-models/motion-spec";
import { motionOf, spanOf, type Tween } from "../deck-models/motion-spec";
import { lengthOf, progressOf } from "./motion";

/**
 * The workbench is only worth trusting if its preview is the motion that
 * ships. Two things have to hold for that, and neither is obvious:
 *
 *  1. The closed form agrees with Motion. `progressOf` evaluates a spec at
 *     `t`; Motion runs the same spec through its own generator. If those
 *     ever diverge, every preview is a plausible lie.
 *
 *  2. Nobody re-types a number. The point of `motion-spec.ts` is that a
 *     duration exists once. A scene or the prototype quietly declaring its
 *     own `const FADE_MS = 200` would pass typecheck and drift forever, so
 *     the last test reads the source and refuses it.
 */

const TWEENS = Object.entries(SPEC).filter(
	(entry): entry is [string, Tween] =>
		typeof entry[1] === "object" &&
		entry[1] !== null &&
		"kind" in entry[1] &&
		entry[1].kind === "tween",
);

describe("a spec evaluated two ways", () => {
	test("there are tweens to check", () => {
		expect(TWEENS.length).toBeGreaterThan(10);
	});

	/**
	 * Three decimal places, not more, and the slack is Motion's. Its bézier
	 * solver stops after twelve binary subdivisions
	 * (`motion-utils/…/cubic-bezier.mjs`), which leaves about 1e-4 of error
	 * in `t`; `cubicBezier` here bisects to a billionth. So the preview is
	 * the more accurate of the two, by a few hundred-thousandths of
	 * progress — far under a pixel of travel on any of these. What the
	 * test is for is a curve that is wrong, not a curve that is rounded.
	 */
	test("progressOf matches Motion's own generator, curve for curve", () => {
		for (const [name, spec] of TWEENS) {
			const theirs = motionKeyframes({
				duration: spec.ms,
				keyframes: [0, 1],
				ease: spec.ease,
			});
			for (let ms = 0; ms <= spec.ms; ms += 4) {
				expect(
					progressOf(spec, ms + spec.delayMs),
					`${name} at ${ms.toString()}ms`,
				).toBeCloseTo(theirs.next(ms).value, 3);
			}
		}
	});

	test("a tween holds still through its delay, then finishes at its end", () => {
		for (const [name, spec] of TWEENS) {
			expect(progressOf(spec, 0), name).toBe(0);
			if (spec.delayMs > 0)
				expect(progressOf(spec, spec.delayMs), name).toBe(0);
			expect(progressOf(spec, spanOf(spec)), name).toBeCloseTo(1, 9);
			expect(progressOf(spec, spanOf(spec) + 5000), name).toBe(1);
			expect(lengthOf(spec), name).toBe(spanOf(spec));
		}
	});

	test("motionOf hands Motion the same numbers, in seconds", () => {
		for (const [name, spec] of TWEENS) {
			const transition = motionOf(spec);
			expect(transition, name).toMatchObject({
				duration: spec.ms / 1000,
				ease: spec.ease,
			});
			if (spec.delayMs > 0)
				expect(transition, name).toMatchObject({
					delay: spec.delayMs / 1000,
				});
		}
		expect(motionOf(SPEC.MORPH)).toEqual({
			type: "spring",
			stiffness: SPEC.MORPH.stiffness,
			damping: SPEC.MORPH.damping,
		});
	});
});

describe("gesture → transform", () => {
	test("the remove lean follows the pointer left and stops at the cap", () => {
		expect(SPEC.leanFor(0)).toBe(0);
		/* rightward travel does not lean: the gesture is armed leftward */
		expect(SPEC.leanFor(200)).toBe(0);
		expect(SPEC.leanFor(-160)).toBeCloseTo(-10, 9);
		expect(SPEC.leanFor(-10_000)).toBe(SPEC.TILT_MAX);
	});

	test("the expand swell rises with upward travel and stops at the cap", () => {
		expect(SPEC.expandScaleFor(0)).toBe(1);
		expect(SPEC.expandScaleFor(200)).toBe(1);
		/* 1 % per 8 px, so it is capped by 40 px of travel */
		expect(SPEC.expandScaleFor(-16)).toBeCloseTo(1.02, 9);
		expect(SPEC.expandScaleFor(-40)).toBeCloseTo(
			1 + SPEC.EXPAND_SCALE_MAX,
			9,
		);
		expect(SPEC.expandScaleFor(-10_000)).toBeCloseTo(
			1 + SPEC.EXPAND_SCALE_MAX,
			9,
		);
	});
});

/* ------------------------------------------------------------ no drift */

const HERE = new URL(".", import.meta.url).pathname;
const PLAYGROUND = [
	join(HERE, "../deck-models/drag-deck.tsx"),
	...readdirSync(join(HERE, "scenes"))
		/* the main-app scenes mirror Tailwind and CSS, not the spec */
		.filter((f) => ["drag.tsx", "note.tsx", "sheet.tsx"].includes(f))
		.map((f) => join(HERE, "scenes", f)),
];

/** A hand-written transition: `duration: 0.16`, `delay: 0.18`. */
const INLINE_TRANSITION = /(?:duration|delay)\s*:\s*[0-9]/;
/** A timing constant: `const FADE_MS = 200`. */
const TIMING_CONST =
	/(?:const|let)\s+([A-Z][A-Z_]*(?:MS|DURATION))\b\s*=\s*[0-9]/;

/**
 * Not every millisecond in these files is an animation. These four decide
 * when something happens, not how it moves, so they stay where they are
 * read — the workbench has nothing to preview for any of them.
 */
const NOT_MOTION = new Map([
	["VELOCITY_STALE_MS", "how stale a pointer sample may be to count"],
	["HOLD_RELEASE_MS", "when an armed gesture relaxes into a plain drag"],
	["SETTLE_TIMEOUT_MS", "when a settle gives up waiting"],
	["DIALOG_MS", "the lego Dialog, which is not a playground animation"],
]);

describe("the spec is the only place a timing lives", () => {
	test("no playground file declares a duration of its own", () => {
		const offenders: string[] = [];
		for (const path of PLAYGROUND) {
			const file = path.split("/").pop() ?? "";
			for (const line of readFileSync(path, "utf8").split("\n")) {
				if (INLINE_TRANSITION.test(line))
					offenders.push(`${file}: ${line.trim()}`);
				const named = TIMING_CONST.exec(line);
				if (named?.[1] && !NOT_MOTION.has(named[1]))
					offenders.push(`${file}: ${line.trim()}`);
			}
		}
		expect(offenders).toEqual([]);
	});

	test("the workbench reads the prototype's geometry, not a copy", async () => {
		const motion = await import("./motion");
		expect(motion.HEADER_REM).toBe(SPEC.HEADER_REM);
		expect(motion.PILE_HEIGHT_REM).toBe(SPEC.PILE_HEIGHT_REM);
		expect(motion.DEFAULT_PARAMS.stiffness).toBe(
			SPEC.DRAG_SPRING.stiffness,
		);
		expect(motion.DEFAULT_PARAMS.damping).toBe(SPEC.DRAG_SPRING.damping);
		expect(motion.MORPH_SPEC).toMatchObject({
			stiffness: SPEC.MORPH.stiffness,
			damping: SPEC.MORPH.damping,
		});
	});
});
