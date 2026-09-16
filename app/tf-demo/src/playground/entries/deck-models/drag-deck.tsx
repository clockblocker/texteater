import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "lego";
import {
	AnimatePresence,
	animate,
	motion,
	useMotionValue,
	useMotionValueEvent,
} from "motion/react";
import {
	type CSSProperties,
	type MouseEvent as ReactMouseEvent,
	type ReactNode,
	type PointerEvent as ReactPointerEvent,
	useEffect,
	useRef,
	useState,
} from "react";

import { type DummyNote, deckFor, type NoteLink, noteById } from "./dummy";
import { DummyReader, ModelShell, NoteBody, useEventLog } from "./shared";

/**
 * COMPASS — the drag deck.
 *
 * The pile is one column: every Card shows its header row, and the
 * expanded Card takes the rest of the height. The written form sits on top,
 * the meaning at the bottom, and the meaning opens by default. Every Card
 * is draggable on its own; a tap on a folded Card expands it, and a tap on
 * the expanded Card does nothing: only the "up" gestures open a Sheet.
 * The first direction of a drag names its intent: left arms "Remove" (the
 * Card tilts), up arms "Open as sheet". Hold an armed Card longer than a
 * beat and the arm relaxes into a plain drag.
 *
 * A plain drag drops inside a pane to open the Card as a Sheet there, on a
 * pane edge to split a new pane (after the production Workspace), on the
 * strip left of the pile to remove, or back on the pile. A fast throw left or up
 * still removes or opens without a zone. A Sheet lifts back into a dragged
 * Card straight from its header, or after holding one of its margins: the
 * Sheet shrinks a touch and its border turns blue while the hold runs.
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
type Drag = {
	readonly card: DeckCard;
	readonly pointerId: number;
	readonly start: { x: number; y: number; t: number };
	readonly origin: Box;
	arm: Arm | null;
	armedAt: number;
	free: boolean;
	/** Lifted out of a Sheet: a release in place leaves it on the pile. */
	lifted: boolean;
	/** The pointer is over the remove zone; the Card is tilted. */
	overRemove: boolean;
	v: { vx: number; vy: number };
	last: { x: number; y: number; t: number };
};

const ROOT_PANE = "text";
const CARD_WIDTH = "26rem";
/** The whole column: the expanded Card plus one header row per folded Card. */
const PILE_HEIGHT_REM = 30;
const HEADER_REM = 2.75;
const PILE_HEIGHT = `${PILE_HEIGHT_REM.toString()}rem`;
const HEADER_HEIGHT = `${HEADER_REM.toString()}rem`;
/** The brief lift a Card gets when it is pulled to the front. */
const LIFT_MS = 220;
/** How far the return zone reaches past the pile's cards. */
const PILE_PAD = "0.75rem";
/** Travel before a gesture has a direction at all. */
const ARM_SLOP = 8;
/** Travel past which an armed gesture commits on release. */
const COMMIT = 88;
/** Velocity, in px/ms, that counts as a throw. */
const THROW = 1;
/** A pointer that rests this long before release has no velocity left. */
const VELOCITY_STALE_MS = 100;
/** An armed Card that is held this long relaxes into a plain drag. */
const HOLD_RELEASE_MS = 650;
const LONG_PRESS_MS = 500;
/** A settling animation that has not finished by then is treated as done. */
const SETTLE_TIMEOUT_MS = 400;
const CLICK_SLOP = 4;
const EDGE_BAND = 80;
/** The remove zone's width, and the gap between it and the pile. */
const REMOVE_WIDTH = "5rem";
const ZONE_GAP = "0.75rem";
const SPRING = { type: "spring", stiffness: 520, damping: 42 } as const;

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
	/* a Card in the pile, or the dragged ghost */
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
		means: "Drop in a pane to open as a Sheet, on an edge for a new pane, left of the pile to remove, or back on the pile.",
	},
	{
		move: "Throw ← / ↑",
		means: "A fast release removes, or opens as a Sheet, without a zone.",
	},
	{
		move: "Tap card",
		means: "Expands a folded Card; the rest fold to their header rows. Tapping the expanded one does nothing; only ↑ opens.",
	},
	{
		move: "Drag header",
		means: "Lifts the Sheet straight into a dragged Card.",
	},
	{
		move: "Hold a margin",
		means: "The Sheet shrinks and blues, then lifts as a dragged Card. ← collapses it to the pile.",
	},
	{
		move: "Esc",
		means: "Cancels a drag; else collapses the top Sheet; else removes the expanded Card.",
	},
	{ move: "Follow link", means: "Opens a Sheet on top, in the same pane." },
	{ move: "New word", means: "Sweeps the pile and deals four fresh Cards." },
	{
		move: "Click page",
		means: "Sweeps the pile, as the main app closes a deck.",
	},
];

