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
 * Every Card in the pile is draggable on its own; a tap on a covered Card
 * still floats it up. The first direction of a drag names its intent: left
 * arms "Remove" (the Card tilts), up arms "Open as sheet". Hold an armed
 * Card longer than a beat and the arm relaxes into a plain drag.
 *
 * A plain drag drops inside a pane to open the Card as a Sheet there, on a
 * pane edge to split a new pane (after the production Workspace), on the
 * left gutter to remove, or back on its own slot. A fast throw left or up
 * still removes or opens without a zone. Sheets collapse back to Cards by
 * holding a corner.
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
	v: { vx: number; vy: number };
	last: { x: number; y: number; t: number };
};

const ROOT_PANE = "text";
const CARD_WIDTH = "26rem";
const CARD_HEIGHT = "22rem";
const FOOTER_HEIGHT = "2.75rem";
const STEP_X = "0.5rem";
const LIFT = "0.75rem";
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
const REMOVE_GUTTER = 64;
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
	"article",
	"section",
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
		means: "Drop in a pane to open as a Sheet, on an edge for a new pane, on the left gutter to remove, or back on its slot.",
	},
	{
		move: "Throw ← / ↑",
		means: "A fast release removes, or opens as a Sheet, without a zone.",
	},
	{
		move: "Tap card",
		means: "Floats a covered Card up. Tapping the floating one opens it.",
	},
	{
		move: "Hold a corner",
		means: "Collapses the Sheet back to a Card on the pile.",
	},
	{
		move: "Esc",
		means: "Cancels a drag; else collapses the top Sheet; else removes the floating Card.",
	},
	{ move: "Follow link", means: "Opens a Sheet on top, in the same pane." },
	{ move: "New word", means: "Sweeps the pile and deals four fresh Cards." },
	{
		move: "Click page",
		means: "Sweeps the pile, as the main app closes a deck.",
	},
];

