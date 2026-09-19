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
	type DummyText,
	deckFor,
	FIRST_TEXT,
	type NoteLink,
	noteById,
	noteFor,
	type SourceContext,
	TEXTS,
	type TextFocus,
	textById,
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
	LOOSE_CARD_REM,
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
import { ModelShell, useEventLog } from "./shared";

/**
 * COMPASS — the Pane algebra (Wayfinder map texteater#473, rebuilt for #482).
 *
 * Every Pane has a permanent Ground whose content walks a line: Menu ›
 * Library › Text. ← on the Ground steps one rung down that line. Everything
 * above the Ground is a Cover; following a Link pushes one, and ← on a Cover
 * collapses it back to its Card when that Card is still in a live Deck, or
 * closes it otherwise. A Pane whose line reaches the Menu is Rooted; a Pane
 * spawned by dropping a Note or a Text on an edge is Floating, its Ground is
 * the dropped thing, and its bar shows X, which closes the Pane.
 *
 * Clicks are target-based. A Segment (a word in the Text, or in a Source
 * Context inside a Note) deals a Deck that belongs to the Sheet it was
 * clicked in; a new selection in the same Sheet replaces it. A Link pushes a
 * Cover. Dragging either lifts a Held Card from the pointer, and that is the
 * one spawning mechanism: drop it in a Pane for a Cover there, on a Pane edge
 * for a new Pane, or back where it came from to cancel.
 *
 * A Deck is hidden, never ended, by covering: only the top Sheet's Deck is
 * drawn, and ← reveals the one beneath. A Deck ends when its Sheet leaves,
 * or by a Sweep: a dismissive click on its Sheet, Escape, or (behind the
 * policy switch of #479) a fast swipe left on any of its Cards. There is no
 * per-Card removal.
 *
 * A Note is one element in every form (ADR 0006). The same `PresentationView`
 * is a Card in the Deck, the Held Card under the pointer, and the Sheet in a
 * Pane; only its box moves, and its Blocks read the form and adapt. A Text
 * takes the same element: its Blocks are its Sentences.
 *
 * Provisional defaults the build may overturn: Segments and Links inside a
 * resting Card are inert until the Card is a Sheet (#485); the Library opens
 * a Text only by tap, never by drag (#486).
 */

/* ---------------------------------------------------------------- types */

type Subject =
	| { readonly kind: "Note"; readonly note: DummyNote }
	| {
			readonly kind: "Text";
			readonly text: DummyText;
			readonly focus: TextFocus | null;
	  };
/** One workspace instance of a Subject; a fresh one for every open (issue 483). */
type Presentation = { readonly id: number; readonly subject: Subject };
type Deck = {
	readonly word: string;
	/** Where the Deck sits in its Pane; null centres it (a seeded scene). */
	readonly anchor: { readonly top: number; readonly left: number } | null;
	/**
	 * Every Note dealt, in Deck rank. A Note keeps its rank in whatever form
	 * it takes: opening as a Cover does not move it, and collapsing brings it
	 * back to the same slot. Only a Sweep, or a new deal, changes this list.
	 */
	readonly cards: readonly Presentation[];
	readonly expandedId: number | null;
};
type Rung = { readonly id: number; readonly deck: Deck | null } & (
	| { readonly kind: "Menu" }
	| { readonly kind: "Library" }
	| { readonly kind: "Sheet"; readonly card: Presentation }
);
type Cover = {
	readonly id: number;
	readonly card: Presentation;
	readonly deck: Deck | null;
	/** The Cover a Held Card would push if dropped here: a ghost, gone when it leaves. */
	readonly preview?: true;
};
type PaneNode = {
	readonly kind: "Pane";
	readonly id: string;
	/** The Ground line, bottom rung first. Rooted when it starts at the Menu. */
	readonly line: readonly Rung[];
	readonly covers: readonly Cover[];
	/**
	 * The Pane a Held Card would spawn if dropped here: inserted while the
	 * Card hovers an edge so the other Panes make room, and gone when it
	 * leaves. Its Ground is drawn as a ghost Sheet of the Card.
	 */
	readonly preview?: true;
};
type SplitNode = {
	readonly kind: "Split";
	readonly id: string;
	readonly axis: "horizontal" | "vertical";
	readonly children: readonly [LayoutNode, LayoutNode];
	/** The child this split was made for, and the size it opened at. */
	readonly freshId?: string;
	readonly freshSize?: number | string;
};
type LayoutNode = PaneNode | SplitNode;
type Edge = "left" | "right" | "bottom";
type Destination =
	| { readonly kind: "return" }
	| { readonly kind: "sheet"; readonly paneId: string }
	| { readonly kind: "pane"; readonly paneId: string; readonly edge: Edge };
type Arm = "sweep" | "expand";
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
/** A Sheet a Deck can belong to: a Ground rung or a Cover, found by id. */
type SheetRef = {
	readonly paneId: string;
	readonly sheetId: number;
	readonly card: Presentation | null;
	readonly deck: Deck | null;
	readonly ground: boolean;
	/** A ghost: what a drop would make, not something the reader can touch. */
	readonly preview: boolean;
};
type Drag = {
	readonly card: Presentation;
	readonly h: NoteHandle;
	readonly pointerId: number;
	readonly start: { x: number; y: number; t: number };
	/** The box the Note holds while in hand; its drag offset is on top. */
	readonly origin: Box;
	/** The Pane the gesture started in: where ↑ and a throw up open a Cover. */
	readonly paneId: string;
	/** The Deck the Note rests in, if it rests in one: its slot, and what a swipe sweeps. */
	readonly deckSheet: number | null;
	/**
	 * Where a release with nothing under it sends the Note: back to its
	 * slot on the Deck, back to the Sheet it was lifted out of, or away —
	 * a Card lifted from a Link or a Segment came from nowhere.
	 */
	readonly home: "slot" | "restore" | "vanish";
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
/** A Segment or a Link under a pointer that has not moved yet. */
type PendingLift = {
	readonly pointerId: number;
	readonly x: number;
	readonly y: number;
	readonly paneId: string;
	readonly make: () => Subject;
};
type Checkpoint = {
	readonly layout: LayoutNode;
};

/**
 * Where a drop lands, read off the Pane the way Obsidian reads it: inside
 * the central rectangle it opens as a Cover here; inside the rectangle a
 * Pane on the left, right or bottom would take, it spawns that Pane; on
 * the Pane bar, or anywhere else, it lands nowhere. A drop region is the
 * very rectangle a drop there produces, so the zone drawn, the ghost and
 * the Pane it becomes are one box, and the centre wins where they meet.
 * `dropRegions` is the one place this geometry is written; the hit test,
 * the drawn zones and the preview all read it.
 */
const CENTER_X = 0.3;
const CENTER_Y = 0.22;
/** A destination is left only once the pointer is this far outside its region. */
const HYSTERESIS_PX = 12;
const ROOT_PANE = "root";
const PREVIEW_PANE = "preview";
/** The Sheet id every ghost wears; never a real Sheet's. */
const PREVIEW_SHEET = -1;
/** The stacking bands over the Panes, lowest first. */
const Z = {
	/** A Ground; each Cover above it is one higher. */
	sheet: 1,
	/** The Deck's Cards, rising toward the expanded one. */
	deck: 10,
	zone: 30,
	returnZone: 35,
	/** The Held Card, over everything until it has landed. */
	held: 40,
} as const;
const CARD_WIDTH = `${CARD_WIDTH_REM.toString()}rem`;
/** A Cover's box: the Pane inset by these. A Ground fills its Pane. */
const SHEET_INSET_X_REM = 1.5;
const SHEET_INSET_Y_REM = 1;
/** How many Source Contexts a Card shows. A Sheet's page is the spec's. */
const CARD_CONTEXTS = 2;
/** How far the return zone reaches past the Deck's cards. */
const PILE_PAD_REM = 0.75;
/** The Heading's inline padding: what a Card's title sits in from its edge. */
const TITLE_INSET_REM = 1;
/** The gap between a selected word's baseline box and the dealt Deck. */
const DEAL_GAP_PX = 8;

/** A click on one of these is never a dismissive click. */
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
	"[data-word]",
	/* a Card, resting or held */
	'[data-form="card"]',
	"[data-return-zone]",
	"[data-pane-bar]",
	"[data-cover-bar]",
].join(", ");