/* -------------------------------------------------------------- layout */

function remPx(): number {
	return Number.parseFloat(
		getComputedStyle(document.documentElement).fontSize,
	);
}

/** The expanded Card's height, in px, for a pile of `count` Cards. */
function cardHeightPx(count: number): number {
	return (PILE_HEIGHT_REM - (Math.max(1, count) - 1) * HEADER_REM) * remPx();
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

/* ---------------------------------------------------------------- model */

export function CompassModel() {
	const { entries, log, clear } = useEventLog();
	const [selected, setSelected] = useState<string | null>(null);
	const [deck, setDeck] = useState<readonly DeckCard[]>([]);
	const [expandedId, setExpandedId] = useState<number | null>(null);
	const [layout, setLayout] = useState<LayoutNode>({
		kind: "Pane",
		id: ROOT_PANE,
		sheets: [],
	});
	const [anchorTop, setAnchorTop] = useState(8 * 16);
	const [drag, setDrag] = useState<Drag | null>(null);
	const [destination, setDestination] = useState<Destination | null>(null);
	const [pastCommit, setPastCommit] = useState(false);
	/** Drop zones stay in the DOM for hit-testing; this only shows them. */
	const [zonesVisible, setZonesVisible] = useState(false);
	const dragRef = useRef<Drag | null>(null);
	const settlingRef = useRef(false);
	const root = useRef<HTMLDivElement>(null);
	const nextId = useRef(1);
	const nextPane = useRef(1);
	const pagePointer = useRef<{
		id: number;
		x: number;
		y: number;
		moved: boolean;
		scrolled: boolean;
	} | null>(null);
	const dismissOnClick = useRef(false);

	const x = useMotionValue(0);
	const y = useMotionValue(0);
	const rotate = useMotionValue(0);
	const scale = useMotionValue(1);
	const ghostOpacity = useMotionValue(1);

	const expanded = deck.find((c) => c.id === expandedId) ?? deck[0] ?? null;
	const rootPane = findPane(layout, ROOT_PANE);

	useMotionValueEvent(x, "change", (value) => {
		const d = dragRef.current;
		if (d?.arm !== "remove") return;
		setPastCommit(value < -COMMIT);
	});
	useMotionValueEvent(y, "change", (value) => {
		const d = dragRef.current;
		if (d?.arm !== "expand") return;
		setPastCommit(value < -COMMIT);
	});

	/* --- deck operations --- */

	function deal(word: string, element: HTMLElement) {
		setSelected(word);
		setExpandedId(null);
		const rootBox = root.current?.getBoundingClientRect();
		const stageBox = element
			.closest("[data-deck-pane]")
			?.getBoundingClientRect();
		const box = element.getBoundingClientRect();
		if (stageBox && rootBox) setAnchorTop(box.bottom - stageBox.top + 14);
		log(
			`Select "${word}": ${deck.length ? `sweep ${deck.length.toString()}, ` : ""}deal 4`,
		);
		setDeck(deckFor(word).map((note) => ({ id: nextId.current++, note })));
	}
	function removeCard(card: DeckCard, reason: string) {
		log(`${reason}: ${card.note.kind} removed`);
		setDeck((d) => d.filter((c) => c.id !== card.id));
	}
	function openSheet(card: DeckCard, paneId: string, reason: string) {
		log(`${reason}: ${card.note.kind} opens as a Sheet in ${paneId}`);
		setDeck((d) => d.filter((c) => c.id !== card.id));
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
		setDeck((d) => d.filter((c) => c.id !== card.id));
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
		log(`${reason}: ${card.note.kind} collapses back onto the pile`);
		setLayout((node) => {
			const pane = findPane(node, paneId);
			if (!pane) return node;
			const sheets = pane.sheets.filter((c) => c.id !== card.id);
			if (!sheets.length && paneId !== ROOT_PANE)
				return replacePane(node, paneId, null) ?? node;
			return replacePane(node, paneId, { ...pane, sheets }) ?? node;
		});
		setDeck((d) => (d.some((c) => c.id === card.id) ? d : [...d, card]));
		setExpandedId(card.id);
	}
	function follow(paneId: string, link: NoteLink) {
		if (link.kind === "Text") {
			log(`Go to source "${link.word}": word reselected`);
			setSelected(link.word);
			return;
		}
		const card = { id: nextId.current++, note: noteById(link.noteId) };
		log(`Follow ${link.label}: Sheet on top in ${paneId}`);
		setLayout((node) =>
			updatePane(node, paneId, (pane) => ({
				...pane,
				sheets: [...pane.sheets, card],
			})),
		);
	}
	function expand(card: DeckCard) {
		log(`Tap folded: ${card.note.kind} expands`);
		setExpandedId(card.id);
	}
	useEffect(() => {
		if (expandedId === null) return;
		const front = root.current?.querySelector<HTMLElement>(
			'[data-deck-column] article[data-place="open"]',
		);
		if (!front) return;
		const controls = animate(
			front,
			{ scale: [1, 1.02, 1] },
			{ duration: LIFT_MS / 1000, ease: "easeOut" },
		);
		return () => controls.stop();
	}, [expandedId]);
	function reset() {
		setSelected(null);
		setDeck([]);
		setExpandedId(null);
		setLayout({ kind: "Pane", id: ROOT_PANE, sheets: [] });
		dragRef.current = null;
		setDrag(null);
		setDestination(null);
		clear();
	}

	/* --- drag: destination under the pointer --- */

	function destinationAt(px: number, py: number): Destination | null {
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

	function cardDown(event: ReactPointerEvent<HTMLElement>, card: DeckCard) {
		if (event.button !== 0 || dragRef.current || settlingRef.current)
			return;
		const frame = root.current;
		if (!frame) return;
		event.preventDefault();
		try {
			frame.setPointerCapture(event.pointerId);
		} catch {
			/* a pointer the browser is not tracking; the frame still hears it */
		}
		const frameBox = frame.getBoundingClientRect();
		const box = event.currentTarget.getBoundingClientRect();
		x.set(0);
		y.set(0);
		rotate.set(0);
		scale.set(1);
		ghostOpacity.set(1);
		setPastCommit(false);
		const now = event.timeStamp;
		const d: Drag = {
			card,
			pointerId: event.pointerId,
			start: { x: event.clientX, y: event.clientY, t: now },
			origin: {
				left: box.left - frameBox.left,
				top: box.top - frameBox.top,
				width: box.width,
				height: box.height,
			},
			arm: null,
			armedAt: 0,
			free: false,
			lifted: false,
			overRemove: false,
			v: { vx: 0, vy: 0 },
			last: { x: event.clientX, y: event.clientY, t: now },
		};
		dragRef.current = d;
		setDrag(d);
		setDestination(null);
	}
	/** A Sheet collapses onto the pile and its Card is at once mid-drag. */
	function liftSheet(
		paneId: string,
		card: DeckCard,
		lift: Lift,
		reason: string,
	) {
		if (dragRef.current || settlingRef.current) return;
		const frame = root.current;
		if (!frame) return;
		try {
			frame.setPointerCapture(lift.pointerId);
		} catch {
			/* a pointer the browser is not tracking; the frame still hears it */
		}
		pagePointer.current = null;
		collapseSheet(paneId, card, reason);
		const frameBox = frame.getBoundingClientRect();
		const width = Number.parseFloat(CARD_WIDTH) * remPx();
		const count = deck.some((c) => c.id === card.id)
			? deck.length
			: deck.length + 1;
		const height = cardHeightPx(count);
		x.set(0);
		y.set(0);
		rotate.set(0);
		scale.set(1);
		ghostOpacity.set(1);
		setPastCommit(false);
		const now = performance.now();
		const d: Drag = {
			card,
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
			overRemove: false,
			v: { vx: 0, vy: 0 },
			last: { x: lift.x, y: lift.y, t: now },
		};
		dragRef.current = d;
		setDrag(d);
		setDestination(destinationAt(lift.x, lift.y));
	}
	function release(d: Drag, reason: string) {
		d.arm = null;
		d.free = true;
		setPastCommit(false);
		animate(rotate, 0, SPRING);
		animate(scale, 1, SPRING);
		log(`${reason}: plain drag`);
		setDrag({ ...d });
	}
	function frameMove(event: ReactPointerEvent<HTMLElement>) {
		const d = dragRef.current;
		if (!d || d.pointerId !== event.pointerId) return;
		const dx = event.clientX - d.start.x;
		const dy = event.clientY - d.start.y;
		const dt = Math.max(1, event.timeStamp - d.last.t);
		const vx = (event.clientX - d.last.x) / dt;
		const vy = (event.clientY - d.last.y) / dt;
		d.v = { vx: d.v.vx * 0.6 + vx * 0.4, vy: d.v.vy * 0.6 + vy * 0.4 };
		d.last = { x: event.clientX, y: event.clientY, t: event.timeStamp };
		x.set(dx);
		y.set(dy);

		if (!d.arm && !d.free && Math.hypot(dx, dy) > ARM_SLOP) {
			if (Math.abs(dx) > Math.abs(dy)) {
				if (dx < 0) {
					d.arm = "remove";
					d.armedAt = event.timeStamp;
					log("Drag ←: armed Remove");
					setDrag({ ...d });
				} else release(d, "Drag →");
			} else if (dy < 0) {
				d.arm = "expand";
				d.armedAt = event.timeStamp;
				log("Drag ↑: armed Open as sheet");
				setDrag({ ...d });
			} else release(d, "Drag ↓");
		}

		if (d.arm === "remove") {
			rotate.set(Math.max(-20, Math.min(0, dx / 16)));
			if (event.timeStamp - d.armedAt > HOLD_RELEASE_MS)
				release(d, "Held a beat");
			else if (dx > 12) release(d, "Turned back");
		} else if (d.arm === "expand") {
			scale.set(1 + Math.max(0, Math.min(0.05, -dy / 800)));
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
			animate(rotate, overRemove ? -20 : 0, SPRING);
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
			setDrag(null);
			setDestination(null);
			setPastCommit(false);
		});
	}
	function snapBack() {
		settle(
			() =>
				Promise.all([
					animate(x, 0, SPRING),
					animate(y, 0, SPRING),
					animate(rotate, 0, SPRING),
					animate(scale, 1, SPRING),
				]),
			() => {},
		);
	}
	function flyAway(card: DeckCard, reason: string) {
		settle(
			() =>
				Promise.all([
					animate(x, x.get() - 720, {
						duration: 0.22,
						ease: "easeIn",
					}),
					animate(rotate, -28, { duration: 0.22 }),
					animate(ghostOpacity, 0, { duration: 0.22 }),
				]),
			() => removeCard(card, reason),
		);
	}
	function dissolveInto(commit: () => void) {
		settle(
			() =>
				Promise.all([
					animate(scale, 1.04, { duration: 0.16 }),
					animate(y, y.get() - 20, { duration: 0.16 }),
					animate(ghostOpacity, 0, { duration: 0.16 }),
				]),
			commit,
		);
	}
	function frameUp(event: ReactPointerEvent<HTMLElement>) {
		const d = dragRef.current;
		if (!d || d.pointerId !== event.pointerId) return;
		dragRef.current = null;
		const dx = x.get();
		const dy = y.get();
		const { vx, vy } =
			event.timeStamp - d.last.t > VELOCITY_STALE_MS
				? { vx: 0, vy: 0 }
				: d.v;
		const card = d.card;
		const travelled = Math.hypot(dx, dy);

		if (travelled < CLICK_SLOP + 2) {
			if (d.lifted) {
				log("Released in place: stays on the pile");
				snapBack();
				return;
			}
			setDrag(null);
			if (expanded && card.id === expanded.id)
				log("Tap expanded: nothing; drag ↑ to open");
			else expand(card);
			return;
		}
		if (d.arm === "remove") {
			if (dx < -COMMIT || vx < -THROW) flyAway(card, "Remove ←");
			else snapBack();
			return;
		}
		if (d.arm === "expand") {
			if (dy < -COMMIT || vy < -THROW)
				dissolveInto(() => openSheet(card, ROOT_PANE, "Open ↑"));
			else snapBack();
			return;
		}
		if (vx < -THROW && Math.abs(vx) > Math.abs(vy)) {
			flyAway(card, "Throw ←");
			return;
		}
		if (vy < -THROW) {
			const target = destinationAt(event.clientX, event.clientY);
			const paneId =
				target && "paneId" in target ? target.paneId : ROOT_PANE;
			dissolveInto(() => openSheet(card, paneId, "Throw ↑"));
			return;
		}
		const target = destinationAt(event.clientX, event.clientY);
		if (!target || target.kind === "return") {
			snapBack();
			return;
		}
		if (target.kind === "remove") flyAway(card, "Drop on Remove");
		else if (target.kind === "sheet")
			dissolveInto(() => openSheet(card, target.paneId, "Drop in pane"));
		else dissolveInto(() => splitPane(card, target.paneId, target.edge));
	}
	function cancelDrag() {
		const d = dragRef.current;
		if (!d) return;
		dragRef.current = null;
		log("Esc: drag cancelled");
		snapBack();
	}

	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			if (event.key !== "Escape") return;
			if (dragRef.current) {
				cancelDrag();
				return;
			}
			const top = rootPane?.sheets.at(-1);
			if (top) {
				collapseSheet(ROOT_PANE, top, "Esc");
				return;
			}
			if (expanded) removeCard(expanded, "Esc");
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	});

	/* --- page click sweeps the pile (ported from the main app) --- */

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
		if (!dismissOnClick.current || !deck.length || rootPane?.sheets.length)
			return;
		if ((event.target as HTMLElement).closest(DISMISS_EXEMPT_SELECTOR))
			return;
		log(`Click page: sweep ${deck.length.toString()}`);
		setDeck([]);
		setExpandedId(null);
	}

	/* --- render --- */

	const dragging = drag !== null;
	const showZones = dragging && drag.free;
	const armLabel =
		drag?.arm === "remove"
			? "Remove"
			: drag?.arm === "expand"
				? "Open as sheet"
				: null;

	function renderPile() {
		const count = deck.length;
		/* written form on top, meaning at the bottom */
		const order = [...deck].reverse();
		const open = expanded ? order.indexOf(expanded) : count - 1;
		return (
			<div
				data-deck-column=""
				className="pointer-events-none absolute left-1/2 -translate-x-1/2"
				style={{
					top: anchorTop,
					width: CARD_WIDTH,
					height: PILE_HEIGHT,
				}}
			>
				{order.map((card, index) => {
					const place: Place =
						index < open
							? "above"
							: index > open
								? "below"
								: "open";
					const lifted = drag?.card.id === card.id;
					/*
					 * Every Card is the same size in the same slot, one header
					 * row below the last. The expanded one sits in front; the
					 * ones above it show their header, the ones below their
					 * footer, and expanding only changes who is in front.
					 */
					const style: CSSProperties = {
						insetInlineStart: 0,
						width: "100%",
						top: `calc(${index.toString()} * ${HEADER_HEIGHT})`,
						height: `calc(${PILE_HEIGHT} - ${(count - 1).toString()} * ${HEADER_HEIGHT})`,
						/* z rises toward the expanded Card from both sides */
						zIndex:
							place === "open"
								? 10
								: place === "above"
									? 1 + index
									: count - index,
						visibility: lifted ? "hidden" : undefined,
						transformOrigin: "50% 50%",
					};
					return (
						<article
							key={card.id}
							aria-label={`${card.note.kind} card`}
							data-place={place}
							style={style}
							onPointerDown={(event) => cardDown(event, card)}
							className="pointer-events-auto absolute flex cursor-grab touch-none flex-col overflow-hidden rounded-[0.9rem] border border-line-strong bg-paper select-none active:cursor-grabbing"
						>
							<CardFace note={card.note} place={place} />
						</article>
					);
				})}
				{/* the remove zone: a strip just left of the pile, same height */}
				{showZones ? (
					<div
						aria-hidden="true"
						data-remove-zone=""
						data-active={destination?.kind === "remove"}
						data-shown={zonesVisible}
						className="pointer-events-none absolute z-[35] grid data-[shown=false]:invisible place-items-center rounded-[1.1rem] border border-dashed border-destructive/50 bg-destructive/5 transition-colors data-[active=true]:border-destructive data-[active=true]:bg-destructive/15"
						style={{
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
				{/* the return zone: the whole pile's footprint, above the pane wash */}
				{showZones ? (
					<div
						aria-hidden="true"
						data-return-zone=""
						data-active={destination?.kind === "return"}
						data-shown={zonesVisible}
						className="pointer-events-none absolute z-[35] flex data-[shown=false]:invisible items-end justify-center pb-3 rounded-[1.1rem] border border-dashed border-line-strong bg-paper/60 transition-colors data-[active=true]:border-link data-[active=true]:bg-link/15"
						style={{
							insetInlineStart: `calc(-1 * ${PILE_PAD})`,
							top: `calc(-1 * ${PILE_PAD})`,
							width: `calc(100% + 2 * ${PILE_PAD})`,
							height: `calc(${PILE_HEIGHT} + 2 * ${PILE_PAD})`,
						}}
					>
						<span className="rounded-md bg-raised px-2 py-0.5 font-mono text-[0.62rem] font-bold tracking-[0.12em] text-link uppercase">
							Back on the pile
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
							<DummyReader
								selected={selected}
								onSelect={({ word, element }) =>
									deal(word, element)
								}
							/>
						</div>
						{renderPile()}
					</>
				) : null}
				<AnimatePresence>
					{top ? (
						<SheetView
							key={top.id}
							card={top}
							trail={trail}
							framed={isRoot}
							onCollapse={(reason) =>
								collapseSheet(pane.id, top, reason)
							}
							onLift={(lift, reason) =>
								liftSheet(pane.id, top, lift, reason)
							}
							onFollow={(link) => follow(pane.id, link)}
						/>
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
			<div
				ref={root}
				data-deck-frame=""
				className="relative h-full min-h-0"
				onPointerMove={frameMove}
				onPointerUp={frameUp}
				onPointerCancel={frameUp}
			>
				{renderLayout(layout)}

				{/* the drag ghost: the lifted Card, following the pointer */}
				{drag ? (
					<motion.div
						aria-hidden="true"
						className="pointer-events-none absolute z-40 flex flex-col overflow-hidden rounded-[0.9rem] border bg-paper"
						data-arm={drag.arm ?? undefined}
						data-past={pastCommit}
						style={{
							left: drag.origin.left,
							top: drag.origin.top,
							width: drag.origin.width,
							height: drag.origin.height,
							x,
							y,
							rotate,
							scale,
							opacity: ghostOpacity,
							transformOrigin: "50% 100%",
							borderColor:
								drag.arm === "remove"
									? "var(--destructive)"
									: drag.arm === "expand" || drag.free
										? "var(--link)"
										: "var(--line-strong)",
						}}
					>
						<CardFace note={drag.card.note} place="open" />
						<AnimatePresence>
							{armLabel ? (
								<motion.div
									key={armLabel}
									initial={{ opacity: 0, scale: 0.9 }}
									animate={{
										opacity: pastCommit ? 1 : 0.55,
										scale: pastCommit ? 1 : 0.96,
									}}
									exit={{ opacity: 0, scale: 0.9 }}
									transition={{ duration: 0.15 }}
									className={`absolute top-3 rounded-md border px-2 py-0.5 font-mono text-[0.62rem] font-bold tracking-[0.12em] uppercase ${drag.arm === "remove" ? "right-3 border-destructive bg-paper text-destructive" : "left-3 border-link bg-paper text-link"}`}
								>
									{armLabel}
								</motion.div>
							) : null}
						</AnimatePresence>
					</motion.div>
				) : null}
			</div>
		</ModelShell>
	);
}

/* -------------------------------------------------------------- pieces */

type Place = "above" | "open" | "below";

/**
 * A whole Card: its info row and the Note's lines. The row sits at the top
 * while the Card is expanded or peeks out above the expanded one, and at
 * the bottom while it peeks out below, so a Card names itself exactly once.
 */
function CardFace({ note, place }: { note: DummyNote; place: Place }) {
	const below = place === "below";
	return (
		<>
			{below ? null : <CardTail note={note} />}
			<div className="pointer-events-none relative min-h-0 flex-1 overflow-hidden">
				<div
					className={`space-y-1.5 px-4 text-[0.85rem] leading-relaxed text-ink-soft ${below ? "pt-3" : "pb-3"}`}
				>
					{note.lines.map((line, index) => (
						<p key={`${index.toString()}-${line}`}>{line}</p>
					))}
				</div>
				{below ? null : (
					<div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-paper to-transparent" />
				)}
			</div>
			{below ? <CardTail note={note} /> : null}
		</>
	);
}

/** A Card's info row: its form, then a gloss. */
function CardTail({ note }: { note: DummyNote }) {
	return (
		<span
			className="flex w-full shrink-0 items-center justify-between gap-4 px-4"
			style={{ height: HEADER_HEIGHT }}
		>
			<span className="truncate font-serif text-[1rem] text-ink">
				{note.tail.form}
			</span>
			<span className="shrink-0 text-[0.72rem] text-ink-muted">
				{note.tail.gloss}
			</span>
		</span>
	);
}

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
					style={
						edge === "bottom"
							? { height: `min(${EDGE_BAND.toString()}px, 23%)` }
							: { width: `min(${EDGE_BAND.toString()}px, 23%)` }
					}
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

type Lift = {
	readonly pointerId: number;
	readonly x: number;
	readonly y: number;
};

function SheetView({
	card,
	trail,
	framed,
	onCollapse,
	onLift,
	onFollow,
}: {
	card: DeckCard;
	trail: readonly string[];
	framed: boolean;
	onCollapse: (reason: string) => void;
	onLift: (lift: Lift, reason: string) => void;
	onFollow: (link: NoteLink) => void;
}) {
	const [holding, setHolding] = useState(false);
	/** Where the hold is: the Sheet shrinks toward this point. */
	const [origin, setOrigin] = useState("50% 50%");
	const section = useRef<HTMLElement>(null);
	const hold = useRef<{ timer: number; pointer: Lift } | null>(null);

	function headerDown(event: ReactPointerEvent<HTMLElement>) {
		if (event.button !== 0) return;
		if ((event.target as HTMLElement).closest("button")) return;
		event.preventDefault();
		onLift(
			{ pointerId: event.pointerId, x: event.clientX, y: event.clientY },
			"Drag header",
		);
	}
	function marginDown(event: ReactPointerEvent<HTMLElement>) {
		if (event.button !== 0 || hold.current) return;
		event.preventDefault();
		const pointer = {
			pointerId: event.pointerId,
			x: event.clientX,
			y: event.clientY,
		};
		const box = section.current?.getBoundingClientRect();
		if (box)
			setOrigin(
				`${(((pointer.x - box.left) / box.width) * 100).toFixed(1)}% ${(((pointer.y - box.top) / box.height) * 100).toFixed(1)}%`,
			);
		setHolding(true);
		hold.current = {
			pointer,
			timer: window.setTimeout(() => {
				const current = hold.current;
				hold.current = null;
				setHolding(false);
				if (current) onLift(current.pointer, "Hold margin");
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
	}
	useEffect(() => stopHold, []);

	return (
		<motion.section
			ref={section}
			aria-label={`${card.note.kind} sheet`}
			style={{ transformOrigin: origin }}
			initial={{ opacity: 0, scale: 0.98 }}
			animate={{
				opacity: 1,
				scale: holding ? 0.95 : 1,
				borderColor: holding ? "var(--link)" : "var(--line-strong)",
			}}
			exit={{ opacity: 0, scale: 0.98 }}
			transition={
				holding
					? { duration: LONG_PRESS_MS / 1000, ease: "linear" }
					: { duration: 0.16 }
			}
			data-framed={framed}
			data-holding={holding}
			className="absolute inset-0 z-20 flex flex-col overflow-hidden border border-transparent bg-paper data-[framed=true]:inset-x-6 data-[framed=true]:inset-y-4 data-[framed=true]:rounded-[0.9rem] data-[framed=true]:border-line-strong"
		>
			<header
				onPointerDown={headerDown}
				className="flex shrink-0 cursor-grab touch-none items-center gap-2 border-b border-line ps-2 pe-3 py-1 select-none active:cursor-grabbing"
			>
				<button
					type="button"
					aria-label="Collapse back to card"
					title="Collapse back to card"
					onClick={() => onCollapse("←")}
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
			</header>
			<div className="min-h-0 flex-1 overflow-auto">
				<NoteBody note={card.note} onFollow={onFollow} />
			</div>
			{/* the Sheet's own margins: hold one to lift the Sheet as a Card */}
			{MARGINS.map((margin) => (
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
			))}
		</motion.section>
	);
}

const MARGINS = ["left", "right", "bottom"] as const;
const MARGIN_CLASS: Record<(typeof MARGINS)[number], string> = {
	left: "inset-y-0 left-0 w-6",
	right: "inset-y-0 right-0 w-6",
	bottom: "inset-x-0 bottom-0 h-5",
};
