import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "lego";
import {
	AnimatePresence,
	animate,
	MotionConfig,
	type MotionValue,
	motion,
	useMotionValue,
	useTransform,
} from "motion/react";
import {
	type MouseEvent as ReactMouseEvent,
	type ReactNode,
	type PointerEvent as ReactPointerEvent,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useMotionPreference } from "@/lib/motion-preference";
import {
	cleanWord,
	type DummyNote,
	deckFor,
	type NoteLink,
	noteById,
} from "./dummy";
import {
	ALL_INTERACTIONS,
	type DeckInteraction,
	DeckInteractions,
	useDeckInteractions,
} from "./interaction-policy";
import {
	after,
	BAR_REM,
	CARD_WIDTH_REM,
	CONTEXT_PAGE,
	HEADER_REM,
	LIFT_SCALE,
	liftShadow,
	type motionOf,
	PILE_HEIGHT_REM,
	SHEET_HEADER_REM,
} from "./motion-spec";
import { useDeckReducedMotion } from "./reduced-motion";
import {
	type DeckMotionOverrides,
	DeckMotionProvider,
	useDeckMotion,
} from "./runtime-config";
import { DummyReader, ModelShell, useEventLog } from "./shared";

/**
 * COMPASS — the drag deck.
 *
 * A Note is one element in every form (ADR 0006). The same `NoteView` is a
 * Card in the Deck, the Held Card under the pointer, and the Sheet in a
 * Pane: only its box moves, and its Blocks read the form and adapt. There
 * is no drag ghost and no separate Sheet component, so nothing crossfades.
 *
 * The Deck is one column: every Card shows its Heading row, and the
 * expanded Card takes the rest of the height. The written form sits on top,
 * the meaning at the bottom, and the meaning opens by default. A tap on a
 * folded Card expands it; a tap on the expanded Card does nothing: only the
 * "up" gestures open a Sheet. The first direction of a drag names its
 * intent: left arms "Remove" (the Card tilts), up arms "Open as sheet".
 * Hold an armed Card longer than a beat and the arm relaxes into a plain
 * drag.
 *
 * A plain drag drops inside a pane to open the Card as a Sheet there, on a
 * pane edge to split a new pane (after the production Workspace), on the
 * strip left of the Deck to remove, or back on the Deck. A fast throw left
 * or up still removes or opens without a zone. A Sheet lifts back into a
 * Held Card straight from its Heading, or after holding one of its margins:
 * the Sheet shrinks a touch and its border turns blue while the hold runs.
 */

type DeckCard = { readonly id: number; readonly note: DummyNote };
type Edge = "left" | "right" | "bottom";
type PaneNode = {
	readonly kind: "Pane";
	readonly id: string;
	readonly sheets: readonly DeckCard[];
};
type SplitNode = {
	readonly kind: "Split";
	readonly id: string;
	readonly axis: "horizontal" | "vertical";
	readonly children: readonly [LayoutNode, LayoutNode];
};
type LayoutNode = PaneNode | SplitNode;
type Destination =
	| { readonly kind: "return" }
	| { readonly kind: "remove" }
	| { readonly kind: "sheet"; readonly paneId: string }
	| { readonly kind: "pane"; readonly paneId: string; readonly edge: Edge };
type Arm = "remove" | "expand";
type Box = {
	readonly left: number;
	readonly top: number;
	readonly width: number;
	readonly height: number;
};
/** A Note's own motion values: its box, and the drag transforms on top. */
type NoteHandle = {
	readonly left: MotionValue<number>;
	readonly top: MotionValue<number>;
	readonly width: MotionValue<number>;
	readonly height: MotionValue<number>;
	readonly x: MotionValue<number>;
	readonly y: MotionValue<number>;
	readonly rotate: MotionValue<number>;
	readonly scale: MotionValue<number>;
	readonly opacity: MotionValue<number>;
	/** How far off the Deck the Card is held, 0 → 1; `setdown` only. */
	readonly lift: MotionValue<number>;
};
type Drag = {
	readonly card: DeckCard;
	readonly h: NoteHandle;
	readonly pointerId: number;
	readonly start: { x: number; y: number; t: number };
	/** The box the Note holds while in hand; its drag offset is on top. */
	readonly origin: Box;
	arm: Arm | null;
	armedAt: number;
	free: boolean;
	/** Lifted out of a Sheet: a release in place leaves it on the Deck. */
	lifted: boolean;
	/**
	 * The pointer has travelled past the slop. Until then the Card stays on
	 * the Deck untouched, so a tap is only a tap.
	 */
	moved: boolean;
	/** The pointer is over the remove zone; the Card is tilted. */
	overRemove: boolean;
	v: { vx: number; vy: number };
	last: { x: number; y: number; t: number };
};
type NoteForm = "card" | "sheet";
type Place = "above" | "open" | "below";
type Lift = {
	readonly pointerId: number;
	readonly x: number;
	readonly y: number;
};

const ROOT_PANE = "text";
const CARD_WIDTH = `${CARD_WIDTH_REM.toString()}rem`;
const PILE_HEIGHT = `${PILE_HEIGHT_REM.toString()}rem`;
/** The Sheet's box: the Pane inset by these. */
const SHEET_INSET_X_REM = 1.5;
const SHEET_INSET_Y_REM = 1;
/** How many Source Contexts a Card shows. A Sheet's page is the spec's. */
const CARD_CONTEXTS = 2;
/** How far the return zone reaches past the Deck's cards. */
const PILE_PAD_REM = 0.75;
const PILE_PAD = `${PILE_PAD_REM.toString()}rem`;
/** The remove zone's width, and the gap between it and the Deck. */
const REMOVE_WIDTH = "5rem";
const ZONE_GAP = "0.75rem";
/** The Heading's inline padding: what a Card's title sits in from its edge. */
const TITLE_INSET_REM = 1;
/** The gap between a selected word's baseline box and the dealt Deck. */
const DEAL_GAP_PX = 8;

const DISMISS_EXEMPT_SELECTOR = [
	"button",
	"a",
	"input",
	"textarea",
	"select",
	"option",
	"summary",
	"[contenteditable]",
	"[role=button]",
	"[role=link]",
	"[role=tab]",
	"[role=checkbox]",
	"[role=radio]",
	/* a Note in any form */
	"article",
	"[data-return-zone]",
].join(", ");

const RULES = [
	{
		move: "Drag ←",
		means: "Arms Remove: the Card tilts and commits past the line. Hold a beat and it relaxes into a plain drag.",
	},
	{
		move: "Drag ↑",
		means: "Arms Open as sheet. Same beat rule.",
	},
	{
		move: "Plain drag",
		means: "Drop in a pane to open as a Sheet, on an edge for a new pane, left of the Deck to remove, or back on the Deck.",
	},
	{
		move: "Throw",
		means: "A fast release removes, or opens as a Sheet, without a zone.",
	},
	{ move: "Tap folded", means: "Brings that Card to the front." },
	{
		move: "Drag Sheet heading",
		means: "Lifts the Sheet straight into a Held Card.",
	},
	{
		move: "Hold Sheet margin",
		means: "The Sheet shrinks and blues, then lifts as a Held Card. ← collapses it to the Deck.",
	},
	{
		move: "Esc",
		means: "Cancels a drag; else collapses the top Sheet; else removes the expanded Card.",
	},
	{ move: "Follow link", means: "Opens a Sheet on top, in the same pane." },
	{ move: "Click page", means: "Sweeps the Deck." },
];

/* -------------------------------------------------------------- layout */

function remPx(): number {
	return Number.parseFloat(
		getComputedStyle(document.documentElement).fontSize,
	);
}

/** Leave room for the selected Card's resting scale and the return outline. */
function cardWidthIn(
	paneWidth: number,
	rem: number,
	openScale: number,
): number {
	return Math.max(
		0,
		Math.min(
			CARD_WIDTH_REM * rem,
			(paneWidth - 2 * rem) / Math.max(1, openScale),
		),
	);
}

/** The expanded Card's height, in px, for a Deck of `count` Cards. */
function cardHeightPx(count: number): number {
	return (PILE_HEIGHT_REM - (Math.max(1, count) - 1) * HEADER_REM) * remPx();
}

/**
 * The Deck's left edge inside its Pane: the Card's title starts where the
 * selected word does, kept inside the Pane by a `PILE_PAD` margin. With no
 * word yet (a seeded scene), the Deck is centred as before.
 */
function deckLeftIn(
	paneWidth: number,
	cardWidth: number,
	rem: number,
	anchorLeft: number | null,
): number {
	if (anchorLeft === null) return (paneWidth - cardWidth) / 2;
	const pad = PILE_PAD_REM * rem;
	const wanted = anchorLeft - TITLE_INSET_REM * rem;
	const max = paneWidth - cardWidth - pad;
	return Math.max(Math.min(pad, max), Math.min(wanted, max));
}

function panesOf(node: LayoutNode): readonly PaneNode[] {
	return node.kind === "Pane"
		? [node]
		: node.children.flatMap((child) => panesOf(child));
}

function findPane(node: LayoutNode, id: string): PaneNode | null {
	return panesOf(node).find((pane) => pane.id === id) ?? null;
}

/** Replaces a pane by id; `null` removes it and lets its sibling take over. */
function replacePane(
	node: LayoutNode,
	id: string,
	next: LayoutNode | null,
): LayoutNode | null {
	if (node.kind === "Pane") return node.id === id ? next : node;
	const [a, b] = node.children;
	const nextA = replacePane(a, id, next);
	const nextB = replacePane(b, id, next);
	if (nextA === null) return nextB;
	if (nextB === null) return nextA;
	if (nextA === a && nextB === b) return node;
	return { ...node, children: [nextA, nextB] };
}

