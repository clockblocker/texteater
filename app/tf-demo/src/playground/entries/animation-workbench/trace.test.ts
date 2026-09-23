import { describe, expect, test } from "bun:test";
import {
	durationOf,
	type Frame,
	feed,
	frameIntervalOf,
	IDLE,
	KEEP,
	MAX_MS,
	moved,
	PREROLL_MS,
	partition,
	QUIET_MS,
	type RecorderState,
	summarize,
	TAIL_MS,
} from "./trace";

const STEP = 16;

function at(t: number, values: Record<string, number>): Frame {
	return { t, values };
}

/** Feeds a still channel for `ms`, then returns the state and the clock. */
function still(
	state: RecorderState,
	from: number,
	ms: number,
	values: Record<string, number>,
): [RecorderState, number] {
	let t = from;
	let next = state;
	for (; t <= from + ms; t += STEP) next = feed(next, at(t, values));
	return [next, t];
}

describe("moved", () => {
	test("geometry moves past half a pixel, opacity past half a percent", () => {
		const base = at(0, { "Note:top": 10, "Bar:opacity": 0 });
		expect(
			moved(base, at(16, { "Note:top": 10.4, "Bar:opacity": 0 })),
		).toBe(false);
		expect(
			moved(base, at(16, { "Note:top": 10.6, "Bar:opacity": 0 })),
		).toBe(true);
		expect(
			moved(base, at(16, { "Note:top": 10, "Bar:opacity": 0.004 })),
		).toBe(false);
		expect(
			moved(base, at(16, { "Note:top": 10, "Bar:opacity": 0.006 })),
		).toBe(true);
	});

	test("an element appearing or leaving is movement", () => {
		const base = at(0, { "Note:top": 10 });
		expect(moved(base, at(16, { "Note:top": 10, "Bar:opacity": 0 }))).toBe(
			true,
		);
		expect(moved(at(0, { "Note:top": 10, "Bar:opacity": 0 }), base)).toBe(
			true,
		);
		expect(moved(undefined, base)).toBe(false);
	});
});

describe("feed", () => {
	test("idle frames keep a bounded pre-roll and never record", () => {
		const [state, t] = still(IDLE, 0, 2000, { "Note:top": 10 });
		expect(state.open).toBeNull();
		expect(state.done).toHaveLength(0);
		const oldest = state.preroll[0];
		expect(oldest).toBeDefined();
		expect(t - STEP - (oldest?.t ?? 0)).toBeLessThanOrEqual(PREROLL_MS);
	});

	test("an input starts a recording at the input, with the pre-roll ahead of it", () => {
		const [idle, t] = still(IDLE, 0, 1000, { "Note:top": 10 });
		const pressed = feed(idle, at(t, { "Note:top": 10 }), [
			{ t: t - 5, label: "pointer down" },
		]);
		expect(pressed.open?.origin).toBe(t - 5);
		expect(pressed.open?.frames.length).toBeGreaterThan(1);
		expect(pressed.preroll).toHaveLength(0);
	});

	test("motion with no input starts at the last still frame", () => {
		const [idle, t] = still(IDLE, 0, 1000, { "Note:top": 10 });
		const moving = feed(idle, at(t, { "Note:top": 14 }));
		expect(moving.open?.origin).toBe(t - STEP);
	});

	test("quiet after the last event closes the recording, keeping a short tail", () => {
		let state = feed(IDLE, at(0, { "Note:top": 10 }), [
			{ t: 0, label: "click" },
		]);
		let t = STEP;
		for (; t <= 200; t += STEP)
			state = feed(state, at(t, { "Note:top": 10 + t / 2 }));
		const lastMove = t - STEP;
		let closedAt: number | null = null;
		for (; t <= lastMove + QUIET_MS + STEP; t += STEP) {
			state = feed(state, at(t, { "Note:top": 10 + lastMove / 2 }));
			if (state.open === null && closedAt === null) closedAt = t;
		}
		expect(closedAt).not.toBeNull();
		expect((closedAt ?? 0) - lastMove).toBeGreaterThanOrEqual(QUIET_MS);
		const recording = state.done.at(-1);
		expect(recording).toBeDefined();
		const end = recording?.frames.at(-1)?.t ?? 0;
		expect(end).toBeGreaterThanOrEqual(lastMove + TAIL_MS);
		expect(end).toBeLessThan(lastMove + TAIL_MS + STEP * 2);
		expect(recording?.markers).toEqual([{ t: 0, label: "click" }]);
	});

	test("a held drag is cut at the ceiling", () => {
		let state = feed(IDLE, at(0, { "Note:top": 0 }), [
			{ t: 0, label: "pointer down" },
		]);
		let t = STEP;
		while (state.open) {
			state = feed(state, at(t, { "Note:top": t }));
			t += STEP;
		}
		expect(t).toBeGreaterThanOrEqual(MAX_MS);
		expect(t).toBeLessThan(MAX_MS + STEP * 2);
		expect(state.done).toHaveLength(1);
	});

	test("only the newest recordings are kept", () => {
		let state = IDLE;
		let t = 0;
		for (let round = 0; round < KEEP + 3; round++) {
			state = feed(state, at(t, { "Note:top": round }), [
				{ t, label: "click" },
			]);
			[state, t] = still(state, t + STEP, QUIET_MS + STEP * 2, {
				"Note:top": round,
			});
		}
		expect(state.done).toHaveLength(KEEP);
	});
});

