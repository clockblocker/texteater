import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "lego";
import {
	animate,
	MotionConfig,
	type MotionValue,
	motion,
	motionValue,
} from "motion/react";
import {
	type MouseEvent as ReactMouseEvent,
	type ReactNode,
	type PointerEvent as ReactPointerEvent,
	type UIEvent,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	BAR_REM,
	cardHeightPx,
	cardWidthIn,
	coverBoxIn,
	DEAL_GAP_PX,
	DECK_TOP_REM,
	deckColumnIn,
	deckTopIn,
	dropRegions,
	findPane,
	groundBoxIn,
	groundOf,
	HEADER_REM,
	HYSTERESIS_PX,
	heldHome,
	inside,
	isRooted,
	LOOSE_CARD_REM,
	openIds,
	panesOf,
	type Region,
	regionAt,
	restingCards,
	returnBandIn,
	sameBoxes,
	spawnSize,
	splitBeside,
	updatePane,
	type WritingDirection,
	workspaceReducer,
	Z,
} from "react-resizable-panels/workspace";
import { useMotionPreference } from "@/lib/motion-preference";
import {
	LEAVING,
	LEAVING_OPACITY,
	rubberBand,
	VELOCITY_SAMPLE_MS,
} from "@/workspace/motion/motion-spec";
import { useDeckReducedMotion } from "@/workspace/motion/reduced-motion";
import {
	type DeckMotionOverrides,
	DeckMotionProvider,
	useDeckMotion,
} from "@/workspace/motion/runtime-config";
import { DropZones, fateOf, homeLabel } from "./drop-zones";
import {
	cleanWord,
	type DummyText,
	deckFor,
	type NoteLink,
	noteFor,
	TEXTS,
	textById,
} from "./dummy";
import {
	coverHeadingRem,
	DEFAULT_HEADING_DESIGN,
	foldedAt,
	type HeadingDesign,
	HeadingDesignProvider,
} from "./heading-design";
import {
	ALL_INTERACTIONS,
	type DeckInteraction,
	DeckInteractions,
	useDeckInteractions,
} from "./interaction-policy";
import { columnRemOf, remPx } from "./layout";
import {
	type Box,
	type Deck,
	type Destination,
	type Drag,
	deckHolding,
	type Edge,
	type Fate,
	findSheet,
	initialWorkspace,
	type LayoutNode,
	type Lift,
	type NoteHandle,
	type PaneNode,
	type PendingLift,
	type Place,
	PREVIEW_PANE,
	PREVIEW_SHEET,
	type Presentation,
	ROOT_PANE,
	type Rung,
	rungLabel,
	type SheetRef,
	type Subject,
	sheetsOf,
	subjectGloss,
	subjectLabel,
	subjectOfLink,
	topSheetOf,
	type Workspace,
	type WorkspaceCommand,
} from "./model";
import { PresentationView } from "./note-view";
import { GROUND_LIST_WIDTH, GroundList, PaneBarFace } from "./pane-chrome";
import { FixtureNotesProvider } from "./real-note";
import { RULES } from "./rules";
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