function updatePane(
	node: LayoutNode,
	id: string,
	update: (pane: PaneNode) => PaneNode,
): LayoutNode {
	const pane = findPane(node, id);
	if (!pane) return node;
	return replacePane(node, id, update(pane)) ?? node;
}

function sheetLabel(card: DeckCard): string {
	return `${card.note.kind} · ${card.note.title}`;
}

function sameBox(a: Box | undefined, b: Box): boolean {
	return (
		a !== undefined &&
		a.left === b.left &&
		a.top === b.top &&
		a.width === b.width &&
		a.height === b.height
	);
}

/** Where a Sheet sits in a Pane: under the bar, inset from the edges. */
function sheetBoxIn(pane: Box, rem: number): Box {
	const insetX = SHEET_INSET_X_REM * rem;
	const insetY = SHEET_INSET_Y_REM * rem;
	const bar = BAR_REM * rem;
	return {
		left: pane.left + insetX,
		top: pane.top + bar + insetY,
		width: Math.max(0, pane.width - 2 * insetX),
		height: Math.max(0, pane.height - bar - 2 * insetY),
	};
}

/* ---------------------------------------------------------------- model */

export type CompassModelProps = {
	interactions?: readonly DeckInteraction[];
	embedded?: boolean;
	initialScene?: "empty" | "deck" | "sheet";
	motion?: DeckMotionOverrides;
	showZones?: boolean;
	showReader?: boolean;
};

export function CompassModel({
	motion,
	interactions = ALL_INTERACTIONS,
	...props
}: CompassModelProps = {}) {
	const { preference } = useMotionPreference();
	return (
		<MotionConfig
			reducedMotion={preference === "ignore" ? "never" : "user"}
		>
			<DeckInteractions value={interactions}>
				<DeckMotionProvider motion={motion}>
					<CompassRuntime {...props} />
				</DeckMotionProvider>
			</DeckInteractions>
		</MotionConfig>
	);
}

