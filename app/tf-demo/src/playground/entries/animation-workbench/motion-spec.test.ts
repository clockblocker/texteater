import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { keyframes as motionKeyframes } from "motion-dom";
import { parseSync, Visitor } from "oxc-parser";

import * as SPEC from "../deck-models/motion-spec";
import {
	isBezier,
	motionOf,
	spanOf,
	type Tween,
} from "../deck-models/motion-spec";
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
	 * The slack is Motion's, not ours. Its bézier solver stops after twelve
	 * binary subdivisions (`motion-utils/…/cubic-bezier.mjs`), leaving
	 * about 1e-4 of error in `t`; `cubicBezier` here bisects to a
	 * billionth. So the preview is the more accurate of the two, and this
	 * bound measures how far Motion strays from it.
	 *
	 * It used to be three decimal places, which held while every spec ran
	 * on one of the browser's built-in curves. `EASE_OUT` is deliberately
	 * steeper than those — that is what makes it read as a decision rather
	 * than a default — and a steep start amplifies the error in `t` into
	 * `y`. The worst case across the file is 6.6e-4 of progress, inside the
	 * first 10 ms, which is under half a pixel even on `FLY_DISTANCE`, the
	 * longest travel here. What the test is for is a curve that is wrong,
	 * not a curve that is rounded.
	 */
	const SOLVER_SLACK = 1e-3;

	test("progressOf matches Motion's own generator, curve for curve", () => {
		for (const [name, spec] of TWEENS) {
			const theirs = motionKeyframes({
				duration: spec.ms,
				keyframes: [0, 1],
				ease: isBezier(spec.ease) ? [...spec.ease] : spec.ease,
			});
			for (let ms = 0; ms <= spec.ms; ms += 4) {
				const ours = progressOf(spec, ms + spec.delayMs);
				expect(
					Math.abs(ours - Number(theirs.next(ms).value)),
					`${name} at ${ms.toString()}ms`,
				).toBeLessThan(SOLVER_SLACK);
			}
		}
	});

	test("the slack is worth less than a pixel of the longest travel", () => {
		expect(SOLVER_SLACK * SPEC.FLY_DISTANCE).toBeLessThan(1);
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

/* ------------------------------------------------------ nothing undeclared */

/**
 * The test above keeps a *number* in one place. This one keeps an
 * *animation* in one place, which is the failure that actually happened.
 *
 * Four things animated on a dealt Card — its Heading row growing from the
 * height of its own title, the kind label flashing and sliding away, the
 * border brightening, the Note fading in — and not one of them was
 * declared anywhere. Three were Motion's own default for a `motion.*`
 * element given an `animate` and no `initial`: with nothing to start from
 * it measures whatever the DOM just rendered and moves off that. The
 * workbench could not show any of it, because a scene is written from the
 * spec and there was no spec to write from. Undeclared motion is
 * invisible to every check in this file.
 *
 * So, read off the source of the prototype:
 *
 *  1. A `motion.*` element that animates declares its first frame.
 *     `initial={false}` says it is dealt where `animate` points and only
 *     moves when that target changes; an explicit `initial` says there is
 *     a mount animation, and somebody chose it. What is forbidden is
 *     leaving the first frame to Motion.
 *  2. Every transition is a spec — an identifier or `motionOf(...)`.
 *     An object literal here is a timing the workbench cannot preview,
 *     and `animate()` with no transition at all is Motion's default
 *     duration, which is the same thing by omission.
 */

type Undeclared = { readonly at: string; readonly what: string };

const MOTION_SOURCES = readdirSync(join(HERE, "../deck-models"))
	.filter((f) => f.endsWith(".tsx"))
	.map((f) => join(HERE, "../deck-models", f))
	.filter((path) =>
		readFileSync(path, "utf8").includes('from "motion/react"'),
	);

/** A transition the spec owns: `MORPH`, or `motionOf(NOTE_BORDER)`. */
/**
 * A transition the spec declares: a named export, `motionOf(SOME_SPEC)`,
 * or an object built out of nothing but those.
 *
 * The composed form is for a transition that has to say two things at
 * once — Motion takes `{ ...spec, layout: otherSpec }` to give a layout
 * animation its own timing. Every value in it still has to be a spec, so
 * `{ ...MORPH, layout: { duration: 0.14 } }` is refused exactly as the
 * bare literal is. Binding the same literal to a `const` first would slip
 * past a rule that only looked at the attribute, which is why this walks
 * into the object rather than trusting the identifier.
 */
function isSpecTransition(node: { type: string } | null | undefined): boolean {
	if (!node) return false;
	if (node.type === "Identifier") return true;
	const call = node as { callee?: { type: string; name?: string } };
	if (
		node.type === "CallExpression" &&
		call.callee?.type === "Identifier" &&
		call.callee.name === "motionOf"
	)
		return true;
	if (node.type !== "ObjectExpression") return false;
	const object = node as {
		properties: {
			type: string;
			value?: { type: string };
			argument?: { type: string };
		}[];
	};
	return object.properties.every((property) =>
		property.type === "SpreadElement"
			? isSpecTransition(property.argument)
			: isSpecTransition(property.value),
	);
}

function undeclaredMotion(file: string, source: string): Undeclared[] {
	const found: Undeclared[] = [];
	const at = (node: { start: number }) =>
		`${file}:${(source.slice(0, node.start).split("\n").length).toString()}`;
	const parsed = parseSync(file, source, { lang: "tsx" });

	new Visitor({
		JSXOpeningElement(node) {
			const name = node.name;
			if (
				name.type !== "JSXMemberExpression" ||
				name.object.type !== "JSXIdentifier" ||
				name.object.name !== "motion"
			)
				return;
			const tag = `motion.${name.property.name}`;
			const named = node.attributes.flatMap((attribute) =>
				attribute.type === "JSXAttribute" &&
				attribute.name.type === "JSXIdentifier"
					? [attribute.name.name]
					: [],
			);
			if (named.includes("animate") && !named.includes("initial"))
				found.push({
					at: at(node),
					what: `<${tag}> animates without declaring its first frame`,
				});
			for (const attribute of node.attributes) {
				if (
					attribute.type !== "JSXAttribute" ||
					attribute.name.type !== "JSXIdentifier" ||
					attribute.name.name !== "transition"
				)
					continue;
				const value = attribute.value;
				const expression =
					value?.type === "JSXExpressionContainer"
						? value.expression
						: null;
				if (!isSpecTransition(expression))
					found.push({
						at: at(attribute),
						what: `<${tag}> is given a transition the spec does not declare`,
					});
			}
		},
		Property(node) {
			if (
				node.key.type !== "Identifier" ||
				node.key.name !== "transition"
			)
				return;
			if (!isSpecTransition(node.value))
				found.push({
					at: at(node),
					what: "a transition is written out rather than named",
				});
		},
		CallExpression(node) {
			if (node.callee.type !== "Identifier") return;
			if (node.callee.name !== "animate") return;
			if (!isSpecTransition(node.arguments[2]))
				found.push({
					at: at(node),
					what: "animate() is given a transition the spec does not declare",
				});
		},
	}).visit(parsed.program);

	return found;
}

describe("nothing animates that the spec does not declare", () => {
	test("there is a prototype to read", () => {
		expect(MOTION_SOURCES.map((p) => p.split("/").pop())).toContain(
			"drag-deck.tsx",
		);
	});

	test("every Motion element declares its first frame, and every transition is a spec", () => {
		const offences = MOTION_SOURCES.flatMap((path) =>
			undeclaredMotion(
				path.split("/").pop() ?? path,
				readFileSync(path, "utf8"),
			),
		);
		expect(offences).toEqual([]);
	});

	/*
	 * A rule nobody has seen fail is a rule that may not work. These are
	 * the four shapes it exists to refuse, and the shapes it must let past.
	 */
	test("the rule refuses motion it cannot see declared", () => {
		const refused = (source: string) =>
			undeclaredMotion("sample.tsx", source).map((o) => o.what);

		expect(
			refused(
				`const A = () => <motion.div animate={{ opacity: 1 }} transition={MORPH} />;`,
			),
		).toEqual(["<motion.div> animates without declaring its first frame"]);

		expect(
			refused(
				`const A = () => <motion.span initial={false} animate={{ y: 4 }} transition={{ duration: 0.16 }} />;`,
			),
		).toEqual([
			"<motion.span> is given a transition the spec does not declare",
		]);

		expect(
			refused(
				`const A = () => <motion.li initial={{ height: 0 }} animate={{ height: "auto", transition: { duration: 0.2 } }} />;`,
			),
		).toEqual(["a transition is written out rather than named"]);

		/* a composed transition is only as declared as its parts */
		expect(
			refused(
				`const A = () => <motion.div initial={false} animate={{ y: 0 }} transition={{ ...MORPH, layout: { duration: 0.14 } }} />;`,
			),
		).toEqual([
			"<motion.div> is given a transition the spec does not declare",
		]);

		expect(refused(`animate(value, 1, { duration: 0.2 });`)).toEqual([
			"animate() is given a transition the spec does not declare",
		]);
		expect(refused(`animate(value, 1);`)).toEqual([
			"animate() is given a transition the spec does not declare",
		]);
	});

	test("the rule lets declared motion past", () => {
		const source = `
			const A = () => <motion.div initial={false} animate={{ opacity: 1 }} transition={MORPH} />;
			const B = () => <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: motionOf(BAR_ENTER) }} exit={{ opacity: 0, transition: motionOf(BAR_EXIT) }} />;
			const C = () => <motion.div style={{ x }} />;
			animate(value, 1, motionOf(NOTE_BORDER));
			animate(value, 1, MORPH);
		`;
		expect(undeclaredMotion("sample.tsx", source)).toEqual([]);
	});
});