const RULES = [
	{
		move: "Click a word",
		means: "Deals a Deck that belongs to the Sheet it was clicked in: the Text, or a Source Context inside a Note.",
	},
	{
		move: "Click a link",
		means: "Pushes a Cover over this Pane. Go to source pushes the Text, scrolled to the Sentence.",
	},
	{
		move: "Drag a word or link",
		means: "Lifts a Held Card. Drop in a Pane for a Cover, on an edge for a new Pane, anywhere else to let it go.",
	},
	{
		move: "Drag ↑ a Card",
		means: "Arms Open as a Cover. Hold a beat and it relaxes into a plain drag.",
	},
	{
		move: "Drag ← a Card",
		means: "Arms Sweep: the whole Deck goes, when the switch is on.",
	},
	{
		move: "← on a Cover",
		means: "Collapses it to its Card if that Card is still in a live Deck, else closes it.",
	},
	{
		move: "← on the Ground",
		means: "Steps one rung down the line: Text › Library › Menu. The Text's Deck goes with it.",
	},
	{
		move: "X",
		means: "Closes a Floating Pane. Its Note collapses back to its Card if the Deck is still live.",
	},
	{
		move: "Drag a Cover's bar",
		means: "Lifts the Cover into a Held Card. A Floating Ground lifts by its Pane bar the same way, and its Pane closes behind it.",
	},
	{
		move: "Hold the Pane bar",
		means: "About a second on a Rooted Ground's bar lifts the Text; the Pane steps down to the Library.",
	},
	{
		move: "Click the page, Esc",
		means: "Sweeps the top Sheet's Deck.",
	},
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
 * word yet (a seeded scene), the Deck is centred.
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

/** The Text's content column in a Sheet; a Note's is `CARD_WIDTH_REM`. */
const TEXT_COLUMN_REM = 42;
/** A spawned Pane never takes more than this share of the Pane it splits. */
const SPAWN_SHARE = 0.5;
/** A spawned Pane below takes this share, in percent: a Note wants height, not a width. */
const SPAWN_SHARE_BELOW = 40;

/**
 * How big the Pane a Card spawns opens: as wide as its content column plus
 * the Cover insets, so a Note gets the room it lays out in and no more,
 * capped at half of the Pane it splits. Below, a share of the height.
 */
function spawnSize(
	card: Presentation,
	edge: Edge,
	paneWidth: number,
	rem: number,
): number | string {
	if (edge === "bottom") return SPAWN_SHARE_BELOW.toString();
	const column =
		card.subject.kind === "Text" ? TEXT_COLUMN_REM : CARD_WIDTH_REM;
	const natural = (column + 2 * SHEET_INSET_X_REM) * rem;
	return Math.round(Math.min(natural, paneWidth * SPAWN_SHARE));
}

type DropRegions = {
	/** Where a drop opens a Cover in this Pane. */
	readonly cover: Box;
	/** Where a drop spawns a Pane on this side: the Pane it spawns. */
	readonly edges: readonly { readonly edge: Edge; readonly box: Box }[];
	/** The Pane bar: chrome, never a drop. */
	readonly bar: Box;
};

/** A Pane's drop regions, in frame coordinates. */
function dropRegions(pane: Box, card: Presentation, rem: number): DropRegions {
	const side = Number(spawnSize(card, "left", pane.width, rem));
	const below = (pane.height * SPAWN_SHARE_BELOW) / 100;
	return {
		cover: {
			left: pane.left + pane.width * CENTER_X,
			top: pane.top + pane.height * CENTER_Y,
			width: pane.width * (1 - 2 * CENTER_X),
			height: pane.height * (1 - 2 * CENTER_Y),
		},
		edges: [
			{
				edge: "left",
				box: {
					left: pane.left,
					top: pane.top,
					width: side,
					height: pane.height,
				},
			},
			{
				edge: "right",
				box: {
					left: pane.left + pane.width - side,
					top: pane.top,
					width: side,
					height: pane.height,
				},
			},
			{
				edge: "bottom",
				box: {
					left: pane.left,
					top: pane.top + pane.height - below,
					width: pane.width,
					height: below,
				},
			},
		],
		bar: {
			left: pane.left,
			top: pane.top,
			width: pane.width,
			height: BAR_REM * rem,
		},
	};
}

function inside(box: Box, x: number, y: number, grow = 0): boolean {
	return (
		x >= box.left - grow &&
		x <= box.left + box.width + grow &&
		y >= box.top - grow &&
		y <= box.top + box.height + grow
	);
}

/** Puts `fresh` beside the pane `id`, on the side the edge names, at `size`. */
function splitBeside(
	node: LayoutNode,
	id: string,
	edge: Edge,
	fresh: PaneNode,
	size: number | string,
): LayoutNode {
	const pane = findPane(node, id);
	if (!pane) return node;
	const split: SplitNode = {
		kind: "Split",
		id: `split-${fresh.id}`,
		axis: edge === "bottom" ? "vertical" : "horizontal",
		children: edge === "left" ? [fresh, pane] : [pane, fresh],
		freshId: fresh.id,
		freshSize: size,
	};
	return replacePane(node, id, split) ?? node;
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

function isRooted(pane: PaneNode): boolean {
	return pane.line[0]?.kind === "Menu";
}

function groundOf(pane: PaneNode): Rung {
	const rung = pane.line.at(-1);
	if (!rung) throw new Error(`Pane ${pane.id} has no Ground`);
	return rung;
}

/** Every Sheet in a Pane, bottom first: the Ground, then its Covers. */
function sheetsOf(pane: PaneNode): readonly SheetRef[] {
	const ground = groundOf(pane);
	return [
		{
			paneId: pane.id,
			sheetId: ground.id,
			card: ground.kind === "Sheet" ? ground.card : null,
			deck: ground.deck,
			ground: true,
			preview: pane.preview === true,
		},
		...pane.covers.map((cover) => ({
			paneId: pane.id,
			sheetId: cover.id,
			card: cover.card,
			deck: cover.deck,
			ground: false,
			preview: cover.preview === true,
		})),
	];
}

function topSheetOf(pane: PaneNode): SheetRef {
	const sheets = sheetsOf(pane);
	return sheets[sheets.length - 1] as SheetRef;
}

function findSheet(node: LayoutNode, sheetId: number): SheetRef | null {
	for (const pane of panesOf(node))
		for (const sheet of sheetsOf(pane))
			if (sheet.sheetId === sheetId) return sheet;
	return null;
}

/** Rewrites one Sheet's Deck, wherever that Sheet is. */
function updateDeck(
	node: LayoutNode,
	sheetId: number,
	update: (deck: Deck | null) => Deck | null,
): LayoutNode {
	const sheet = findSheet(node, sheetId);
	if (!sheet) return node;
	return updatePane(node, sheet.paneId, (pane) => ({
		...pane,
		line: pane.line.map((rung) =>
			rung.id === sheetId ? { ...rung, deck: update(rung.deck) } : rung,
		),
		covers: pane.covers.map((cover) =>
			cover.id === sheetId
				? { ...cover, deck: update(cover.deck) }
				: cover,
		),
	}));
}

/** Every Presentation that is open as a Sheet somewhere, so its Card is not on a Deck. */
function openIds(node: LayoutNode): ReadonlySet<number> {
	const ids = new Set<number>();
	for (const pane of panesOf(node))
		for (const sheet of sheetsOf(pane))
			if (sheet.card) ids.add(sheet.card.id);
	return ids;
}

/**
 * The live Deck a Card still has a slot in, if any: the Sheet that dealt it
 * is still in its stack and the Deck has not been swept or replaced since.
 */
function deckHolding(node: LayoutNode, cardId: number): SheetRef | null {
	for (const pane of panesOf(node))
		for (const sheet of sheetsOf(pane))
			if (sheet.deck?.cards.some((card) => card.id === cardId))
				return sheet;
	return null;
}

function subjectLabel(subject: Subject): string {
	return subject.kind === "Text"
		? subject.text.title
		: `${subject.note.kind} · ${subject.note.title}`;
}

function rungLabel(rung: Rung): string {
	return rung.kind === "Sheet" ? subjectLabel(rung.card.subject) : rung.kind;
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

function sameBoxes(
	a: Readonly<Record<string, Box>>,
	b: Readonly<Record<string, Box>>,
): boolean {
	const ids = Object.keys(b);
	return (
		ids.length === Object.keys(a).length &&
		ids.every((id) => sameBox(a[id], b[id] as Box))
	);
}

/** Where a Cover sits in a Pane: under the bar, inset from the edges. */
function coverBoxIn(pane: Box, rem: number): Box {
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

/** Where a Ground sits: the whole Pane under its bar. */
function groundBoxIn(pane: Box, rem: number): Box {
	const bar = BAR_REM * rem;
	return {
		left: pane.left,
		top: pane.top + bar,
		width: pane.width,
		height: Math.max(0, pane.height - bar),
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
	const policy = useDeckInteractions();
	/**
	 * Issue 479, prototyped both ways behind one switch: with it on, a fast
	 * swipe left on any Card sweeps the whole Deck; off, the left gesture
	 * is gone and only the click, Escape and a new selection sweep.
	 */
	const [swipeSweeps, setSwipeSweeps] = useState(true);
	const allows = (interaction: DeckInteraction) =>
		policy(interaction) && (interaction !== "sweep" || swipeSweeps);
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
		GROUND_PRESS_MS,
		GROUND_SHRINK,
		HOLD_RELEASE,
		ZONE_FEEDBACK_MS,
		OPEN_SCALE,
		SETTLE_TIMEOUT_MS,
		SNAP_BACK,
		SNAP_LAND_PX,
		SNAP_RETURN,
		LIFT,
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

	/* Every animate() below is imperative, so none of it is reachable by
	   CSS or by MotionConfig. See `reduced-motion.ts`. */
	const reduce = useDeckReducedMotion();
	const { entries, log, clear } = useEventLog();
	const nextId = useRef(1);
	const nextSheet = useRef(1);
	const nextPane = useRef(1);
	const [layout, setLayout] = useState<LayoutNode>(() =>
		initialLayout(initialScene, nextId, nextSheet),
	);
	const [drag, setDrag] = useState<Drag | null>(null);
	/** A Card lifted from a Link or a Segment: in no Deck, in no Sheet, in hand. */
	const [loose, setLoose] = useState<{
		readonly card: Presentation;
		readonly box: Box;
	} | null>(null);
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
	 * its slot, not the teardown, so the box morphs to the slot while the
	 * drag offset unwinds on its own spring and the two read as one move.
	 */
	const [returning, setReturning] = useState(false);
	/** Drop zones stay in the DOM for hit-testing; this only shows them. */
	const [zonesVisible, setZonesVisible] = useState(initialZones);
	/** Every Pane's box, relative to the frame; Notes are placed from these. */
	const [paneBoxes, setPaneBoxes] = useState<Readonly<Record<string, Box>>>(
		{},
	);
	/**
	 * The Panes' boxes as they rested before any preview moved them: what
	 * a drop is read against, and where the zones are drawn, for the whole
	 * of a drag. Measured only while no preview is up.
	 */
	const [restBoxes, setRestBoxes] = useState<Readonly<Record<string, Box>>>(
		{},
	);
	const previewUpRef = useRef(false);
	const [rem, setRem] = useState(16);
	/**
	 * Bumped whenever a Pane's box changes: a split, a preview, a handle
	 * drag, the window. A Note whose box changes in the same pass is being
	 * resized with its Pane, not moved, and jumps rather than morphs.
	 */
	const [layoutEpoch, setLayoutEpoch] = useState(0);
	const dragRef = useRef<Drag | null>(null);
	const layoutRef = useRef(layout);
	layoutRef.current = layout;
	const settlingRef = useRef(false);
	const landedRef = useRef(false);
	/** Live subscriptions watching a return for its arrival. */
	const landWatch = useRef<(() => void)[]>([]);
	/** The return's own animations, so a fresh grab can take the Card back. */
	const returnRun = useRef<{ stop: () => void }[]>([]);
	const root = useRef<HTMLDivElement>(null);
	const handles = useRef(new Map<number, NoteHandle>());
	const gestureCheckpoint = useRef<Checkpoint | null>(null);
	const pendingLift = useRef<PendingLift | null>(null);
	/** A lift started under this click: the click is not a click. */
	const swallowClick = useRef(false);
	/** The Pane the reader last touched: what Escape sweeps. */
	const activePane = useRef(ROOT_PANE);
	const pagePointer = useRef<{
		id: number;
		x: number;
		y: number;
		moved: boolean;
		scrolled: boolean;
	} | null>(null);
	const dismissOnClick = useRef(false);

	const open = useMemo(() => openIds(layout), [layout]);
	const previewAt = drag && destination?.kind === "pane" ? destination : null;
	const coverAt =
		drag && destination?.kind === "sheet" ? destination.paneId : null;
	previewUpRef.current = previewAt !== null;
	/**
	 * The size the preview opened at, kept while it is up: the drop reuses
	 * it. It is read off the resting boxes, the same ones the drop was.
	 */
	const previewSize = useRef<{
		paneId: string;
		edge: Edge;
		size: number | string;
	} | null>(null);
	if (!previewAt) previewSize.current = null;
	else if (
		drag &&
		(previewSize.current?.paneId !== previewAt.paneId ||
			previewSize.current.edge !== previewAt.edge)
	)
		previewSize.current = {
			paneId: previewAt.paneId,
			edge: previewAt.edge,
			size: spawnSize(
				drag.card,
				previewAt.edge,
				restBoxes[previewAt.paneId]?.width ?? 0,
				rem,
			),
		};
	/**
	 * What is laid out: the real layout with what a drop here would make
	 * already in it, marked as a ghost. On an edge, the Pane it would
	 * spawn, so the others shift to make room the way Obsidian previews a
	 * split; in the centre, the Cover it would push, so the Pane's Deck is
	 * hidden under it the way it would be. The drop only makes it real.
	 */
	const displayLayout = useMemo(() => {
		if (!drag) return layout;
		if (coverAt)
			return updatePane(layout, coverAt, (pane) => ({
				...pane,
				covers: [
					...pane.covers,
					{
						id: PREVIEW_SHEET,
						card: drag.card,
						deck: null,
						preview: true,
					},
				],
			}));
		if (!previewAt || !previewSize.current) return layout;
		const fresh: PaneNode = {
			kind: "Pane",
			id: PREVIEW_PANE,
			line: [
				{
					id: PREVIEW_SHEET,
					kind: "Sheet",
					card: drag.card,
					deck: null,
				},
			],
			covers: [],
			preview: true,
		};
		return splitBeside(
			layout,
			previewAt.paneId,
			previewAt.edge,
			fresh,
			previewSize.current.size,
		);
	}, [layout, drag, previewAt, coverAt]);
	const destinationRef = useRef<Destination | null>(null);
	destinationRef.current = destination;
	/** The Cards a Deck shows: the dealt Notes that are not open as a Sheet. */
	const visibleCards = (deck: Deck) =>
		deck.cards.filter((card) => !open.has(card.id));
	const expandedOf = (deck: Deck, cards: readonly Presentation[]) =>
		cards.find((card) => card.id === deck.expandedId) ?? cards[0] ?? null;

	/* the held Note's offset drives the commit line */
	useEffect(() => {
		const d = drag;
		if (!d?.arm) return;
		const value = d.arm === "sweep" ? d.h.x : d.h.y;
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
				const same = sameBoxes(current, next);
				if (!same) setLayoutEpoch((epoch) => epoch + 1);
				return same ? current : next;
			});
			/* a preview has moved the Panes; the rest boxes wait it out */
			if (!previewUpRef.current)
				setRestBoxes((current) =>
					sameBoxes(current, next) ? current : next,
				);
		};
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(frame);
		for (const element of frame.querySelectorAll("[data-deck-pane]"))
			observer.observe(element);
		return () => observer.disconnect();
	}, [displayLayout]);

	/* --- the Ground line --- */

	function present(subject: Subject): Presentation {
		return { id: nextId.current++, subject };
	}
	function stepUp(
		paneId: string,
		rung:
			| { readonly kind: "Menu" }
			| { readonly kind: "Library" }
			| { readonly kind: "Sheet"; readonly card: Presentation },
	) {
		const next: Rung = { ...rung, id: nextSheet.current++, deck: null };
		setLayout((node) =>
			updatePane(node, paneId, (pane) => ({
				...pane,
				line: [...pane.line, next],
			})),
		);
	}
	function openLibrary(paneId: string) {
		log(`Menu › Library in ${paneId}`);
		stepUp(paneId, { kind: "Library" });
	}
	function openText(paneId: string, text: DummyText) {
		log(`Library › ${text.title} in ${paneId}: the Ground's selection`);
		stepUp(paneId, {
			kind: "Sheet",
			card: present({ kind: "Text", text, focus: null }),
		});
	}
	/** ← on a Ground: one rung down the line. The rung's Deck leaves with it. */
	function stepDown(paneId: string, reason: string) {
		const pane = findPane(layoutRef.current, paneId);
		if (!pane || pane.covers.length || pane.line.length < 2) return;
		const leaving = groundOf(pane);
		const below = pane.line[pane.line.length - 2] as Rung;
		log(
			`${reason}: ${rungLabel(leaving)} › ${rungLabel(below)}${leaving.deck ? ", its Deck ends" : ""}`,
		);
		setLayout((node) =>
			updatePane(node, paneId, (p) => ({
				...p,
				line: p.line.slice(0, -1),
			})),
		);
	}
	/** A Rooted Pane spawned empty, at its Menu, on purpose (issue 480). */
	function spawnEmptyPane() {
		const id = `pane-${(nextPane.current++).toString()}`;
		log(`New Rooted Pane ${id} at its Menu`);
		setLayout((node) => {
			const pane = findPane(node, ROOT_PANE);
			if (!pane) return node;
			const fresh: PaneNode = {
				kind: "Pane",
				id,
				line: [{ id: nextSheet.current++, kind: "Menu", deck: null }],
				covers: [],
			};
			return (
				replacePane(node, ROOT_PANE, {
					kind: "Split",
					id: `split-${id}`,
					axis: "horizontal",
					children: [pane, fresh],
				}) ?? node
			);
		});
	}

	/* --- decks --- */

	/** A Segment clicked in a Sheet deals a Deck that belongs to that Sheet. */
	function deal(
		paneId: string,
		sheetId: number,
		word: string,
		element: HTMLElement,
	) {
		if (!allows("deal")) return;
		const pane = findPane(layoutRef.current, paneId);
		if (!pane || topSheetOf(pane).sheetId !== sheetId) return;
		const frameBox = root.current?.getBoundingClientRect();
		const paneBox = paneBoxes[paneId];
		const box = element.getBoundingClientRect();
		const anchor =
			frameBox && paneBox
				? {
						top:
							box.bottom -
							frameBox.top -
							paneBox.top +
							DEAL_GAP_PX,
						left: box.left - frameBox.left - paneBox.left,
					}
				: null;
		const before = findSheet(layoutRef.current, sheetId)?.deck;
		log(
			`Select "${cleanWord(word)}": ${before ? "replace the Deck, " : ""}deal 4`,
		);
		setLayout((node) =>
			updateDeck(node, sheetId, () => ({
				word: cleanWord(word),
				anchor,
				cards: deckFor(word).map((note) =>
					present({ kind: "Note", note }),
				),
				expandedId: null,
			})),
		);
	}
	function expand(sheetId: number, card: Presentation) {
		if (!allows("select")) return;
		log(`Tap folded: ${subjectLabel(card.subject)} expands`);
		setLayout((node) =>
			updateDeck(node, sheetId, (deck) =>
				deck ? { ...deck, expandedId: card.id } : deck,
			),
		);
	}
	/** The Deck ends: every Card still on it flies off, then it is gone. */
	function sweep(
		sheetId: number,
		reason: string,
		run?: () => Promise<unknown>,
	) {
		const sheet = findSheet(layoutRef.current, sheetId);
		if (!sheet?.deck) return;
		const cards = visibleCards(sheet.deck);
		log(`${reason}: sweep ${cards.length.toString()}`);
		const end = () =>
			setLayout((node) => updateDeck(node, sheetId, () => null));
		if (run) {
			settle(run, end);
			return;
		}
		const fly = cards.flatMap((card) => {
			const h = handles.current.get(card.id);
			return h ? [flight(h)] : [];
		});
		settle(() => Promise.all(fly), end);
	}

	/* --- covers and panes --- */

	/** A Cover is a form, not a move: a dealt Card keeps its rank in its Deck. */
	function openCover(paneId: string, card: Presentation, reason: string) {
		log(`${reason}: ${subjectLabel(card.subject)} covers ${paneId}`);
		setLayout((node) =>
			updatePane(node, paneId, (pane) => ({
				...pane,
				covers: [
					...pane.covers,
					{ id: nextSheet.current++, card, deck: null },
				],
			})),
		);
	}
	/** A Note or a Text dropped on an edge is the new Pane's Ground: a Floating Pane. */
	function splitPane(card: Presentation, paneId: string, edge: Edge) {
		const id = `pane-${(nextPane.current++).toString()}`;
		log(
			`Drop at ${edge} edge: Floating Pane ${id} with ${subjectLabel(card.subject)} as Ground`,
		);
		const fresh: PaneNode = {
			kind: "Pane",
			id,
			line: [
				{ id: nextSheet.current++, kind: "Sheet", card, deck: null },
			],
			covers: [],
		};
		const previewed = previewSize.current;
		const size =
			previewed?.paneId === paneId && previewed.edge === edge
				? previewed.size
				: spawnSize(card, edge, restBoxes[paneId]?.width ?? 0, rem);
		setLayout((node) => splitBeside(node, paneId, edge, fresh, size));
	}
	/** Puts a Card back in front on the Deck that still holds it, if one does. */
	function collapseTo(node: LayoutNode, card: Presentation): LayoutNode {
		const holder = deckHolding(node, card.id);
		return holder
			? updateDeck(node, holder.sheetId, (deck) =>
					deck ? { ...deck, expandedId: card.id } : deck,
				)
			: node;
	}
	/** ← on a Cover: Collapse when its Card is still on a live Deck, Close otherwise. */
	function leaveCover(paneId: string, cover: Cover, reason: string) {
		const holder = deckHolding(layoutRef.current, cover.card.id);
		log(
			`${reason}: ${subjectLabel(cover.card.subject)} ${holder ? "collapses back to its Card" : "closes"}${cover.deck ? ", its Deck ends" : ""}`,
		);
		setLayout((node) =>
			collapseTo(
				updatePane(node, paneId, (pane) => ({
					...pane,
					covers: pane.covers.filter((c) => c.id !== cover.id),
				})),
				cover.card,
			),
		);
	}
	/** X: a Floating Pane closes with its Covers and its Deck. */
	function closePane(paneId: string, reason: string) {
		const pane = findPane(layoutRef.current, paneId);
		if (!pane || isRooted(pane)) return;
		const ground = groundOf(pane);
		const card = ground.kind === "Sheet" ? ground.card : null;
		const holder = card ? deckHolding(layoutRef.current, card.id) : null;
		log(
			`${reason}: Pane ${paneId} closes${card ? `; ${subjectLabel(card.subject)} ${holder ? "collapses back to its Card" : "closes"}` : ""}`,
		);
		setLayout((node) => {
			const without = replacePane(node, paneId, null) ?? node;
			return card ? collapseTo(without, card) : without;
		});
	}
	/** The Pane bar's control: the Ground's ←, or a Floating Pane's X. */
	function back(paneId: string, reason: string) {
		const pane = findPane(layoutRef.current, paneId);
		if (!pane || !allows("collapse")) return;
		if (isRooted(pane)) {
			if (!pane.covers.length) stepDown(paneId, reason);
		} else closePane(paneId, reason);
	}
	/** A Cover bar's ←: only the top Cover's is reachable. */
	function coverBack(paneId: string, sheetId: number) {
		const pane = findPane(layoutRef.current, paneId);
		const top = pane?.covers.at(-1);
		if (!top || top.id !== sheetId || !allows("collapse")) return;
		leaveCover(paneId, top, "←");
	}
	function follow(paneId: string, link: NoteLink) {
		if (!allows("follow")) return;
		const subject = subjectOfLink(link);
		openCover(paneId, present(subject), `Follow ${link.label}`);
	}
	function reset() {
		nextId.current = 1;
		nextSheet.current = 1;
		nextPane.current = 1;
		setLayout(initialLayout("empty", nextId, nextSheet));
		dragRef.current = null;
		gestureCheckpoint.current = null;
		pendingLift.current = null;
		setLoose(null);
		setDrag(null);
		setDestination(null);
		clear();
	}

	/* --- drag: destination under the pointer --- */

	/** The Deck's column in its Pane: where its Cards sit, in frame coordinates. */
	function deckColumn(deck: Deck, paneBox: Box): Box {
		const width = cardWidthIn(paneBox.width, rem, OPEN_SCALE);
		return {
			left:
				paneBox.left +
				deckLeftIn(
					paneBox.width,
					width,
					rem,
					deck.anchor?.left ?? null,
				),
			top: paneBox.top + (deck.anchor?.top ?? defaultAnchorTop(embedded)),
			width,
			height: PILE_HEIGHT_REM * rem,
		};
	}
	/** The return zone: the Deck's column, reaching `PILE_PAD` past it. */
	function returnZone(deck: Deck, paneBox: Box): Box {
		const column = deckColumn(deck, paneBox);
		const pad = PILE_PAD_REM * rem;
		return {
			left: column.left - pad,
			top: column.top - pad,
			width: column.width + 2 * pad,
			height: column.height + 2 * pad,
		};
	}
	/**
	 * What is under the pointer. The return zone follows its Deck, so it
	 * is read live; everything else is read off the Panes as they rested
	 * before any preview moved them, so a ghost opening never moves the
	 * region that opened it. Leaving a region takes a little more than
	 * entering it did.
	 */
	function destinationAt(
		px: number,
		py: number,
		d: Drag,
	): Destination | null {
		if (!allows("drop")) return null;
		const frameBox = root.current?.getBoundingClientRect();
		if (!frameBox) return null;
		const x = px - frameBox.left;
		const y = py - frameBox.top;
		const holder =
			d.deckSheet === null
				? null
				: findSheet(layoutRef.current, d.deckSheet);
		const holderBox = holder ? paneBoxes[holder.paneId] : undefined;
		if (
			holder?.deck &&
			holderBox &&
			inside(returnZone(holder.deck, holderBox), x, y)
		)
			return { kind: "return" };
		/* no drop until the rest boxes describe this layout */
		const panes = panesOf(layoutRef.current);
		if (
			panes.length !== Object.keys(restBoxes).length ||
			panes.some((pane) => !restBoxes[pane.id])
		)
			return null;
		const regionsOf = (paneId: string) =>
			dropRegions(restBoxes[paneId] as Box, d.card, rem);
		const current = destinationRef.current;
		if (current && "paneId" in current) {
			const regions = regionsOf(current.paneId);
			const region =
				current.kind === "sheet"
					? regions.cover
					: regions.edges.find((e) => e.edge === current.edge)?.box;
			if (
				region &&
				inside(region, x, y, HYSTERESIS_PX) &&
				!inside(regions.bar, x, y)
			)
				return current;
		}
		for (const pane of panes) {
			const regions = regionsOf(pane.id);
			if (inside(regions.bar, x, y)) return null;
			if (inside(regions.cover, x, y))
				return { kind: "sheet", paneId: pane.id };
			for (const { edge, box } of regions.edges)
				if (inside(box, x, y))
					return { kind: "pane", paneId: pane.id, edge };
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
	function capture(pointerId: number) {
		try {
			root.current?.setPointerCapture(pointerId);
		} catch {
			/* a pointer the browser is not tracking; the frame still hears it */
		}
	}
	/** A Card on the Deck goes under the pointer; nothing moves until it does. */
	function cardDown(
		event: ReactPointerEvent<HTMLElement>,
		card: Presentation,
		sheet: SheetRef,
	) {
		if (!allows("drag") && !allows("select")) return;
		if (
			event.button !== 0 ||
			dragRef.current ||
			(settlingRef.current && !landedRef.current)
		)
			return;
		const h = handles.current.get(card.id);
		if (!h) return;
		event.preventDefault();
		capture(event.pointerId);
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
			paneId: sheet.paneId,
			deckSheet: sheet.sheetId,
			home: "slot",
			arm: null,
			armedAt: 0,
			free: false,
			lifted: false,
			moved: false,
			v: { vx: 0, vy: 0 },
			last: { x: event.clientX, y: event.clientY, t: now },
		};
		dragRef.current = d;
		setDrag(d);
		setDestination(null);
	}
	/** The box a Note is held in when it was lifted out of a Sheet or from nowhere. */
	function handBox(lift: Lift, paneId: string, height: number): Box {
		const frame = root.current;
		const frameBox = frame?.getBoundingClientRect();
		if (!frameBox) return { left: 0, top: 0, width: 0, height };
		const width = cardWidthIn(
			paneBoxes[paneId]?.width ?? frameBox.width,
			remPx(),
			OPEN_SCALE,
		);
		return {
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
		};
	}
	function startLift(
		card: Presentation,
		lift: Lift,
		origin: Box,
		paneId: string,
		deckSheet: number | null,
		home: Drag["home"],
	) {
		const h = handles.current.get(card.id);
		if (!h) return;
		capture(lift.pointerId);
		pagePointer.current = null;
		resetTransforms(h);
		setPastCommit(false);
		const now = performance.now();
		const d: Drag = {
			card,
			h,
			pointerId: lift.pointerId,
			start: { x: lift.x, y: lift.y, t: now },
			origin,
			paneId,
			deckSheet,
			home,
			arm: null,
			armedAt: 0,
			free: true,
			lifted: true,
			moved: true,
			v: { vx: 0, vy: 0 },
			last: { x: lift.x, y: lift.y, t: now },
		};
		dragRef.current = d;
		setDrag(d);
		setDestination(destinationAt(lift.x, lift.y, d));
	}
	/**
	 * A Sheet lifted by its Heading or a held margin: a Cover leaves its
	 * stack, a Floating Ground takes its whole Pane with it. If the Card is
	 * still on a live Deck it shrinks toward its slot there; otherwise it
	 * is in hand with nowhere to go back to but the Sheet it was.
	 */
	function liftSheet(
		sheet: SheetRef,
		lift: Lift,
		reason: string,
		bar: HTMLElement | null = null,
	) {
		if (!allows("lift") || dragRef.current || settlingRef.current) return;
		const card = sheet.card;
		if (!card) return;
		endReturn();
		gestureCheckpoint.current = { layout: layoutRef.current };
		const holder = deckHolding(layoutRef.current, card.id);
		if (sheet.ground) {
			log(
				`${reason}: ${subjectLabel(card.subject)} lifts; Pane ${sheet.paneId} closes behind it`,
			);
			setLayout((node) => replacePane(node, sheet.paneId, null) ?? node);
		} else {
			log(
				`${reason}: ${subjectLabel(card.subject)} lifts off ${sheet.paneId}`,
			);
			setLayout((node) =>
				updatePane(node, sheet.paneId, (p) => ({
					...p,
					covers: p.covers.filter((c) => c.id !== sheet.sheetId),
				})),
			);
		}
		/* the Deck it lands on is one taller than what it shows now */
		const count = holder?.deck ? visibleCards(holder.deck).length + 1 : 1;
		const height = holder ? cardHeightPx(count) : LOOSE_CARD_REM * remPx();
		if (holder) {
			setLayout((node) => collapseTo(node, card));
		}
		emergeFrom(card, bar);
		startLift(
			card,
			lift,
			handBox(lift, sheet.paneId, height),
			sheet.paneId,
			holder?.sheetId ?? null,
			holder ? "slot" : "restore",
		);
	}
	/**
	 * A Sheet is handled by its bar, not by its content: the Card emerges
	 * from the bar rather than the whole Sheet shrinking into the hand. The
	 * one element stays one element (ADR 0006); only its box starts the
	 * morph at the bar instead of at the Sheet.
	 */
	function emergeFrom(card: Presentation, bar: HTMLElement | null) {
		const frame = root.current;
		const h = handles.current.get(card.id);
		if (!frame || !h || !bar) return;
		const frameBox = frame.getBoundingClientRect();
		const rect = bar.getBoundingClientRect();
		h.left.jump(rect.left - frameBox.left);
		h.top.jump(rect.top - frameBox.top);
		h.width.jump(rect.width);
		h.height.jump(rect.height);
	}
	/** A Rooted Ground's content, its bar held about a second: it lifts and the Pane steps down. */
	function liftGround(sheet: SheetRef, lift: Lift, bar: HTMLElement | null) {
		if (!allows("lift") || dragRef.current || settlingRef.current) return;
		const pane = findPane(layoutRef.current, sheet.paneId);
		const card = sheet.card;
		if (!pane || !card || pane.covers.length || pane.line.length < 2)
			return;
		endReturn();
		gestureCheckpoint.current = { layout: layoutRef.current };
		stepDown(sheet.paneId, "Hold bar: lift the Ground");
		emergeFrom(card, bar);
		startLift(
			card,
			lift,
			handBox(lift, sheet.paneId, LOOSE_CARD_REM * remPx()),
			sheet.paneId,
			null,
			"restore",
		);
	}
	/* --- the bars are the handles --- */

	const barHold = useRef<{
		timer: number;
		pointerId: number;
		x: number;
		y: number;
	} | null>(null);
	/** The Pane whose bar is being held, for the bar's own feedback. */
	const [barHolding, setBarHolding] = useState<string | null>(null);
	function stopBarHold() {
		if (barHold.current) window.clearTimeout(barHold.current.timer);
		barHold.current = null;
		setBarHolding(null);
	}
	useEffect(() => stopBarHold, []);
	/**
	 * The Pane bar is the Ground's handle. Rooted: hold it about a second
	 * and the Ground lifts. Floating: a plain drag lifts it, like any
	 * Card. Covered, it is nobody's handle.
	 */
	function paneBarDown(
		event: ReactPointerEvent<HTMLElement>,
		pane: PaneNode,
	) {
		if (event.button !== 0 || barHold.current || dragRef.current) return;
		if ((event.target as HTMLElement).closest("button")) return;
		const ground = sheetsOf(pane)[0];
		if (!ground?.card || pane.covers.length || !allows("lift")) return;
		const bar = event.currentTarget;
		const lift = {
			pointerId: event.pointerId,
			x: event.clientX,
			y: event.clientY,
		};
		event.preventDefault();
		if (!isRooted(pane)) {
			liftSheet(ground, lift, "Drag bar", bar);
			return;
		}
		if (pane.line.length < 2) return;
		setBarHolding(pane.id);
		barHold.current = {
			pointerId: event.pointerId,
			x: event.clientX,
			y: event.clientY,
			timer: window.setTimeout(() => {
				barHold.current = null;
				setBarHolding(null);
				liftGround(ground, lift, bar);
			}, GROUND_PRESS_MS),
		};
	}
	function paneBarMove(event: ReactPointerEvent<HTMLElement>) {
		const hold = barHold.current;
		if (!hold || hold.pointerId !== event.pointerId) return;
		if (
			Math.hypot(event.clientX - hold.x, event.clientY - hold.y) >
			CLICK_SLOP
		)
			stopBarHold();
	}
	/** A Cover's bar lifts the Cover, straight into the hand. */
	function coverBarDown(
		event: ReactPointerEvent<HTMLElement>,
		sheet: SheetRef,
	) {
		if (event.button !== 0 || dragRef.current) return;
		if ((event.target as HTMLElement).closest("button")) return;
		event.preventDefault();
		liftSheet(
			sheet,
			{ pointerId: event.pointerId, x: event.clientX, y: event.clientY },
			"Drag bar",
			event.currentTarget,
		);
	}

	/** A Segment or a Link dragged past the slop: a fresh Card, from nowhere. */
	function liftLoose(
		pending: PendingLift,
		event: ReactPointerEvent<HTMLElement>,
	) {
		if (!allows("drag") || dragRef.current || settlingRef.current) return;
		const card = present(pending.make());
		log(`Drag: ${subjectLabel(card.subject)} lifts as a fresh Card`);
		swallowClick.current = true;
		const lift = {
			pointerId: pending.pointerId,
			x: pending.x,
			y: pending.y,
		};
		const box = handBox(lift, pending.paneId, LOOSE_CARD_REM * remPx());
		setLoose({ card, box });
		/* the handle exists once the Card has rendered; finish the lift then */
		queueLift.current = { card, lift, box, paneId: pending.paneId, event };
	}
	const queueLift = useRef<{
		card: Presentation;
		lift: Lift;
		box: Box;
		paneId: string;
		event: ReactPointerEvent<HTMLElement>;
	} | null>(null);
	/* an effect, not a layout effect: the Card registers its handle in one */
	useEffect(() => {
		const queued = queueLift.current;
		if (!queued || !loose || loose.card.id !== queued.card.id) return;
		queueLift.current = null;
		startLift(
			queued.card,
			queued.lift,
			queued.box,
			queued.paneId,
			null,
			"vanish",
		);
		frameMove(queued.event);
	});
	function segmentDown(
		event: ReactPointerEvent<HTMLElement>,
		paneId: string,
		make: () => Subject,
	) {
		if (event.button !== 0 || dragRef.current) return;
		pendingLift.current = {
			pointerId: event.pointerId,
			x: event.clientX,
			y: event.clientY,
			paneId,
			make,
		};
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
		const pending = pendingLift.current;
		if (pending && pending.pointerId === event.pointerId) {
			if (
				Math.hypot(
					event.clientX - pending.x,
					event.clientY - pending.y,
				) > ARM_SLOP
			) {
				pendingLift.current = null;
				liftLoose(pending, event);
			}
			return;
		}
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
				if (dx < 0 && allows("sweep") && d.deckSheet !== null) {
					d.arm = "sweep";
					d.armedAt = event.timeStamp;
					log("Drag ←: armed Sweep");
					setDrag({ ...d });
				} else release(d, dx < 0 ? "Drag ←" : "Drag →");
			} else if (dy < 0 && allows("expand")) {
				d.arm = "expand";
				d.armedAt = event.timeStamp;
				log("Drag ↑: armed Open as Cover");
				setDrag({ ...d });
			} else release(d, "Drag ↓");
		}

		if (d.arm === "sweep") {
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
			? destinationAt(event.clientX, event.clientY, d)
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
			/* a Card picked up again while it was settling is in hand now,
			   and tearing the drag down under it would drop it */
			if (dragRef.current) return;
			landWatch.current = [];
			returnRun.current = [];
			landedRef.current = false;
			setLanded(false);
			setReturning(false);
			setLoose(null);
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
	 * whole of its journey home.
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
	 * A Card leaving for good. Reduced motion keeps the fade and drops the
	 * 720 px of travel: the Card still visibly leaves, it just does not
	 * fly across the page.
	 */
	function flight(h: NoteHandle): Promise<unknown> {
		return reduce
			? Promise.all([animate(h.opacity, 0, transition(FLY_FADE))])
			: Promise.all([
					animate(
						h.x,
						h.x.get() - FLY_DISTANCE,
						transition(FLY_TRAVEL),
					),
					animate(h.rotate, FLY_ROTATE_TO, transition(FLY_ROTATE)),
					animate(h.opacity, 0, transition(FLY_FADE)),
				]);
	}
	/** A loose Card let go with nothing under it: it fades where it is. */
	function vanish(d: Drag) {
		log("Let go: the Card goes");
		settle(
			() => Promise.all([animate(d.h.opacity, 0, transition(FLY_FADE))]),
			() => {},
		);
	}
	/** A lifted Sheet let go with nowhere to be: it is the Sheet again. */
	function restore(d: Drag, reason: string) {
		const checkpoint = gestureCheckpoint.current;
		gestureCheckpoint.current = null;
		log(`${reason}: ${subjectLabel(d.card.subject)} is a Sheet again`);
		resetTransforms(d.h);
		if (checkpoint) setLayout(checkpoint.layout);
		setLoose(null);
		setDrag(null);
		setDestination(null);
		setPastCommit(false);
	}
	/** Whole-Deck swipe: the held Card and its Deck fly together. */
	function sweepByDrag(d: Drag, reason: string) {
		if (d.deckSheet === null) return;
		const sheet = findSheet(layoutRef.current, d.deckSheet);
		if (!sheet?.deck) return;
		const cards = visibleCards(sheet.deck);
		const fly = cards.flatMap((card) => {
			const h = handles.current.get(card.id);
			return h ? [flight(h)] : [];
		});
		sweep(d.deckSheet, reason, () => Promise.all(fly));
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
		gestureCheckpoint.current = null;
		dragRef.current = null;
		setDrag(null);
		setDestination(null);
		setPastCommit(false);
		commit();
		/* a loose Card is a Sheet now; its Presentation lives in the layout */
		setLoose(null);
	}
	/** A release with nothing under it. */
	function goHome(d: Drag) {
		if (d.home === "slot") snapBack(d.h);
		else if (d.home === "restore") restore(d, "Released in place");
		else vanish(d);
	}
	function frameUp(event: ReactPointerEvent<HTMLElement>) {
		pendingLift.current = null;
		stopBarHold();
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
				if (d.home === "slot")
					log("Released in place: stays on the Deck");
				goHome(d);
				return;
			}
			setDrag(null);
			const sheet =
				d.deckSheet === null
					? null
					: findSheet(layoutRef.current, d.deckSheet);
			if (!sheet?.deck) return;
			const deck = sheet.deck;
			if (expandedOf(deck, visibleCards(deck))?.id === card.id)
				log("Tap expanded: nothing; drag ↑ to open");
			else expand(sheet.sheetId, card);
			return;
		}
		if (d.arm === "sweep") {
			if (dx < -COMMIT || vx < -THROW) sweepByDrag(d, "Swipe ←");
			else snapBack(h);
			return;
		}
		if (d.arm === "expand") {
			if (dy < -COMMIT || vy < -THROW)
				growFromHand(d, () => openCover(d.paneId, card, "Open ↑"));
			else snapBack(h);
			return;
		}
		if (
			allows("sweep") &&
			d.deckSheet !== null &&
			vx < -THROW &&
			Math.abs(vx) > Math.abs(vy)
		) {
			sweepByDrag(d, "Throw ←");
			return;
		}
		if (allows("expand") && vy < -THROW) {
			const target = destinationAt(event.clientX, event.clientY, d);
			const paneId =
				target && "paneId" in target ? target.paneId : d.paneId;
			growFromHand(d, () => openCover(paneId, card, "Throw ↑"));
			return;
		}
		const target = destinationAt(event.clientX, event.clientY, d);
		if (!target || target.kind === "return") {
			goHome(d);
			return;
		}
		if (target.kind === "sheet")
			growFromHand(d, () =>
				openCover(target.paneId, card, "Drop in Pane"),
			);
		else growFromHand(d, () => splitPane(card, target.paneId, target.edge));
	}
	function cancelDrag(event?: ReactPointerEvent<HTMLElement>) {
		pendingLift.current = null;
		stopBarHold();
		const d = dragRef.current;
		if (!d || (event && event.pointerId !== d.pointerId)) return;
		dragRef.current = null;
		if (root.current?.hasPointerCapture(d.pointerId))
			root.current.releasePointerCapture(d.pointerId);
		log("Drag cancelled");
		if (d.lifted && d.home !== "slot") {
			restore(d, "Cancel");
			return;
		}
		const checkpoint = gestureCheckpoint.current;
		gestureCheckpoint.current = null;
		if (d.lifted && checkpoint) {
			resetTransforms(d.h);
			setLayout(checkpoint.layout);
			setLoose(null);
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
			if (!allows("dismiss")) return;
			const pane = findPane(layoutRef.current, activePane.current);
			const top = pane ? topSheetOf(pane) : null;
			if (top?.deck && visibleCards(top.deck).length)
				sweep(top.sheetId, "Esc");
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	});

	/* --- a dismissive click sweeps the top Sheet's Deck --- */

	function pageDown(event: ReactPointerEvent<HTMLElement>) {
		dismissOnClick.current = false;
		const at = (event.target as HTMLElement).closest<HTMLElement>(
			"[data-deck-pane], [data-pane]",
		);
		const paneId = at?.dataset.deckPane ?? at?.dataset.pane;
		if (paneId) activePane.current = paneId;
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
		if (swallowClick.current) {
			swallowClick.current = false;
			event.preventDefault();
			event.stopPropagation();
			return;
		}
		if (!allows("dismiss") || !dismissOnClick.current) return;
		const target = event.target as HTMLElement;
		if (target.closest(DISMISS_EXEMPT_SELECTOR)) return;
		const sheetId = Number(
			target.closest<HTMLElement>("[data-sheet-id]")?.dataset.sheetId,
		);
		const paneId =
			target.closest<HTMLElement>("[data-deck-pane]")?.dataset.deckPane;
		const pane = paneId ? findPane(layoutRef.current, paneId) : null;
		const top = pane ? topSheetOf(pane) : null;
		/* only a click on the top Sheet is a click on that Sheet */
		const sheet =
			Number.isFinite(sheetId) && sheetId
				? findSheet(layoutRef.current, sheetId)
				: top;
		if (!sheet?.deck || !visibleCards(sheet.deck).length) return;
		const its = findPane(layoutRef.current, sheet.paneId);
		if (!its || topSheetOf(its).sheetId !== sheet.sheetId) return;
		sweep(sheet.sheetId, "Click page");
	}

	/* --- render --- */

	const dragging = drag !== null;
	const showZones = allows("drop") && dragging && drag.free;
	const armLabel =
		drag?.arm === "sweep"
			? "Sweep"
			: drag?.arm === "expand"
				? "Open as Cover"
				: null;
	const register = (id: number, handle: NoteHandle | null) => {
		if (handle) handles.current.set(id, handle);
		else handles.current.delete(id);
	};

	/** The return zone over a Deck's footprint: drawn on demand, where it is read. */
	function renderReturnZone(sheet: SheetRef, paneBox: Box) {
		const deck = sheet.deck;
		if (!deck || !showZones || drag?.deckSheet !== sheet.sheetId)
			return null;
		const box = returnZone(deck, paneBox);
		return (
			<div
				key={`return-${sheet.sheetId.toString()}`}
				aria-hidden="true"
				data-return-zone=""
				data-active={destination?.kind === "return"}
				data-shown={zonesVisible}
				className="pointer-events-none absolute flex items-end justify-center rounded-[1.1rem] border border-dashed border-line-strong bg-paper/60 pb-3 transition-colors data-[active=true]:border-link data-[active=true]:bg-link/15 data-[shown=false]:invisible"
				style={{
					...box,
					zIndex: Z.returnZone,
					transitionDuration: `${ZONE_FEEDBACK_MS}ms`,
				}}
			>
				<span className="rounded-md bg-raised px-2 py-0.5 font-mono text-[0.62rem] font-bold tracking-[0.12em] text-link uppercase">
					Back on the Deck
				</span>
			</div>
		);
	}

	/** The drop regions of every resting Pane, drawn on demand where they are read. */
	function renderZones(): ReactNode[] {
		if (!showZones || !drag) return [];
		return panesOf(layout).flatMap((pane) => {
			const box = restBoxes[pane.id];
			return box
				? [
						<DropZones
							key={`zones-${pane.id}`}
							paneId={pane.id}
							regions={dropRegions(box, drag.card, rem)}
							destination={destination}
							shown={zonesVisible}
						/>,
					]
				: [];
		});
	}

	function renderPane(pane: PaneNode): ReactNode {
		const rooted = isRooted(pane);
		const ground = groundOf(pane);
		const covered = pane.covers.length > 0;
		const trail = pane.line.map((rung) => rungLabel(rung));
		/* the bar is a handle only while its Ground is a Sheet and uncovered */
		const handle =
			ground.kind === "Sheet" && !covered && allows("lift")
				? rooted
					? "press"
					: "drag"
				: "none";
		const holdingHere = barHolding === pane.id;
		/* the Pane bar is the Ground's: ← steps its line (not while it is
		   covered), X closes a Floating Pane with everything on it. Each
		   Cover carries its own bar. */
		const control = rooted
			? {
					glyph: "←",
					label:
						pane.line.length > 1
							? `Back to ${rungLabel(pane.line[pane.line.length - 2] as Rung)}`
							: "At the Menu",
					enabled:
						pane.line.length > 1 && !covered && allows("collapse"),
				}
			: {
					glyph: "×",
					label: "Close pane",
					enabled: allows("collapse"),
				};
		return (
			<section
				key={pane.id}
				data-deck-pane={pane.id}
				data-pane-kind={rooted ? "rooted" : "floating"}
				aria-label={
					rooted
						? `Rooted pane ${pane.id}`
						: `Floating pane ${pane.id}`
				}
				data-preview={pane.preview}
				className={`relative h-full min-h-0 overflow-hidden bg-paper ${pane.preview ? "pointer-events-none" : ""}`}
			>
				{/* the Pane bar: Sheet chrome, owned by the Pane, and the
				    Ground's handle. A hold shrinks the bar a touch. */}
				<motion.div
					data-pane-bar=""
					data-handle={handle}
					data-holding={holdingHere}
					initial={false}
					animate={{ scale: holdingHere ? 0.985 : 1 }}
					transition={transition(
						holdingHere ? GROUND_SHRINK : HOLD_RELEASE,
					)}
					onPointerDown={(event) => paneBarDown(event, pane)}
					onPointerMove={paneBarMove}
					onPointerUp={stopBarHold}
					onPointerCancel={stopBarHold}
					onPointerLeave={stopBarHold}
					className={`absolute inset-x-0 top-0 z-20 flex items-center gap-2 border-b bg-paper ps-2 pe-3 select-none ${pane.preview ? "border-dashed border-link/60" : "border-line"} ${handle === "drag" ? "cursor-grab touch-none active:cursor-grabbing" : handle === "press" ? "cursor-pointer touch-none" : ""}`}
					style={{
						height: `${BAR_REM.toString()}rem`,
						transformOrigin: "0% 50%",
					}}
				>
					<button
						type="button"
						disabled={!control.enabled}
						aria-label={control.label}
						title={control.label}
						onClick={() => back(pane.id, control.glyph)}
						className="grid h-7 min-w-7 place-items-center rounded-md px-1.5 text-[0.9rem] text-link hover:bg-raised disabled:text-ink-muted disabled:hover:bg-transparent"
					>
						{control.glyph}
					</button>
					<nav
						aria-label="Trail"
						className="flex min-w-0 items-center gap-1 truncate font-mono text-[0.62rem] tracking-[0.08em] text-ink-muted uppercase"
					>
						<AnimatePresence initial={false}>
							{trail.map((crumb, index) => (
								<motion.span
									key={`${index.toString()}-${crumb}`}
									/* a preview Pane is there at once, crumbs and all */
									initial={
										pane.preview ? false : { opacity: 0 }
									}
									animate={{
										opacity: 1,
										transition: transition(BAR_ENTER),
									}}
									exit={{
										opacity: 0,
										transition: transition(BAR_EXIT),
									}}
									className="contents"
								>
									{index > 0 ? (
										<span aria-hidden="true">›</span>
									) : null}
									<span
										className={
											index === trail.length - 1
												? holdingHere
													? "text-link"
													: "text-ink"
												: undefined
										}
									>
										{crumb}
									</span>
								</motion.span>
							))}
						</AnimatePresence>
						{handle === "press" ? (
							<span className="ms-2 shrink-0 normal-case tracking-normal text-ink-muted">
								hold to lift
							</span>
						) : null}
					</nav>
				</motion.div>
				{/* the Menu and the Library are the Ground's first rungs: lists, in the Pane */}
				{ground.kind === "Menu" ? (
					<GroundList
						title="Menu"
						items={[{ key: "library", label: "Library" }]}
						onPick={() => openLibrary(pane.id)}
					/>
				) : ground.kind === "Library" ? (
					<GroundList
						title="Library"
						items={TEXTS.map((text) => ({
							key: text.id,
							label: text.title,
						}))}
						onPick={(key) => openText(pane.id, textById(key))}
					/>
				) : null}
			</section>
		);
	}

	function renderLayout(node: LayoutNode): ReactNode {
		if (node.kind === "Pane") return renderPane(node);
		const [a, b] = node.children;
		return (
			/* keyed by its shape too: a preview that swaps sides is a new
			   split, and opens at its size rather than inheriting one */
			<ResizablePanelGroup
				key={`${node.id}:${a.id}:${b.id}`}
				orientation={node.axis}
			>
				<ResizablePanel
					id={a.id}
					minSize={240}
					defaultSize={
						node.freshId === a.id ? node.freshSize : undefined
					}
				>
					{renderLayout(a)}
				</ResizablePanel>
				<ResizableHandle aria-label="Resize panes" />
				<ResizablePanel
					id={b.id}
					minSize={240}
					defaultSize={
						node.freshId === b.id ? node.freshSize : undefined
					}
				>
					{renderLayout(b)}
				</ResizablePanel>
			</ResizablePanelGroup>
		);
	}

	/**
	 * The top Sheet's Deck: Cards in slots one Heading row apart. While a
	 * ghost Cover hides the Deck, only the Card in hand is drawn, in the
	 * place it has on the Deck it will show again.
	 */
	function renderDeck(
		sheet: SheetRef,
		paneBox: Box,
		heldOnly = false,
	): ReactNode[] {
		const deck = sheet.deck;
		if (!deck) return [];
		const cards = visibleCards(deck);
		const count = cards.length;
		const headerPx = HEADER_REM * rem;
		const slotHeight = cardHeightPx(count);
		const order = [...cards].reverse();
		const expanded = expandedOf(deck, cards);
		const openAt = expanded ? order.indexOf(expanded) : count - 1;
		const column = deckColumn(deck, paneBox);
		return order.flatMap((card, index) => {
			const place: Place =
				index < openAt ? "above" : index > openAt ? "below" : "open";
			const held = drag?.moved === true && drag.card.id === card.id;
			if (heldOnly && !held) return [];
			const slot: Box = {
				left: column.left,
				top: column.top + index * headerPx,
				width: column.width,
				height: slotHeight,
			};
			/* z rises toward the expanded Card from both sides; a Held
			   Card is over all of them until it has landed */
			const z =
				held && !landed
					? Z.held
					: Z.deck +
						(place === "open"
							? 9
							: place === "above"
								? index
								: count - 1 - index);
			return (
				<PresentationView
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
					paneId={sheet.paneId}
					sheetId={null}
					ground={false}
					showText={showReader}
					litWord={null}
					epoch={layoutEpoch}
					register={register}
					onDown={(event) => cardDown(event, card, sheet)}
					onHoldLift={() => {}}
					onFollow={() => {}}
					onSegment={() => {}}
					onSegmentDown={() => {}}
				/>
			);
		});
	}

	/**
	 * A Cover's own bar: its ← and its label, sitting on the Cover's box
	 * above the Note. Pane chrome, not Note content (ADR 0006), so it is
	 * drawn beside the Note rather than inside it, and arrives a beat after
	 * the box the way the Pane bar used to.
	 */
	function renderCoverBar(
		sheet: SheetRef,
		box: Box,
		z: number,
		isTop: boolean,
	): ReactNode {
		const card = sheet.card;
		if (!card) return null;
		const label = deckHolding(layout, card.id)
			? "Collapse back to card"
			: "Close cover";
		const ghost = sheet.preview;
		const grabs = isTop && !ghost && allows("lift");
		return (
			<motion.div
				key={
					ghost
						? `ghost-bar-${sheet.paneId}`
						: `bar-${sheet.sheetId.toString()}`
				}
				data-cover-bar={sheet.sheetId}
				data-pane={sheet.paneId}
				data-preview={ghost || undefined}
				/* a ghost is there at once: it previews a state, it does not arrive */
				initial={ghost ? false : { opacity: 0 }}
				animate={{ opacity: 1, transition: transition(BAR_ENTER) }}
				onPointerDown={
					grabs ? (event) => coverBarDown(event, sheet) : undefined
				}
				className={`absolute flex items-center gap-2 rounded-t-[0.9rem] border border-b-0 bg-paper ps-2 pe-3 select-none ${ghost ? "pointer-events-none border-dashed border-link" : "pointer-events-auto border-line-strong"} ${grabs ? "cursor-grab touch-none active:cursor-grabbing" : ""}`}
				style={{
					left: box.left,
					top: box.top,
					width: box.width,
					height: `${BAR_REM.toString()}rem`,
					zIndex: z,
				}}
			>
				<button
					type="button"
					disabled={ghost || !isTop || !allows("collapse")}
					aria-label={label}
					title={label}
					onClick={() => coverBack(sheet.paneId, sheet.sheetId)}
					className="grid h-7 min-w-7 place-items-center rounded-md px-1.5 text-[0.9rem] text-link hover:bg-raised disabled:text-ink-muted disabled:hover:bg-transparent"
				>
					←
				</button>
				<span className="min-w-0 truncate font-mono text-[0.62rem] tracking-[0.08em] text-ink uppercase">
					{subjectLabel(card.subject)}
				</span>
			</motion.div>
		);
	}

	/**
	 * Every Note, in whatever form it is in right now, with the box it
	 * should occupy: each Pane's Ground and Covers, the top Sheet's Deck,
	 * and a loose Card in hand. Read off the display layout, so a ghost is
	 * drawn by the same path as the Sheet it previews, and the Deck under
	 * a ghost Cover is hidden the way it would be. The Card in hand stays
	 * in hand: a ghost of it is a second element of the same Subject.
	 */
	function renderNotes(): ReactNode {
		const notes: ReactNode[] = [];
		const rendered = new Set<number>();
		for (const pane of panesOf(displayLayout)) {
			const paneBox = paneBoxes[pane.id];
			if (!paneBox) continue;
			const sheets = sheetsOf(pane);
			const top = sheets[sheets.length - 1] as SheetRef;
			sheets.forEach((sheet, index) => {
				if (!sheet.card) return;
				const isTop = index === sheets.length - 1;
				const ghost = sheet.preview;
				if (!ghost) rendered.add(sheet.card.id);
				const coverBox = sheet.ground ? null : coverBoxIn(paneBox, rem);
				if (coverBox)
					notes.push(
						renderCoverBar(sheet, coverBox, Z.sheet + index, isTop),
					);
				notes.push(
					<PresentationView
						key={
							ghost
								? `ghost-${pane.id}-${sheet.sheetId.toString()}`
								: sheet.card.id
						}
						card={sheet.card}
						form="sheet"
						place="open"
						box={
							coverBox
								? {
										...coverBox,
										top: coverBox.top + BAR_REM * rem,
										height: Math.max(
											0,
											coverBox.height - BAR_REM * rem,
										),
									}
								: groundBoxIn(paneBox, rem)
						}
						z={Z.sheet + index}
						held={false}
						arm={null}
						free={false}
						pastCommit={false}
						armLabel={null}
						paneId={pane.id}
						sheetId={ghost ? null : sheet.sheetId}
						ground={sheet.ground}
						covered={!isTop}
						preview={ghost}
						showText={showReader}
						litWord={isTop ? (sheet.deck?.word ?? null) : null}
						epoch={layoutEpoch}
						register={ghost ? () => {} : register}
						onDown={() => {}}
						onHoldLift={(lift) =>
							liftSheet(sheet, lift, "Hold margin")
						}
						onFollow={(link) => follow(pane.id, link)}
						onSegment={(word, element) =>
							deal(pane.id, sheet.sheetId, word, element)
						}
						onSegmentDown={(event, make) =>
							segmentDown(event, pane.id, make)
						}
					/>,
				);
			});
			/* the Deck is the real top Sheet's; a ghost Cover hides it, and
			   the Card in hand is the one thing still drawn from it */
			const real = findPane(layout, pane.id);
			const realTop = real ? topSheetOf(real) : null;
			if (!realTop?.deck) continue;
			const hidden = top.preview && !top.ground;
			if (!hidden)
				for (const card of visibleCards(realTop.deck))
					rendered.add(card.id);
			else if (drag) rendered.add(drag.card.id);
			notes.push(...renderDeck(realTop, paneBox, hidden));
			notes.push(renderReturnZone(realTop, paneBox));
		}
		/* a Card from nowhere, or a Sheet in hand whose Deck is hidden or
		   gone: nothing above drew it, and the hand still holds it */
		const inHand =
			loose && !rendered.has(loose.card.id)
				? { card: loose.card, box: loose.box }
				: drag?.lifted && !rendered.has(drag.card.id)
					? { card: drag.card, box: drag.origin }
					: null;
		if (inHand) {
			const held = drag?.card.id === inHand.card.id;
			notes.push(
				<PresentationView
					key={inHand.card.id}
					card={inHand.card}
					form="card"
					place="open"
					box={held && drag ? drag.origin : inHand.box}
					z={Z.held}
					held={held}
					arm={held ? (drag?.arm ?? null) : null}
					free={held ? (drag?.free ?? false) : false}
					pastCommit={held && pastCommit}
					armLabel={held ? armLabel : null}
					paneId={drag?.paneId ?? ROOT_PANE}
					sheetId={null}
					ground={false}
					showText={showReader}
					litWord={null}
					epoch={layoutEpoch}
					register={register}
					onDown={() => {}}
					onHoldLift={() => {}}
					onFollow={() => {}}
					onSegment={() => {}}
					onSegmentDown={() => {}}
				/>,
			);
		}
		notes.push(...renderZones());
		return notes;
	}

	const frame = (
		<div
			ref={root}
			data-deck-frame=""
			tabIndex={-1}
			onPointerDownCapture={(event) => {
				root.current?.focus({ preventScroll: true });
				pageDown(event);
			}}
			onPointerMoveCapture={pageMove}
			onPointerUpCapture={pageUp}
			onScrollCapture={pageScroll}
			onClickCapture={pageClick}
			className="relative h-full min-h-0 overflow-hidden"
			onPointerMove={frameMove}
			onPointerUp={frameUp}
			onPointerCancel={cancelDrag}
		>
			{renderLayout(displayLayout)}
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
				<div className="flex flex-col gap-2 text-[0.8rem] text-ink">
					<label className="flex cursor-pointer items-center justify-between gap-3 select-none">
						<span>Swipe left sweeps the Deck</span>
						<input
							type="checkbox"
							checked={swipeSweeps}
							onChange={(event) =>
								setSwipeSweeps(event.target.checked)
							}
							className="accent-link"
						/>
					</label>
					<label className="flex cursor-pointer items-center justify-between gap-3 select-none">
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
					<button
						type="button"
						onClick={spawnEmptyPane}
						className="self-start text-[0.78rem] text-link underline-offset-2 hover:underline"
					>
						Spawn an empty Rooted Pane
					</button>
				</div>
			}
		>
			{frame}
		</ModelShell>
	);
}