function CompassRuntime({
	embedded = false,
	initialScene = embedded ? "deck" : "empty",
	showZones: initialZones = false,
	showReader = !embedded,
}: Omit<CompassModelProps, "motion">) {
	const allows = useDeckInteractions();
	const {
		transition,
		SPRING,
		MORPH,
		ARM_SLOP,
		COMMIT,
		THROW,
		VELOCITY_STALE_MS,
		HOLD_RELEASE_MS,
		CLICK_SLOP,
		EDGE_BAND,
		ZONE_FEEDBACK_MS,
		OPEN_SCALE,
		SETTLE_TIMEOUT_MS,
		SNAP_BACK,
		SNAP_LAND_PX,
		SNAP_RETURN,
		LIFT,
		TILT_MAX,
		leanFor,
		expandScaleFor,
		FLY_DISTANCE,
		FLY_FADE,
		FLY_ROTATE,
		FLY_ROTATE_TO,
		FLY_TRAVEL,
		BAR_ENTER,
		BAR_EXIT,
	} = useDeckMotion();
	const [seed] = useState(() =>
		initialScene === "empty"
			? []
			: deckFor("noch").map((note, index) => ({ id: index + 1, note })),
	);

	/* Every animate() below is imperative, so none of it is reachable by
	   CSS or by MotionConfig. See `reduced-motion.ts`. */
	const reduce = useDeckReducedMotion();
	const { entries, log, clear } = useEventLog();
	const [selected, setSelected] = useState<string | null>(null);
	/**
	 * Every Note dealt for the selected word, in Deck rank: the order the
	 * deal established, and the one true one. A Note keeps its rank in
	 * whatever form it takes — opening as a Sheet does not move it, and
	 * collapsing brings it back to the same slot. Only a remove, or a new
	 * deal, changes this list. The Deck on screen is derived from it below.
	 */
	const [dealt, setDealt] = useState<readonly DeckCard[]>(seed);
	const [expandedId, setExpandedId] = useState<number | null>(null);
	const [layout, setLayout] = useState<LayoutNode>({
		kind: "Pane",
		id: ROOT_PANE,
		sheets: initialScene === "sheet" ? seed.slice(0, 1) : [],
	});
	const [anchorTop, setAnchorTop] = useState((embedded ? 3 : 8) * 16);
	/**
	 * Where the Deck's titles start, from the root Pane's left edge; null
	 * until a word is selected, and then that word's left. The Deck sits
	 * so its titles line up under the word, not centred in the Pane.
	 */
	const [anchorLeft, setAnchorLeft] = useState<number | null>(null);
	const [drag, setDrag] = useState<Drag | null>(null);
	const [destination, setDestination] = useState<Destination | null>(null);
	const [pastCommit, setPastCommit] = useState(false);
	/**
	 * A returning Card has reached its slot and the Deck has closed over
	 * it: it is drawn in the stack again rather than above it. Which frame
	 * this turns on is what the snap-back models disagree about.
	 */
	const [landed, setLanded] = useState(false);
	/**
	 * The gesture is over and the Note is on its way home. It stops being
	 * boxed at the hand from this frame: the release is where it learns
	 * its slot, not the teardown. For a Card the two are the same box and
	 * nothing changes — but a Sheet lifted by its Heading is held in a
	 * hand box nowhere near its slot, and used to settle there, wait out
	 * the settle timeout and only then travel down to the Deck. One
	 * release, two motions and a stop in between. Now the box morphs to
	 * the slot while the drag offset unwinds on its own spring: both end
	 * at the same place, so they read as one move.
	 */
	const [returning, setReturning] = useState(false);
	/** Drop zones stay in the DOM for hit-testing; this only shows them. */
	const [zonesVisible, setZonesVisible] = useState(initialZones);
	/** Every Pane's box, relative to the frame; Notes are placed from these. */
	const [paneBoxes, setPaneBoxes] = useState<Readonly<Record<string, Box>>>(
		{},
	);
	const [rem, setRem] = useState(16);
	const dragRef = useRef<Drag | null>(null);
	const settlingRef = useRef(false);
	const landedRef = useRef(false);
	/** Live subscriptions watching a return for its arrival. */
	const landWatch = useRef<(() => void)[]>([]);
	/** The return's own animations, so a fresh grab can take the Card back. */
	const returnRun = useRef<{ stop: () => void }[]>([]);
	const root = useRef<HTMLDivElement>(null);
	const handles = useRef(new Map<number, NoteHandle>());
	const nextId = useRef(seed.length + 1);
	const nextPane = useRef(1);
	const gestureCheckpoint = useRef<{
		dealt: readonly DeckCard[];
		layout: LayoutNode;
		expandedId: number | null;
	} | null>(null);
	const pagePointer = useRef<{
		id: number;
		x: number;
		y: number;
		moved: boolean;
		scrolled: boolean;
	} | null>(null);
	const dismissOnClick = useRef(false);

	const rootPane = findPane(layout, ROOT_PANE);
	/** The Deck's Cards: the dealt Notes that are not open as a Sheet. */
	const deck = useMemo(() => {
		const open = new Set(
			panesOf(layout).flatMap((pane) => pane.sheets.map((c) => c.id)),
		);
		return dealt.filter((c) => !open.has(c.id));
	}, [dealt, layout]);
	const expanded = deck.find((c) => c.id === expandedId) ?? deck[0] ?? null;

	/* the held Note's offset drives the commit line */
	useEffect(() => {
		const d = drag;
		if (!d?.arm) return;
		const value = d.arm === "remove" ? d.h.x : d.h.y;
		const update = (v: number) => setPastCommit(v < -COMMIT);
		update(value.get());
		return value.on("change", update);
	}, [drag, COMMIT]);

	/* --- geometry: the Panes' boxes, kept fresh --- */

	useLayoutEffect(() => {
		const frame = root.current;
		if (!frame) return;
		const measure = () => {
			const frameBox = frame.getBoundingClientRect();
			const next: Record<string, Box> = {};
			for (const element of frame.querySelectorAll<HTMLElement>(
				"[data-deck-pane]",
			)) {
				const r = element.getBoundingClientRect();
				next[element.dataset.deckPane ?? ""] = {
					left: r.left - frameBox.left,
					top: r.top - frameBox.top,
					width: r.width,
					height: r.height,
				};
			}
			setRem(remPx());
			setPaneBoxes((current) => {
				const ids = Object.keys(next);
				const same =
					ids.length === Object.keys(current).length &&
					ids.every((id) => sameBox(current[id], next[id] as Box));
				return same ? current : next;
			});
		};
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(frame);
		for (const element of frame.querySelectorAll("[data-deck-pane]"))
			observer.observe(element);
		return () => observer.disconnect();
	}, [layout]);

	/* --- deck operations --- */

	function deal(word: string, element: HTMLElement) {
		if (!allows("deal")) return;
		setSelected(word);
		setExpandedId(null);
		const stageBox = element
			.closest("[data-deck-pane]")
			?.getBoundingClientRect();
		const box = element.getBoundingClientRect();
		if (stageBox) {
			setAnchorTop(box.bottom - stageBox.top + DEAL_GAP_PX);
			setAnchorLeft(box.left - stageBox.left);
		}
		log(
			`Select "${word}": ${deck.length ? `sweep ${deck.length.toString()}, ` : ""}deal 4`,
		);
		setDealt(deckFor(word).map((note) => ({ id: nextId.current++, note })));
	}
	function removeCard(card: DeckCard, reason: string) {
		log(`${reason}: ${card.note.kind} removed`);
		setDealt((d) => d.filter((c) => c.id !== card.id));
	}
	/** A Sheet is a form, not a move: the Card keeps its rank in `dealt`. */
	function openSheet(card: DeckCard, paneId: string, reason: string) {
		log(`${reason}: ${card.note.kind} opens as a Sheet in ${paneId}`);
		setLayout((node) =>
			updatePane(node, paneId, (pane) => ({
				...pane,
				sheets: [...pane.sheets, card],
			})),
		);
	}
	function splitPane(card: DeckCard, paneId: string, edge: Edge) {
		const id = `pane-${(nextPane.current++).toString()}`;
		log(`Drop at ${edge} edge: new pane ${id} with ${card.note.kind}`);
		setLayout((node) => {
			const pane = findPane(node, paneId);
			if (!pane) return node;
			const fresh: PaneNode = { kind: "Pane", id, sheets: [card] };
			const split: SplitNode = {
				kind: "Split",
				id: `split-${id}`,
				axis: edge === "bottom" ? "vertical" : "horizontal",
				children: edge === "left" ? [fresh, pane] : [pane, fresh],
			};
			return replacePane(node, paneId, split) ?? node;
		});
	}
	function collapseSheet(paneId: string, card: DeckCard, reason: string) {
		log(`${reason}: ${card.note.kind} collapses back onto the Deck`);
		setLayout((node) => {
			const pane = findPane(node, paneId);
			if (!pane) return node;
			const sheets = pane.sheets.filter((c) => c.id !== card.id);
			if (!sheets.length && paneId !== ROOT_PANE)
				return replacePane(node, paneId, null) ?? node;
			return replacePane(node, paneId, { ...pane, sheets }) ?? node;
		});
		/* back in its own slot: the Card never left `dealt` */
		setExpandedId(card.id);
	}
	function follow(paneId: string, link: NoteLink) {
		if (!allows("follow")) return;
		if (link.kind === "Text") {
			log(`Go to source "${link.word}": word reselected`);
			setSelected(link.word);
			return;
		}
		const card = { id: nextId.current++, note: noteById(link.noteId) };
		log(`Follow ${link.label}: Sheet on top in ${paneId}`);
		/* a followed Note was never dealt: it ranks after the deal, so a
		   collapse lands it at the bottom of the Deck */
		setDealt((d) => [...d, card]);
		setLayout((node) =>
			updatePane(node, paneId, (pane) => ({
				...pane,
				sheets: [...pane.sheets, card],
			})),
		);
	}
	function expand(card: DeckCard) {
		if (!allows("select")) return;
		log(`Tap folded: ${card.note.kind} expands`);
		setExpandedId(card.id);
	}
	function reset() {
		setSelected(null);
		setAnchorLeft(null);
		setDealt([]);
		setExpandedId(null);
		setLayout({ kind: "Pane", id: ROOT_PANE, sheets: [] });
		dragRef.current = null;
		setDrag(null);
		setDestination(null);
		clear();
	}

	/* --- drag: destination under the pointer --- */

	function destinationAt(px: number, py: number): Destination | null {
		if (!allows("drop")) return null;
		const frame = root.current;
		if (!frame) return null;
		const inside = (rect: DOMRect) =>
			px >= rect.left &&
			px <= rect.right &&
			py >= rect.top &&
			py <= rect.bottom;
		const slot = frame.querySelector<HTMLElement>("[data-return-zone]");
		if (slot && inside(slot.getBoundingClientRect()))
			return { kind: "return" };
		const gutter = frame.querySelector<HTMLElement>("[data-remove-zone]");
		if (gutter && inside(gutter.getBoundingClientRect()))
			return { kind: "remove" };
		for (const element of frame.querySelectorAll<HTMLElement>(
			"[data-deck-pane]",
		)) {
			const rect = element.getBoundingClientRect();
			if (!inside(rect)) continue;
			const paneId = element.dataset.deckPane ?? "";
			const distances = [
				{
					edge: "left" as const,
					value:
						(px - rect.left) /
						Math.min(EDGE_BAND, rect.width * 0.23),
				},
				{
					edge: "right" as const,
					value:
						(rect.right - px) /
						Math.min(EDGE_BAND, rect.width * 0.23),
				},
				{
					edge: "bottom" as const,
					value:
						(rect.bottom - py) /
						Math.min(EDGE_BAND, rect.height * 0.23),
				},
			].sort((a, b) => a.value - b.value);
			const closest = distances[0];
			return closest && closest.value < 1
				? { kind: "pane", paneId, edge: closest.edge }
				: { kind: "sheet", paneId };
		}
		return null;
	}
	function sameDestination(a: Destination | null, b: Destination | null) {
		return JSON.stringify(a) === JSON.stringify(b);
	}

	/* --- drag: pointer --- */

	function resetTransforms(h: NoteHandle) {
		h.x.jump(0);
		h.y.jump(0);
		h.rotate.jump(0);
		h.scale.jump(1);
		h.opacity.jump(1);
		h.lift.jump(0);
	}
	/**
	 * Forget a return in flight: its arrival watch and its animations.
	 * A Card picked up again mid-return is under the pointer from that
	 * frame on, and nothing that was taking it home may still be writing.
	 */
	function endReturn() {
		for (const stop of landWatch.current) stop();
		landWatch.current = [];
		for (const run of returnRun.current) run.stop();
		returnRun.current = [];
		landedRef.current = false;
		setLanded(false);
		setReturning(false);
	}
	function currentBox(h: NoteHandle): Box {
		return {
			left: h.left.get(),
			top: h.top.get(),
			width: h.width.get(),
			height: h.height.get(),
		};
	}
	/** A Card on the Deck goes under the pointer; nothing moves until it does. */
	function cardDown(event: ReactPointerEvent<HTMLElement>, card: DeckCard) {
		if (!allows("drag") && !allows("select")) return;
		if (
			event.button !== 0 ||
			dragRef.current ||
			(settlingRef.current && !landedRef.current)
		)
			return;
		const frame = root.current;
		const h = handles.current.get(card.id);
		if (!frame || !h) return;
		event.preventDefault();
		try {
			frame.setPointerCapture(event.pointerId);
		} catch {
			/* a pointer the browser is not tracking; the frame still hears it */
		}
		endReturn();
		resetTransforms(h);
		setPastCommit(false);
		const now = event.timeStamp;
		const d: Drag = {
			card,
			h,
			pointerId: event.pointerId,
			start: { x: event.clientX, y: event.clientY, t: now },
			origin: currentBox(h),
			arm: null,
			armedAt: 0,
			free: false,
			lifted: false,
			moved: false,
			overRemove: false,
			v: { vx: 0, vy: 0 },
			last: { x: event.clientX, y: event.clientY, t: now },
		};
		dragRef.current = d;
		setDrag(d);
		setDestination(null);
	}
	/** A Sheet collapses onto the Deck and shrinks into the hand, mid-drag. */
	function liftSheet(
		paneId: string,
		card: DeckCard,
		lift: Lift,
		reason: string,
	) {
		if (!allows("lift") || dragRef.current || settlingRef.current) return;
		endReturn();
		const frame = root.current;
		const h = handles.current.get(card.id);
		if (!frame || !h) return;
		try {
			frame.setPointerCapture(lift.pointerId);
		} catch {
			/* a pointer the browser is not tracking; the frame still hears it */
		}
		pagePointer.current = null;
		gestureCheckpoint.current = { dealt, layout, expandedId };
		collapseSheet(paneId, card, reason);
		const frameBox = frame.getBoundingClientRect();
		const width = cardWidthIn(
			paneBoxes[ROOT_PANE]?.width ?? frameBox.width,
			remPx(),
			OPEN_SCALE,
		);
		/* a Sheet is never in `deck`, so the Deck it lands on is one taller */
		const count = deck.length + 1;
		const height = cardHeightPx(count);
		resetTransforms(h);
		setPastCommit(false);
		const now = performance.now();
		const d: Drag = {
			card,
			h,
			pointerId: lift.pointerId,
			start: { x: lift.x, y: lift.y, t: now },
			origin: {
				left: Math.max(
					0,
					Math.min(
						frameBox.width - width,
						lift.x - frameBox.left - width / 2,
					),
				),
				top: lift.y - frameBox.top - 24,
				width,
				height,
			},
			arm: null,
			armedAt: 0,
			free: true,
			lifted: true,
			moved: true,
			overRemove: false,
			v: { vx: 0, vy: 0 },
			last: { x: lift.x, y: lift.y, t: now },
		};
		dragRef.current = d;
		setDrag(d);
		setDestination(destinationAt(lift.x, lift.y));
	}
	function noteDown(
		event: ReactPointerEvent<HTMLElement>,
		card: DeckCard,
		form: NoteForm,
		paneId: string | null,
	) {
		if (form === "card") {
			cardDown(event, card);
			return;
		}
		if (event.button !== 0 || paneId === null) return;
		event.preventDefault();
		liftSheet(
			paneId,
			card,
			{ pointerId: event.pointerId, x: event.clientX, y: event.clientY },
			"Drag heading",
		);
	}
	function release(d: Drag, reason: string) {
		d.arm = null;
		d.free = true;
		setPastCommit(false);
		settleTransform(d.h);
		log(`${reason}: plain drag`);
		setDrag({ ...d });
	}
	function frameMove(event: ReactPointerEvent<HTMLElement>) {
		if (!allows("drag")) return;
		const d = dragRef.current;
		if (!d || d.pointerId !== event.pointerId) return;
		const { h } = d;
		const dx = event.clientX - d.start.x;
		const dy = event.clientY - d.start.y;
		const dt = Math.max(1, event.timeStamp - d.last.t);
		const vx = (event.clientX - d.last.x) / dt;
		const vy = (event.clientY - d.last.y) / dt;
		d.v = { vx: d.v.vx * 0.6 + vx * 0.4, vy: d.v.vy * 0.6 + vy * 0.4 };
		d.last = { x: event.clientX, y: event.clientY, t: event.timeStamp };
		h.x.set(dx);
		h.y.set(dy);

		if (!d.arm && !d.free && Math.hypot(dx, dy) > ARM_SLOP) {
			d.moved = true;
			if (!reduce && SNAP_BACK === "setdown")
				animate(h.lift, 1, transition(LIFT));
			if (Math.abs(dx) > Math.abs(dy)) {
				if (dx < 0 && allows("remove")) {
					d.arm = "remove";
					d.armedAt = event.timeStamp;
					log("Drag ←: armed Remove");
					setDrag({ ...d });
				} else release(d, "Drag →");
			} else if (dy < 0 && allows("expand")) {
				d.arm = "expand";
				d.armedAt = event.timeStamp;
				log("Drag ↑: armed Open as sheet");
				setDrag({ ...d });
			} else release(d, "Drag ↓");
		}

		if (d.arm === "remove") {
			/* the lean and the swell are decoration on top of a gesture
			   that already reads in the border and the label */
			h.rotate.set(reduce ? 0 : leanFor(dx));
			if (event.timeStamp - d.armedAt > HOLD_RELEASE_MS)
				release(d, "Held a beat");
			else if (dx > 12) release(d, "Turned back");
		} else if (d.arm === "expand") {
			h.scale.set(reduce ? 1 : expandScaleFor(dy));
			if (event.timeStamp - d.armedAt > HOLD_RELEASE_MS)
				release(d, "Held a beat");
			else if (dy > 12) release(d, "Turned back");
		}

		const next = d.free
			? destinationAt(event.clientX, event.clientY)
			: null;
		/* over the remove zone the Card tilts as if swiped left */
		const overRemove = next?.kind === "remove";
		if (overRemove !== d.overRemove) {
			d.overRemove = overRemove;
			if (!reduce) animate(h.rotate, overRemove ? TILT_MAX : 0, SPRING);
		}
		setDestination((current) =>
			sameDestination(current, next) ? current : next,
		);
	}
	function settle(run: () => Promise<unknown>, then: () => void) {
		settlingRef.current = true;
		const timeout = new Promise((resolve) =>
			window.setTimeout(resolve, SETTLE_TIMEOUT_MS),
		);
		void Promise.race([run(), timeout]).then(() => {
			settlingRef.current = false;
			then();
			/* a Card picked up again while it was settling is in hand now,
			   and tearing the drag down under it would drop it */
			if (dragRef.current) return;
			landWatch.current = [];
			returnRun.current = [];
			landedRef.current = false;
			setLanded(false);
			setReturning(false);
			setDrag(null);
			setDestination(null);
			setPastCommit(false);
		});
	}
	/**
	 * Put the Card's decoration back where it rests. Reduced motion takes
	 * it there at once: the tilt and the swell say nothing the border and
	 * the label are not already saying.
	 */
	function settleTransform(h: NoteHandle) {
		if (reduce) {
			h.rotate.jump(0);
			h.scale.jump(1);
			return;
		}
		animate(h.rotate, 0, SPRING);
		animate(h.scale, 1, SPRING);
	}
	/**
	 * The Deck closes over the returning Card. Everything the models
	 * disagree about is when this runs.
	 */
	function rejoinStack() {
		for (const stop of landWatch.current) stop();
		landWatch.current = [];
		landedRef.current = true;
		setLanded(true);
	}
	/**
	 * Rejoin the stack once the drag offset is within `SNAP_LAND_PX` of
	 * nothing. That is the gesture unwinding, which for a Card is the
	 * whole of its journey home; a Sheet's box is still morphing to the
	 * slot beside it, and these models do not speak for that.
	 */
	function watchForLanding(h: NoteHandle) {
		const check = () => {
			if (Math.hypot(h.x.get(), h.y.get()) > SNAP_LAND_PX) return;
			rejoinStack();
		};
		landWatch.current = [h.x.on("change", check), h.y.on("change", check)];
		check();
	}
	/**
	 * The Card goes back to the slot it was picked up from. The travel is
	 * the same in every model bar `quick`; what differs is the frame the
	 * Deck closes over it — see `SNAP_BACK_MODELS`.
	 */
	function snapBack(h: NoteHandle) {
		setReturning(true);
		if (reduce) {
			for (const [value, rest] of [
				[h.x, 0],
				[h.y, 0],
				[h.rotate, 0],
				[h.scale, 1],
				[h.lift, 0],
			] as const)
				value.jump(rest);
			rejoinStack();
			settle(
				() => Promise.resolve(),
				() => {},
			);
			return;
		}
		if (SNAP_BACK === "under") rejoinStack();
		else if (SNAP_BACK !== "lifted") watchForLanding(h);
		const home = SNAP_BACK === "quick" ? transition(SNAP_RETURN) : SPRING;
		settle(
			() => {
				const run = [
					animate(h.x, 0, home),
					animate(h.y, 0, home),
					animate(h.rotate, 0, home),
					animate(h.scale, 1, home),
					/* the lift only ever left the ground in `setdown`;
					   in every other model this animates 0 to 0 */
					animate(h.lift, 0, SPRING),
				];
				returnRun.current = run;
				return Promise.all(run);
			},
			() => {},
		);
	}
	/**
	 * Reduced motion keeps the fade and drops the 720 px of travel: the
	 * Card still visibly leaves, it just does not fly across the page.
	 */
	function flyAway(d: Drag, reason: string) {
		const { h } = d;
		settle(
			() =>
				reduce
					? Promise.all([animate(h.opacity, 0, transition(FLY_FADE))])
					: Promise.all([
							animate(
								h.x,
								h.x.get() - FLY_DISTANCE,
								transition(FLY_TRAVEL),
							),
							animate(
								h.rotate,
								FLY_ROTATE_TO,
								transition(FLY_ROTATE),
							),
							animate(h.opacity, 0, transition(FLY_FADE)),
						]),
			() => removeCard(d.card, reason),
		);
	}
	/**
	 * The Note stays exactly where the hand left it and grows from there:
	 * its drag offset is folded into its box, and the state change gives it
	 * a new target box to animate to.
	 */
	function growFromHand(d: Drag, commit: () => void) {
		const { h } = d;
		/* jump, not set: a set would hand the spring the drag's velocity */
		h.left.jump(h.left.get() + h.x.get());
		h.top.jump(h.top.get() + h.y.get());
		h.x.jump(0);
		h.y.jump(0);
		if (reduce) {
			h.rotate.jump(0);
			h.scale.jump(1);
			h.lift.jump(0);
		} else {
			animate(h.rotate, 0, MORPH);
			animate(h.scale, 1, MORPH);
			animate(h.lift, 0, MORPH);
		}
		dragRef.current = null;
		setDrag(null);
		setDestination(null);
		setPastCommit(false);
		commit();
	}
	function frameUp(event: ReactPointerEvent<HTMLElement>) {
		const d = dragRef.current;
		if (!d || d.pointerId !== event.pointerId) return;
		dragRef.current = null;
		const { h } = d;
		const dx = h.x.get();
		const dy = h.y.get();
		const { vx, vy } =
			event.timeStamp - d.last.t > VELOCITY_STALE_MS
				? { vx: 0, vy: 0 }
				: d.v;
		const card = d.card;
		const travelled = Math.hypot(dx, dy);

		if (travelled < CLICK_SLOP + 2) {
			if (d.lifted) {
				log("Released in place: stays on the Deck");
				snapBack(h);
				return;
			}
			setDrag(null);
			if (expanded && card.id === expanded.id)
				log("Tap expanded: nothing; drag ↑ to open");
			else expand(card);
			return;
		}
		if (d.arm === "remove") {
			if (dx < -COMMIT || vx < -THROW) flyAway(d, "Remove ←");
			else snapBack(h);
			return;
		}
		if (d.arm === "expand") {
			if (dy < -COMMIT || vy < -THROW)
				growFromHand(d, () => openSheet(card, ROOT_PANE, "Open ↑"));
			else snapBack(h);
			return;
		}
		if (allows("remove") && vx < -THROW && Math.abs(vx) > Math.abs(vy)) {
			flyAway(d, "Throw ←");
			return;
		}
		if (allows("expand") && vy < -THROW) {
			const target = destinationAt(event.clientX, event.clientY);
			const paneId =
				target && "paneId" in target ? target.paneId : ROOT_PANE;
			growFromHand(d, () => openSheet(card, paneId, "Throw ↑"));
			return;
		}
		const target = destinationAt(event.clientX, event.clientY);
		if (!target || target.kind === "return") {
			snapBack(h);
			return;
		}
		if (target.kind === "remove") flyAway(d, "Drop on Remove");
		else if (target.kind === "sheet")
			growFromHand(d, () =>
				openSheet(card, target.paneId, "Drop in pane"),
			);
		else growFromHand(d, () => splitPane(card, target.paneId, target.edge));
	}
	function cancelDrag(event?: ReactPointerEvent<HTMLElement>) {
		const d = dragRef.current;
		if (!d || (event && event.pointerId !== d.pointerId)) return;
		dragRef.current = null;
		if (root.current?.hasPointerCapture(d.pointerId))
			root.current.releasePointerCapture(d.pointerId);
		log("Drag cancelled");
		const checkpoint = gestureCheckpoint.current;
		gestureCheckpoint.current = null;
		if (d.lifted && checkpoint) {
			resetTransforms(d.h);
			setDealt(checkpoint.dealt);
			setLayout(checkpoint.layout);
			setExpandedId(checkpoint.expandedId);
			setDrag(null);
			setDestination(null);
			setPastCommit(false);
		} else snapBack(d.h);
	}

	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			if (event.key !== "Escape") return;
			if (
				!root.current?.contains(document.activeElement) &&
				!dragRef.current
			)
				return;
			if (dragRef.current) {
				cancelDrag();
				return;
			}
			const top = rootPane?.sheets.at(-1);
			if (top && allows("collapse")) {
				collapseSheet(ROOT_PANE, top, "Esc");
				return;
			}
			if (expanded && allows("dismiss")) removeCard(expanded, "Esc");
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	});

	/* --- page click sweeps the Deck (ported from the main app) --- */

	function pageDown(event: ReactPointerEvent<HTMLElement>) {
		dismissOnClick.current = false;
		if (event.button !== 0) return;
		pagePointer.current = {
			id: event.pointerId,
			x: event.clientX,
			y: event.clientY,
			moved: false,
			scrolled: false,
		};
	}
	function pageMove(event: ReactPointerEvent<HTMLElement>) {
		const pointer = pagePointer.current;
		if (!pointer || pointer.id !== event.pointerId) return;
		pointer.moved ||=
			Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) >
			CLICK_SLOP;
	}
	function pageUp(event: ReactPointerEvent<HTMLElement>) {
		const pointer = pagePointer.current;
		if (!pointer || pointer.id !== event.pointerId) return;
		pageMove(event);
		dismissOnClick.current =
			!pointer.moved &&
			!pointer.scrolled &&
			window.getSelection()?.isCollapsed !== false;
		pagePointer.current = null;
		window.setTimeout(() => {
			dismissOnClick.current = false;
		}, 0);
	}
	function pageScroll() {
		if (pagePointer.current) pagePointer.current.scrolled = true;
	}
	function pageClick(event: ReactMouseEvent<HTMLElement>) {
		if (!allows("dismiss")) return;
		if (!dismissOnClick.current || !deck.length || rootPane?.sheets.length)
			return;
		if ((event.target as HTMLElement).closest(DISMISS_EXEMPT_SELECTOR))
			return;
		log(`Click page: sweep ${deck.length.toString()}`);
		setDealt([]);
		setExpandedId(null);
	}

	/* --- render --- */

	const dragging = drag !== null;
	const showZones = allows("drop") && dragging && drag.free;
	const armLabel =
		drag?.arm === "remove"
			? "Remove"
			: drag?.arm === "expand"
				? "Open as sheet"
				: null;

	/** The zones around the Deck's footprint: hit areas, and outlines on demand. */
	function renderZones() {
		const columnWidth = cardWidthIn(
			paneBoxes[ROOT_PANE]?.width ?? 0,
			rem,
			OPEN_SCALE,
		);
		return (
			<div
				data-deck-column=""
				className="pointer-events-none absolute"
				style={{
					top: anchorTop,
					left: deckLeftIn(
						paneBoxes[ROOT_PANE]?.width ?? 0,
						columnWidth,
						rem,
						anchorLeft,
					),
					width: columnWidth,
					height: PILE_HEIGHT,
				}}
			>
				{/* the remove zone: a strip just left of the Deck, same height */}
				{showZones ? (
					<div
						aria-hidden="true"
						data-remove-zone=""
						data-active={destination?.kind === "remove"}
						data-shown={zonesVisible}
						className="pointer-events-none absolute z-[35] grid data-[shown=false]:invisible place-items-center rounded-[1.1rem] border border-dashed border-destructive/50 bg-destructive/5 transition-colors data-[active=true]:border-destructive data-[active=true]:bg-destructive/15"
						style={{
							transitionDuration: `${ZONE_FEEDBACK_MS}ms`,
							insetInlineStart: `calc(-1 * ${PILE_PAD} - ${ZONE_GAP} - ${REMOVE_WIDTH})`,
							top: `calc(-1 * ${PILE_PAD})`,
							width: REMOVE_WIDTH,
							height: `calc(${PILE_HEIGHT} + 2 * ${PILE_PAD})`,
						}}
					>
						<span className="rotate-180 font-mono text-[0.62rem] font-bold tracking-[0.12em] text-destructive uppercase [writing-mode:vertical-rl]">
							Remove
						</span>
					</div>
				) : null}
				{/* the return zone: the whole Deck's footprint, above the pane wash */}
				{showZones ? (
					<div
						aria-hidden="true"
						data-return-zone=""
						data-active={destination?.kind === "return"}
						data-shown={zonesVisible}
						className="pointer-events-none absolute z-[35] flex data-[shown=false]:invisible items-end justify-center pb-3 rounded-[1.1rem] border border-dashed border-line-strong bg-paper/60 transition-colors data-[active=true]:border-link data-[active=true]:bg-link/15"
						style={{
							transitionDuration: `${ZONE_FEEDBACK_MS}ms`,
							insetInlineStart: `calc(-1 * ${PILE_PAD})`,
							top: `calc(-1 * ${PILE_PAD})`,
							width: `calc(100% + 2 * ${PILE_PAD})`,
							height: `calc(${PILE_HEIGHT} + 2 * ${PILE_PAD})`,
						}}
					>
						<span className="rounded-md bg-raised px-2 py-0.5 font-mono text-[0.62rem] font-bold tracking-[0.12em] text-link uppercase">
							Back on the Deck
						</span>
					</div>
				) : null}
			</div>
		);
	}

	function renderPane(pane: PaneNode): ReactNode {
		const isRoot = pane.id === ROOT_PANE;
		const top = pane.sheets.at(-1);
		const trail = [
			"Text",
			...pane.sheets.map((sheet) => sheetLabel(sheet)),
		];
		return (
			<section
				key={pane.id}
				data-deck-pane={pane.id}
				aria-label={isRoot ? "Text pane" : `Pane ${pane.id}`}
				className="relative h-full min-h-0 overflow-hidden bg-paper"
				onPointerDownCapture={isRoot ? pageDown : undefined}
				onPointerMoveCapture={isRoot ? pageMove : undefined}
				onPointerUpCapture={isRoot ? pageUp : undefined}
				onScrollCapture={isRoot ? pageScroll : undefined}
				onClickCapture={isRoot ? pageClick : undefined}
			>
				{isRoot ? (
					<>
						<div className="h-full overflow-auto">
							{showReader ? (
								<DummyReader
									selected={selected}
									onSelect={({ word, element }) =>
										deal(word, element)
									}
								/>
							) : null}
						</div>
						{renderZones()}
					</>
				) : null}
				{/* the Pane bar: Sheet chrome, owned by the Pane, arriving after the box */}
				<AnimatePresence>
					{top ? (
						<motion.div
							key="bar"
							data-pane-bar=""
							initial={{ opacity: 0 }}
							animate={{
								opacity: 1,
								transition: transition(BAR_ENTER),
							}}
							exit={{
								opacity: 0,
								transition: transition(BAR_EXIT),
							}}
							className="absolute inset-x-0 top-0 z-20 flex items-center gap-2 bg-paper ps-2 pe-3"
							style={{ height: `${BAR_REM.toString()}rem` }}
						>
							<button
								type="button"
								disabled={!allows("collapse")}
								aria-label="Collapse back to card"
								title="Collapse back to card"
								onClick={() => collapseSheet(pane.id, top, "←")}
								className="grid h-7 min-w-7 place-items-center rounded-md px-1.5 text-[0.9rem] text-link hover:bg-raised"
							>
								←
							</button>
							<nav
								aria-label="Trail"
								className="flex min-w-0 items-center gap-1 truncate font-mono text-[0.62rem] tracking-[0.08em] text-ink-muted uppercase"
							>
								{trail.map((crumb, index) => (
									<span
										key={`${index.toString()}-${crumb}`}
										className="contents"
									>
										{index > 0 ? (
											<span aria-hidden="true">›</span>
										) : null}
										<span
											className={
												index === trail.length - 1
													? "text-ink"
													: undefined
											}
										>
											{crumb}
										</span>
									</span>
								))}
							</nav>
						</motion.div>
					) : null}
				</AnimatePresence>
				{showZones ? (
					<DropZones
						paneId={pane.id}
						destination={destination}
						shown={zonesVisible}
					/>
				) : null}
			</section>
		);
	}

	function renderLayout(node: LayoutNode): ReactNode {
		if (node.kind === "Pane") return renderPane(node);
		const [a, b] = node.children;
		return (
			<ResizablePanelGroup key={node.id} orientation={node.axis}>
				<ResizablePanel id={a.id} minSize={240}>
					{renderLayout(a)}
				</ResizablePanel>
				<ResizableHandle aria-label="Resize panes" />
				<ResizablePanel id={b.id} minSize={240}>
					{renderLayout(b)}
				</ResizablePanel>
			</ResizablePanelGroup>
		);
	}

	/**
	 * Every Note, in whatever form it is in right now, with the box it
	 * should occupy. The Deck's Cards sit in slots one Heading row apart;
	 * Sheets fill their Pane's Sheet box; the held one keeps its hand box.
	 */
	function renderNotes(): ReactNode {
		const rootBox = paneBoxes[ROOT_PANE];
		if (!rootBox) return null;
		const count = deck.length;
		const cardWidth = cardWidthIn(rootBox.width, rem, OPEN_SCALE);
		const headerPx = HEADER_REM * rem;
		const slotHeight = cardHeightPx(count);
		const order = [...deck].reverse();
		const open = expanded ? order.indexOf(expanded) : count - 1;
		const notes: ReactNode[] = [];

		order.forEach((card, index) => {
			const place: Place =
				index < open ? "above" : index > open ? "below" : "open";
			const held = drag?.moved === true && drag.card.id === card.id;
			const slot: Box = {
				left:
					rootBox.left +
					deckLeftIn(rootBox.width, cardWidth, rem, anchorLeft),
				top: rootBox.top + anchorTop + index * headerPx,
				width: cardWidth,
				height: slotHeight,
			};
			/* z rises toward the expanded Card from both sides; a Held
			   Card is over all of them until it has landed */
			const z =
				held && !landed
					? 40
					: 10 +
						(place === "open"
							? 9
							: place === "above"
								? index
								: count - 1 - index);
			notes.push(
				<NoteView
					key={card.id}
					card={card}
					form="card"
					place={place}
					box={held && drag && !returning ? drag.origin : slot}
					z={z}
					held={held}
					arm={held ? (drag?.arm ?? null) : null}
					free={held ? (drag?.free ?? false) : false}
					pastCommit={held && pastCommit}
					armLabel={held ? armLabel : null}
					paneId={null}
					register={(id, handle) => {
						if (handle) handles.current.set(id, handle);
						else handles.current.delete(id);
					}}
					onDown={(event) => noteDown(event, card, "card", null)}
					onHoldLift={() => {}}
					onFollow={(link) => follow(ROOT_PANE, link)}
				/>,
			);
		});

		for (const pane of panesOf(layout)) {
			const paneBox = paneBoxes[pane.id];
			if (!paneBox) continue;
			const box = sheetBoxIn(paneBox, rem);
			pane.sheets.forEach((card, index) => {
				const isTop = index === pane.sheets.length - 1;
				notes.push(
					<NoteView
						key={card.id}
						card={card}
						form="sheet"
						place="open"
						box={box}
						z={30 + index}
						held={false}
						arm={null}
						free={false}
						pastCommit={false}
						armLabel={null}
						paneId={pane.id}
						covered={!isTop}
						register={(id, handle) => {
							if (handle) handles.current.set(id, handle);
							else handles.current.delete(id);
						}}
						onDown={(event) =>
							noteDown(event, card, "sheet", pane.id)
						}
						onHoldLift={(lift) =>
							liftSheet(pane.id, card, lift, "Hold margin")
						}
						onFollow={(link) => follow(pane.id, link)}
					/>,
				);
			});
		}
		return notes;
	}

	const frame = (
		<div
			ref={root}
			data-deck-frame=""
			tabIndex={-1}
			onPointerDownCapture={() =>
				root.current?.focus({ preventScroll: true })
			}
			className="relative h-full min-h-0 overflow-hidden"
			onPointerMove={frameMove}
			onPointerUp={frameUp}
			onPointerCancel={cancelDrag}
		>
			{renderLayout(layout)}
			{/* every Note, in every form, placed over the Panes.
				    No AnimatePresence: nothing here has an exit to play, and
				    holding a swept Note for the frame it takes to find that
				    out leaves the old deck standing over the new one. */}
			<div
				data-deck-notes=""
				className="pointer-events-none absolute inset-0"
			>
				{renderNotes()}
			</div>
		</div>
	);
	if (embedded) return frame;
	return (
		<ModelShell
			rules={RULES}
			entries={entries}
			onReset={reset}
			toolbar={
				<label className="flex cursor-pointer items-center justify-between gap-3 text-[0.8rem] text-ink select-none">
					<span>Show drop zones</span>
					<input
						type="checkbox"
						checked={zonesVisible}
						onChange={(event) =>
							setZonesVisible(event.target.checked)
						}
						className="accent-link"
					/>
				</label>
			}
		>
			{frame}
		</ModelShell>
	);
}

