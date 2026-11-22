import "../../../tests/support/dom";
import { describe, expect, test } from "bun:test";
import { act, fireEvent, render } from "@testing-library/react";
import {
	createWorkspace,
	type PlacementStyle,
	type WorkspaceCommand,
	type WorkspaceState,
	workspaceReducer,
} from "compass";
import { motionValue } from "motion/react";
import { StrictMode, useCallback, useRef, useState } from "react";
import { Compass } from "./compass";
import { useContentMotion } from "./content-motion";
import type { NoteHandle } from "./gesture";
import { useNoteMoves } from "./note-moves";
import type { SubjectRenderer } from "./subject";
import type { CompassWorkspace } from "./use-compass-workspace";
import { useNoteBox } from "./use-note-box";

type TestSubject = {
	readonly id: string;
	readonly label: string;
};

const RENDERER: SubjectRenderer<TestSubject> = {
	label: (subject) => subject.label,
	columnRem: () => 40,
	render: (subject, view, part) => {
		if (part === "heading") return <h1>{subject.label}</h1>;
		return (
			<div>
				<button
					type="button"
					data-trigger-cover={subject.id}
					onClick={() =>
						view.follow({ id: "cover-1", label: "Marktplatz" })
					}
				>
					Open Cover
				</button>
				<button
					type="button"
					data-trigger-deck={subject.id}
					onClick={(event) =>
						view.deal(
							"word-1",
							[
								{
									subject: {
										id: "card-1",
										label: "Marktplatz",
									},
								},
							],
							event.currentTarget,
						)
					}
				>
					Deal Deck
				</button>
				<textarea aria-label={`Notes for ${subject.label}`} />
			</div>
		);
	},
};

function TestCompassHost() {
	const initial = workspaceReducer(
		workspaceReducer(createWorkspace<TestSubject>(), {
			type: "StepUp",
			paneId: "pane-1",
			to: { kind: "MenuItem", item: "library" },
		}),
		{
			type: "StepUp",
			paneId: "pane-1",
			to: { kind: "Sheet", subject: { id: "ground-1", label: "Reader" } },
		},
	);
	const [state, setState] = useState(initial);
	const stateRef = useRef(state);
	stateRef.current = state;

	const dispatch = useCallback((command: WorkspaceCommand<TestSubject>) => {
		const next = workspaceReducer(stateRef.current, command);
		stateRef.current = next;
		setState(next);
		return next;
	}, []);

	const reset = useCallback((next: WorkspaceState<TestSubject>) => {
		stateRef.current = next;
		setState(next);
	}, []);

	const workspace: CompassWorkspace<TestSubject> = {
		state,
		current: () => stateRef.current,
		dispatch,
		reset,
	};

	return (
		<Compass
			workspace={workspace}
			renderer={RENDERER}
			menu={[{ key: "library", label: "Library" }]}
			renderMenuItem={() => null}
		/>
	);
}