describe("summarize", () => {
	const frames: Frame[] = [];
	for (let t = -48; t <= 600; t += STEP) {
		const values: Record<string, number> = {
			/* moves from 100 to 40 between 0 and 200 ms, then holds */
			"Note haus:top":
				t <= 0 ? 100 : t >= 200 ? 40 : 100 - (60 * t) / 200,
			"Note haus:left": 12,
		};
		/* the bar mounts at 32 ms, fades in from 180 ms to 340 ms */
		if (t >= 32)
			values["Cover bar 1:opacity"] =
				t < 180 ? 0 : t >= 340 ? 1 : (t - 180) / 160;
		frames.push(at(t, values));
	}
	const recording = { frames, markers: [{ t: 0, label: "pointer up" }] };
	const summaries = summarize(recording);
	const byKey = Object.fromEntries(summaries.map((s) => [s.key, s]));

	test("still channels are dropped", () => {
		expect(byKey["Note haus:left"]).toBeUndefined();
		expect(summaries.map((summary) => summary.key)).toEqual([
			"Note haus:top",
			"Cover bar 1:opacity",
		]);
	});

	test("a channel's start and settle are read off its own frames", () => {
		const top = byKey["Note haus:top"];
		expect(top?.appears).toBeNull();
		expect(top?.starts).toBe(16);
		expect(top?.settles).toBe(208);
		expect(top?.from).toBe(100);
		expect(top?.to).toBe(40);
		expect(top?.element).toBe("Note haus");
		expect(top?.property).toBe("top");
	});

	test("an element that mounts late reports when it appeared and when it began to move", () => {
		const bar = byKey["Cover bar 1:opacity"];
		expect(bar?.appears).toBe(32);
		expect(bar?.starts).toBe(192);
		expect(bar?.settles).toBe(352);
		expect(bar?.leaves).toBeNull();
	});

	test("an element that leaves before the end is kept for its exit alone", () => {
		const gone = summarize({
			frames: [
				at(0, { "Zone cover:top": 5, "Note:top": 1 }),
				at(16, { "Zone cover:top": 5, "Note:top": 1 }),
				at(32, { "Note:top": 1 }),
			],
			markers: [],
		});
		expect(gone.map((summary) => summary.key)).toEqual(["Zone cover:top"]);
		expect(gone[0]?.leaves).toBe(16);
		expect(gone[0]?.starts).toBeNull();
	});

	test("duration and frame interval describe the sampler's cadence", () => {
		expect(durationOf(recording)).toBe(640);
		expect(frameIntervalOf(recording)).toBe(STEP);
		expect(frameIntervalOf({ frames: [], markers: [] })).toBeNull();
	});

	test("an element that only comes or goes is one presence row", () => {
		const split = partition(
			summarize({
				frames: [
					at(0, {
						"Zone cover:top": 5,
						"Zone cover:left": 5,
						"Note:top": 1,
					}),
					at(16, {
						"Zone cover:top": 5,
						"Zone cover:left": 5,
						"Note:top": 4,
					}),
					at(32, { "Note:top": 4 }),
				],
				markers: [],
			}),
		);
		expect(split.moving.map((summary) => summary.key)).toEqual([
			"Note:top",
		]);
		expect(split.presence).toEqual([
			{ element: "Zone cover", appears: null, leaves: 16 },
		]);
	});
});