/* ----------------------------------------------------------------- note */

/**
 * One Note, in one of its forms. Its box is four motion values that
 * animate to whatever target the model hands it; the drag transforms sit
 * on top of the box, so a release can fold them in and grow from there.
 * The Blocks inside read `form` and `place` and adapt.
 */
function NoteView({
	card,
	form,
	place,
	box,
	z,
	held,
	arm,
	free,
	pastCommit,
	armLabel,
	paneId,
	covered = false,
	register,
	onDown,
	onHoldLift,
	onFollow,
}: {
	card: DeckCard;
	form: NoteForm;
	place: Place;
	box: Box;
	z: number;
	held: boolean;
	arm: Arm | null;
	free: boolean;
	pastCommit: boolean;
	armLabel: string | null;
	paneId: string | null;
	/** A Sheet under another Sheet in the same Pane. */
	covered?: boolean;
	register: (id: number, handle: NoteHandle | null) => void;
	onDown: (event: ReactPointerEvent<HTMLElement>) => void;
	onHoldLift: (lift: Lift) => void;
	onFollow: (link: NoteLink) => void;
}) {
	const {
		transition,
		MORPH,
		OPEN_SCALE,
		HOLD_SCALE,
		HOLD_SHRINK,
		HOLD_RELEASE,
		LONG_PRESS_MS,
		CLICK_SLOP,
		HEADING_EDGE,
		NOTE_BORDER,
		CLIP_FADE,
		ARM_LABEL,
		ARM_LABEL_FROM,
		ARM_LABEL_ARMED,
		ARM_LABEL_COMMITTED,
	} = useDeckMotion();
	const allows = useDeckInteractions();
	const reduce = useDeckReducedMotion();
	const left = useMotionValue(box.left);
	const top = useMotionValue(box.top);
	const width = useMotionValue(box.width);
	const height = useMotionValue(box.height);
	const x = useMotionValue(0);
	const y = useMotionValue(0);
	const rotate = useMotionValue(0);
	const scale = useMotionValue(1);
	/* A dealt Note is simply there: opaque on its first frame, never faded. */
	const opacity = useMotionValue(1);
	const lift = useMotionValue(0);
	const handle = useRef<NoteHandle>({
		left,
		top,
		width,
		height,
		x,
		y,
		rotate,
		scale,
		opacity,
		lift,
	});
	/**
	 * The open Card rests larger than the ones behind it (`OPEN_SCALE`). It
	 * is a state, not a move: which Card is in front changes at once, with
	 * no pulse. `scale` stays the raw value the drag and the hold animate,
	 * and the two are multiplied on the way to the DOM.
	 */
	const restScale = form === "card" && place === "open" ? OPEN_SCALE : 1;
	/**
	 * Three scales, multiplied on the way to the DOM: the Card's resting
	 * one, whatever the drag and the hold are animating, and the `setdown`
	 * model's lift off the Deck. The lift is a shadow as well; at 0 that
	 * shadow is `none`, so a Card that never leaves the Deck hands the
	 * compositor nothing to paint.
	 */
	const shownScale = useTransform(
		() => scale.get() * restScale * (1 + lift.get() * LIFT_SCALE),
	);
	const shownShadow = useTransform(() => liftShadow(lift.get()));
	/**
	 * The box's origin travels as a transform, not as `left`/`top`.
	 *
	 * `left` and `top` are still the spring's values and still mean "where
	 * the model put this Note" — `growFromHand` folds the drag into them,
	 * and nothing about that changes. What changes is how they reach the
	 * DOM: as part of the transform, which composites, rather than as box
	 * offsets, which lay out. Two of the four properties on MORPH leave the
	 * layout path this way; `width` and `height` have to stay, because a
	 * Note genuinely reflows its text between a Card and a Sheet.
	 *
	 * The drag offset rides along here rather than in its own `x`/`y`: one
	 * translate, composed from both, so the two cannot fight over it. The
	 * order the browser applies the transform in leaves `rotate` and
	 * `scale` turning about the element's own `transform-origin` exactly as
	 * they did when the box was positioned, so the hold's pressed-corner
	 * origin is unaffected.
	 */
	const shownX = useTransform(() => left.get() + x.get());
	const shownY = useTransform(() => top.get() + y.get());
	const [holding, setHolding] = useState(false);
	const [origin, setOrigin] = useState("50% 50%");
	const section = useRef<HTMLElement>(null);
	const hold = useRef<{ timer: number; pointer: Lift } | null>(null);
	useEffect(
		() => () => {
			if (hold.current) window.clearTimeout(hold.current.timer);
		},
		[],
	);

	useEffect(() => {
		register(card.id, handle.current);
		return () => {
			register(card.id, null);
		};
		/* register is a fresh closure every render; the handle is not */
	}, [card.id]);

	/* the box: animate to wherever the model puts the Note now */
	useEffect(() => {
		if (reduce) {
			left.jump(box.left);
			top.jump(box.top);
			width.jump(box.width);
			height.jump(box.height);
			return;
		}
		const controls = [
			animate(left, box.left, MORPH),
			animate(top, box.top, MORPH),
			animate(width, box.width, MORPH),
			animate(height, box.height, MORPH),
		];
		return () => {
			for (const control of controls) control.stop();
		};
	}, [
		box.left,
		box.top,
		box.width,
		box.height,
		left,
		top,
		width,
		height,
		reduce,
		MORPH,
	]);

	/* the hold on a Sheet margin: shrink toward the finger, then lift.
	   Reduced motion keeps the hold — the border still turns — without the
	   shrink, which is the only part of it that moves. */
	useEffect(() => {
		if (held) return;
		if (reduce) {
			scale.jump(1);
			return;
		}
		const controls = animate(
			scale,
			holding ? HOLD_SCALE : 1,
			transition(holding ? HOLD_SHRINK : HOLD_RELEASE),
		);
		return () => controls.stop();
	}, [
		holding,
		held,
		scale,
		reduce,
		HOLD_SCALE,
		HOLD_SHRINK,
		HOLD_RELEASE,
		transition,
	]);

	function marginDown(event: ReactPointerEvent<HTMLElement>) {
		if (event.button !== 0 || hold.current) return;
		event.preventDefault();
		event.stopPropagation();
		const pointer = {
			pointerId: event.pointerId,
			x: event.clientX,
			y: event.clientY,
		};
		const rect = section.current?.getBoundingClientRect();
		if (rect)
			setOrigin(
				`${(((pointer.x - rect.left) / rect.width) * 100).toFixed(1)}% ${(((pointer.y - rect.top) / rect.height) * 100).toFixed(1)}%`,
			);
		setHolding(true);
		hold.current = {
			pointer,
			timer: window.setTimeout(() => {
				const current = hold.current;
				hold.current = null;
				setHolding(false);
				setOrigin("50% 50%");
				if (current) onHoldLift(current.pointer);
			}, LONG_PRESS_MS),
		};
	}
	function marginMove(event: ReactPointerEvent<HTMLElement>) {
		const current = hold.current;
		if (!current || current.pointer.pointerId !== event.pointerId) return;
		if (
			Math.hypot(
				event.clientX - current.pointer.x,
				event.clientY - current.pointer.y,
			) > CLICK_SLOP
		)
			stopHold();
	}
	function stopHold() {
		if (hold.current) window.clearTimeout(hold.current.timer);
		hold.current = null;
		setHolding(false);
		setOrigin("50% 50%");
	}
	useEffect(() => stopHold, []);

	function down(event: ReactPointerEvent<HTMLElement>) {
		const target = event.target as HTMLElement;
		if (target.closest("button")) return;
		/* a Sheet is lifted by its Heading only; its body scrolls */
		if (form === "sheet" && !target.closest("[data-heading]")) return;
		if (covered) return;
		onDown(event);
	}

	const sheet = form === "sheet";
	const below = place === "below" && !sheet;
	/**
	 * Which transition the Heading and the Blocks ride when they swap ends.
	 *
	 * A change of form is a morph: the Heading's height springs on `MORPH`
	 * at the same moment, so its position has to travel with it or the two
	 * come apart. A deck tap changes only which edge the Heading sits at —
	 * no height moves at all. The baseline changes edges immediately; a
	 * headingEdgeMs override enables a sliding alternative.
	 */
	const previousForm = useRef(form);
	const morphing = previousForm.current !== form;
	useEffect(() => {
		previousForm.current = form;
	}, [form]);
	const positionSpec = morphing ? MORPH : transition(HEADING_EDGE);
	/* Measure local flex positions explicitly: ancestor motion transforms can
	   prevent layout projection from detecting an edge swap. */
	const headingOffset = useMotionValue(0);
	const bodyOffset = useMotionValue(0);
	const previousPositions = useRef<{
		form: NoteForm;
		below: boolean;
		heading: number;
		body: number;
	} | null>(null);
	useLayoutEffect(() => {
		const heading =
			section.current?.querySelector<HTMLElement>("[data-heading]");
		const body =
			section.current?.querySelector<HTMLElement>("[data-scroller]");
		if (!heading || !body) return;
		const previous = previousPositions.current;
		previousPositions.current = {
			form,
			below,
			heading: heading.offsetTop,
			body: body.offsetTop,
		};
		if (
			previous?.form === form &&
			previous.below !== below &&
			!held &&
			!reduce &&
			HEADING_EDGE.ms > 0
		) {
			headingOffset.set(
				headingOffset.get() + previous.heading - heading.offsetTop,
			);
			bodyOffset.set(bodyOffset.get() + previous.body - body.offsetTop);
			const controls = [
				animate(headingOffset, 0, transition(HEADING_EDGE)),
				animate(bodyOffset, 0, transition(HEADING_EDGE)),
			];
			return () => {
				for (const control of controls) control.stop();
			};
		}
		headingOffset.jump(0);
		bodyOffset.jump(0);
	}, [
		below,
		form,
		held,
		reduce,
		HEADING_EDGE,
		transition,
		headingOffset,
		bodyOffset,
	]);
	const borderColor =
		arm === "remove"
			? "var(--destructive)"
			: arm === "expand" || free || holding
				? "var(--link)"
				: "var(--line-strong)";

	return (
		<motion.article
			ref={section}
			aria-label={`${card.note.kind} ${sheet ? "sheet" : "card"}`}
			data-card-id={card.id}
			data-form={form}
			data-place={sheet ? undefined : place}
			data-held={held || undefined}
			data-arm={arm ?? undefined}
			data-past={pastCommit}
			data-holding={holding}
			data-pane={paneId ?? undefined}
			/* The border is the arm state. A Note is dealt wearing its
			   resting colour; only arming changes it. */
			initial={false}
			animate={{ borderColor }}
			transition={transition(NOTE_BORDER)}
			style={{
				/* the origin is the transform's; see `shownX` above */
				left: 0,
				top: 0,
				width,
				height,
				x: shownX,
				y: shownY,
				rotate,
				scale: shownScale,
				opacity,
				boxShadow: shownShadow,
				zIndex: z,
				/**
				 * One origin for the Card's whole life. It used to move to
				 * the bottom edge while the Card was held, so the remove
				 * tilt would pivot there — but the open Card rests at
				 * `OPEN_SCALE`, and scaling about the bottom rather than
				 * the centre draws it `(OPEN_SCALE - 1) × height / 2`
				 * higher: 9 px of hover that lasted from the grab until
				 * the drag state tore down, and dropped away a fifth of a
				 * second after the Card was home. The tilt pivots about
				 * the centre now, which is where a Card under a finger
				 * turns anyway.
				 */
				transformOrigin: origin,
			}}
			onPointerDown={down}
			/* `contain` stops the width/height spring's recalc at this Note
			   rather than letting it walk the deck */
			className={`pointer-events-auto absolute flex flex-col overflow-hidden rounded-[0.9rem] border bg-paper [contain:layout_paint] select-none ${sheet ? "" : "cursor-grab touch-none active:cursor-grabbing"}`}
		>
			{/* the content column: one width in every form, centred in a wide box */}
			<div
				className="mx-auto flex min-h-0 w-full flex-1 flex-col"
				style={{ maxWidth: CARD_WIDTH }}
			>
				<HeadingBlock
					note={card.note}
					form={form}
					atBottom={below}
					layout={!held && morphing}
					offset={headingOffset}
					positionSpec={positionSpec}
				/>
				{/* the Blocks travel with the Heading: the row it vacates is
				    the row they take, so bridging one without the other
				    trades a jump for a slide against a jump */}
				<motion.div
					data-scroller=""
					layout={!held && morphing ? "position" : false}
					style={{ y: bodyOffset }}
					layoutDependency={`${form}:${below.toString()}`}
					transition={{ layout: positionSpec }}
					className={`relative order-1 min-h-0 flex-1 ${sheet ? "overflow-y-auto" : "overflow-hidden"}`}
				>
					<div
						className={`flex flex-col gap-3 px-4 ${below ? "pt-3" : "pb-4"}`}
					>
						<ContextsBlock note={card.note} form={form} />
						<BodyBlock note={card.note} />
						<LinksBlock note={card.note} onFollow={onFollow} />
					</div>
					{/* the Card's clip fades its content out; the Sheet lifts the fade */}
					<motion.div
						aria-hidden="true"
						initial={false}
						animate={{ opacity: sheet || below ? 0 : 1 }}
						transition={transition(CLIP_FADE)}
						className="pointer-events-none sticky bottom-0 -mt-8 h-8 bg-gradient-to-t from-paper to-transparent"
					/>
				</motion.div>
			</div>
			{/* a Sheet's own margins: hold one to lift the Sheet as a Card */}
			{sheet && !covered && allows("lift")
				? MARGINS.map((margin) => (
						<div
							key={margin}
							aria-hidden="true"
							data-sheet-margin={margin}
							onPointerDown={marginDown}
							onPointerMove={marginMove}
							onPointerUp={stopHold}
							onPointerCancel={stopHold}
							onPointerLeave={stopHold}
							className={`absolute z-10 touch-none select-none ${MARGIN_CLASS[margin]}`}
						/>
					))
				: null}
			<AnimatePresence>
				{armLabel ? (
					<motion.div
						key={armLabel}
						initial={ARM_LABEL_FROM}
						animate={
							pastCommit ? ARM_LABEL_COMMITTED : ARM_LABEL_ARMED
						}
						exit={ARM_LABEL_FROM}
						transition={transition(ARM_LABEL)}
						className={`absolute top-3 z-10 rounded-md border px-2 py-0.5 font-mono text-[0.62rem] font-bold tracking-[0.12em] uppercase ${arm === "remove" ? "right-3 border-destructive bg-paper text-destructive" : "left-3 border-link bg-paper text-link"}`}
					>
						{armLabel}
					</motion.div>
				) : null}
			</AnimatePresence>
		</motion.article>
	);
}