describe("Compass scrims, modal A11y, and focus craft", () => {
	test("renders pane-scoped Deck and Cover scrims, isolates covered Ground, and manages Cover focus", async () => {
		const view = render(<TestCompassHost />);
		const frame =
			view.container.querySelector<HTMLElement>("[data-deck-frame]");
		const ground = view.container.querySelector<HTMLElement>(
			'[data-presentation="ground"]',
		);
		const deckScrim = view.container.querySelector<HTMLElement>(
			'[data-scrim="deck"]',
		);
		const coverScrim = view.container.querySelector<HTMLElement>(
			'[data-scrim="cover"]',
		);
		if (!frame || !ground || !deckScrim || !coverScrim) {
			throw new Error("Expected frame, ground, and both pane scrims.");
		}

		// At rest: frame & pane use overflow-clip (never overflow-hidden) so scrollTop stays locked at 0.
		const pane =
			view.container.querySelector<HTMLElement>("[data-deck-pane]");
		expect(frame.className).toContain("overflow-clip");
		expect(frame.className).not.toContain("overflow-hidden");
		expect(pane?.className).toContain("overflow-clip");
		expect(pane?.className).not.toContain("overflow-hidden");

		// At rest: both scrims stay invisible and Ground is live.
		expect(deckScrim.className).toContain("bg-scrim/45");
		expect(deckScrim.className).toContain("opacity-0");
		expect(coverScrim.className).toContain("bg-scrim/60");
		expect(coverScrim.className).toContain("opacity-0");
		expect(ground.hasAttribute("inert")).toBe(false);
		expect(ground.getAttribute("aria-hidden")).toBeNull();

		// Deal a Deck: Deck scrim dims Ground while keeping pointer-events-none.
		const dealButton = view.container.querySelector<HTMLButtonElement>(
			'[data-trigger-deck="ground-1"]',
		);
		if (!dealButton) throw new Error("Missing deal button.");
		fireEvent.click(dealButton);
		expect(deckScrim.className).toContain("opacity-100");
		expect(deckScrim.className).toContain("pointer-events-none");

		// Open a Cover from a focused trigger on Ground.
		const openCoverButton = view.container.querySelector<HTMLButtonElement>(
			'[data-trigger-cover="ground-1"]',
		);
		if (!openCoverButton) throw new Error("Missing open cover button.");
		openCoverButton.focus();
		expect(document.activeElement).toBe(openCoverButton);
		fireEvent.click(openCoverButton);

		const cover = view.container.querySelector<HTMLElement>(
			'[data-presentation="cover"]',
		);
		if (!cover) throw new Error("Expected open Cover.");

		// Cover scrim dims and captures outside clicks; Ground is isolated via inert + aria-hidden.
		expect(coverScrim.className).toContain("opacity-100");
		expect(coverScrim.className).toContain("pointer-events-auto");
		expect(coverScrim.className).toContain("overscroll-contain");
		expect(ground.hasAttribute("inert")).toBe(true);
		expect(ground.getAttribute("aria-hidden")).toBe("true");
		// Focus moved into the newly opened Cover.
		expect(document.activeElement).toBe(cover);

		// Chrome buttons expose 44px pseudo hit targets, fine-pointer hover guard, and concentric KeyHandles.
		const clearButton = cover.querySelector<HTMLButtonElement>(
			'[data-heading-chrome="clear"]',
		);
		const keyHandle = cover.querySelector<HTMLButtonElement>(
			'[data-key-handle="lift"]',
		);
		expect(clearButton?.className).toContain("after:-inset-1.5");
		expect(clearButton?.className).toContain("touch-manipulation");
		expect(clearButton?.className).toContain("disabled:text-ink-faint/75");
		expect(clearButton?.className).toContain(
			"[@media(hover:hover)_and_(pointer:fine)]:enabled:hover:bg-destructive/12",
		);
		expect(keyHandle?.className).toContain("rounded-sm");
		expect(keyHandle?.parentElement?.className).toContain("top-2");

		// Clicking an interactive textarea inside the Cover does not lose focus to [data-deck-frame].
		const textarea = cover.querySelector<HTMLTextAreaElement>("textarea");
		if (!textarea) throw new Error("Missing cover textarea.");
		textarea.focus();
		fireEvent.pointerDown(textarea, { button: 0, pointerId: 1 });
		expect(document.activeElement).toBe(textarea);

		// Clicking the Cover scrim dismisses Covers and restores focus to the trigger.
		fireEvent.pointerDown(coverScrim, {
			button: 0,
			pointerId: 2,
			clientX: 10,
			clientY: 10,
		});
		fireEvent.pointerUp(coverScrim, {
			button: 0,
			pointerId: 2,
			clientX: 10,
			clientY: 10,
		});
		fireEvent.click(coverScrim);
		await act(async () => {
			await Promise.resolve();
		});

		expect(
			view.container.querySelector('[data-presentation="cover"]'),
		).toBeNull();
		expect(ground.hasAttribute("inert")).toBe(false);
		expect(ground.getAttribute("aria-hidden")).toBeNull();
		expect(document.activeElement).toBe(openCoverButton);
	});

	test("resumes stalled offset animations under React StrictMode effect reconnect", async () => {
		const COVER_PLACE: PlacementStyle = {
			insetInlineStart: "216px",
			top: "12px",
			width: "896px",
			height: "788px",
		};
		const CARD_PLACE: PlacementStyle = {
			insetInlineStart: "456px",
			top: "288px",
			width: "416px",
			height: "384px",
		};
		const probe: {
			latestShownX: (() => number) | null;
			latestWidth: (() => string) | null;
			triggerCollapse: (() => void) | null;
		} = {
			latestShownX: null,
			latestWidth: null,
			triggerCollapse: null,
		};

		function BoxProbe() {
			const [place, setPlace] = useState<PlacementStyle>(COVER_PLACE);
			const ref = useRef<HTMLDivElement | null>(null);
			probe.triggerCollapse = () => setPlace(CARD_PLACE);
			const box = useNoteBox({
				element: ref,
				place,
				preview: false,
				reduce: false,
				MORPH: { duration: 0.04, ease: "linear" },
				restScale: place === CARD_PLACE ? 1.05 : 1,
			});
			probe.latestShownX = () => box.shownX.get();
			probe.latestWidth = () => box.width.get();
			return (
				<div
					ref={ref}
					style={{
						position: "absolute",
						left: place.insetInlineStart,
						top: place.top,
						width: place.width,
						height: place.height,
					}}
				/>
			);
		}

		render(
			<StrictMode>
				<BoxProbe />
			</StrictMode>,
		);

		act(() => {
			probe.triggerCollapse?.();
		});

		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 140));
		});

		expect(Math.abs(probe.latestShownX?.() ?? 999)).toBeLessThan(1);
		expect(probe.latestWidth?.()).toBe("calc(416px + 0px)");
	});

	test("foldOffset restores opacity to 1 after a Card grazed the leaving zone", async () => {
		let runFold: ((handle: NoteHandle) => void) | null = null;

		function MovesProbe() {
			const moves = useNoteMoves();
			runFold = (handle) => moves.foldOffset(handle);
			return null;
		}

		render(<MovesProbe />);

		const opacity = motionValue(0.5);
		const handle: NoteHandle = {
			x: motionValue(24),
			y: motionValue(-12),
			rotate: motionValue(3),
			opacity,
			box: () => ({ left: 456, top: 288, width: 416, height: 384 }),
			morphFrom: () => {},
		};

		act(() => {
			runFold?.(handle);
		});

		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 260));
		});

		expect(opacity.get()).toBeCloseTo(1, 2);
	});

	test("Escape collapses an open Cover and a plain click on its Heading keeps it open", () => {
		const view = render(<TestCompassHost />);
		const openCoverButton = view.container.querySelector<HTMLButtonElement>(
			'[data-trigger-cover="ground-1"]',
		);
		if (!openCoverButton) throw new Error("Missing open cover button.");
		fireEvent.click(openCoverButton);

		const cover = view.container.querySelector<HTMLElement>(
			'[data-presentation="cover"]',
		);
		const heading = cover?.querySelector<HTMLElement>("[data-heading]");
		if (!cover || !heading) throw new Error("Expected open Cover heading.");

		/* Pressing and releasing on the Cover Heading within slop must not lift or close it. */
		fireEvent.pointerDown(heading, {
			button: 0,
			pointerId: 7,
			clientX: 200,
			clientY: 40,
		});
		fireEvent.pointerMove(heading, {
			pointerId: 7,
			clientX: 203,
			clientY: 42,
		});
		fireEvent.pointerUp(heading, {
			pointerId: 7,
			clientX: 203,
			clientY: 42,
		});
		expect(
			view.container.querySelector('[data-presentation="cover"]'),
		).not.toBeNull();

		/* Pressing Escape dismisses the top Cover when no Deck is on top of it. */
		fireEvent.keyDown(window, { key: "Escape" });
		expect(
			view.container.querySelector('[data-presentation="cover"]'),
		).toBeNull();
	});

	test("Cover-to-Card collapse updates width, height, and --note-morph across sibling reorder in StrictMode", async () => {
		const COVER_PLACE: PlacementStyle = {
			insetInlineStart: "216px",
			top: "12px",
			width: "896px",
			height: "788px",
		};
		const CARD_PLACE: PlacementStyle = {
			insetInlineStart: "456px",
			top: "288px",
			width: "416px",
			height: "384px",
		};
		const probe: {
			box: { width: () => string; height: () => string } | null;
			surfaceStyle: Record<string, unknown> | null;
			toggle: (() => void) | null;
		} = {
			box: null,
			surfaceStyle: null,
			toggle: null,
		};

		function NoteItem({ asCover }: { asCover: boolean }) {
			const ref = useRef<HTMLDivElement | null>(null);
			const place = asCover ? COVER_PLACE : CARD_PLACE;
			const box = useNoteBox({
				element: ref,
				place,
				preview: false,
				reduce: true,
				MORPH: { duration: 0, ease: "linear" },
				restScale: asCover ? 1 : 1.05,
			});
			const content = useContentMotion({
				section: ref,
				form: asCover ? "sheet" : "card",
				below: false,
				held: false,
			});
			probe.box = {
				width: () => box.width.get(),
				height: () => box.height.get(),
			};
			const surface = content.surface?.(
				{
					className: "",
					"data-probe": "surface",
					style: {},
				},
				{
					form: asCover ? "cover" : "card",
					mode: asCover ? "sheet" : "card",
					sheet: asCover,
					target: asCover ? 1 : 0,
					progress: asCover ? 1 : 0,
				},
			);
			probe.surfaceStyle =
				(surface as { props?: { style?: Record<string, unknown> } })
					?.props?.style ?? null;
			return <div ref={ref}>{surface}</div>;
		}

		function ReorderHost() {
			const [asCover, setAsCover] = useState(true);
			probe.toggle = () => setAsCover((value) => !value);
			/* Mirrors Compass moving the Note between Sheet order and Deck order. */
			return asCover ? (
				<div>
					<NoteItem key="note-1" asCover={true} />
					<div key="sibling" />
				</div>
			) : (
				<div>
					<div key="sibling" />
					<NoteItem key="note-1" asCover={false} />
				</div>
			);
		}

		render(
			<StrictMode>
				<ReorderHost />
			</StrictMode>,
		);

		expect(probe.box?.width()).toBe("calc(896px + 0px)");
		expect(probe.box?.height()).toBe("calc(788px + 0px)");

		act(() => {
			probe.toggle?.();
		});

		/* Reduced-motion box dimensions snap synchronously despite StrictMode + reorder. */
		expect(probe.box?.width()).toBe("calc(416px + 0px)");
		expect(probe.box?.height()).toBe("calc(384px + 0px)");
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 450));
		});
		const morphValue = probe.surfaceStyle?.["--note-morph"] as
			| { get: () => number }
			| undefined;
		expect(morphValue?.get()).toBeCloseTo(0, 2);
	});
});
