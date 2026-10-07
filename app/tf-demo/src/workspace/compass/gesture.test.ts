import { describe, expect, test } from "bun:test";
import {
	createWorkspace,
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
	projected,
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

describe("keyboard destinations", () => {
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
		const ground =
			state.layout.kind === "Pane" ? state.layout.line[2] : null;
		return workspaceReducer(state, {
			type: "Deal",
			sheetId: ground?.id ?? "",
			selection: "noch",
			cards: [{ subject: "a" }, { subject: "b" }],
		});
	}
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