/* -------------------------------------------------------------- layout */

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
	const [floatingId, setFloatingId] = useState<number | null>(null);
	const [layout, setLayout] = useState<LayoutNode>({
		kind: "Pane",
		id: ROOT_PANE,
		sheets: [],
	});
	const [anchorTop, setAnchorTop] = useState(8 * 16);
	const [drag, setDrag] = useState<Drag | null>(null);
	const [destination, setDestination] = useState<Destination | null>(null);
	const [pastCommit, setPastCommit] = useState(false);
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

	const floating = deck.find((c) => c.id === floatingId) ?? deck[0] ?? null;
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
		setFloatingId(null);
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
		setFloatingId(card.id);
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
	function floatUp(card: DeckCard) {
		log(`Tap covered: ${card.note.kind} floats up`);
		setFloatingId(card.id);
	}
	function reset() {
		setSelected(null);
		setDeck([]);
		setFloatingId(null);
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
			v: { vx: 0, vy: 0 },
			last: { x: event.clientX, y: event.clientY, t: now },
		};
		dragRef.current = d;
		setDrag(d);
		setDestination(null);
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
			setDrag(null);
			if (floating && card.id === floating.id)
				openSheet(card, ROOT_PANE, "Tap");
			else floatUp(card);
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
		if (target.kind === "remove") flyAway(card, "Drop on gutter");
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
			if (floating) removeCard(floating, "Esc");
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
		setFloatingId(null);
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
		return (
			<div
				className="pointer-events-none absolute left-1/2 -translate-x-1/2"
				style={{ top: anchorTop, width: CARD_WIDTH }}
			>
				{[...deck].reverse().map((card) => {
					const index = deck.indexOf(card);
					const floatingIndex = floating
						? deck.indexOf(floating)
						: -1;
					const isFloating = card === floating;
					const lifted = drag?.card.id === card.id;
					const style: CSSProperties = {
						insetInlineStart: `calc(${index.toString()} * ${STEP_X})`,
						top: `calc(${index.toString()} * ${FOOTER_HEIGHT})`,
						width: "100%",
						height: CARD_HEIGHT,
						transform: isFloating
							? `translateY(calc(-1 * ${LIFT}))`
							: undefined,
						zIndex: isFloating ? 20 : 10 - index,
						visibility: lifted ? "hidden" : undefined,
					};
					return (
						<article
							key={card.id}
							aria-label={`${card.note.kind} card`}
							data-covered={!isFloating}
							style={style}
							onPointerDown={(event) => cardDown(event, card)}
							className="pointer-events-auto absolute flex cursor-grab touch-none flex-col justify-end overflow-hidden rounded-[0.9rem] border border-line-strong bg-paper transition-transform duration-200 select-none active:cursor-grabbing"
						>
							{isFloating ? (
								<CardFace note={card.note} />
							) : (
								<div
									data-above={index < floatingIndex}
									className="flex h-full w-full flex-col justify-end text-start data-[above=true]:justify-start"
								>
									<CardTail note={card.note} />
								</div>
							)}
						</article>
					);
				})}
				{drag ? (
					<div
						aria-hidden="true"
						data-return-zone=""
						data-active={destination?.kind === "return"}
						className="pointer-events-none absolute rounded-[0.9rem] border border-dashed border-line-strong transition-colors data-[active=true]:border-link data-[active=true]:bg-link/5"
						style={{
							insetInlineStart: `calc(${deck.indexOf(drag.card).toString()} * ${STEP_X})`,
							top: `calc(${deck.indexOf(drag.card).toString()} * ${FOOTER_HEIGHT})`,
							width: "100%",
							height: CARD_HEIGHT,
						}}
					/>
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
							onFollow={(link) => follow(pane.id, link)}
						/>
					) : null}
				</AnimatePresence>
				{showZones ? (
					<DropZones paneId={pane.id} destination={destination} />
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
		<ModelShell rules={RULES} entries={entries} onReset={reset}>
			<div
				ref={root}
				data-deck-frame=""
				className="relative h-full min-h-0"
				onPointerMove={frameMove}
				onPointerUp={frameUp}
				onPointerCancel={frameUp}
			>
				{renderLayout(layout)}

				{/* the remove gutter, along the frame's left edge */}
				{showZones ? (
					<div
						aria-hidden="true"
						data-remove-zone=""
						data-active={destination?.kind === "remove"}
						className="pointer-events-none absolute inset-y-0 left-0 z-30 grid place-items-center border-e border-dashed border-destructive/50 bg-destructive/5 transition-colors data-[active=true]:bg-destructive/15"
						style={{ width: REMOVE_GUTTER }}
					>
						<span className="rotate-180 font-mono text-[0.62rem] font-bold tracking-[0.12em] text-destructive uppercase [writing-mode:vertical-rl]">
							Remove
						</span>
					</div>
				) : null}

				{/* the drag ghost: the lifted Card, following the pointer */}
				{drag ? (
					<motion.div
						aria-hidden="true"
						className="pointer-events-none absolute z-40 overflow-hidden rounded-[0.9rem] border bg-paper"
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
									: drag.arm === "expand"
										? "var(--link)"
										: "var(--line-strong)",
						}}
					>
						<CardFace note={drag.card.note} />
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

function CardFace({ note }: { note: DummyNote }) {
	return (
		<>
			<div className="pointer-events-none min-h-0 flex-1 overflow-hidden">
				<NoteBody note={note} compact onFollow={() => {}} />
			</div>
			<div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-paper to-transparent" />
		</>
	);
}

function CardTail({ note }: { note: DummyNote }) {
	return (
		<span
			className="flex w-full items-center justify-between gap-4 px-4"
			style={{ height: FOOTER_HEIGHT }}
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
}: {
	paneId: string;
	destination: Destination | null;
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
					className="pointer-events-none absolute z-30 grid place-items-center border border-dashed border-link/40 bg-link/5 transition-colors data-[active=true]:border-link data-[active=true]:bg-link/15 data-[edge=bottom]:inset-x-0 data-[edge=bottom]:bottom-0 data-[edge=left]:inset-y-0 data-[edge=left]:left-0 data-[edge=right]:inset-y-0 data-[edge=right]:right-0"
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
					className="pointer-events-none absolute inset-0 z-30 grid place-items-center bg-link/5"
				>
					<span className="rounded-md bg-raised px-2 py-0.5 font-mono text-[0.62rem] font-bold tracking-[0.12em] text-link uppercase">
						Open as sheet
					</span>
				</div>
			) : null}
		</>
	);
}

function SheetView({
	card,
	trail,
	framed,
	onCollapse,
	onFollow,
}: {
	card: DeckCard;
	trail: readonly string[];
	framed: boolean;
	onCollapse: (reason: string) => void;
	onFollow: (link: NoteLink) => void;
}) {
	return (
		<motion.section
			aria-label={`${card.note.kind} sheet`}
			initial={{ opacity: 0, scale: 0.98 }}
			animate={{ opacity: 1, scale: 1 }}
			exit={{ opacity: 0, scale: 0.98 }}
			transition={{ duration: 0.16 }}
			data-framed={framed}
			className="absolute inset-0 z-20 flex flex-col overflow-hidden bg-paper data-[framed=true]:inset-x-6 data-[framed=true]:inset-y-4 data-[framed=true]:rounded-[0.9rem] data-[framed=true]:border data-[framed=true]:border-line-strong"
		>
			<header className="flex shrink-0 items-center gap-2 border-b border-line ps-2 pe-3 py-1 select-none">
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
			{(["tl", "tr", "bl", "br"] as const).map((corner) => (
				<CornerHold
					key={corner}
					corner={corner}
					onHold={() => onCollapse("Hold corner")}
				/>
			))}
		</motion.section>
	);
}

const CORNER_CLASS: Record<"tl" | "tr" | "bl" | "br", string> = {
	tl: "top-0 left-0 rounded-tl-[0.9rem]",
	tr: "top-0 right-0 rounded-tr-[0.9rem]",
	bl: "bottom-0 left-0 rounded-bl-[0.9rem]",
	br: "bottom-0 right-0 rounded-br-[0.9rem]",
};
const CORNER_BRACKET: Record<"tl" | "tr" | "bl" | "br", string> = {
	tl: "top-2 left-2 border-t border-l",
	tr: "top-2 right-2 border-t border-r",
	bl: "bottom-2 left-2 border-b border-l",
	br: "bottom-2 right-2 border-b border-r",
};

/**
 * A corner of a Sheet. Press and hold it to collapse the Sheet back to a
 * Card; the fill shows how far along the hold is.
 */
function CornerHold({
	corner,
	onHold,
}: {
	corner: "tl" | "tr" | "bl" | "br";
	onHold: () => void;
}) {
	const [holding, setHolding] = useState(false);
	const timer = useRef<number | null>(null);
	function start(event: ReactPointerEvent<HTMLButtonElement>) {
		if (event.button !== 0) return;
		try {
			event.currentTarget.setPointerCapture(event.pointerId);
		} catch {
			/* a pointer the browser is not tracking; the hold still counts */
		}
		setHolding(true);
		timer.current = window.setTimeout(() => {
			timer.current = null;
			setHolding(false);
			onHold();
		}, LONG_PRESS_MS);
	}
	function stop() {
		if (timer.current !== null) window.clearTimeout(timer.current);
		timer.current = null;
		setHolding(false);
	}
	useEffect(() => stop, []);
	return (
		<button
			type="button"
			aria-label="Hold to collapse back to card"
			title="Hold to collapse"
			onPointerDown={start}
			onPointerUp={stop}
			onPointerCancel={stop}
			onPointerLeave={stop}
			className={`group/corner absolute z-10 size-8 touch-none overflow-hidden select-none ${CORNER_CLASS[corner]}`}
		>
			<motion.span
				aria-hidden="true"
				className="absolute inset-0 bg-link/25"
				initial={false}
				animate={{ scale: holding ? 1 : 0, opacity: holding ? 1 : 0 }}
				transition={
					holding
						? { duration: LONG_PRESS_MS / 1000, ease: "linear" }
						: { duration: 0.12 }
				}
				style={{ transformOrigin: originOf(corner) }}
			/>
			<span
				aria-hidden="true"
				className={`absolute size-3 border-line-strong transition-colors group-hover/corner:border-link ${CORNER_BRACKET[corner]}`}
			/>
		</button>
	);
}

function originOf(corner: "tl" | "tr" | "bl" | "br"): string {
	return {
		tl: "0% 0%",
		tr: "100% 0%",
		bl: "0% 100%",
		br: "100% 100%",
	}[corner];
}
