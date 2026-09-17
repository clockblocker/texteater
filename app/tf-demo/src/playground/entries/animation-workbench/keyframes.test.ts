import { describe, expect, test } from "bun:test";

import {
	deriveKeyframes,
	describeHits,
	flatten,
	formatSample,
	keyAt,
} from "./keyframes";
import { DEFAULT_PARAMS, springAt } from "./motion";
import { CHROME } from "./scenes/chrome";
import { SHEET } from "./scenes/sheet";

/** A piecewise-linear track through `points`, one every 10 ms. */
function ramp(points: readonly number[]): (t: number) => number {
	return (t) => {
		const at = t / 10;
		const i = Math.min(Math.floor(at), points.length - 2);
		const from = points[i] ?? 0;
		const to = points[i + 1] ?? from;
		return from + (to - from) * (at - i);
	};
}

function sceneKeys(groupKey: string, key: string) {
	const group = [CHROME, SHEET].find((g) => g.key === groupKey);
	const scene = group?.scenes.find((s) => s.key === key);
	if (!scene) throw new Error(`no scene ${groupKey}/${key}`);
	const length = scene.length(DEFAULT_PARAMS);
	return deriveKeyframes((t) => scene.frame(t, DEFAULT_PARAMS), length);
}

describe("flatten", () => {
	test("walks objects and arrays into dotted paths", () => {
		const flat = flatten({
			box: { left: 1, top: 2 },
			cards: [{ y: 3 }, { y: 4 }],
			border: "link",
			label: null,
		});
		expect([...flat.entries()]).toEqual([
			["box.left", 1],
			["box.top", 2],
			["cards.0.y", 3],
			["cards.1.y", 4],
			["border", "link"],
			["label", "null"],
		]);
	});
});

describe("deriveKeyframes", () => {
	test("a press-hold-release reads as start, settle, start, settle", () => {
		const { channels, keys } = sceneKeys("chrome", "library-press");
		expect(channels.map((c) => c.path)).toEqual(["scale", "wash", "arrow"]);
		expect(keys.map((k) => Math.round(k.at))).toEqual([0, 150, 300, 450]);
		const scale = keys.map((k) => k.hits.find((h) => h.path === "scale"));
		expect(scale.map((h) => h?.event)).toEqual([
			"start",
			"stop",
			"start",
			"stop",
		]);
		expect(keys[1]?.values.scale).toBeCloseTo(0.96, 6);
		expect(keys[3]?.values.scale).toBeCloseTo(1, 6);
	});

	test("channels that never move are left out", () => {
		const { channels } = sceneKeys("sheet", "sheet-hold");
		expect(channels.map((c) => c.path)).toEqual(["scale", "border"]);
	});

	test("a discrete channel keys where it changes", () => {
		const { keys } = sceneKeys("sheet", "sheet-hold");
		const change = keys.find((k) =>
			k.hits.some((h) => h.path === "border" && h.event === "change"),
		);
		expect(change).toBeDefined();
		expect(change?.values.border).toBe("link");
	});

	test("a spring's overshoot is a turn; its final tremor is not", () => {
		const spec = { stiffness: 300, damping: 14 };
		const { keys } = deriveKeyframes(
			(t) => ({ y: 100 * springAt(t, spec) }),
			1200,
		);
		const turns = keys.filter((k) =>
			k.hits.some((h) => h.event === "peak"),
		);
		expect(turns.length).toBeGreaterThanOrEqual(2);
		expect(turns.length).toBeLessThanOrEqual(5);
		const first = turns[0];
		expect(first).toBeDefined();
		expect(Number(first?.values.y)).toBeGreaterThan(100);
		expect(keys[keys.length - 1]?.at).toBe(1200);
	});

	test("a spring still creeping at the end settles on the last key", () => {
		const { keys } = sceneKeys("sheet", "note-grows");
		const last = keys[keys.length - 1];
		expect(last?.at).toBe(435);
		expect(
			last?.hits.filter((h) => h.event === "stop").map((h) => h.path),
		).toContain("box.left");
		/* The delayed Pane bar keeps its own start and settle. It moves on
		   the frame its 180 ms delay is up, and is visually done at 311,
		   well inside its 340 ms span: that is `EASE_OUT` spending its
		   budget where the eye is, which the old `easeInOut` did not —
		   under that curve the bar did not stir until 183 and was still
		   arriving at 337. */
		const bar = keys.filter((k) => k.hits.some((h) => h.path === "bar"));
		expect(bar.map((k) => Math.round(k.at))).toEqual([180, 311]);
	});

	test("a still frame has only its start and end", () => {
		const { channels, keys } = deriveKeyframes(() => ({ y: 1 }), 500);
		expect(channels).toEqual([]);
		expect(keys.map((k) => k.at)).toEqual([0, 500]);
	});
});

describe("helpers", () => {
	test("keyAt is the key at or before t", () => {
		const keys = [{ at: 0 }, { at: 150 }, { at: 300 }].map((k) => ({
			...k,
			hits: [],
			values: {},
		}));
		expect(keyAt(keys, 0)).toBe(0);
		expect(keyAt(keys, 149)).toBe(0);
		expect(keyAt(keys, 150)).toBe(1);
		expect(keyAt(keys, 999)).toBe(2);
	});

	test("formatSample keeps three decimals below ten and trims zeros", () => {
		expect(formatSample(0.96)).toBe("0.96");
		expect(formatSample(1)).toBe("1");
		expect(formatSample(12.345)).toBe("12.3");
		expect(formatSample(384)).toBe("384");
		expect(formatSample("link")).toBe("link");
	});

	test("describeHits reads as a sentence fragment", () => {
		expect(
			describeHits([
				{ path: "scale", event: "peak" },
				{ path: "box.left", event: "stop" },
			]),
		).toBe("scale turns · box.left settles");
	});
});

describe("prune", () => {
	test("a ring inside a ring keeps the outer turns", () => {
		/* up to 10, down to 0, a 0.02 ring there, back up to 10 */
		const y = ramp([0, 10, 0, 0.02, 0.01, 0.02, 0, 10, 10]);
		const { keys } = deriveKeyframes((t) => ({ y: y(t) }), 80);
		const peaks = keys
			.filter((k) => k.hits.some((h) => h.event === "peak"))
			.map((k) => Math.round(k.at));
		expect(peaks).toEqual([10, 60]);
	});

	test("a small bump between two turns is dropped, the deeper low stays", () => {
		/* up to 10, down to 2, a bump to 2.05, down to 0, up to 10 */
		const y = ramp([0, 5, 10, 6, 2, 2.05, 1, 0, 5, 10, 10]);
		const { keys } = deriveKeyframes((t) => ({ y: y(t) }), 100);
		const peaks = keys
			.filter((k) => k.hits.some((h) => h.event === "peak"))
			.map((k) => Math.round(k.at));
		expect(peaks).toEqual([20, 70]);
	});
});