const MARGINS = ["left", "right", "bottom"] as const;
const MARGIN_CLASS: Record<(typeof MARGINS)[number], string> = {
	left: "inset-y-0 left-0 w-6",
	right: "inset-y-0 right-0 w-6",
	bottom: "inset-x-0 bottom-0 h-5",
};

/* --------------------------------------------------------------- blocks */

/**
 * The Heading: pinned first, the lift handle in every form. In Card form
 * it is the one-line row (form, then gloss); in Sheet form the title grows
 * and the kind label shows above it. When the Card is a Card Tail the row
 * sits at the bottom edge. The baseline puts it there immediately;
 * the injected heading-edge transition can make it slide.
 */
function HeadingBlock({
	note,
	form,
	atBottom,
	layout,
	offset,
	positionSpec,
}: {
	note: DummyNote;
	form: NoteForm;
	atBottom: boolean;
	layout: boolean;
	offset: MotionValue<number>;
	/** What the row's position rides; see `positionSpec` in `NoteView`. */
	positionSpec: ReturnType<typeof motionOf>;
}) {
	const { transition, MORPH, KIND_LABEL, KIND_LABEL_Y } = useDeckMotion();
	const sheet = form === "sheet";
	const rem = remPx();
	return (
		<motion.div
			data-heading=""
			/*
			 * `initial={false}` is the whole of it: without it Motion has no
			 * first value for a height it was never given in CSS, so on mount
			 * it measures the row it just rendered — the title's own line box —
			 * and springs from there to `HEADER_REM`, carrying the Blocks below
			 * down with it. A Card is dealt at its size; only a change of form
			 * is a move.
			 */
			initial={false}
			layout={layout ? "position" : false}
			/* Form changes use layout projection; edge variants use the local offset. */
			layoutDependency={`${form}:${atBottom.toString()}`}
			transition={{ ...MORPH, layout: positionSpec }}
			animate={{ height: (sheet ? SHEET_HEADER_REM : HEADER_REM) * rem }}
			style={{ order: atBottom ? 2 : 0, y: offset }}
			className={`relative flex w-full shrink-0 items-end gap-4 px-4 ${sheet ? "cursor-grab touch-none active:cursor-grabbing" : ""} ${atBottom ? "" : "pb-2"}`}
		>
			<motion.span
				/* Card form hides it. Without this the label is painted
				   first and then fades out, so a dealt Card flashes its
				   kind and slides it away. Same mount rule as the row. */
				initial={false}
				animate={{
					opacity: sheet ? 1 : 0,
					y: sheet ? 0 : KIND_LABEL_Y,
				}}
				transition={transition(KIND_LABEL)}
				className="pointer-events-none absolute top-3 left-4 font-mono text-[0.62rem] font-bold tracking-[0.12em] text-ink-muted uppercase"
			>
				{note.kind}
			</motion.span>
			<motion.span
				initial={false}
				animate={{ fontSize: (sheet ? 1.5 : 1) * rem }}
				transition={MORPH}
				className={`min-w-0 flex-1 truncate font-serif leading-tight text-ink ${atBottom ? "pb-3" : ""}`}
			>
				{note.tail.form}
			</motion.span>
			<span
				className={`shrink-0 pb-[0.15rem] text-[0.72rem] text-ink-muted ${atBottom ? "pb-3" : ""}`}
			>
				{note.tail.gloss}
			</span>
		</motion.div>
	);
}