/** Where a seeded Deck sits when no word was selected to anchor it. */
function defaultAnchorTop(embedded: boolean): number {
	return (embedded ? 3 : 8) * 16;
}

function subjectOfLink(link: NoteLink): Subject {
	return link.kind === "Text"
		? { kind: "Text", text: textById(link.textId), focus: link.focus }
		: { kind: "Note", note: noteById(link.noteId) };
}

/**
 * The opening scene. Every scene starts a Rooted Pane at the end of its
 * line, Menu › Library › Text, so ← has rungs to step down; a seeded scene
 * deals a Deck for "noch", and the Sheet scene opens its first Card.
 */
function initialLayout(
	scene: "empty" | "deck" | "sheet",
	nextId: { current: number },
	nextSheet: { current: number },
): LayoutNode {
	const text: Presentation = {
		id: nextId.current++,
		subject: { kind: "Text", text: FIRST_TEXT, focus: null },
	};
	const cards =
		scene === "empty"
			? []
			: deckFor("noch").map((note) => ({
					id: nextId.current++,
					subject: { kind: "Note" as const, note },
				}));
	const deck: Deck | null = cards.length
		? {
				word: "noch",
				anchor: null,
				cards,
				expandedId: null,
			}
		: null;
	const first = cards[0];
	return {
		kind: "Pane",
		id: ROOT_PANE,
		line: [
			{ id: nextSheet.current++, kind: "Menu", deck: null },
			{ id: nextSheet.current++, kind: "Library", deck: null },
			{ id: nextSheet.current++, kind: "Sheet", card: text, deck },
		],
		covers:
			scene === "sheet" && first
				? [{ id: nextSheet.current++, card: first, deck: null }]
				: [],
	};
}

