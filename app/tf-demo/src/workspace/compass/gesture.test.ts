import { describe, expect, test } from "bun:test";
import {
	createWorkspace,
	findSheet,
	restingCards,
	type WorkspaceState,
	workspaceReducer,
} from "compass";
import { motionValue } from "motion/react";
import { keyboardDestinations } from "./destination";
import {
	type Drag,
	flickOf,
	freshDrag,
	inHandOf,
	type NoteHandle,
	pastCommit,
	projected,
	type ReleaseLimits,
	releaseOf,
	sample,
	type ThrowTuning,
} from "./gesture";

const TUNING: ThrowTuning = {
	sampleMs: 16,
	staleMs: 100,
	projectionMs: 150,
	flickSpeed: 0.5,
};

const handle = (): NoteHandle => ({
	left: motionValue(0),
	top: motionValue(0),
	width: motionValue(0),
	height: motionValue(0),
	x: motionValue(0),
	y: motionValue(0),
	rotate: motionValue(0),
	opacity: motionValue(1),
});

function dragOf(
	overrides: Partial<Parameters<typeof freshDrag<string>>[0]> = {},
): Drag<string> {
	return freshDrag<string>({
		card: { id: "presentation-9", subject: "noch" },
		h: handle(),
		pointerId: 1,
		at: { x: 100, y: 100, t: 0 },
		origin: { left: 0, top: 0, width: 0, height: 0 },
		paneId: "pane-1",
		deckSheet: null,
		home: "slot",
		phase: "held",
		lifted: false,
		keyboard: false,
		...overrides,
	});
}

/** A Text open in pane-1 with two Cards dealt onto its Deck. */
function dealt(): WorkspaceState<string> {
	const at = [
		{
			type: "StepUp",
			paneId: "pane-1",
			to: { kind: "MenuItem", item: "library" },
		},
		{
			type: "StepUp",
			paneId: "pane-1",
			to: { kind: "Sheet", subject: "text" },
		},
	] as const;
	const state = at.reduce(
		workspaceReducer<string>,
		createWorkspace<string>(),
	);
	const ground = state.layout.kind === "Pane" ? state.layout.line[2] : null;
	return workspaceReducer(state, {
		type: "Deal",
		sheetId: ground?.id ?? "",
		selection: "noch",
		cards: [{ subject: "a" }, { subject: "b" }],
	});
}

/** A hand moving `dx` px along x every 16 ms, `steps` times. */
function moveAlong(d: Drag<string>, dx: number, steps: number) {
	for (let step = 1; step <= steps; step++)
		sample(d, 100 + dx * step, 100, step * 16, TUNING);
}

describe("a throw", () => {
	test("is carried on at the hand's speed while it is fresh", () => {
		const d = dragOf();
		moveAlong(d, 16, 5);
		const ahead = projected(d, 80, TUNING);
		expect(ahead.dx).toBeGreaterThan(80);
		/* a hand still for longer than staleMs carries nothing on */
		expect(projected(d, 300, TUNING).dx).toBe(80);
	});

	test("toward inline-start is leftward in left-to-right text and rightward in right-to-left", () => {
		const left = dragOf();
		moveAlong(left, -16, 5);
		expect(flickOf(left, 80, TUNING, "ltr")).toBe("start");
		expect(flickOf(left, 80, TUNING, "rtl")).toBe("end");
		const right = dragOf();
		moveAlong(right, 16, 5);
		expect(flickOf(right, 80, TUNING, "ltr")).toBe("end");
		expect(flickOf(right, 80, TUNING, "rtl")).toBe("start");
	});

	test("is no flick when slow, stale or mostly vertical", () => {
		const slow = dragOf();
		moveAlong(slow, 2, 5);
		expect(flickOf(slow, 80, TUNING, "ltr")).toBeNull();
		const fast = dragOf();
		moveAlong(fast, -16, 5);
		expect(flickOf(fast, 400, TUNING, "ltr")).toBeNull();
	});
});