/** Where the workbench's stage, with no Text above its Deck, puts the Deck's top. */
const STAGE_DECK_TOP_REM = 3;

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
	const deckTopRem = embedded ? STAGE_DECK_TOP_REM : DECK_TOP_REM;
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
	/** Floating Panes whose Ground has scrolled far enough to fold its bar. */
	const [foldedGrounds, setFoldedGrounds] = useState<ReadonlySet<string>>(
		() => new Set(),
	);
	/**
	 * A Pane bar's height. A Floating Pane's bar is its Ground's Heading, so
	 * it takes the Heading design, fold and all; a Rooted Pane's carries the
	 * trail, and stays a bar.
	 */
	function barRemOf(pane: PaneNode | null): number {
		if (!pane || isRooted(pane) || groundOf(pane).kind !== "Sheet")
			return BAR_REM;
		return coverHeadingRem(foldedGrounds.has(pane.id));
	}
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
		GROUND_FILL,
		HOLD_RELEASE,
		ZONE_FEEDBACK_MS,
		OPEN_SCALE,
		SETTLE_TIMEOUT_MS,
		leanFor,
		deckFollowFor,
		DECK_FOLLOW_SPRING,
		SWIPE_BREAK_PX,
		SWIPE_LET_GO_PX,
		FLICK_SPEED,
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
	/**
	 * The Panes, their Decks and the Held Card, as the battery's reducer
	 * keeps them. The ref is the truth handlers read and `dispatch` writes
	 * at once, so a handler sees its own command's result; the state
	 * renders it.
	 */
	const [workspace, setWorkspace] = useState<Workspace>(() =>
		initialWorkspace(initialScene),
	);
	const workspaceRef = useRef(workspace);
	const layout = workspace.layout;
	function dispatch(command: WorkspaceCommand): Workspace {
		const next = workspaceReducer(workspaceRef.current, command);
		workspaceRef.current = next;
		setWorkspace(next);
		return next;
	}
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
	/** The frame's writing direction: which physical side each logical edge is on. */
	const [direction, setDirection] = useState<WritingDirection>("ltr");
	/**
	 * Bumped whenever a Pane's box changes: a split, a preview, a handle
	 * drag, the window. A Note whose box changes in the same pass is being
	 * resized with its Pane, not moved, and jumps rather than morphs.
	 */
	const [layoutEpoch, setLayoutEpoch] = useState(0);
	const dragRef = useRef<Drag | null>(null);
	const settlingRef = useRef(false);
	/** `returning`, read by handlers: a returning Card can be taken back. */
	const returningRef = useRef(false);
	/** Looks at a still hand again once its throw has gone stale; see `reassess`. */
	const staleTimer = useRef<number | undefined>(undefined);
	useEffect(() => () => window.clearTimeout(staleTimer.current), []);
	/** The return's own animations, so a fresh grab can take the Card back. */
	const returnRun = useRef<{ stop: () => void }[]>([]);
	const root = useRef<HTMLDivElement>(null);
	const handles = useRef(new Map<string, NoteHandle>());
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
				columnRemOf(drag.card.subject),
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
						presentation: drag.card,
						deck: null,
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
					presentation: drag.card,
					deck: null,
				},
			],
			covers: [],
		};
		return splitBeside(layout, previewAt.paneId, previewAt.edge, fresh, {
			id: `split-${PREVIEW_PANE}`,
			size: previewSize.current.size,
		});
	}, [layout, drag, previewAt, coverAt]);
	const destinationRef = useRef<Destination | null>(null);
	destinationRef.current = destination;
	/** The Cards a Deck shows: the dealt Notes that are not open as a Sheet. */
	const visibleCards = (deck: Deck) =>
		deck.cards.filter((card) => !open.has(card.id));
	const expandedOf = (deck: Deck, cards: readonly Presentation[]) =>
		cards.find((card) => card.id === deck.frontId) ?? cards[0] ?? null;

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
			setDirection(
				getComputedStyle(frame).direction === "rtl" ? "rtl" : "ltr",
			);
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

	function openLibrary(paneId: string) {
		log(`Menu › Library in ${paneId}`);
		dispatch({
			type: "StepUp",
			paneId,
			to: { kind: "MenuItem", item: "Library" },
		});
	}
	function openText(paneId: string, text: DummyText) {
		log(`Library › ${text.title} in ${paneId}: the Ground's selection`);
		dispatch({
			type: "StepUp",
			paneId,
			to: { kind: "Sheet", subject: { kind: "Text", text, focus: null } },
		});
	}
	/** Logs ← on a Ground, one rung down the line; the rung's Deck leaves with it. */
	function logStepDown(pane: PaneNode, reason: string) {
		const leaving = groundOf(pane);
		const below = pane.line[pane.line.length - 2] as Rung;
		log(
			`${reason}: ${rungLabel(leaving)} › ${rungLabel(below)}${leaving.deck ? ", its Deck ends" : ""}`,
		);
	}
	/** ← on a Ground: one rung down the line. The rung's Deck leaves with it. */
	function stepDown(paneId: string, reason: string) {
		const pane = findPane(workspaceRef.current.layout, paneId);
		if (!pane || pane.covers.length || pane.line.length < 2) return;
		logStepDown(pane, reason);
		dispatch({ type: "GoBack", sheetId: groundOf(pane).id });
	}
	/** A Rooted Pane spawned empty, at its Menu, on purpose (issue 480). */
	function spawnEmptyPane() {
		const before = new Set(
			panesOf(workspaceRef.current.layout).map((pane) => pane.id),
		);
		const next = dispatch({
			type: "SpawnRootedPane",
			paneId: ROOT_PANE,
			edge: "inline-end",
		});
		const id = panesOf(next.layout).find(
			(pane) => !before.has(pane.id),
		)?.id;
		if (id) log(`New Rooted Pane ${id} at its Menu`);
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
		const deckTop = frameBox.top + paneBox.top + deckTopIn(rem, deckTopRem);
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
		sheetId: string,
		word: string,
		element: HTMLElement,
	) {
		if (!allows("deal")) return;
		const pane = findPane(workspaceRef.current.layout, paneId);
		if (!pane || topSheetOf(pane).sheetId !== sheetId) return;
		clearSentence(element, paneId);
		const before = findSheet(workspaceRef.current.layout, sheetId)?.deck;
		log(
			`Select "${cleanWord(word)}": ${before ? "replace the Deck, " : ""}deal 4`,
		);
		dispatch({
			type: "Deal",
			sheetId,
			selection: cleanWord(word),
			cards: deckFor(word).map((note) => ({
				subject: { kind: "Note", note },
			})),
		});
	}
	function bringToFront(sheetId: string, card: Presentation) {
		if (!allows("select")) return;
		log(`Tap folded: ${subjectLabel(card.subject)} expands`);
		dispatch({ type: "BringToFront", sheetId, presentationId: card.id });
	}
	/** The Deck ends: every Card still on it flies off, then it is gone. */
	function sweep(
		sheetId: string,
		reason: string,
		run?: () => Promise<unknown>,
	) {
		const sheet = findSheet(workspaceRef.current.layout, sheetId);
		if (!sheet?.deck) return;
		const cards = visibleCards(sheet.deck);
		log(`${reason}: sweep ${cards.length.toString()}`);
		const end = () => dispatch({ type: "Sweep", sheetId });
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

	/** A Link pushes a fresh Presentation as a Cover; Go to source is one. */
	function followLink(paneId: string, subject: Subject, reason: string) {
		log(`${reason}: ${subjectLabel(subject)} covers ${paneId}`);
		dispatch({ type: "FollowLink", paneId, subject });
	}
	/** A Cover is a form, not a move: a dealt Card keeps its rank in its Deck. */
	function openCover(paneId: string, card: Presentation, reason: string) {
		log(`${reason}: ${subjectLabel(card.subject)} covers ${paneId}`);
		dispatch({ type: "Expand", paneId });
	}
	/** A Note or a Text dropped on an edge is the new Pane's Ground: a Floating Pane. */
	function splitPane(card: Presentation, paneId: string, edge: Edge) {
		const previewed = previewSize.current;
		const size =
			previewed?.paneId === paneId && previewed.edge === edge
				? previewed.size
				: spawnSize(
						columnRemOf(card.subject),
						restBoxes[paneId]?.width ?? 0,
						rem,
					);
		const next = dispatch({ type: "Expand", paneId, edge, size });
		const id = panesOf(next.layout).find(
			(pane) => sheetsOf(pane)[0]?.presentation?.id === card.id,
		)?.id;
		log(
			`Drop at ${edge} edge: Floating Pane ${id ?? "?"} with ${subjectLabel(card.subject)} as Ground`,
		);
	}
	/** ← on a Cover: Collapse when its Card is still on a live Deck, Close otherwise. */
	function leaveCover(cover: SheetRef, reason: string) {
		const card = cover.presentation;
		if (!card) return;
		const holder = deckHolding(workspaceRef.current.layout, card.id);
		log(
			`${reason}: ${subjectLabel(card.subject)} ${holder ? "collapses back to its Card" : "closes"}${cover.deck ? ", its Deck ends" : ""}`,
		);
		dispatch({ type: "GoBack", sheetId: cover.sheetId });
	}
	/** X: a Floating Pane closes with its Covers and its Deck. */
	function closePane(paneId: string, reason: string) {
		const pane = findPane(workspaceRef.current.layout, paneId);
		if (!pane || isRooted(pane)) return;
		const ground = groundOf(pane);
		const card = ground.kind === "Sheet" ? ground.presentation : null;
		const holder = card
			? deckHolding(workspaceRef.current.layout, card.id)
			: null;
		log(
			`${reason}: Pane ${paneId} closes${card ? `; ${subjectLabel(card.subject)} ${holder ? "collapses back to its Card" : "closes"}` : ""}`,
		);
		dispatch({ type: "ClosePane", paneId });
	}
	/** The Pane bar's control: the Ground's ←, or a Floating Pane's X. */
	function back(paneId: string, reason: string) {
		const pane = findPane(workspaceRef.current.layout, paneId);
		if (!pane || !allows("collapse")) return;
		if (isRooted(pane)) {
			if (!pane.covers.length) stepDown(paneId, reason);
		} else closePane(paneId, reason);
	}
	/** A Cover bar's ←: only the top Cover's is reachable. */
	function coverBack(paneId: string, sheetId: string) {
		const pane = findPane(workspaceRef.current.layout, paneId);
		const top = pane ? topSheetOf(pane) : null;
		if (
			!top ||
			top.ground ||
			top.sheetId !== sheetId ||
			!allows("collapse")
		)
			return;
		leaveCover(top, "←");
	}
	/**
	 * A Cover's ×: every Cover in the Pane leaves at once, each as its ←
	 * would, and the Ground is what remains.
	 */
	function clearCovers(paneId: string) {
		const pane = findPane(workspaceRef.current.layout, paneId);
		if (!pane?.covers.length || !allows("collapse")) return;
		log(
			`×: ${pane.covers.length > 1 ? `${pane.covers.length.toString()} Covers leave` : "the Cover leaves"} ${paneId}; its Ground shows`,
		);
		dispatch({ type: "ClearCovers", paneId });
	}
	function follow(paneId: string, link: NoteLink) {
		if (!allows("follow")) return;
		followLink(paneId, subjectOfLink(link), `Follow ${link.label}`);
	}
	function reset() {
		const fresh = initialWorkspace("empty");
		workspaceRef.current = fresh;
		setWorkspace(fresh);
		dragRef.current = null;
		pendingLift.current = null;
		setLoose(null);
		setDrag(null);
		setDestination(null);
		clear();
	}

	/* --- drag: destination under the pointer --- */

	/** The Deck's column in its Pane: where its Cards sit, in frame coordinates. */
	function deckColumn(paneBox: Box): Box {
		return deckColumnIn(paneBox, rem, OPEN_SCALE, deckTopRem);
	}
	/**
	 * The return band: the Pane's width between its two edge regions, from
	 * the Deck's top to `RETURN_PAD_REM` below it.
	 */
	function returnZone(paneBox: Box, card: Presentation): Box {
		return returnBandIn(
			paneBox,
			columnRemOf(card.subject),
			rem,
			OPEN_SCALE,
			{
				topRem: deckTopRem,
			},
		);
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
				: findSheet(workspaceRef.current.layout, d.deckSheet);
		const holderBox = holder ? paneBoxes[holder.paneId] : undefined;
		/* a Card off its Deck thrown right goes back to it, wherever it is
		   let go: the throw says where it is headed, not where it is */
		if (holder?.deck && !d.lifted && flickOf(d, now) === "right")
			return { kind: "return" };
		if (
			holder?.deck &&
			holderBox &&
			!inside(
				dropRegions(holderBox, columnRemOf(d.card.subject), rem, {
					barRem: barRemOf(
						findPane(workspaceRef.current.layout, holder.paneId),
					),
					direction,
				}).bar,
				x,
				y,
			)
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
		const panes = panesOf(workspaceRef.current.layout);
		if (
			panes.length !== Object.keys(restBoxes).length ||
			panes.some((pane) => !restBoxes[pane.id])
		)
			return null;
		const columnRem = columnRemOf(d.card.subject);
		const regions = panes.map((pane) => ({
			paneId: pane.id,
			regions: dropRegions(restBoxes[pane.id] as Box, columnRem, rem, {
				barRem: barRemOf(pane),
				direction,
			}),
		}));
		/* the destination the pointer was over holds it a little longer */
		const current = destinationRef.current;
		const held: Region | null =
			current?.kind === "pane"
				? { kind: "edge", paneId: current.paneId, edge: current.edge }
				: current && "paneId" in current
					? { kind: "cover", paneId: current.paneId }
					: null;
		const hit = regionAt(regions, x, y, held);
		if (!hit) return null;
		if (hit === held) return current;
		if (hit.kind === "edge")
			return { kind: "pane", paneId: hit.paneId, edge: hit.edge };
		return d.lifted && d.home !== "vanish" && hit.paneId === d.paneId
			? { kind: "home", paneId: hit.paneId }
			: { kind: "sheet", paneId: hit.paneId };
	}
	function sameDestination(a: Destination | null, b: Destination | null) {
		return JSON.stringify(a) === JSON.stringify(b);
	}

	/* --- drag: pointer --- */

	function resetTransforms(h: NoteHandle) {
		h.x.jump(0);
		h.y.jump(0);
		h.rotate.jump(0);
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
			sampled: { x: event.clientX, y: event.clientY, t: now },
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
		deckSheet: string | null,
		home: Drag["home"],
	) {
		const h = handles.current.get(card.id);
		/* nothing to hold: the Lift the reducer began is called off */
		if (!h) {
			dispatch({ type: "CancelGesture" });
			return;
		}
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
			sampled: { x: lift.x, y: lift.y, t: now },
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
		const card = sheet.presentation;
		if (!card) return;
		endReturn();
		const before = workspaceRef.current.layout;
		const holder = deckHolding(before, card.id);
		const next = dispatch({ type: "LiftSheet", sheetId: sheet.sheetId });
		if (!next.held) return;
		log(
			sheet.ground
				? `${reason}: ${subjectLabel(card.subject)} lifts; Pane ${sheet.paneId} closes behind it`
				: `${reason}: ${subjectLabel(card.subject)} lifts off ${sheet.paneId}`,
		);
		/* the Deck it lands on is one taller than what it shows now */
		const count = holder?.deck
			? restingCards(before, holder.deck).length + 1
			: 1;
		const height = holder
			? cardHeightPx(count, remPx())
			: LOOSE_CARD_REM * remPx();
		emergeFrom(card, bar);
		startLift(
			card,
			lift,
			handBox(lift, sheet.paneId, height),
			sheet.paneId,
			holder?.sheetId ?? null,
			heldHome(next) ?? "close",
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
		const pane = findPane(workspaceRef.current.layout, sheet.paneId);
		const card = sheet.presentation;
		if (!pane || !card || pane.covers.length || pane.line.length < 2)
			return;
		endReturn();
		logStepDown(pane, "Hold bar: lift the Ground");
		dispatch({ type: "LiftSheet", sheetId: sheet.sheetId });
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
				ground?.presentation &&
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
		if (!ground?.presentation || pane.covers.length || !allows("lift"))
			return;
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
		const card = dispatch({
			type: "LiftFresh",
			paneId: pending.paneId,
			subject: pending.make(),
		}).held?.presentation;
		if (!card) return;
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
		if (!d.lifted && d.deckSheet !== null)
			dispatch({
				type: "LiftCard",
				sheetId: d.deckSheet,
				presentationId: d.card.id,
			});
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
		const span = event.timeStamp - d.sampled.t;
		if (span >= VELOCITY_SAMPLE_MS) {
			const vx = (event.clientX - d.sampled.x) / span;
			const vy = (event.clientY - d.sampled.y) / span;
			/* a hand that had stopped starts its speed afresh: what it had
			   before the pause is not carried into the next move */
			const keep =
				event.timeStamp - d.last.t > VELOCITY_STALE_MS ? 0 : 0.6;
			d.v = {
				vx: d.v.vx * keep + vx * (1 - keep),
				vy: d.v.vy * keep + vy * (1 - keep),
			};
			d.sampled = {
				x: event.clientX,
				y: event.clientY,
				t: event.timeStamp,
			};
		}
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
		if (d.phase === "swiping") swipeDeck(d, dx, dy, event.timeStamp);
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
	 * Which way the hand is throwing, if it is: its speed along its main
	 * axis, while that speed is still fresh, past `FLICK_SPEED`.
	 */
	function flickOf(d: Drag, now: number): "left" | "right" | null {
		if (now - d.last.t > VELOCITY_STALE_MS) return null;
		const { vx, vy } = d.v;
		if (Math.abs(vx) < FLICK_SPEED || Math.abs(vx) < Math.abs(vy))
			return null;
		return vx < 0 ? "left" : "right";
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
				if (dragRef.current !== d) return;
				const later = performance.now();
				/* a swipe held still past the let-go line is a slow one */
				if (d.phase === "swiping")
					swipeDeck(
						d,
						d.last.x - d.start.x,
						d.last.y - d.start.y,
						later,
					);
				reassess(d, d.last.x, d.last.y, later);
			}, VELOCITY_STALE_MS + 1);
	}
	/** Every other Card on the Deck `d`'s Card rests in, and how many ranks away it is. */
	function followersOf(d: Drag): { h: NoteHandle; distance: number }[] {
		if (d.deckSheet === null) return [];
		const deck = findSheet(workspaceRef.current.layout, d.deckSheet)?.deck;
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
	 * `SWIPE_BREAK_PX`, or carried slowly left past `SWIPE_LET_GO_PX`, the
	 * Card tears loose. A hand throwing left tears nothing: the throw is
	 * the sweep, and a throw drifts.
	 */
	function swipeDeck(d: Drag, dx: number, dy: number, now: number) {
		if (
			flickOf(d, now) !== "left" &&
			(dx > SWIPE_BREAK_PX ||
				Math.abs(dy) > SWIPE_BREAK_PX ||
				dx < -SWIPE_LET_GO_PX)
		) {
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
	 * Put the Card's tilt back where it rests. Reduced motion takes it
	 * there at once: the tilt says nothing the border and the label are
	 * not already saying.
	 */
	function settleTransform(h: NoteHandle) {
		if (reduce) h.rotate.jump(0);
		else animate(h.rotate, 0, SPRING);
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
	 *
	 * The travel spring picks up the speed `h.x` already has, so a flicked
	 * Card leaves at the hand's pace. The flight is over when the Card has
	 * faded and turned; the travel's long tail is out of sight by then.
	 */
	function flight(h: NoteHandle): Promise<unknown> {
		if (reduce)
			return Promise.all([animate(h.opacity, 0, transition(FLY_FADE))]);
		const travel = animate(
			h.x,
			h.x.get() - FLY_DISTANCE,
			transition(FLY_TRAVEL),
		);
		return Promise.all([
			animate(h.rotate, FLY_ROTATE_TO, transition(FLY_ROTATE)),
			animate(h.opacity, 0, transition(FLY_FADE)),
		]).then(() => travel.stop());
	}
	/** A loose Card let go with nothing under it: it fades where it is. */
	function vanish(d: Drag) {
		log("Let go: the Card goes");
		dispatch({ type: "Release" });
		settle(
			() => Promise.all([animate(d.h.opacity, 0, transition(FLY_FADE))]),
			() => {},
		);
	}
	/** A lifted Sheet let go with nowhere to be: it is the Sheet again. */
	function restore(d: Drag, reason: string) {
		log(`${reason}: ${subjectLabel(d.card.subject)} is a Sheet again`);
		resetTransforms(d.h);
		dispatch({ type: "CancelGesture" });
		setLoose(null);
		setDrag(null);
		setDestination(null);
		setPastCommit(false);
	}
	/** Whole-Deck swipe: the held Card and its Deck fly together. */
	function sweepByDrag(d: Drag, reason: string) {
		if (d.deckSheet === null) return;
		const sheet = findSheet(workspaceRef.current.layout, d.deckSheet);
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
		if (reduce) h.rotate.jump(0);
		else animate(h.rotate, 0, MORPH);
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
		log(`${reason}: ${subjectLabel(d.card.subject)} closes`);
		dispatch({ type: "Release" });
		settle(
			() => Promise.all([animate(d.h.opacity, 0, transition(FLY_FADE))]),
			() => {},
		);
	}
	/** A release with nothing under it, or in the Card's own Pane. */
	function goHome(d: Drag, reason = "Released in place") {
		if (d.home === "slot") {
			dispatch({ type: "Release" });
			snapBack(d.h);
		} else if (d.home === "restore") restore(d, reason);
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
					: findSheet(workspaceRef.current.layout, d.deckSheet);
			if (!sheet?.deck) return;
			const deck = sheet.deck;
			if (expandedOf(deck, visibleCards(deck))?.id === card.id)
				log("Tap expanded: nothing; drag ↑ to open");
			else bringToFront(sheet.sheetId, card);
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
		const lifted = workspaceRef.current.held !== null;
		dispatch({ type: "CancelGesture" });
		if (d.lifted && lifted) {
			resetTransforms(d.h);
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
			const { layout: current, activePaneId } = workspaceRef.current;
			const pane = findPane(current, activePaneId);
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
		if (paneId && paneId !== PREVIEW_PANE)
			dispatch({ type: "ActivatePane", paneId });
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
	function pageScroll(event: UIEvent<HTMLElement>) {
		if (pagePointer.current) pagePointer.current.scrolled = true;
		/* a Floating Ground's body folds its Pane bar, as a Cover's body
		   folds its Heading */
		const scroller = event.target;
		if (
			!(scroller instanceof HTMLElement) ||
			!scroller.matches("[data-scroller]")
		)
			return;
		const paneId = scroller.closest<HTMLElement>('[data-form="ground"]')
			?.dataset.pane;
		if (!paneId) return;
		setFoldedGrounds((current) => {
			const was = current.has(paneId);
			if (foldedAt(was, scroller.scrollTop) === was) return current;
			const next = new Set(current);
			if (was) next.delete(paneId);
			else next.add(paneId);
			return next;
		});
	}
	/**
	 * A click in the gap between a Pane and its Covers is the top Cover's
	 * ×. The Covers hide everything of the Pane but that gap, so a click
	 * that lands on the Pane or its Ground while it has Covers landed there.
	 * A Card lying over the gap is its own.
	 */
	function clearFromGap(target: HTMLElement): boolean {
		if (target.closest('[data-form="card"], [data-return-zone]'))
			return false;
		const at = target.closest<HTMLElement>(
			'[data-deck-pane], [data-form="ground"]',
		);
		const paneId = at?.dataset.deckPane ?? at?.dataset.pane;
		const pane = paneId
			? findPane(workspaceRef.current.layout, paneId)
			: null;
		if (!pane?.covers.length) return false;
		clearCovers(pane.id);
		return true;
	}
	function pageClick(event: ReactMouseEvent<HTMLElement>) {
		if (swallowClick.current) {
			swallowClick.current = false;
			event.preventDefault();
			event.stopPropagation();
			return;
		}
		if (!dismissOnClick.current) return;
		const target = event.target as HTMLElement;
		if (clearFromGap(target)) return;
		if (!allows("dismiss")) return;
		if (target.closest(DISMISS_EXEMPT_SELECTOR)) return;
		const sheetId =
			target.closest<HTMLElement>("[data-sheet-id]")?.dataset.sheetId;
		const paneId =
			target.closest<HTMLElement>("[data-deck-pane]")?.dataset.deckPane;
		const pane = paneId
			? findPane(workspaceRef.current.layout, paneId)
			: null;
		const top = pane ? topSheetOf(pane) : null;
		/* only a click on the top Sheet is a click on that Sheet */
		const sheet = sheetId
			? findSheet(workspaceRef.current.layout, sheetId)
			: top;
		if (!sheet?.deck || !visibleCards(sheet.deck).length) return;
		const its = findPane(workspaceRef.current.layout, sheet.paneId);
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
	const register = (id: string, handle: NoteHandle | null) => {
		if (handle) handles.current.set(id, handle);
		else handles.current.delete(id);
	};

	/** The return band over a Deck's footprint: drawn on demand, where it is read. */
	function renderReturnZone(sheet: SheetRef, paneBox: Box): ReactNode[] {
		const deck = sheet.deck;
		if (!deck || !showZones || drag?.deckSheet !== sheet.sheetId) return [];
		return [
			<div
				key={`return-${sheet.sheetId}`}
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
							regions={dropRegions(
								box,
								columnRemOf(drag.card.subject),
								rem,
								{ barRem: barRemOf(pane), direction },
							)}
							destination={destination}
							homeLabel={homeLabel(drag)}
							shown={zonesVisible}
							direction={direction}
						/>,
					]
				: [];
		});
	}

	function renderPane(pane: PaneNode): ReactNode {
		const preview = pane.id === PREVIEW_PANE;
		const rooted = isRooted(pane);
		const ground = groundOf(pane);
		const covered = pane.covers.length > 0;
		const trail = pane.line.map((rung) => rungLabel(rung));
		const gloss =
			ground.kind === "Sheet"
				? subjectGloss(ground.presentation.subject)
				: null;
		/* the bar is a handle only while its Ground is a Sheet and uncovered */
		const handle =
			ground.kind === "Sheet" && !covered && allows("lift")
				? rooted
					? "press"
					: "drag"
				: "none";
		const holdingHere = barHolding === pane.id;
		const barRem = barRemOf(pane);
		/* a bar drawn as a Heading has no rule until it folds */
		const barRuled = barRem === BAR_REM;
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
				data-preview={preview || undefined}
				className={`relative h-full min-h-0 overflow-hidden bg-paper ${preview ? "pointer-events-none" : ""}`}
			>
				{/* the Pane bar: Sheet chrome, owned by the Pane, and the
				    Ground's handle. A hold fills it; see `GROUND_PRESS_MS`. */}
				<motion.div
					data-pane-bar=""
					data-handle={handle}
					data-holding={holdingHere}
					/* a Cover lies over the bar and carries its own, so the
					   Pane's steps back under it rather than peek past its
					   sides */
					inert={covered}
					initial={false}
					animate={{
						height: barRem * rem,
						opacity: covered ? 0 : 1,
					}}
					/* the bar's height and its Ground's box move as one */
					transition={{
						height: MORPH,
						opacity: transition(covered ? BAR_EXIT : BAR_ENTER),
					}}
					onPointerDown={(event) => paneBarDown(event, pane)}
					onPointerMove={paneBarMove}
					onPointerUp={stopBarHold}
					onPointerCancel={stopBarHold}
					onPointerLeave={stopBarHold}
					className={`absolute inset-x-0 top-0 border-b bg-paper select-none ${covered ? "pointer-events-none z-0" : "z-20"} ${preview ? "border-dashed border-link/60" : barRuled ? "border-line" : "border-transparent"} ${handle === "drag" ? "cursor-grab touch-none active:cursor-grabbing" : handle === "press" ? "cursor-pointer touch-none" : ""}`}
				>
					{/* the hold's countdown: it fills from the inline-start
					    edge in exactly the press time, and drains fast when
					    let go. Reduced, it deepens in place instead of
					    sweeping across. Under the bar's words, over its paper */}
					<motion.div
						aria-hidden="true"
						data-hold-fill=""
						initial={false}
						animate={{
							scaleX: reduce || holdingHere ? 1 : 0,
							opacity: !reduce || holdingHere ? 1 : 0,
						}}
						transition={transition(
							holdingHere ? GROUND_FILL : HOLD_RELEASE,
						)}
						className="pointer-events-none absolute inset-0 -z-10 origin-left bg-link/15 rtl:origin-right"
					/>
					<PaneBarFace
						subject={
							ground.kind === "Sheet"
								? ground.presentation.subject
								: null
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
							{/* the trail changes on every step, and changes at
							    once: the step is the motion, the words follow */}
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
												? holdingHere
													? "text-link"
													: "text-ink"
												: undefined
										}
									>
										{crumb}
									</span>
								</span>
							))}
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
				) : ground.kind === "MenuItem" ? (
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
				orientation={node.direction}
			>
				<ResizablePanel
					id={a.id}
					minSize={240}
					defaultSize={
						node.fresh?.paneId === a.id
							? node.fresh.size
							: undefined
					}
				>
					{renderLayout(a)}
				</ResizablePanel>
				<ResizableHandle aria-label="Resize panes" />
				<ResizablePanel
					id={b.id}
					minSize={240}
					defaultSize={
						node.fresh?.paneId === b.id
							? node.fresh.size
							: undefined
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
		const slotHeight = cardHeightPx(count, remPx());
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
		const rendered = new Set<string>();
		for (const pane of panesOf(displayLayout)) {
			const paneBox = paneBoxes[pane.id];
			if (!paneBox) continue;
			const sheets = sheetsOf(pane);
			const top = sheets[sheets.length - 1] as SheetRef;
			sheets.forEach((sheet, index) => {
				const card = sheet.presentation;
				if (!card) return;
				const isTop = index === sheets.length - 1;
				const ghost = sheet.preview;
				if (!ghost) rendered.add(card.id);
				/* a Cover's Heading is its bar: the ← and the handle ride
				   the Note's own box rather than sitting beside it */
				const grabs = isTop && !ghost && allows("lift");
				notes.push(
					<PresentationView
						key={
							ghost
								? `ghost-${pane.id}-${sheet.sheetId}`
								: card.id
						}
						card={card}
						form="sheet"
						place="open"
						box={
							sheet.ground
								? groundBoxIn(paneBox, rem, barRemOf(pane))
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
						litWord={isTop ? (sheet.deck?.selection ?? null) : null}
						epoch={layoutEpoch}
						register={ghost ? () => {} : register}
						back={
							sheet.ground
								? null
								: {
										label: deckHolding(layout, card.id)
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
						<legend className="mb-1 font-mono text-[0.62rem] font-bold tracking-[0.12em] text-ink-muted uppercase">
							Cover Heading
						</legend>
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
								followLink(
									workspaceRef.current.activePaneId,
									{
										kind: "Note",
										note: noteFor("Reading", "Dämmerung"),
									},
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