/**
 * Source Contexts: pinned, part of the Anchor. A Card shows the two most
 * recent; a Sheet shows a page and can load more.
 */
function ContextsBlock({ note, form }: { note: DummyNote; form: NoteForm }) {
	const allows = useDeckInteractions();
	const { transition, CONTEXT_ITEM, contextDelayFor } = useDeckMotion();
	const sheet = form === "sheet";
	const [shown, setShown] = useState(CONTEXT_PAGE);
	useEffect(() => {
		if (!sheet) setShown(CONTEXT_PAGE);
	}, [sheet]);
	const visible = note.contexts.slice(0, sheet ? shown : CARD_CONTEXTS);
	const more = note.contexts.length - visible.length;
	const word = cleanWord(note.word);
	/**
	 * Where the arriving group starts, so the stagger counts from the first
	 * item that is actually new rather than from the top of the list.
	 *
	 * Counting from the absolute index would put the whole second page at
	 * the cap — five items, all 200 ms late, all together, which is the
	 * flat arrival this is here to break up.
	 */
	const settled = useRef(visible.length);
	const arrivingFrom = settled.current;
	useEffect(() => {
		settled.current = visible.length;
	}, [visible.length]);
	return (
		<div data-block="contexts" className="flex flex-col gap-1">
			<div className="flex items-baseline justify-between font-mono text-[0.58rem] font-bold tracking-[0.12em] text-ink-muted uppercase">
				<span>Source contexts</span>
				<span>{note.contexts.length.toString()}</span>
			</div>
			<ul className="flex flex-col gap-0.5 text-[0.8rem] leading-relaxed text-ink-soft">
				<AnimatePresence initial={false}>
					{visible.map((line, index) => (
						<motion.li
							key={line}
							initial={{ opacity: 0, height: 0 }}
							/* the stagger is on the way in only: a group
							   arrives one after another, and leaves at once */
							animate={{
								opacity: 1,
								height: "auto",
								transition: transition(
									after(
										CONTEXT_ITEM,
										contextDelayFor(index - arrivingFrom),
									),
								),
							}}
							exit={{
								opacity: 0,
								height: 0,
								transition: transition(CONTEXT_ITEM),
							}}
							className="overflow-hidden"
						>
							{highlight(line, word)}
						</motion.li>
					))}
				</AnimatePresence>
			</ul>
			{sheet && more > 0 ? (
				<button
					type="button"
					onClick={(event) => {
						event.stopPropagation();
						if (allows("contexts"))
							setShown((n) => n + CONTEXT_PAGE);
					}}
					disabled={!allows("contexts")}
					className="self-start text-[0.72rem] text-link underline-offset-2 hover:underline"
				>
					{`Load ${Math.min(more, CONTEXT_PAGE).toString()} more`}
				</button>
			) : null}
		</div>
	);
}