describe("a release", () => {
	const limits: ReleaseLimits = {
		tuning: TUNING,
		commit: 60,
		clickSlop: 4,
		sign: 1,
	};
	const still = { x: 0, y: 0 };
	const { layout } = createWorkspace<string>();

	test("of a lifted Note that never left its slop is in place, whatever its phase", () => {
		for (const phase of ["pressed", "swiping", "held"] as const)
			expect(
				releaseOf(
					dragOf({ lifted: true, phase }),
					{ x: 3, y: 3 },
					0,
					layout,
					limits,
				),
			).toEqual({ kind: "in-place" });
	});

	test("of a lifted Note past its slop is no longer in place", () => {
		expect(
			releaseOf(
				dragOf({ lifted: true }),
				{ x: 6, y: 0 },
				0,
				layout,
				limits,
			),
		).toEqual({ kind: "commit" });
	});

	describe("of a press that never passed the slop is a tap", () => {
		const state = dealt();
		const ground =
			state.layout.kind === "Pane"
				? (state.layout.line[2]?.id ?? "")
				: "";
		const deck = findSheet(state.layout, ground)?.deck;
		const cards = deck ? restingCards(state.layout, deck) : [];
		const front =
			cards.find((card) => card.id === deck?.frontId) ?? cards[0];
		const behind = cards.find((card) => card.id !== front?.id);

		test("that brings a Card behind the front to the front of its Deck", () => {
			expect(behind).toBeDefined();
			if (!behind) return;
			expect(
				releaseOf(
					dragOf({
						card: behind,
						deckSheet: ground,
						phase: "pressed",
					}),
					still,
					0,
					state.layout,
					limits,
				),
			).toEqual({ kind: "tap", toFront: ground });
		});

		test("that leaves the front Card, and a Card on no Deck, as they are", () => {
			expect(front).toBeDefined();
			if (!front) return;
			expect(
				releaseOf(
					dragOf({
						card: front,
						deckSheet: ground,
						phase: "pressed",
					}),
					still,
					0,
					state.layout,
					limits,
				),
			).toEqual({ kind: "tap", toFront: null });
			expect(
				releaseOf(
					dragOf({ phase: "pressed" }),
					still,
					0,
					state.layout,
					limits,
				),
			).toEqual({ kind: "tap", toFront: null });
		});
	});

	test("of a swipe headed past the commit line toward inline-start sweeps", () => {
		const d = dragOf({ phase: "swiping" });
		moveAlong(d, -16, 5);
		expect(pastCommit(d, 80, TUNING, 60, 1)).toBe(true);
		expect(releaseOf(d, still, 80, layout, limits)).toEqual({
			kind: "sweep",
		});
		/* in right-to-left text inline-start is to the right */
		expect(
			releaseOf(d, still, 80, layout, { ...limits, sign: -1 }),
		).toEqual({ kind: "snap" });
	});

	test("of a swipe short of the line, or gone still, snaps back", () => {
		const short = dragOf({ phase: "swiping" });
		moveAlong(short, -2, 5);
		expect(releaseOf(short, still, 80, layout, limits)).toEqual({
			kind: "snap",
		});
		const slow = dragOf({ phase: "swiping" });
		moveAlong(slow, -8, 5);
		/* 40 px travelled; the throw that carried it past 60 has gone stale */
		expect(pastCommit(slow, 80, TUNING, 60, 1)).toBe(true);
		expect(releaseOf(slow, still, 400, layout, limits)).toEqual({
			kind: "snap",
		});
	});

	test("of a Card in hand commits at its destination", () => {
		expect(
			releaseOf(dragOf({ phase: "held" }), still, 0, layout, limits),
		).toEqual({ kind: "commit" });
	});
});

describe("keyboard destinations", () => {
	const reading = (state: WorkspaceState<string>, narrow: boolean) => ({
		layout: state.layout,
		shown: state.layout.kind === "Pane" ? [state.layout] : [],
		restBoxes: { "pane-1": { left: 0, top: 0, width: 1200, height: 900 } },
		rem: 16,
		narrow,
		columnRem: 26,
		allows: () => true,
	});

	test("a Card off its Deck can go back, open over it, or open a Pane either side, in reading order", () => {
		const state = dealt();
		const ground =
			state.layout.kind === "Pane"
				? (state.layout.line[2]?.id ?? "")
				: "";
		const d = dragOf({ deckSheet: ground });
		expect(
			keyboardDestinations(d, reading(state, false)).map((at) =>
				at.kind === "pane" ? `${at.kind}:${at.edge}` : at.kind,
			),
		).toEqual(["return", "pane:inline-start", "sheet", "pane:inline-end"]);
	});

	test("a narrow screen offers no edges", () => {
		const state = dealt();
		const ground =
			state.layout.kind === "Pane"
				? (state.layout.line[2]?.id ?? "")
				: "";
		const d = dragOf({ deckSheet: ground });
		expect(
			keyboardDestinations(d, reading(state, true)).map((at) => at.kind),
		).toEqual(["return", "sheet"]);
	});

	test("a lifted Sheet starts at home, where letting go changes nothing", () => {
		const d = dragOf({ lifted: true, home: "close" });
		const list = keyboardDestinations(d, reading(dealt(), true));
		expect(list).toEqual([{ kind: "home", paneId: "pane-1" }]);
	});
});

describe("the Card in hand drawn on its own", () => {
	const box = { left: 1, top: 2, width: 3, height: 4 };
	const origin = { left: 5, top: 6, width: 7, height: 8 };
	const loose = { card: { id: "loose", subject: "los" }, box };
	const none = new Set<string>();

	test("is a loose Card not drawn yet, at its own box", () => {
		expect(inHandOf(loose, dragOf({ lifted: true }), none)).toEqual(loose);
	});

	test("else a lifted drag's Card not drawn yet, at its origin", () => {
		const d = dragOf({ lifted: true, origin });
		expect(inHandOf(null, d, none)).toEqual({ card: d.card, box: origin });
		expect(inHandOf(loose, d, new Set(["loose"]))).toEqual({
			card: d.card,
			box: origin,
		});
	});

	test("is nothing once drawn, or for a Card picked off a Deck", () => {
		const d = dragOf({ lifted: true });
		expect(inHandOf(null, d, new Set([d.card.id]))).toBeNull();
		expect(inHandOf(null, dragOf({ lifted: false }), none)).toBeNull();
		expect(inHandOf(null, null, none)).toBeNull();
	});
});