/* ----------------------------------------------------------- ground list */

/** A Menu or a Library rung: a list the Ground walks by tapping. */
function GroundList({
	title,
	items,
	onPick,
}: {
	title: string;
	items: readonly { readonly key: string; readonly label: string }[];
	onPick: (key: string) => void;
}) {
	return (
		<div
			className="h-full overflow-auto"
			style={{ paddingTop: `${BAR_REM.toString()}rem` }}
		>
			<div className="mx-auto w-full max-w-[42rem] px-8 pt-10 pb-12">
				<h2 className="mb-5 font-sans text-[0.68rem] font-bold tracking-[0.12em] text-ink-muted uppercase">
					{title}
				</h2>
				<ul className="flex flex-col gap-1">
					{items.map((item) => (
						<li key={item.key}>
							<button
								type="button"
								data-ground-item={item.key}
								onClick={() => onPick(item.key)}
								className="w-full rounded-md px-3 py-2 text-left font-serif text-[1.15rem] text-ink hover:bg-raised"
							>
								{item.label}
							</button>
						</li>
					))}
				</ul>
			</div>
		</div>
	);
}

/* ----------------------------------------------------------------- note */

/**
 * One Presentation, in one of its forms. Its box is four motion values
 * that animate to whatever target the model hands it; the drag transforms
 * sit on top of the box, so a release can fold them in and grow from there.
 * The Blocks inside read `form` and `place` and adapt.
 */
