import { describe, expect, test } from "bun:test";
import {
	type PartBox,
	type PartPlan,
	type PartShown,
	planParts,
} from "./parts";
import { FOLLOW, type Shape, shareAt } from "./shape";

const box = (x: number, y: number, h = 20): PartBox => ({ x, y, w: 224, h });
const shown = (at: PartBox, opacity = 1): PartShown => ({
	box: at,
	dx: 0,
	dy: 0,
	opacity,
});

/* the Cover, its column centred: heading, context, two more, gloss, lines */
const COVER = new Map([
	["heading", shown(box(208, 41, 40))],
	["context-0", shown(box(208, 93))],
	["context-1", shown(box(208, 124))],
	["context-2", shown(box(208, 155))],
	["gloss", shown(box(208, 187))],
	["lines", shown(box(208, 219, 40))],
]);
/* the Card: heading, gloss above the first context */
const CARD = new Map([
	["heading", box(16, 1, 40)],
	["gloss", box(16, 47)],
	["context-0", box(16, 73)],
]);

/** Every Part's box and opacity at progress `p`, as the Table draws them. */
function drawn(plan: PartPlan, after: ReadonlyMap<string, PartBox>, p: number) {
	return [...plan.terms].map(([id, terms]) => {
		const rest = after.get(id) ?? plan.pins.get(id);
		if (!rest) throw new Error(`nowhere for ${id}`);
		const sum = (channel: string) =>
			terms
				.filter((term) => term.channel === channel)
				.reduce(
					(total, term) =>
						total + term.delta * shareAt(term.shape, p),
					0,
				);
		return {
			id,
			box: { ...rest, x: rest.x + sum("x"), y: rest.y + sum("y") },
			opacity: (after.has(id) ? 1 : 0) + sum("opacity"),
		};
	});
}

function overlaps(plan: PartPlan, after: ReadonlyMap<string, PartBox>) {
	const found: string[] = [];
	for (let i = 0; i <= 100; i++) {
		const parts = drawn(plan, after, i / 100).filter(
			(part) => part.opacity > 0.05,
		);
		for (const a of parts)
			for (const b of parts)
				if (
					a.id < b.id &&
					Math.min(a.box.x + a.box.w, b.box.x + b.box.w) -
						Math.max(a.box.x, b.box.x) >
						0.5 &&
					Math.min(a.box.y + a.box.h, b.box.y + b.box.h) -
						Math.max(a.box.y, b.box.y) >
						0.5
				)
					found.push(`${a.id}/${b.id} at ${i / 100}`);
	}
	return found;
}

describe("Parts on a change of form", () => {
	const shape: Shape = FOLLOW;
	const plan = planParts({ before: COVER, after: CARD, shape });

	test("Parts both forms have ride the box's own progress", () => {
		const heading = plan.terms.get("heading");
		expect(heading?.map((term) => term.shape)).toEqual([shape, shape]);
		expect(heading?.find((term) => term.channel === "x")?.delta).toBe(192);
	});

	test("a Part whose order flips dissolves rather than slide through another", () => {
		const gloss = plan.terms.get("gloss");
		const jump = gloss?.find((term) => term.channel === "y")?.shape;
		const fade = gloss?.find((term) => term.channel === "opacity")?.shape;
		expect(jump?.kind).toBe("step");
		/* it jumps while hidden, between fading out and fading back in */
		if (jump?.kind !== "step" || fade?.kind !== "keys")
			throw new Error("no dissolve");
		expect(jump.at).toBeGreaterThan(fade.times[1] ?? 1);
		expect(jump.at).toBeLessThan(fade.times[2] ?? 0);
	});

	test("Parts only the old form had stay pinned where they showed and are gone by 0.35", () => {
		expect(plan.pins.get("lines")).toEqual(box(208, 219, 40));
		for (const id of ["context-1", "context-2", "lines"]) {
			const fade = plan.terms.get(id)?.[0];
			expect(fade?.channel).toBe("opacity");
			expect(shareAt(fade?.shape ?? FOLLOW, 0.35)).toBe(0);
		}
	});

	test("no two Parts' boxes overlap at any point of the Move, either way", () => {
		expect(overlaps(plan, CARD)).toEqual([]);
		const before = new Map([...CARD].map(([id, at]) => [id, shown(at)]));
		const after = new Map([...COVER].map(([id, part]) => [id, part.box]));
		expect(overlaps(planParts({ before, after, shape }), after)).toEqual(
			[],
		);
	});

	test("Parts only the new form has fade in once nothing travelling is over them", () => {
		const before = new Map([...CARD].map(([id, at]) => [id, shown(at)]));
		const after = new Map([...COVER].map(([id, part]) => [id, part.box]));
		const opened = planParts({ before, after, shape });
		const lines = opened.terms.get("lines")?.[0];
		expect(lines).toMatchObject({ channel: "opacity", delta: -1 });
		expect(shareAt(lines?.shape ?? FOLLOW, 0.5)).toBe(1);
	});

	test("under reduced motion everything switches at the dissolve's middle", () => {
		const reduced = planParts({
			before: COVER,
			after: CARD,
			shape,
			cut: 0.5,
		});
		for (const terms of reduced.terms.values())
			for (const term of terms)
				expect(term.shape).toEqual({ kind: "step", at: 0.5 });
	});
});