/** Marks the word inside a context sentence. */
function highlight(line: string, word: string): ReactNode {
	const index = line.toLowerCase().indexOf(word.toLowerCase());
	if (index < 0) return line;
	return (
		<>
			{line.slice(0, index)}
			<span className="text-ink">
				{line.slice(index, index + word.length)}
			</span>
			{line.slice(index + word.length)}
		</>
	);
}

/** The Note's lines. The same in every form; a Card only clips them. */
function BodyBlock({ note }: { note: DummyNote }) {
	return (
		<div
			data-block="body"
			className="space-y-1.5 text-[0.85rem] leading-relaxed text-ink-soft"
		>
			{note.lines.map((line, index) => (
				<p key={`${index.toString()}-${line}`}>{line}</p>
			))}
		</div>
	);
}

/** Onward links. The same in every form. */
function LinksBlock({
	note,
	onFollow,
}: {
	note: DummyNote;
	onFollow: (link: NoteLink) => void;
}) {
	const allows = useDeckInteractions();
	return (
		<ul
			data-block="links"
			className="flex flex-wrap gap-x-4 gap-y-1 text-[0.85rem]"
		>
			{note.links.map((link) => (
				<li key={link.label}>
					<button
						type="button"
						disabled={!allows("follow")}
						onPointerDown={(event) => event.stopPropagation()}
						onClick={(event) => {
							event.stopPropagation();
							onFollow(link);
						}}
						className="text-link decoration-link-shadow decoration-[1.5px] underline-offset-[0.2em] hover:underline"
					>
						{link.kind === "Text"
							? `↩ ${link.label} (${cleanWord(link.word)})`
							: link.label}
					</button>
				</li>
			))}
		</ul>
	);
}

