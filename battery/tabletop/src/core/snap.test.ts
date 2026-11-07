import { describe, expect, test } from "bun:test";
import { snapOffset, snapPx, snapWidth } from "./snap";
import { shareAfter } from "./term";

/** A move's offsets frame by frame, from `from` to its rest, on the morph spring. */
function frames(from: number): number[] {
	const curve = {
		kind: "spring" as const,
		stiffness: 380,
		damping: 38,
		rate: 0,
	};
	const out: number[] = [];
	for (let t = 0; t <= 800; t += 1000 / 60)
		out.push(from * shareAfter(curve, t));
	return out;
}

const onGrid = (value: number, dpr: number) =>
	Math.abs(value * dpr - Math.round(value * dpr)) < 1e-9;

describe("device-pixel snapping relative to the rest (rule 6)", () => {
	test("puts a value on the device's grid", () => {
		expect(snapPx(10.3, 2)).toBe(10.5);
		expect(snapPx(10.2, 1)).toBe(10);
	});

	for (const dpr of [1, 1.25, 2, 3])
		for (const from of [37.3, -137.65, 0.4])
			test(`at DPR ${dpr} from ${from}: shows its start exactly, then steps toward the rest on the grid, never back`, () => {
				const offsets = frames(from).map((offset) =>
					snapOffset(offset, from, dpr),
				);
				expect(offsets[0]).toBe(from);
				expect(offsets.at(-1)).toBe(0);
				const sign = Math.sign(from);
				for (let i = 1; i < offsets.length; i++) {
					const [was, is] = [offsets[i - 1] ?? 0, offsets[i] ?? 0];
					/* toward the rest or still, never back past where it was */
					expect((was - is) * sign).toBeGreaterThanOrEqual(0);
					expect(Math.abs(is)).toBeLessThanOrEqual(Math.abs(from));
					if (is !== from) expect(onGrid(is, dpr)).toBe(true);
				}
			});

	test("a width steps in even device pixels, so its centre steps in whole ones", () => {
		for (const dpr of [1, 2]) {
			const from = -274.5;
			const widths = frames(from).map((offset) =>
				snapWidth(offset, from, dpr),
			);
			expect(widths[0]).toBe(from);
			for (const width of widths.slice(1))
				if (width !== from) expect(onGrid(width / 2, dpr)).toBe(true);
			for (let i = 1; i < widths.length; i++)
				expect(widths[i] ?? 0).toBeGreaterThanOrEqual(
					widths[i - 1] ?? 0,
				);
		}
	});

	test("a path that leaves its start snaps freely beyond it", () => {
		expect(snapOffset(-12.3, 4.2, 2)).toBe(-12.5);
		expect(snapOffset(30.3, 4.2, 2)).toBe(30.5);
		/* between the rest and the start it never rounds out past the start */
		expect(snapOffset(4.1, 4.2, 2)).toBe(4);
		expect(snapOffset(4.19, 4.2, 1)).toBe(4);
		expect(snapOffset(4.15, 4.4, 2)).toBe(4);
		expect(snapOffset(4.3, 4.4, 2)).toBe(4.4);
	});
});