function PresentationView({
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
	sheetId,
	ground,
	covered = false,
	preview = false,
	epoch,
	showText,
	litWord,
	register,
	onDown,
	onHoldLift,
	onFollow,
	onSegment,
	onSegmentDown,
}: {
	card: Presentation;
	form: NoteForm;
	place: Place;
	box: Box;
	z: number;
	held: boolean;
	arm: Arm | null;
	free: boolean;
	pastCommit: boolean;
	armLabel: string | null;
	paneId: string;
	/** The Sheet this is, when it is one; a Deck can belong to it. */
	sheetId: number | null;
	/** A Ground fills its Pane and wears no Card chrome. */
	ground: boolean;
	/** A Sheet under another Sheet in the same Pane. */
	covered?: boolean;
	/** A ghost: the Sheet a drop would make, where it would sit; seen, never touched. */
	preview?: boolean;
	/** The Panes' measurement pass; see `layoutEpoch`. */
	epoch: number;
	/** A Text Ground with the reader hidden: the workbench's quiet scenes. */
	showText: boolean;
	/** The word this Sheet's Deck was dealt for, lit in its Segments. */
	litWord: string | null;
	register: (id: number, handle: NoteHandle | null) => void;
	onDown: (event: ReactPointerEvent<HTMLElement>) => void;
	onHoldLift: (lift: Lift) => void;
	onFollow: (link: NoteLink) => void;
	onSegment: (word: string, element: HTMLElement) => void;
	onSegmentDown: (
		event: ReactPointerEvent<HTMLElement>,
		make: () => Subject,
	) => void;
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
	const shownScale = useTransform(
		() => scale.get() * restScale * (1 + lift.get() * LIFT_SCALE),
	);
	const shownShadow = useTransform(() => liftShadow(lift.get()));
	/**
	 * The box's origin travels as a transform, not as `left`/`top`, so two
	 * of the four properties on MORPH leave the layout path; `width` and
	 * `height` have to stay, because a Note genuinely reflows its text
	 * between a Card and a Sheet. The drag offset rides along in the same
	 * translate, so the two cannot fight over it.
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
		if (preview) return;
		register(card.id, handle.current);
		return () => {
			register(card.id, null);
		};
		/* register is a fresh closure every render; the handle is not */
	}, [card.id, preview]);

	/* the box: animate to wherever the model puts the Note now. A preview
	   is placed, never moved: it appears where it will be, at once. And a
	   box that changed because the Panes were re-measured, with the form
	   unchanged, is a resize, not a move: the Note is where its Pane put
	   it, at once. A change of form in the same pass is still a morph. */
	const boxPass = useRef({ form, epoch });
	useEffect(() => {
		const previous = boxPass.current;
		boxPass.current = { form, epoch };
		const resized = previous.epoch !== epoch && previous.form === form;
		if (reduce || preview || resized) {
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
		preview,
		epoch,
		form,
		MORPH,
	]);

	/* the hold on a Sheet margin or a Rooted Ground's Heading: shrink toward
	   the finger, then lift. Reduced motion keeps the hold — the border still
	   turns — without the shrink, which is the only part of it that moves. */
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

	function startHold(event: ReactPointerEvent<HTMLElement>) {
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
	function holdMove(event: ReactPointerEvent<HTMLElement>) {
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
		if (covered) return;
		/* a Sheet is handled by its bar, never by its content: a Card is
		   picked up from anywhere, a Sheet's body only scrolls */
		if (form === "card") onDown(event);
	}

	const sheet = form === "sheet";
	const below = place === "below" && !sheet;
	/**
	 * Which transition the Heading and the Blocks ride when they swap ends.
	 * A change of form is a morph on `MORPH`; a deck tap changes only which
	 * edge the Heading sits at, on `HEADING_EDGE`.
	 */
	const previousForm = useRef(form);
	const morphing = previousForm.current !== form;
	useEffect(() => {
		previousForm.current = form;
	}, [form]);
	const positionSpec = morphing ? MORPH : transition(HEADING_EDGE);
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
		arm === "sweep"
			? "var(--destructive)"
			: arm === "expand" || free || holding || preview
				? "var(--link)"
				: ground
					? "transparent"
					: "var(--line-strong)";
	const subject = card.subject;
	const dataForm = ground ? "ground" : form;

	return (
		<motion.article
			ref={section}
			aria-label={`${subjectLabel(subject)} ${ground ? "ground" : sheet ? "sheet" : "card"}`}
			data-card-id={card.id}
			data-form={dataForm}
			data-place={sheet ? undefined : place}
			data-held={held || undefined}
			data-arm={arm ?? undefined}
			data-past={pastCommit}
			data-holding={holding}
			data-pane={paneId}
			data-sheet-id={sheetId ?? undefined}
			data-preview={preview || undefined}
			/* The border is the arm state. A Note is dealt wearing its
			   resting colour; only arming changes it. */
			initial={false}
			animate={{ borderColor }}
			transition={transition(NOTE_BORDER)}
			style={{
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
				transformOrigin: origin,
				...(preview ? { borderStyle: "dashed" } : {}),
			}}
			onPointerDown={down}
			/* the Rooted Ground's Heading press is watched here: the same
			   hold as a margin, one second long, ended by a move or a release */
			onPointerMove={holdMove}
			onPointerUp={stopHold}
			onPointerCancel={stopHold}
			onPointerLeave={stopHold}
			/* `contain` stops the width/height spring's recalc at this Note
			   rather than letting it walk the deck */
			className={`${preview ? "pointer-events-none" : "pointer-events-auto"} absolute flex flex-col overflow-hidden border bg-paper [contain:layout_paint] select-none ${ground ? "" : sheet ? "rounded-b-[0.9rem]" : "rounded-[0.9rem]"} ${sheet ? "" : "cursor-grab touch-none active:cursor-grabbing"}`}
		>
			{/* the content column: one width in every form, centred in a wide box.
			    A ghost's ink is quiet, on paper as opaque as any: nothing shows through */}
			<div
				className={`mx-auto flex min-h-0 w-full flex-1 flex-col ${preview ? "opacity-50" : ""}`}
				style={{
					maxWidth:
						sheet && subject.kind === "Text" ? "42rem" : CARD_WIDTH,
				}}
			>
				<HeadingBlock
					subject={subject}
					form={form}
					atBottom={below}
					layout={!held && morphing}
					offset={headingOffset}
					positionSpec={positionSpec}
				/>
				{/* the Blocks travel with the Heading: the row it vacates is
				    the row they take */}
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
						{subject.kind === "Text" ? (
							<TextBlock
								text={subject.text}
								focus={subject.focus}
								form={form}
								shown={showText}
								litWord={litWord}
								onSegment={onSegment}
								onSegmentDown={onSegmentDown}
							/>
						) : (
							<>
								<ContextsBlock
									note={subject.note}
									form={form}
									litWord={litWord}
									onSegment={onSegment}
									onSegmentDown={onSegmentDown}
								/>
								<BodyBlock note={subject.note} />
								<LinksBlock
									note={subject.note}
									form={form}
									onFollow={onFollow}
									onSegmentDown={onSegmentDown}
								/>
							</>
						)}
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
			{/* a Cover's own margins: hold one to lift the Cover as a Card */}
			{sheet && !ground && !covered && allows("lift")
				? MARGINS.map((margin) => (
						<div
							key={margin}
							aria-hidden="true"
							data-sheet-margin={margin}
							onPointerDown={(event) => startHold(event)}
							onPointerMove={holdMove}
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
						className={`absolute top-3 z-10 rounded-md border px-2 py-0.5 font-mono text-[0.62rem] font-bold tracking-[0.12em] uppercase ${arm === "sweep" ? "right-3 border-destructive bg-paper text-destructive" : "left-3 border-link bg-paper text-link"}`}
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
 * The Heading: pinned first, the Card's lift handle. In Card form
 * it is the one-line row (form, then gloss); in Sheet form the title grows
 * and the kind label shows above it. When the Card is a Card Tail the row
 * sits at the bottom edge.
 */
function HeadingBlock({
	subject,
	form,
	atBottom,
	layout,
	offset,
	positionSpec,
}: {
	subject: Subject;
	form: NoteForm;
	atBottom: boolean;
	layout: boolean;
	offset: MotionValue<number>;
	/** What the row's position rides; see `positionSpec` in `PresentationView`. */
	positionSpec: ReturnType<typeof motionOf>;
}) {
	const { transition, MORPH, KIND_LABEL, KIND_LABEL_Y } = useDeckMotion();
	const sheet = form === "sheet";
	const rem = remPx();
	const kind = subject.kind === "Text" ? "Text" : subject.note.kind;
	const title =
		subject.kind === "Text" ? subject.text.title : subject.note.tail.form;
	const gloss = subject.kind === "Text" ? "text" : subject.note.tail.gloss;
	return (
		<motion.div
			data-heading=""
			/* `initial={false}`: a Card is dealt at its size; only a change
			   of form is a move. */
			initial={false}
			layout={layout ? "position" : false}
			layoutDependency={`${form}:${atBottom.toString()}`}
			transition={{ ...MORPH, layout: positionSpec }}
			animate={{ height: (sheet ? SHEET_HEADER_REM : HEADER_REM) * rem }}
			style={{ order: atBottom ? 2 : 0, y: offset }}
			className={`relative flex w-full shrink-0 items-end gap-4 px-4 ${atBottom ? "" : "pb-2"}`}
		>
			<motion.span
				initial={false}
				animate={{
					opacity: sheet ? 1 : 0,
					y: sheet ? 0 : KIND_LABEL_Y,
				}}
				transition={transition(KIND_LABEL)}
				className="pointer-events-none absolute top-3 left-4 font-mono text-[0.62rem] font-bold tracking-[0.12em] text-ink-muted uppercase"
			>
				{kind}
			</motion.span>
			<motion.span
				initial={false}
				animate={{ fontSize: (sheet ? 1.5 : 1) * rem }}
				transition={MORPH}
				className={`min-w-0 flex-1 truncate font-serif leading-tight text-ink ${atBottom ? "pb-3" : ""}`}
			>
				{title}
			</motion.span>
			<span
				className={`shrink-0 pb-[0.15rem] text-[0.72rem] text-ink-muted ${atBottom ? "pb-3" : ""}`}
			>
				{gloss}
			</span>
		</motion.div>
	);
}

/**
 * A Segment: a word that deals when clicked and lifts when dragged, in
 * Sheet form. In Card form it is inert text (issue 485, provisional).
 */
function Segment({
	word,
	live,
	lit,
	focused,
	onSegment,
	onSegmentDown,
}: {
	word: string;
	live: boolean;
	lit: boolean;
	focused: boolean;
	onSegment: (word: string, element: HTMLElement) => void;
	onSegmentDown: (
		event: ReactPointerEvent<HTMLElement>,
		make: () => Subject,
	) => void;
}) {
	if (!live)
		return (
			<span data-segment={word} className={lit ? "text-ink" : undefined}>
				{word}
			</span>
		);
	return (
		<button
			type="button"
			data-word={word}
			aria-pressed={lit}
			aria-current={focused ? "location" : undefined}
			onPointerDown={(event) =>
				onSegmentDown(event, () => ({
					kind: "Note",
					note: noteFor("Reading", word),
				}))
			}
			onClick={(event) => onSegment(word, event.currentTarget)}
			className="rounded-[0.2rem] px-[0.08em] text-word-unknown decoration-word-resolving decoration-[1.5px] underline-offset-[0.2em] hover:underline aria-[current=location]:bg-selection/40 aria-pressed:bg-selection aria-pressed:text-selection-foreground"
		>
			{word}
		</button>
	);
}

/** A Text's Blocks: its Sentences, every word a Segment once it is a Sheet. */
function TextBlock({
	text,
	focus,
	form,
	shown,
	litWord,
	onSegment,
	onSegmentDown,
}: {
	text: DummyText;
	focus: TextFocus | null;
	form: NoteForm;
	shown: boolean;
	litWord: string | null;
	onSegment: (word: string, element: HTMLElement) => void;
	onSegmentDown: (
		event: ReactPointerEvent<HTMLElement>,
		make: () => Subject,
	) => void;
}) {
	const sheet = form === "sheet";
	const lit = useRef<HTMLParagraphElement>(null);
	/* a Cover pushed by Go to source arrives scrolled to its Sentence */
	useEffect(() => {
		if (sheet && focus) lit.current?.scrollIntoView({ block: "center" });
	}, [sheet, focus]);
	if (!shown) return null;
	return (
		<div
			data-block="text"
			className={`font-serif text-ink ${sheet ? "px-4 pt-4 text-[1.15rem] leading-[1.71rem]" : "text-[0.9rem] leading-relaxed"}`}
		>
			{text.sentences.map((sentence, sentenceIndex) => {
				const focused = focus?.sentence === sentenceIndex;
				return (
					<p
						key={sentence.join(" ")}
						ref={focused ? lit : undefined}
						data-sentence={sentenceIndex}
						className={`${sheet ? "mb-[1.75rem]" : "mb-2"} ${focused ? "rounded-md bg-raised/60 -mx-2 px-2" : ""}`}
					>
						{sentence.map((word, index) => (
							<span key={`${word}-${index.toString()}`}>
								<Segment
									word={word}
									live={sheet}
									lit={
										litWord !== null &&
										cleanWord(word) === litWord
									}
									focused={
										focused &&
										cleanWord(word) === focus.word
									}
									onSegment={onSegment}
									onSegmentDown={onSegmentDown}
								/>
								{index < sentence.length - 1 ? " " : ""}
							</span>
						))}
					</p>
				);
			})}
		</div>
	);
}

/**
 * Source Contexts: pinned, part of the Anchor. A Card shows the two most
 * recent; a Sheet shows a page and can load more. In a Sheet, every word
 * is a Segment that deals a Deck belonging to that Sheet.
 */
function ContextsBlock({
	note,
	form,
	litWord,
	onSegment,
	onSegmentDown,
}: {
	note: DummyNote;
	form: NoteForm;
	litWord: string | null;
	onSegment: (word: string, element: HTMLElement) => void;
	onSegmentDown: (
		event: ReactPointerEvent<HTMLElement>,
		make: () => Subject,
	) => void;
}) {
	const allows = useDeckInteractions();
	const { transition, CONTEXT_ITEM, contextDelayFor } = useDeckMotion();
	const sheet = form === "sheet";
	const [shown, setShown] = useState(CONTEXT_PAGE);
	useEffect(() => {
		if (!sheet) setShown(CONTEXT_PAGE);
	}, [sheet]);
	const visible = note.contexts.slice(0, sheet ? shown : CARD_CONTEXTS);
	const more = note.contexts.length - visible.length;
	/**
	 * Where the arriving group starts, so the stagger counts from the first
	 * item that is actually new rather than from the top of the list.
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
					{visible.map((context, index) => (
						<motion.li
							key={contextKey(context)}
							initial={{ opacity: 0, height: 0 }}
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
							{context.words.map((word, wordIndex) => (
								<span key={`${word}-${wordIndex.toString()}`}>
									<Segment
										word={word}
										live={sheet}
										lit={
											cleanWord(word) === note.word ||
											(litWord !== null &&
												cleanWord(word) === litWord)
										}
										focused={false}
										onSegment={onSegment}
										onSegmentDown={onSegmentDown}
									/>
									{wordIndex < context.words.length - 1
										? " "
										: ""}
								</span>
							))}
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

function contextKey(context: SourceContext): string {
	return `${context.textId ?? "filler"}:${context.sentence.toString()}:${context.words.join(" ")}`;
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

/**
 * Onward Links. In a Sheet a tap pushes a Cover and a drag lifts the
 * target as a fresh Card; in a Card they are inert (issue 485, provisional).
 */
function LinksBlock({
	note,
	form,
	onFollow,
	onSegmentDown,
}: {
	note: DummyNote;
	form: NoteForm;
	onFollow: (link: NoteLink) => void;
	onSegmentDown: (
		event: ReactPointerEvent<HTMLElement>,
		make: () => Subject,
	) => void;
}) {
	const allows = useDeckInteractions();
	const live = form === "sheet";
	return (
		<ul
			data-block="links"
			className="flex flex-wrap gap-x-4 gap-y-1 text-[0.85rem]"
		>
			{note.links.map((link) => {
				const label =
					link.kind === "Text"
						? `↩ ${link.label} (${link.focus.word})`
						: link.label;
				return (
					<li key={link.label}>
						{live ? (
							<button
								type="button"
								data-link={link.label}
								disabled={!allows("follow")}
								onPointerDown={(event) => {
									event.stopPropagation();
									onSegmentDown(event, () =>
										subjectOfLink(link),
									);
								}}
								onClick={(event) => {
									event.stopPropagation();
									onFollow(link);
								}}
								className="text-link decoration-link-shadow decoration-[1.5px] underline-offset-[0.2em] hover:underline disabled:no-underline"
							>
								{label}
							</button>
						) : (
							<span data-link={link.label} className="text-link">
								{label}
							</span>
						)}
					</li>
				);
			})}
		</ul>
	);
}

/* -------------------------------------------------------------- zones */

function DropZones({
	paneId,
	regions,
	destination,
	shown,
}: {
	paneId: string;
	regions: DropRegions;
	destination: Destination | null;
	/** The regions are read whether or not they are drawn; this draws them. */
	shown: boolean;
}) {
	const { ZONE_FEEDBACK_MS } = useDeckMotion();
	const here =
		destination && "paneId" in destination && destination.paneId === paneId
			? destination
			: null;
	const zoneClass =
		"pointer-events-none absolute grid place-items-center border border-dashed border-link/40 bg-link/5 transition-colors data-[shown=false]:invisible data-[active=true]:border-link data-[active=true]:bg-link/15";
	const labelClass =
		"rounded-md bg-raised px-2 py-0.5 font-mono text-[0.62rem] font-bold tracking-[0.12em] text-link uppercase";
	return (
		<>
			{regions.edges.map(({ edge, box }) => {
				const active = here?.kind === "pane" && here.edge === edge;
				return (
					<div
						key={edge}
						aria-hidden="true"
						data-edge={edge}
						data-active={active}
						data-shown={shown}
						className={zoneClass}
						style={{
							...box,
							zIndex: Z.zone,
							transitionDuration: `${ZONE_FEEDBACK_MS}ms`,
						}}
					>
						{active ? (
							<span className={labelClass}>New pane</span>
						) : null}
					</div>
				);
			})}
			<div
				aria-hidden="true"
				data-zone="cover"
				data-active={here?.kind === "sheet"}
				data-shown={shown}
				className={zoneClass}
				style={{
					...regions.cover,
					zIndex: Z.zone,
					transitionDuration: `${ZONE_FEEDBACK_MS}ms`,
				}}
			>
				{here?.kind === "sheet" ? (
					<span className={labelClass}>Open as Cover</span>
				) : null}
			</div>
		</>
	);
}
