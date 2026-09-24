import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "lego";
import {
	AnimatePresence,
	animate,
	MotionConfig,
	type MotionValue,
	motion,
	motionValue,
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
	COVER_GUTTER_REM,
	coverHeadingRem,
	coverHeadingRuled,
	DEFAULT_HEADING_DESIGN,
	HEADING_VARIANT_LABEL,
	HEADING_VARIANTS,
	type HeadingControl,
	type HeadingDesign,
	HeadingDesignProvider,
	ONE_LINE_TITLE,
	SheetChrome,
	useFolded,
	useHeadingDesign,
} from "./heading-design";
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
	LOOSE_CARD_REM,
	type motionOf,
	PILE_HEIGHT_REM,
} from "./motion-spec";
import {
	FixtureNotesProvider,
	PortedBlocks,
	PortedTitle,
	usePortedFollow,
	usePortedReading,
} from "./real-note";
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
 * policy switch of #479) a swipe left on any of its Cards, which takes the
 * whole Deck with the finger. There is no per-Card removal, and no place
 * a Card can be dropped that ends its Deck.
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
/**
 * A Cover's ←: Collapse to its Card, or Close, and whether it is live. Its
 * × is the same shape: every Cover in the Pane leaves, back to the Ground.
 */
type CoverBack = HeadingControl;
/** One workspace instance of a Subject; a fresh one for every open (issue 483). */
type Presentation = { readonly id: number; readonly subject: Subject };
type Deck = {
	readonly word: string;
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
type Edge = "left" | "right";
type Destination =
	| { readonly kind: "return" }
	/** The Pane the Card was lifted out of: a drop here is a release in place. */
	| { readonly kind: "home"; readonly paneId: string }
	| { readonly kind: "sheet"; readonly paneId: string }
	| { readonly kind: "pane"; readonly paneId: string; readonly edge: Edge };
/**
 * Where a gesture on a Note is. `pressed`: down, not yet past the slop,
 * so letting go is a tap. `swiping`: it started leftward on a Card on a
 * Deck and moves the whole Deck until the finger lifts or pulls the Card
 * loose. `held`: the Card is in hand and goes where the pointer says.
 * Nothing changes phase on a timer.
 */
type Phase = "pressed" | "swiping" | "held";
/**
 * What letting go now does to the Card in hand, shown on the Card before
 * it is done: it opens somewhere, it goes back to rest, or it leaves.
 */
type Fate = "open" | "rest" | "leave";
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
	/** The Pane the gesture started in. */
	readonly paneId: string;
	/** The Deck the Note rests in, if it rests in one: its slot, and what a swipe sweeps. */
	readonly deckSheet: number | null;
	/**
	 * Where a release with nothing under it sends the Note: back to its
	 * slot on the Deck, back to the Sheet it was lifted out of, closed (a
	 * Cover whose Card is on no live Deck), or away — a Card lifted from a
	 * Link or a Segment came from nowhere.
	 */
	readonly home: "slot" | "restore" | "close" | "vanish";
	phase: Phase;
	/** Lifted out of a Sheet or from nowhere, rather than picked off a Deck. */
	readonly lifted: boolean;
	v: { vx: number; vy: number };
	last: { x: number; y: number; t: number };
	/**
	 * A Card torn off a swipe sits this far from the finger, where the
	 * rubber band held it, and the gap closes on its own spring. `stop`
	 * ends the catch-up.
	 */
	gap: {
		readonly x: MotionValue<number>;
		readonly y: MotionValue<number>;
		readonly stop: () => void;
	} | null;
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
 * Where a drop lands, read off the Pane: inside the rectangle a Pane on
 * the left or right would take, it spawns that Pane; in the band between
 * them that reaches a little past the Deck, it goes back on the Deck; on
 * the Pane bar it lands nowhere; anywhere else in the Pane it opens as a
 * Cover there. A Card lifted out of a Sheet reads that last region in
 * its own Pane as home: a release there is a release in place, and
 * previews nothing. An edge region is the very rectangle a drop there
 * produces, so the zone drawn, the ghost and the Pane it becomes are one
 * box. `dropRegions` is the one place this geometry is written; the hit
 * test, the drawn zones and the preview all read it.
 */
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
	/** The return band, over the Deck's Pane's zones. */
	returnZone: 35,
	/** The Held Card, over everything until it is let go. */
	held: 40,
} as const;
const CARD_WIDTH = `${CARD_WIDTH_REM.toString()}rem`;
/** A Cover's box: the Pane inset by these. A Ground fills its Pane. */
const SHEET_INSET_X_REM = 1.5;
const SHEET_INSET_Y_REM = 1;
/** How many Source Contexts a Card shows. A Sheet's page is the spec's. */
const CARD_CONTEXTS = 2;
/** How far the return band reaches below the Deck's cards. */
const RETURN_PAD_REM = 3;
/** The gap a clicked Sentence keeps above the Deck once the Text has moved. */
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
	/* a Cover's Heading is its handle and its ← */
	"[data-heading]",
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
		means: "Lifts a Held Card. Drop on a side for a new Pane, in the band around its Deck to put it back, anywhere else in a Pane for a Cover. A lifted Sheet dropped in its own Pane goes back to its Deck, or closes if it has none.",
	},
	{
		move: "Drag ↑ a Card",
		means: "Takes it in hand. Far enough up, or flicked up, a ghost Cover shows where it opens, and letting go opens it; back down on the Deck, it rests. Any drag but a swipe is in hand at once, and a release does what the ghost and the Card's border show.",
	},
	{
		move: "Drag ← a Card",
		means: "Swipes the whole Deck, when the switch is on: it follows the finger and turns red past the line. Let go there, or flick, and it is swept; short of it, it springs back. Pull well up, down or back right and the Card tears loose: the Deck springs back and the Card is a plain drag.",
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
		move: "× on a Cover",
		means: "Every Cover in the Pane leaves at once, each as its ← would, and the Ground shows.",
	},
	{
		move: "Drag a Cover's Heading",
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

/** The Deck's left edge inside its Pane: the Deck is centred. */
function deckLeftIn(paneWidth: number, cardWidth: number): number {
	return (paneWidth - cardWidth) / 2;
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

/**
 * How big the Pane a Card spawns opens: as wide as its content column plus
 * the Cover insets, so a Note gets the room it lays out in and no more,
 * capped at half of the Pane it splits.
 */
function spawnSize(card: Presentation, paneWidth: number, rem: number): number {
	const column =
		card.subject.kind === "Text" ? TEXT_COLUMN_REM : CARD_WIDTH_REM;
	const natural = (column + 2 * SHEET_INSET_X_REM) * rem;
	return Math.round(Math.min(natural, paneWidth * SPAWN_SHARE));
}

type DropRegions = {
	/** Where a drop opens a Cover in this Pane: between the sides, under the bar. */
	readonly cover: Box;
	/** Where a drop spawns a Pane on this side: the Pane it spawns. */
	readonly edges: readonly { readonly edge: Edge; readonly box: Box }[];
	/** The Pane bar: chrome, never a drop. */
	readonly bar: Box;
};

/** A side region takes at most this share of its Pane, whatever it would spawn. */
const EDGE_SHARE = 0.3;

/** How wide a Pane's side regions are: the Pane it would spawn, capped at `EDGE_SHARE`. */
function edgeWidth(card: Presentation, paneWidth: number, rem: number): number {
	return Math.min(spawnSize(card, paneWidth, rem), paneWidth * EDGE_SHARE);
}

/** A Pane's drop regions, in frame coordinates. */
function dropRegions(pane: Box, card: Presentation, rem: number): DropRegions {
	const side = edgeWidth(card, pane.width, rem);
	const bar = BAR_REM * rem;
	return {
		cover: {
			left: pane.left + side,
			top: pane.top + bar,
			width: pane.width - 2 * side,
			height: pane.height - bar,
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
		],
		bar: {
			left: pane.left,
			top: pane.top,
			width: pane.width,
			height: bar,
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
		axis: "horizontal",
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

/** A Note's gloss, shown after its label in a bar; a Text has none. */
function subjectGloss(subject: Subject): string | null {
	return subject.kind === "Text" ? null : subject.note.tail.gloss;
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
					<FixtureNotesProvider>
						<CompassRuntime {...props} />
					</FixtureNotesProvider>
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
	/** The Cover Heading under study; see `heading-design.tsx`. */
	const [headingDesign, setHeadingDesign] = useState<HeadingDesign>(
		DEFAULT_HEADING_DESIGN,
	);
	const headingDesignRef = useRef(headingDesign);
	headingDesignRef.current = headingDesign;
	const allows = (interaction: DeckInteraction) =>
		policy(interaction) && (interaction !== "sweep" || swipeSweeps);
	const {
		transition,
		SPRING,
		MORPH,
		ARM_SLOP,
		COMMIT,
		THROW_PROJECTION_MS,
		VELOCITY_STALE_MS,
		CLICK_SLOP,
		GROUND_PRESS_MS,
		GROUND_SHRINK,
		HOLD_RELEASE,
		ZONE_FEEDBACK_MS,
		OPEN_SCALE,
		SETTLE_TIMEOUT_MS,
		leanFor,
		LEAVING,
		LEAVING_OPACITY,
		deckFollowFor,
		DECK_FOLLOW_SPRING,
		rubberBand,
		SWIPE_BREAK_PX,
		TEAR_CATCH_UP,
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
	 * The gesture is over and the Note is on its way home. It stops being
	 * boxed at the hand from this frame: the release is where it learns
	 * its slot, not the teardown, so the box morphs to the slot while the
	 * drag offset unwinds on its own spring and the two read as one move.
	 * The Deck closes over it at once: it travels home under the Cards
	 * that overlap it, so nothing happens on arrival.
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
	/** `returning`, read by handlers: a returning Card can be taken back. */
	const returningRef = useRef(false);
	/** Looks at a still hand again once its throw has gone stale; see `reassess`. */
	const staleTimer = useRef<number | undefined>(undefined);
	useEffect(() => () => window.clearTimeout(staleTimer.current), []);
	/** The return's own animations, so a fresh grab can take the Card back. */
	const returnRun = useRef<{ stop: () => void }[]>([]);
	const root = useRef<HTMLDivElement>(null);
	const handles = useRef(new Map<number, NoteHandle>());
	const gestureCheckpoint = useRef<Checkpoint | null>(null);
	const pendingLift = useRef<PendingLift | null>(null);
	/** A link in a Cover's Heading under a pointer that has not moved yet. */
	const pendingHeading = useRef<{
		readonly pointerId: number;
		readonly x: number;
		readonly y: number;
		readonly sheet: SheetRef;
		readonly heading: HTMLElement;
	} | null>(null);
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

	/**
	 * The Deck sits at one place in its Pane; the Text moves instead. The
	 * Sheet's body scrolls just far enough that the Sentence the Segment
	 * was clicked in sits whole above the Deck's top, and not at all when
	 * it already does.
	 */
	function clearSentence(element: HTMLElement, paneId: string) {
		const frameBox = root.current?.getBoundingClientRect();
		const paneBox = paneBoxes[paneId];
		const sentence = element.closest<HTMLElement>("[data-sentence]");
		const scroller = element.closest<HTMLElement>("[data-scroller]");
		if (!frameBox || !paneBox || !sentence || !scroller) return;
		const deckTop = frameBox.top + paneBox.top + deckTopIn(embedded);
		const overshoot =
			sentence.getBoundingClientRect().bottom + DEAL_GAP_PX - deckTop;
		if (overshoot <= 0) return;
		scroller.scrollBy({
			top: overshoot,
			behavior: reduce ? "auto" : "smooth",
		});
	}

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
		clearSentence(element, paneId);
		const before = findSheet(layoutRef.current, sheetId)?.deck;
		log(
			`Select "${cleanWord(word)}": ${before ? "replace the Deck, " : ""}deal 4`,
		);
		setLayout((node) =>
			updateDeck(node, sheetId, () => ({
				word: cleanWord(word),
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
				: spawnSize(card, restBoxes[paneId]?.width ?? 0, rem);
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
	/**
	 * A Cover's ×: every Cover in the Pane leaves at once, each as its ←
	 * would, and the Ground is what remains. The lowest Cover is applied
	 * last, so if two collapse onto one Deck, the one nearest the Ground
	 * is in front.
	 */
	function clearCovers(paneId: string) {
		const pane = findPane(layoutRef.current, paneId);
		if (!pane?.covers.length || !allows("collapse")) return;
		log(
			`×: ${pane.covers.length > 1 ? `${pane.covers.length.toString()} Covers leave` : "the Cover leaves"} ${paneId}; its Ground shows`,
		);
		setLayout((node) =>
			[...pane.covers].reverse().reduce(
				(next, cover) => collapseTo(next, cover.card),
				updatePane(node, paneId, (p) => ({ ...p, covers: [] })),
			),
		);
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
	function deckColumn(paneBox: Box): Box {
		const width = cardWidthIn(paneBox.width, rem, OPEN_SCALE);
		return {
			left: paneBox.left + deckLeftIn(paneBox.width, width),
			top: paneBox.top + deckTopIn(embedded),
			width,
			height: PILE_HEIGHT_REM * rem,
		};
	}
	/**
	 * The return band: the Pane's width between its two edge regions, from
	 * the Deck's top to `RETURN_PAD` below it.
	 */
	function returnZone(paneBox: Box, card: Presentation): Box {
		const column = deckColumn(paneBox);
		const side = edgeWidth(card, paneBox.width, rem);
		const pad = RETURN_PAD_REM * rem;
		return {
			left: paneBox.left + side,
			top: column.top,
			width: paneBox.width - 2 * side,
			height: column.height + pad,
		};
	}
	/**
	 * Where letting go at this point, `now`, sends the Card: the one answer
	 * the preview and the release both read. The return band follows its
	 * Deck's Pane, so it is read live; everything else is read off the
	 * Panes as they rested before any preview moved them, so a ghost
	 * opening never moves the region that opened it. Leaving a region
	 * takes a little more than entering it did. The Pane bar is chrome;
	 * then a Card taken up off its Deck, which opens over it; then the
	 * band, then the sides; the rest of a Pane opens a Cover.
	 */
	function destinationAt(
		px: number,
		py: number,
		d: Drag,
		now: number,
	): Destination | null {
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
			!inside(dropRegions(holderBox, d.card, rem).bar, x, y)
		) {
			const band = inside(returnZone(holderBox, d.card), x, y);
			/* a Card taken up off its Deck, far enough or fast enough, opens
			   over it: a move, not a place, since the band reaches up the
			   whole Deck and the Card may start at its foot */
			const current = destinationRef.current;
			const line =
				current?.kind === "sheet" ? HYSTERESIS_PX - COMMIT : -COMMIT;
			if (
				!d.lifted &&
				allows("expand") &&
				projected(d, now).dy < line &&
				(band || (!allows("drop") && inside(holderBox, x, y)))
			)
				return { kind: "sheet", paneId: holder.paneId };
			if (band) return { kind: "return" };
		}
		if (!allows("drop")) return null;
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
				current.kind === "pane"
					? regions.edges.find((e) => e.edge === current.edge)?.box
					: regions.cover;
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
			for (const { edge, box } of regions.edges)
				if (inside(box, x, y))
					return { kind: "pane", paneId: pane.id, edge };
			if (inside(regions.cover, x, y))
				return d.lifted && d.home !== "vanish" && pane.id === d.paneId
					? { kind: "home", paneId: pane.id }
					: { kind: "sheet", paneId: pane.id };
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
	}
	/**
	 * Forget a return in flight. A Card picked up again mid-return is
	 * under the pointer from that frame on, and nothing that was taking it
	 * home may still be writing.
	 */
	function endReturn() {
		for (const run of returnRun.current) run.stop();
		returnRun.current = [];
		returningRef.current = false;
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
			(settlingRef.current && !returningRef.current)
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
			phase: "pressed",
			lifted: false,
			v: { vx: 0, vy: 0 },
			last: { x: event.clientX, y: event.clientY, t: now },
			gap: null,
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
			phase: "held",
			lifted: true,
			v: { vx: 0, vy: 0 },
			last: { x: lift.x, y: lift.y, t: now },
			gap: null,
		};
		dragRef.current = d;
		setDrag(d);
		setDestination(destinationAt(lift.x, lift.y, d, now));
	}
	/**
	 * A Sheet lifted by its Heading or its Pane bar: a Cover leaves its
	 * stack, a Floating Ground takes its whole Pane with it. If the Card is
	 * still on a live Deck it shrinks toward its slot there; otherwise it
	 * is in hand and a release in its own Pane closes it, as ← would.
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
			holder ? "slot" : "close",
		);
	}
	/**
	 * A Sheet is handled by its bar, not by its content: the Card emerges
	 * from the bar (a Cover's Heading, or a Ground's Pane bar) rather than
	 * the whole Sheet shrinking into the hand. The one element stays one
	 * element (ADR 0006); only its box starts the morph at the bar instead
	 * of at the Sheet.
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
		const target = event.target as HTMLElement;
		const ground = sheetsOf(pane)[0];
		const bar = event.currentTarget;
		/* a link in a Floating Ground's title reads past the slop, as a
		   Cover's does */
		if (target.closest("[data-heading-title] button")) {
			if (
				ground?.card &&
				!isRooted(pane) &&
				!pane.covers.length &&
				allows("lift") &&
				headingDesignRef.current.linksDrag
			)
				pendingHeading.current = {
					pointerId: event.pointerId,
					x: event.clientX,
					y: event.clientY,
					sheet: ground,
					heading: bar,
				};
			return;
		}
		if (target.closest("button")) return;
		if (!ground?.card || pane.covers.length || !allows("lift")) return;
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
	/** A Cover's Heading is its bar: it lifts the Cover, straight into the hand. */
	function coverHeadingDown(
		event: ReactPointerEvent<HTMLElement>,
		sheet: SheetRef,
	) {
		if (event.button !== 0 || dragRef.current) return;
		const target = event.target as HTMLElement;
		const heading = target.closest<HTMLElement>("[data-heading]");
		if (!heading || target.closest("[data-heading-chrome]")) return;
		/* a link in the title waits for the slop: a release inside it is
		   the link's click, a move past it lifts the Cover */
		if (target.closest("[data-heading-title] button")) {
			if (!headingDesignRef.current.linksDrag) return;
			pendingHeading.current = {
				pointerId: event.pointerId,
				x: event.clientX,
				y: event.clientY,
				sheet,
				heading,
			};
			return;
		}
		event.preventDefault();
		liftSheet(
			sheet,
			{ pointerId: event.pointerId, x: event.clientX, y: event.clientY },
			"Drag Heading",
			heading,
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
	/** The Card is in hand from here on: the drop regions read it. */
	function takeInHand(d: Drag, reason: string) {
		d.phase = "held";
		settleTransform(d.h);
		log(`${reason}: in hand`);
		setDrag({ ...d });
	}
	function frameMove(event: ReactPointerEvent<HTMLElement>) {
		const fromLink = pendingHeading.current;
		if (fromLink && fromLink.pointerId === event.pointerId) {
			if (
				Math.hypot(
					event.clientX - fromLink.x,
					event.clientY - fromLink.y,
				) <= ARM_SLOP
			)
				return;
			pendingHeading.current = null;
			/* the link under the press is not followed */
			swallowClick.current = true;
			liftSheet(
				fromLink.sheet,
				{
					pointerId: fromLink.pointerId,
					x: fromLink.x,
					y: fromLink.y,
				},
				"Drag Heading from a link",
				fromLink.heading,
			);
		}
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
		/* a swiped Card is placed by the swipe, on its rubber band */
		if (d.phase !== "swiping") {
			h.x.set(dx + (d.gap?.x.get() ?? 0));
			h.y.set(dy + (d.gap?.y.get() ?? 0));
		}
		/* past the slop the gesture is one thing or the other, and stays so:
		   leftward off a Deck it swipes the Deck, any other way the Card is
		   in hand */
		if (d.phase === "pressed" && Math.hypot(dx, dy) > ARM_SLOP) {
			if (
				dx < 0 &&
				Math.abs(dx) > Math.abs(dy) &&
				allows("sweep") &&
				d.deckSheet !== null
			) {
				d.phase = "swiping";
				log("Drag ←: swipe the Deck");
				setDrag({ ...d });
			} else takeInHand(d, "Drag");
		}
		if (d.phase === "swiping") swipeDeck(d, dx, dy);
		reassess(d, event.clientX, event.clientY, event.timeStamp);
	}
	/**
	 * Where the hand is headed: its travel so far, carried on at the speed
	 * it is moving for `THROW_PROJECTION_MS`. A flick reads as the move it
	 * is the start of, and a hand that has stopped carries nothing on.
	 */
	function projected(d: Drag, now: number): { dx: number; dy: number } {
		const fresh = now - d.last.t <= VELOCITY_STALE_MS;
		const { vx, vy } = fresh ? d.v : { vx: 0, vy: 0 };
		return {
			dx: d.last.x - d.start.x + vx * THROW_PROJECTION_MS,
			dy: d.last.y - d.start.y + vy * THROW_PROJECTION_MS,
		};
	}
	/**
	 * What letting go now would do, shown before it is done: the commit
	 * line of a swipe, and where a Card in hand would land. The release
	 * reads the same two things, so it does what is shown.
	 */
	function reassess(d: Drag, px: number, py: number, now: number) {
		window.clearTimeout(staleTimer.current);
		setPastCommit(d.phase === "swiping" && projected(d, now).dx < -COMMIT);
		const next = d.phase === "held" ? destinationAt(px, py, d, now) : null;
		setDestination((current) =>
			sameDestination(current, next) ? current : next,
		);
		/* a hand that stops has no throw left in it: once its speed has
		   gone stale, look again without it */
		if (now - d.last.t <= VELOCITY_STALE_MS)
			staleTimer.current = window.setTimeout(() => {
				if (dragRef.current === d)
					reassess(d, d.last.x, d.last.y, performance.now());
			}, VELOCITY_STALE_MS + 1);
	}
	/** Every other Card on the Deck `d`'s Card rests in, and how many ranks away it is. */
	function followersOf(d: Drag): { h: NoteHandle; distance: number }[] {
		if (d.deckSheet === null) return [];
		const deck = findSheet(layoutRef.current, d.deckSheet)?.deck;
		if (!deck) return [];
		const cards = visibleCards(deck);
		const lead = cards.findIndex((card) => card.id === d.card.id);
		return cards.flatMap((card, index) => {
			const h = handles.current.get(card.id);
			return card.id === d.card.id || !h
				? []
				: [{ h, distance: Math.abs(index - lead) }];
		});
	}
	/**
	 * A Deck swiped left moves as one thing: the Card under the finger
	 * leads and the others trail at their share of its travel. Pulled
	 * right or off its axis it gives and resists, and pulled past
	 * `SWIPE_BREAK_PX` the Card tears loose.
	 */
	function swipeDeck(d: Drag, dx: number, dy: number) {
		if (dx > SWIPE_BREAK_PX || Math.abs(dy) > SWIPE_BREAK_PX) {
			tearLoose(d, dx, dy);
			return;
		}
		const { h } = d;
		const x = dx < 0 ? dx : rubberBand(dx);
		h.x.set(x);
		h.y.set(rubberBand(dy));
		/* the lean is decoration on a move the Deck already makes */
		const lean = reduce ? 0 : leanFor(x);
		h.rotate.set(lean);
		for (const { h: other, distance } of followersOf(d)) {
			const share = deckFollowFor(distance);
			/* the lag is motion on its own; reduced, the Deck moves rigidly */
			if (reduce) other.x.set(x * share);
			else animate(other.x, x * share, DECK_FOLLOW_SPRING);
			other.rotate.set(lean * share);
		}
	}
	/** The Cards that followed a swipe go back to their slots. */
	function settleFollowers(d: Drag) {
		const toRest = (value: MotionValue<number>) => {
			if (reduce) value.jump(0);
			else animate(value, 0, SPRING);
		};
		for (const { h } of followersOf(d)) {
			toRest(h.x);
			toRest(h.rotate);
		}
	}
	/** A swipe let go short of the line: the Deck springs back together. */
	function snapDeck(d: Drag) {
		settleFollowers(d);
		snapBack(d.h);
	}
	/**
	 * Pulled off the swipe, the Card tears loose: the Deck springs back
	 * without it, and the Card is in hand, a plain drag. It closes the gap
	 * the rubber band left between it and the finger on its own spring
	 * rather than jumping to the finger.
	 */
	function tearLoose(d: Drag, dx: number, dy: number) {
		const { h } = d;
		settleFollowers(d);
		const gap = {
			x: motionValue(h.x.get() - dx),
			y: motionValue(h.y.get() - dy),
		};
		const place = () => {
			h.x.set(d.last.x - d.start.x + gap.x.get());
			h.y.set(d.last.y - d.start.y + gap.y.get());
		};
		const watching = [gap.x.on("change", place), gap.y.on("change", place)];
		const running = reduce
			? []
			: [
					animate(gap.x, 0, TEAR_CATCH_UP),
					animate(gap.y, 0, TEAR_CATCH_UP),
				];
		d.gap = {
			...gap,
			stop: () => {
				for (const stop of watching) stop();
				for (const run of running) run.stop();
			},
		};
		if (reduce) {
			gap.x.jump(0);
			gap.y.jump(0);
			place();
		}
		takeInHand(d, "Pulled off the swipe");
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
			returnRun.current = [];
			returningRef.current = false;
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
	 * The Card goes back to the slot it was picked up from, and the Deck
	 * closes over it at the release rather than on arrival: the frame it
	 * gets its resting z back is then no event at all.
	 */
	function snapBack(h: NoteHandle) {
		returningRef.current = true;
		setReturning(true);
		if (reduce) {
			for (const [value, rest] of [
				[h.x, 0],
				[h.y, 0],
				[h.rotate, 0],
				[h.scale, 1],
			] as const)
				value.jump(rest);
			settle(
				() => Promise.resolve(),
				() => {},
			);
			return;
		}
		settle(
			() => {
				const run = [
					animate(h.x, 0, SPRING),
					animate(h.y, 0, SPRING),
					animate(h.rotate, 0, SPRING),
					animate(h.scale, 1, SPRING),
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
		} else {
			animate(h.rotate, 0, MORPH);
			animate(h.scale, 1, MORPH);
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
	/** A lifted Cover with no Deck to go back to: it closes, as ← would. */
	function close(d: Drag, reason: string) {
		gestureCheckpoint.current = null;
		log(`${reason}: ${subjectLabel(d.card.subject)} closes`);
		settle(
			() => Promise.all([animate(d.h.opacity, 0, transition(FLY_FADE))]),
			() => {},
		);
	}
	/** A release with nothing under it, or in the Card's own Pane. */
	function goHome(d: Drag, reason = "Released in place") {
		if (d.home === "slot") snapBack(d.h);
		else if (d.home === "restore") restore(d, reason);
		else if (d.home === "close") close(d, reason);
		else vanish(d);
	}
	function frameUp(event: ReactPointerEvent<HTMLElement>) {
		pendingLift.current = null;
		pendingHeading.current = null;
		stopBarHold();
		const d = dragRef.current;
		if (!d || d.pointerId !== event.pointerId) return;
		dragRef.current = null;
		/* the release takes the Card from where it is, gap and all */
		d.gap?.stop();
		window.clearTimeout(staleTimer.current);
		const { h } = d;
		const card = d.card;

		if (d.lifted && Math.hypot(h.x.get(), h.y.get()) < CLICK_SLOP + 2) {
			if (d.home === "slot") log("Released in place: stays on the Deck");
			/* a tap on a bar is not a close: the Sheet stays */
			if (d.home === "close") restore(d, "Released in place");
			else goHome(d);
			return;
		}
		if (d.phase === "pressed") {
			/* never past the slop, so a tap: the few px it gave go back */
			for (const value of [h.x, h.y])
				if (reduce) value.jump(0);
				else animate(value, 0, SPRING);
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
		/* the release reads what the preview read: `projected` and
		   `destinationAt` at this moment, so it does what was shown */
		if (d.phase === "swiping") {
			if (projected(d, event.timeStamp).dx < -COMMIT)
				sweepByDrag(d, "Swipe ←");
			else snapDeck(d);
			return;
		}
		const target = destinationAt(
			event.clientX,
			event.clientY,
			d,
			event.timeStamp,
		);
		if (!target || target.kind === "return") {
			goHome(d);
			return;
		}
		if (target.kind === "home") {
			goHome(d, "Drop in its own Pane");
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
		pendingHeading.current = null;
		stopBarHold();
		const d = dragRef.current;
		if (!d || (event && event.pointerId !== d.pointerId)) return;
		dragRef.current = null;
		d.gap?.stop();
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
		} else if (d.phase === "swiping") snapDeck(d);
		else snapBack(d.h);
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

	const showZones = allows("drop") && drag?.phase === "held";
	/* nothing wears a label: the ghost says where a Card opens, the moving
	   Deck says it is being swiped, and the Card's own border and ink say
	   what letting go does to it */
	const fate: Fate | null =
		drag?.phase === "held" ? fateOf(drag, destination) : null;
	/* a Card that would leave dims, so the loss shows before it happens */
	const leaving = fate === "leave";
	useEffect(() => {
		const d = dragRef.current;
		if (d?.phase !== "held") return;
		const controls = animate(
			d.h.opacity,
			leaving ? LEAVING_OPACITY : 1,
			transition(LEAVING),
		);
		return () => controls.stop();
	}, [leaving, transition, LEAVING]);
	const register = (id: number, handle: NoteHandle | null) => {
		if (handle) handles.current.set(id, handle);
		else handles.current.delete(id);
	};

	/** The return band over a Deck's footprint: drawn on demand, where it is read. */
	function renderReturnZone(sheet: SheetRef, paneBox: Box): ReactNode[] {
		const deck = sheet.deck;
		if (!deck || !showZones || drag?.deckSheet !== sheet.sheetId) return [];
		return [
			<div
				key={`return-${sheet.sheetId.toString()}`}
				aria-hidden="true"
				data-return-zone="return"
				data-active={destination?.kind === "return"}
				data-shown={zonesVisible}
				className="pointer-events-none absolute flex items-end justify-center rounded-[1.1rem] border border-dashed border-line-strong bg-paper/60 pb-3 transition-colors data-[active=true]:border-link data-[active=true]:bg-link/15 data-[shown=false]:invisible"
				style={{
					...returnZone(paneBox, drag.card),
					zIndex: Z.returnZone,
					transitionDuration: `${ZONE_FEEDBACK_MS}ms`,
				}}
			>
				<span className="rounded-md bg-raised px-2 py-0.5 font-mono text-[0.62rem] font-bold tracking-[0.12em] text-link uppercase">
					Back on the Deck
				</span>
			</div>,
		];
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
							homeLabel={homeLabel(drag)}
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
		const gloss =
			ground.kind === "Sheet" ? subjectGloss(ground.card.subject) : null;
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
					className={`absolute inset-x-0 top-0 z-20 border-b bg-paper select-none ${pane.preview ? "border-dashed border-link/60" : "border-line"} ${handle === "drag" ? "cursor-grab touch-none active:cursor-grabbing" : handle === "press" ? "cursor-pointer touch-none" : ""}`}
					style={{
						height: `${BAR_REM.toString()}rem`,
						transformOrigin: "0% 50%",
					}}
				>
					<PaneBarFace
						subject={
							ground.kind === "Sheet" ? ground.card.subject : null
						}
						titled={!rooted}
						width={
							ground.kind === "Sheet" ? null : GROUND_LIST_WIDTH
						}
						back={
							rooted
								? {
										label: control.label,
										enabled: control.enabled,
										onPress: () => back(pane.id, "←"),
									}
								: null
						}
						clear={
							rooted
								? null
								: {
										label: control.label,
										enabled: control.enabled,
										onPress: () => back(pane.id, "×"),
									}
						}
						onFollow={(link) => follow(pane.id, link)}
					>
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
											pane.preview
												? false
												: { opacity: 0 }
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
							{gloss ? (
								<span className="ms-2 shrink-0 normal-case tracking-normal text-ink-muted">
									{gloss}
								</span>
							) : null}
						</nav>
					</PaneBarFace>
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
		const column = deckColumn(paneBox);
		/* a swiped Deck moves as a stack: every Card keeps its z, and every
		   Card wears the commit line */
		const swiping =
			drag?.phase === "swiping" && drag.deckSheet === sheet.sheetId;
		return order.flatMap((card, index) => {
			const place: Place =
				index < openAt ? "above" : index > openAt ? "below" : "open";
			const held =
				drag !== null &&
				drag.phase !== "pressed" &&
				drag.card.id === card.id;
			if (heldOnly && !held) return [];
			const slot: Box = {
				left: column.left,
				top: column.top + index * headerPx,
				width: column.width,
				height: slotHeight,
			};
			/* z rises toward the expanded Card from both sides; a Held
			   Card is over all of them until it is let go */
			const z =
				held && !returning && !swiping
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
					fate={held ? fate : null}
					swiping={swiping}
					pastCommit={swiping && pastCommit}
					paneId={sheet.paneId}
					sheetId={null}
					ground={false}
					showText={showReader}
					litWord={null}
					epoch={layoutEpoch}
					register={register}
					onDown={(event) => cardDown(event, card, sheet)}
					onFollow={() => {}}
					onSegment={() => {}}
					onSegmentDown={() => {}}
				/>
			);
		});
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
				/* a Cover's Heading is its bar: the ← and the handle ride
				   the Note's own box rather than sitting beside it */
				const grabs = isTop && !ghost && allows("lift");
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
							sheet.ground
								? groundBoxIn(paneBox, rem)
								: coverBoxIn(paneBox, rem)
						}
						z={Z.sheet + index}
						held={false}
						fate={null}
						pastCommit={false}
						paneId={pane.id}
						sheetId={ghost ? null : sheet.sheetId}
						ground={sheet.ground}
						covered={!isTop}
						preview={ghost}
						showText={showReader}
						litWord={isTop ? (sheet.deck?.word ?? null) : null}
						epoch={layoutEpoch}
						register={ghost ? () => {} : register}
						back={
							sheet.ground
								? null
								: {
										label: deckHolding(
											layout,
											sheet.card.id,
										)
											? "Collapse back to card"
											: "Close cover",
										enabled:
											!ghost &&
											isTop &&
											allows("collapse"),
										onPress: () =>
											coverBack(pane.id, sheet.sheetId),
									}
						}
						clear={
							sheet.ground
								? null
								: {
										label: "Close every Cover",
										enabled:
											!ghost &&
											isTop &&
											allows("collapse"),
										onPress: () => clearCovers(pane.id),
									}
						}
						onDown={
							grabs
								? (event) => coverHeadingDown(event, sheet)
								: () => {}
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
			notes.push(...renderReturnZone(realTop, paneBox));
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
					fate={held ? fate : null}
					pastCommit={false}
					paneId={drag?.paneId ?? ROOT_PANE}
					sheetId={null}
					ground={false}
					showText={showReader}
					litWord={null}
					epoch={layoutEpoch}
					register={register}
					onDown={() => {}}
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
			<HeadingDesignProvider value={headingDesign}>
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
			</HeadingDesignProvider>
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
					<fieldset className="flex flex-col gap-1.5 border-t border-line pt-2">
						<legend className="float-left mb-1 font-mono text-[0.62rem] font-bold tracking-[0.12em] text-ink-muted uppercase">
							Cover Heading
						</legend>
						<div className="clear-left grid grid-cols-3 gap-0.5 rounded-md border border-line p-0.5">
							{HEADING_VARIANTS.map((variant) => (
								<label
									key={variant}
									className="grid cursor-pointer place-items-center rounded-[0.3rem] px-1 py-1 text-center text-[0.72rem] leading-tight text-ink-soft transition-colors select-none hover:text-ink has-[:checked]:bg-raised has-[:checked]:text-ink has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-link/50"
								>
									<input
										type="radio"
										name="cover-heading-design"
										value={variant}
										checked={
											headingDesign.variant === variant
										}
										onChange={() =>
											setHeadingDesign((design) => ({
												...design,
												variant,
											}))
										}
										className="sr-only"
									/>
									{HEADING_VARIANT_LABEL[variant]}
								</label>
							))}
						</div>
						<label className="flex cursor-pointer items-center justify-between gap-3 select-none">
							<span>Links in the Heading drag</span>
							<input
								type="checkbox"
								checked={headingDesign.linksDrag}
								onChange={(event) => {
									const linksDrag = event.target.checked;
									setHeadingDesign((design) => ({
										...design,
										linksDrag,
									}));
								}}
								className="accent-link"
							/>
						</label>
						<button
							type="button"
							onClick={() =>
								openCover(
									activePane.current,
									present({
										kind: "Note",
										note: noteFor("Reading", "Dämmerung"),
									}),
									"Open the ported Reading",
								)
							}
							className="self-start text-[0.78rem] text-link underline-offset-2 hover:underline"
						>
							Open the ported Reading (Dämmerung)
						</button>
					</fieldset>
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

/** The Deck's top inside its Pane, in px: one place, whatever was clicked. */
function deckTopIn(embedded: boolean): number {
	return (embedded ? 3 : 12) * 16;
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

/**
 * A Note's column. As a Sheet its gutters hold ← and ×, and whichever
 * draws them, a Cover's Heading or a Ground's Pane bar, sets its title on
 * `title`, the body's column. The gutters widen as a Card becomes a Sheet
 * and the column widens with them, so the text keeps its measure and its
 * place. A Text reads at prose width; a ported Note is laid out by the
 * Notes page's own column.
 */
function sheetColumn(subject: Subject, sheet: boolean, ported: boolean) {
	const column = sheet && subject.kind === "Text" ? "42rem" : CARD_WIDTH;
	/* a Text's Blocks carry a rem of their own inside the column */
	const gutterRem = sheet
		? COVER_GUTTER_REM - (subject.kind === "Text" ? 1 : 0)
		: 1;
	const body = `calc(${column} + ${(2 * (gutterRem - 1)).toString()}rem)`;
	return {
		column,
		gutterRem,
		body,
		title: ported ? "var(--container-note)" : body,
	};
}

/** The Menu's and the Library's column, gutters included, as a Text's. */
const GROUND_LIST_WIDTH = "43rem";

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
			<div
				className="mx-auto w-full pt-10 pb-12"
				style={{
					maxWidth: GROUND_LIST_WIDTH,
					paddingInline: `${COVER_GUTTER_REM.toString()}rem`,
				}}
			>
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
								className="-mx-3 w-[calc(100%+1.5rem)] rounded-md px-3 py-2 text-left font-serif text-[1.15rem] text-ink hover:bg-raised"
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
	fate,
	swiping = false,
	pastCommit,
	paneId,
	sheetId,
	ground,
	covered = false,
	preview = false,
	epoch,
	showText,
	litWord,
	register,
	back = null,
	clear = null,
	onDown,
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
	/** In hand: what letting go now does to it. */
	fate: Fate | null;
	/** On a Deck being swiped: it moves with the Deck, whichever Card leads. */
	swiping?: boolean;
	/** On a swiped Deck that a release now would sweep. */
	pastCommit: boolean;
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
	/** A Cover's ←, drawn in its Heading; a Ground's is on the Pane bar. */
	back?: CoverBack | null;
	/** A Cover's ×, drawn in its Heading's right margin. */
	clear?: CoverBack | null;
	onDown: (event: ReactPointerEvent<HTMLElement>) => void;
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
		HEADING_EDGE,
		NOTE_BORDER,
		CLIP_FADE,
	} = useDeckMotion();
	const allows = useDeckInteractions();
	const reduce = useDeckReducedMotion();
	const design = useHeadingDesign();
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
	});
	/**
	 * The open Card rests larger than the ones behind it (`OPEN_SCALE`). It
	 * is a state, not a move: which Card is in front changes at once, with
	 * no pulse. `scale` stays the raw value the drag animates, and the two
	 * are multiplied on the way to the DOM.
	 */
	const restScale = form === "card" && place === "open" ? OPEN_SCALE : 1;
	const shownScale = useTransform(() => scale.get() * restScale);
	/**
	 * The box's origin travels as a transform, not as `left`/`top`, so two
	 * of the four properties on MORPH leave the layout path; `width` and
	 * `height` have to stay, because a Note genuinely reflows its text
	 * between a Card and a Sheet. The drag offset rides along in the same
	 * translate, so the two cannot fight over it.
	 */
	const shownX = useTransform(() => left.get() + x.get());
	const shownY = useTransform(() => top.get() + y.get());
	const section = useRef<HTMLElement>(null);

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

	function down(event: ReactPointerEvent<HTMLElement>) {
		const target = event.target as HTMLElement;
		/* a button is a click, except a link in a Cover's title while the
		   links drag: that one is the Heading's to read past the slop */
		if (
			target.closest("button") &&
			!(design.linksDrag && target.closest("[data-heading-title] button"))
		)
			return;
		if (covered) return;
		/* a Sheet is handled by its bar, never by its content: a Card is
		   picked up from anywhere, a Sheet's body only scrolls. A Cover's
		   bar is its Heading. */
		if (form === "card" || target.closest("[data-heading]")) onDown(event);
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
	/* the border is the Card's fate: blue where letting go opens it, red
	   on a swiped Deck a release would sweep, and its resting colour
	   otherwise. A Card that would leave also dims; see `LEAVING`. */
	const borderColor =
		swiping && pastCommit
			? "var(--destructive)"
			: fate === "open" || preview
				? "var(--link)"
				: ground
					? "transparent"
					: "var(--line-strong)";
	const subject = card.subject;
	const dataForm = ground ? "ground" : form;
	const note = subject.kind === "Note" ? subject.note : null;
	const ported = usePortedReading(note);
	const portedFollow = usePortedFollow(note?.word ?? "", onFollow);
	const isCover = sheet && !ground && back !== null;
	const folded = useFolded(section, isCover && design.variant === "shrink");
	const {
		column,
		gutterRem,
		body: bodyWidth,
		title: coverWidth,
	} = sheetColumn(subject, sheet, ported !== null);
	const titles = ported
		? {
				card: (
					<PortedTitle
						note={ported}
						presentation="Card"
						follow={portedFollow}
					/>
				),
				cover: (
					<PortedTitle
						note={ported}
						presentation="Sheet"
						follow={portedFollow}
					/>
				),
			}
		: null;

	return (
		<motion.article
			ref={section}
			aria-label={`${subjectLabel(subject)} ${ground ? "ground" : sheet ? "sheet" : "card"}`}
			data-card-id={card.id}
			data-form={dataForm}
			data-place={sheet ? undefined : place}
			data-held={held || undefined}
			data-arm={held && swiping ? "sweep" : undefined}
			data-fate={fate ?? undefined}
			data-past={pastCommit}
			data-swiping={swiping || undefined}
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
				zIndex: z,
				...(preview ? { borderStyle: "dashed" } : {}),
			}}
			onPointerDown={down}
			/* `contain` stops the width/height spring's recalc at this Note
			   rather than letting it walk the deck */
			className={`${preview ? "pointer-events-none" : "pointer-events-auto"} absolute flex flex-col overflow-hidden border bg-paper [contain:layout_paint] select-none ${ground ? "" : "rounded-[0.9rem]"} ${sheet ? "" : "cursor-grab touch-none active:cursor-grabbing"}`}
		>
			{/* the content column: one width in every form, centred inside a
			    Heading and a scroller that both span the Pane, so the scrollbar
			    sits at the Pane's edge, not the column's. A ghost's ink is
			    quiet, on paper as opaque as any: nothing shows through */}
			<div
				className={`flex min-h-0 w-full flex-1 flex-col ${preview ? "opacity-50" : ""}`}
			>
				<HeadingBlock
					subject={subject}
					form={form}
					ground={ground}
					back={back}
					clear={clear}
					coverRem={coverHeadingRem(design.variant, folded)}
					coverWidth={coverWidth}
					folded={folded}
					titles={titles}
					morphing={morphing}
					grab={
						sheet &&
						!ground &&
						!covered &&
						!preview &&
						allows("lift")
					}
					atBottom={below}
					layout={!held && morphing}
					offset={headingOffset}
					positionSpec={positionSpec}
					column={column}
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
					{ported ? (
						/* a Card's links are inert until it is a Sheet (#485) */
						<div
							inert={!sheet}
							className={
								sheet
									? "[&_[data-note-presentation]>article]:pt-3"
									: ""
							}
						>
							<PortedBlocks
								note={ported}
								presentation={sheet ? "Sheet" : "Card"}
								follow={portedFollow}
							/>
						</div>
					) : (
						<div
							className={`mx-auto flex w-full flex-col gap-3 ${below ? "pt-3" : sheet ? "pt-4 pb-4" : "pb-4"}`}
							style={{
								maxWidth: bodyWidth,
								paddingInline: `${gutterRem.toString()}rem`,
							}}
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
					)}
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
		</motion.article>
	);
}

/* --------------------------------------------------------------- blocks */

/**
 * The Heading: pinned first, the Note's lift handle in every form. As a
 * Card it is the one-line row (form, then gloss), at the bottom edge when
 * the Card is a Card Tail. As a Cover it is the Cover's bar: ← in its left
 * margin, × in its right, and the title on the body's column; its height
 * is the design's (see `heading-design.tsx`). As a Ground it folds shut,
 * because the Pane bar carries the label. A ported Note's title is its
 * real Reading Header, in both faces.
 *
 * The row is one element whose height rides `MORPH` with the Note's box,
 * so the Cover's top edge is the Note's own edge in every frame. Only the
 * words change: the face leaving goes on `BAR_EXIT`, the one arriving
 * follows on `BAR_ENTER`, and the row between them never fades. A change
 * of height with no change of form, a fold or a switch of design, rides
 * `HEADING_RESIZE`.
 */
function HeadingBlock({
	subject,
	form,
	ground,
	back,
	clear,
	coverRem,
	coverWidth,
	folded,
	titles,
	morphing,
	grab,
	atBottom,
	layout,
	offset,
	positionSpec,
	column,
}: {
	subject: Subject;
	form: NoteForm;
	ground: boolean;
	back: CoverBack | null;
	clear: CoverBack | null;
	/** The Cover face's height, in rem. */
	coverRem: number;
	/** The body column the Cover's title sits on, gutters included. */
	coverWidth: string;
	folded: boolean;
	/** A ported Note's real title, as a Card and as a Cover. */
	titles: { card: ReactNode; cover: ReactNode } | null;
	/** The form changed this render: the row rides `MORPH`. */
	morphing: boolean;
	/** The row is the Cover's handle right now. */
	grab: boolean;
	atBottom: boolean;
	layout: boolean;
	offset: MotionValue<number>;
	/** What the row's position rides; see `positionSpec` in `PresentationView`. */
	positionSpec: ReturnType<typeof motionOf>;
	/** The content column's width; the Card's row is centred at it. */
	column: string;
}) {
	const { transition, MORPH, BAR_ENTER, BAR_EXIT, HEADING_RESIZE } =
		useDeckMotion();
	const design = useHeadingDesign();
	const rem = remPx();
	const face = form === "card" ? "card" : ground || !back ? null : "cover";
	const rowRem =
		face === "card" ? HEADER_REM : face === "cover" ? coverRem : 0;
	const title =
		subject.kind === "Text" ? subject.text.title : subject.note.tail.form;
	const gloss = subjectGloss(subject);
	const fade = {
		initial: { opacity: 0 },
		animate: { opacity: 1, transition: transition(BAR_ENTER) },
		exit: { opacity: 0, transition: transition(BAR_EXIT) },
	};
	const rowSpec = morphing ? MORPH : transition(HEADING_RESIZE);
	return (
		<motion.div
			data-heading=""
			data-heading-variant={face === "cover" ? design.variant : undefined}
			data-folded={face === "cover" ? folded : undefined}
			/* `initial={false}`: a Note is dealt at its size; only a change
			   of form is a move. */
			initial={false}
			layout={layout ? "position" : false}
			layoutDependency={`${form}:${atBottom.toString()}`}
			transition={{
				...rowSpec,
				layout: positionSpec,
			}}
			animate={{ height: rowRem * rem, opacity: face ? 1 : 0 }}
			style={{ order: atBottom ? 2 : 0, y: offset }}
			className={`relative w-full shrink-0 overflow-hidden select-none ${grab ? "cursor-grab touch-none active:cursor-grabbing" : ""}`}
		>
			<AnimatePresence initial={false}>
				{face === "card" ? (
					<motion.div
						key="card"
						{...fade}
						className={`absolute inset-0 flex justify-center ${titles ? "px-3.5" : "px-4"} ${atBottom ? "" : "pb-2"}`}
					>
						<div
							className="relative flex h-full w-full min-w-0 items-end gap-4"
							style={{ maxWidth: column }}
						>
							{titles ? (
								/* a Card's links are inert until it is a Sheet (#485) */
								<div
									inert
									className={`min-w-0 flex-1 ${ONE_LINE_TITLE} ${atBottom ? "pb-3" : ""}`}
								>
									{titles.card}
								</div>
							) : (
								<>
									<h2
										className={`min-w-0 flex-1 truncate font-serif text-[1rem] font-normal leading-tight text-ink ${atBottom ? "pb-3" : ""}`}
									>
										{title}
									</h2>
									{gloss ? (
										<span
											className={`shrink-0 pb-[0.15rem] text-[0.72rem] text-ink-muted ${atBottom ? "pb-3" : ""}`}
										>
											{gloss}
										</span>
									) : null}
								</>
							)}
						</div>
					</motion.div>
				) : face === "cover" && back && clear ? (
					<motion.div
						key="cover"
						{...fade}
						className="absolute inset-0"
					>
						<SheetChrome
							ruled={coverHeadingRuled(design.variant, folded)}
							maxWidth={coverWidth}
							back={back}
							clear={clear}
							linksDrag={design.linksDrag}
						>
							{titles ? (
								titles.cover
							) : (
								<SheetTitle subject={subject} />
							)}
						</SheetChrome>
					</motion.div>
				) : null}
			</AnimatePresence>
		</motion.div>
	);
}

/** A dummy Sheet's title in its chrome: the form, then what kind of Note it is. */
function SheetTitle({ subject }: { subject: Subject }) {
	const gloss = subjectGloss(subject);
	return (
		<div className="flex min-w-0 items-baseline gap-3">
			<h2 className="min-w-0 truncate font-serif text-[1rem] font-normal leading-[1.4] text-ink">
				{subject.kind === "Text"
					? subject.text.title
					: subject.note.tail.form}
			</h2>
			{subject.kind === "Note" ? (
				<span className="shrink-0 font-mono text-[0.62rem] tracking-[0.08em] text-ink-muted uppercase">
					{subject.note.kind}
					{gloss ? (
						<span className="ms-2 normal-case tracking-normal">
							{gloss}
						</span>
					) : null}
				</span>
			) : null}
		</div>
	);
}

/**
 * A Pane bar's face: the Ground's chrome, laid out as a Cover's Heading.
 * A Rooted Pane shows its ← and its trail; a Floating Pane its ×, and its
 * Ground's title, the real one when the Ground is a ported Note.
 */
function PaneBarFace({
	subject,
	titled,
	width,
	back,
	clear,
	onFollow,
	children,
}: {
	/** The Ground's Subject when it is a Sheet: its column is the bar's. */
	subject: Subject | null;
	/** Shows the Ground's title; otherwise the trail. */
	titled: boolean;
	/** The column when the Ground is a list rather than a Sheet. */
	width: string | null;
	back: CoverBack | null;
	clear: CoverBack | null;
	onFollow: (link: NoteLink) => void;
	/** The trail. */
	children: ReactNode;
}) {
	const design = useHeadingDesign();
	const note = subject?.kind === "Note" ? subject.note : null;
	const ported = usePortedReading(note);
	const portedFollow = usePortedFollow(note?.word ?? "", onFollow);
	return (
		<SheetChrome
			ruled={false}
			maxWidth={
				width ??
				(subject
					? sheetColumn(subject, true, ported !== null).title
					: "")
			}
			back={back}
			clear={clear}
			linksDrag={design.linksDrag}
		>
			{!titled || !subject ? (
				children
			) : ported ? (
				<PortedTitle
					note={ported}
					presentation="Sheet"
					follow={portedFollow}
				/>
			) : (
				<SheetTitle subject={subject} />
			)}
		</SheetChrome>
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
	const block = useRef<HTMLDivElement>(null);
	/* a Cover pushed by Go to source arrives scrolled to its Sentence */
	useEffect(() => {
		if (sheet && focus) lit.current?.scrollIntoView({ block: "center" });
	}, [sheet, focus]);
	/* room under the last Sentence, so any Sentence can be scrolled clear
	   of the Deck: as tall as the body that scrolls it */
	const [trailer, setTrailer] = useState(0);
	useLayoutEffect(() => {
		if (!sheet) return;
		const scroller = block.current?.closest<HTMLElement>("[data-scroller]");
		if (!scroller) return;
		const measure = () => setTrailer(scroller.clientHeight);
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(scroller);
		return () => observer.disconnect();
	}, [sheet, shown]);
	if (!shown) return null;
	return (
		<div
			ref={block}
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
			{sheet ? (
				<div aria-hidden="true" style={{ height: trailer }} />
			) : null}
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

/** What a release in the held Card's own Pane does, as the zone says it. */
function homeLabel(drag: Drag): string {
	switch (drag.home) {
		case "slot":
			return "Back on the Deck";
		case "close":
			return "Close";
		default:
			return "Back in place";
	}
}

/** What letting go of `drag` over `destination` does to its Card. */
function fateOf(drag: Drag, destination: Destination | null): Fate {
	if (destination?.kind === "sheet" || destination?.kind === "pane")
		return "open";
	/* anywhere else it goes home, and for a Card from nowhere, or a Cover
	   on no live Deck, home is away */
	return drag.home === "close" || drag.home === "vanish" ? "leave" : "rest";
}

function DropZones({
	paneId,
	regions,
	destination,
	homeLabel,
	shown,
}: {
	paneId: string;
	regions: DropRegions;
	destination: Destination | null;
	/** What the cover region says when it is the held Card's home. */
	homeLabel: string;
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
				data-active={here?.kind === "sheet" || here?.kind === "home"}
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
				) : here?.kind === "home" ? (
					<span className={labelClass}>{homeLabel}</span>
				) : null}
			</div>
		</>
	);
}