/* -------------------------------------------------------------- zones */

function DropZones({
	paneId,
	destination,
	shown,
}: {
	paneId: string;
	destination: Destination | null;
	/** Hidden zones still light the pane; only the outlines are hidden. */
	shown: boolean;
}) {
	const { EDGE_BAND, ZONE_FEEDBACK_MS } = useDeckMotion();
	const here =
		destination && "paneId" in destination && destination.paneId === paneId
			? destination
			: null;
	const edges: readonly Edge[] = ["left", "right", "bottom"];
	return (
		<>
			{edges.map((edge) => (
				<div
					key={edge}
					aria-hidden="true"
					data-edge={edge}
					data-active={here?.kind === "pane" && here.edge === edge}
					data-shown={shown}
					className="pointer-events-none absolute z-30 grid place-items-center border border-dashed border-link/40 bg-link/5 transition-colors data-[shown=false]:invisible data-[active=true]:border-link data-[active=true]:bg-link/15 data-[edge=bottom]:inset-x-0 data-[edge=bottom]:bottom-0 data-[edge=left]:inset-y-0 data-[edge=left]:left-0 data-[edge=right]:inset-y-0 data-[edge=right]:right-0"
					style={{
						transitionDuration: `${ZONE_FEEDBACK_MS}ms`,
						...(edge === "bottom"
							? { height: `min(${EDGE_BAND.toString()}px, 23%)` }
							: { width: `min(${EDGE_BAND.toString()}px, 23%)` }),
					}}
				>
					{here?.kind === "pane" && here.edge === edge ? (
						<span className="rounded-md bg-raised px-2 py-0.5 font-mono text-[0.62rem] font-bold tracking-[0.12em] text-link uppercase">
							New pane
						</span>
					) : null}
				</div>
			))}
			{here?.kind === "sheet" ? (
				<div
					aria-hidden="true"
					data-shown={shown}
					className="pointer-events-none absolute inset-0 z-30 grid place-items-center bg-link/5 data-[shown=false]:invisible"
				>
					<span className="rounded-md bg-raised px-2 py-0.5 font-mono text-[0.62rem] font-bold tracking-[0.12em] text-link uppercase">
						Open as sheet
					</span>
				</div>
			) : null}
		</>
	);
}
