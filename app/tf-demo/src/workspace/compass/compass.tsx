import {
	type Box,
	coverBoxIn,
	DECK_TOP_REM,
	deckColumnIn,
	deckHolding,
	deckSlotsIn,
	dropRegions,
	findPane,
	groundBoxIn,
	groundOf,
	isRooted,
	type LayoutNode,
	openIds,
	type PaneNode,
	type Presentation,
	panesOf,
	restingCards,
	returnBandIn,
	sheetZ,
	Z,
} from "compass";
import {
	ResizableSplit,
	ResizableSplitHandle,
	ResizableSplitRegion,
} from "lego";
import { MotionConfig } from "motion/react";
import { type ReactNode, useMemo, useRef } from "react";
import { useMotionPreference } from "@/lib/motion-preference";
import { VELOCITY_SAMPLE_MS } from "@/workspace/motion/motion-spec";
import {
	type DeckMotionOverrides,
	DeckMotionProvider,
	useDeckMotion,
} from "@/workspace/motion/runtime-config";
import type { DropReading } from "./destination";
import { DropZones, ReturnZone } from "./drop-zones";
import {
	type Fate,
	fateOf,
	homeLabel,
	inHandOf,
	type NoteHandle,
	type ThrowTuning,
} from "./gesture";
import { DEFAULT_HEADING_DESIGN, HeadingDesignProvider } from "./heading";
import {
	ALL_INTERACTIONS,
	type DeckInteraction,
	DeckInteractions,
	useDeckInteractions,
} from "./interaction-policy";
import { sheetColumn } from "./layout";
import { useNoteMoves } from "./note-moves";
import { GROUND_LIST_WIDTH, GroundList, PaneBar } from "./pane-chrome";
import {
	inertActions,
	PresentationView,
	type SheetActions,
} from "./presentation-view";
import {
	groundSheetOf,
	PREVIEW_PANE,
	previewLayout,
	rungLabel,
	type SheetView,
	sheetsOf,
	shownPanes,
	topSheetOf,
} from "./sheets";
import type { MenuItem, MenuItemView, SubjectRenderer } from "./subject";
import type { CompassWorkspace } from "./use-compass-workspace";
import { useDismiss } from "./use-dismiss";
import { type PagePress, useDrag } from "./use-drag";
import { useGestureState } from "./use-gesture-state";
import { useGroundFold } from "./use-ground-fold";
import { useKeyboardLift } from "./use-keyboard-lift";
import { usePaneBoxes } from "./use-pane-boxes";
import { useWorkspaceCommands } from "./use-workspace-commands";

/**
 * The Compass renderer: the battery's Pane algebra drawn as Panes with a
 * Ground beneath their Covers, the Decks their Sheets deal, and the Held
 * Card of a Lift (tf-demo ADR 0008). Every Presentation is one element in
 * every form (ADR 0006): the same `PresentationView` is a Card in a Deck,
 * the Held Card under the pointer, and the Sheet in a Pane; only its box
 * moves, and the Subject's parts read the form and adapt.
 *
 * It is generic over the Subject. The application holds the workspace
 * (`useCompassWorkspace`) and says what a Subject is and looks like
 * (`SubjectRenderer`), what the Menu lists, and what each Menu Item's rung
 * shows.
 */
export type CompassProps<S> = {
	workspace: CompassWorkspace<S>;
	renderer: SubjectRenderer<S>;
	/** The Menu's Items, in order: the first rung after the Menu. */
	menu: readonly MenuItem[];
	/** What a Menu Item's rung shows; a selection there goes on the Ground. */
	renderMenuItem: (item: string, view: MenuItemView<S>) => ReactNode;
	/** The live interactions; a scenario restricts them. */
	interactions?: readonly DeckInteraction[];
	/** Motion parameters over the spec's, as the animation workbench tunes them. */
	motion?: DeckMotionOverrides;
	/** Whether a link in a Heading's title lifts the Sheet when dragged. */
	linksDrag?: boolean;
	/** Draw the drop regions while a Card is in hand; they are read either way. */
	zonesShown?: boolean;
	/** How far below its Pane's top a Deck starts, for a stage with nothing above it. */
	deckTopRem?: number;
};

export function Compass<S>({
	motion,
	interactions = ALL_INTERACTIONS,
	...props
}: CompassProps<S>) {
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

const ignore = () => {};

function CompassRuntime<S>({
	workspace,
	renderer,
	menu,
	renderMenuItem,
	linksDrag = DEFAULT_HEADING_DESIGN.linksDrag,
	zonesShown = false,
	deckTopRem = DECK_TOP_REM,
}: Omit<CompassProps<S>, "motion" | "interactions">) {
	const allows = useDeckInteractions();
	const {
		OPEN_SCALE,
		COMMIT,
		VELOCITY_STALE_MS,
		THROW_PROJECTION_MS,
		FLICK_SPEED,
	} = useDeckMotion();
	const tuning: ThrowTuning = {
		sampleMs: VELOCITY_SAMPLE_MS,
		staleMs: VELOCITY_STALE_MS,
		projectionMs: THROW_PROJECTION_MS,
		flickSpeed: FLICK_SPEED,
	};
	const { label } = renderer;
	const { layout, activePaneId } = workspace.state;
	const root = useRef<HTMLDivElement>(null);
	const handles = useRef(new Map<string, NoteHandle>());
	const press = useRef<PagePress | null>(null);
	const gesture = useGestureState<S>();
	const { drag, destination, returning, pastCommit } = gesture;
	const displayLayout = useMemo(
		() => previewLayout(layout, drag ? drag.card : null, destination),
		[layout, drag, destination],
	);
	const { paneBoxes, restBoxes, rem, direction, narrow, layoutEpoch } =
		usePaneBoxes(
			root,
			displayLayout,
			drag !== null && destination?.kind === "pane",
			activePaneId,
		);
	const fold = useGroundFold();
	const moves = useNoteMoves();
	const shown = shownPanes(layout, activePaneId, narrow);
	const open = useMemo(() => openIds(layout), [layout]);

	function deckColumnOf(paneId: string): Box | null {
		const box = paneBoxes[paneId];
		return box ? deckColumnIn(box, rem, OPEN_SCALE, deckTopRem) : null;
	}
	function reading(card: Presentation<S>): DropReading<S> {
		return {
			layout: workspace.current().layout,
			shown: shownPanes(
				workspace.current().layout,
				workspace.current().activePaneId,
				narrow,
			),
			paneBoxes,
			restBoxes,
			rem,
			direction,
			narrow,
			columnRem: renderer.columnRem(card.subject),
			barRemOf: fold.barRemOf,
			allows,
			tuning,
			commit: COMMIT,
			openScale: OPEN_SCALE,
			deckTopRem,
		};
	}

	const commands = useWorkspaceCommands({
		workspace,
		allows,
		smooth: !moves.reduce,
		deckTopOf: (paneId) => {
			const frameBox = root.current?.getBoundingClientRect();
			const column = deckColumnOf(paneId);
			return frameBox && column ? frameBox.top + column.top : null;
		},
		sweepAway: (cards, end, run) => {
			if (run) {
				gesture.settle(run, end);
				return;
			}
			const fly = cards.flatMap((card) => {
				const h = handles.current.get(card.id);
				return h ? [moves.flight(h, direction)] : [];
			});
			gesture.settle(() => Promise.all(fly), end);
		},
	});
	const drags = useDrag({
		root,
		workspace,
		gesture,
		moves,
		commands,
		handles,
		allows,
		direction,
		paneBoxes,
		tuning,
		reading,
		press,
		linksDrag,
		deckColumnOf,
	});
	const keyboard = useKeyboardLift({
		root,
		gesture,
		drag: drags,
		moves,
		handles,
		renderer,
		allows,
		direction,
		reading,
	});
	const dismiss = useDismiss({
		root,
		workspace,
		press,
		dragging: () => gesture.dragRef.current !== null,
		swallowClick: drags.swallowClick,
		allows,
		sweep: commands.sweep,
		clearCovers: commands.clearCovers,
		cancelDrag: () => drags.cancelDrag(),
	});

	/* --- render --- */

	const showZones = allows("drop") && drag?.phase === "held";
	/* nothing wears a label: the ghost says where a Card opens, the moving
	   Deck says it is being swiped, and the Card's own border and ink say
	   what letting go does to it */
	const fate: Fate | null =
		drag?.phase === "held" ? fateOf(drag, destination) : null;
	const inert = inertActions<S>();
	const register = (id: string, handle: NoteHandle | null) => {
		if (handle) handles.current.set(id, handle);
		else handles.current.delete(id);
	};
	/** A Card's Segments and Links do nothing, but its Deck still keeps up with it. */
	function cardActionsOf(presentationId: string): SheetActions<S> {
		return {
			...inert,
			reconcile: (cards) => commands.reconcile(presentationId, cards),
		};
	}
	/** What a Sheet's Segments and Links do, bound to its Pane. */
	function actionsOf(
		paneId: string,
		sheetId: string,
		presentationId: string,
	): SheetActions<S> {
		return {
			deal: (selection, cards, from) =>
				commands.deal(paneId, sheetId, selection, cards, from),
			follow: (subject) => commands.follow(paneId, subject),
			liftOnDrag: (event, make) => drags.segmentDown(event, paneId, make),
			reconcile: (cards) => commands.reconcile(presentationId, cards),
		};
	}
	function handleIn(selector: string): HTMLElement | null {
		return root.current?.querySelector<HTMLElement>(selector) ?? null;
	}

	function renderZones(): ReactNode[] {
		if (!showZones || !drag) return [];
		return shown.flatMap((pane) => {
			const box = restBoxes[pane.id];
			return box
				? [
						<DropZones
							key={`zones-${pane.id}`}
							paneId={pane.id}
							regions={dropRegions(
								box,
								renderer.columnRem(drag.card.subject),
								rem,
								{
									barRem: fold.barRemOf(pane),
									direction,
									narrow,
								},
							)}
							destination={destination}
							homeLabel={homeLabel(drag)}
							shown={zonesShown}
							direction={direction}
						/>,
					]
				: [];
		});
	}

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complexity baseline (#994): decompose to remove
	function renderPane(pane: PaneNode<S>): ReactNode {
		const preview = pane.id === PREVIEW_PANE;
		const rooted = isRooted(pane);
		const ground = groundOf(pane);
		const groundSheet = groundSheetOf(pane);
		const covered = pane.covers.length > 0;
		/* the bar is a handle only while its Ground is a Sheet and uncovered */
		const lifts = ground.kind === "Sheet" && !covered && allows("lift");
		const below = pane.line.at(-2);
		const barSelector = `[data-deck-pane="${pane.id}"] [data-pane-bar]`;
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
				<PaneBar
					rem={rem}
					barRem={fold.barRemOf(pane)}
					covered={covered}
					preview={preview}
					handle={lifts ? (rooted ? "press" : "drag") : "none"}
					holding={drags.barHolding === pane.id}
					columnWidth={
						ground.kind === "Sheet"
							? sheetColumn(
									renderer.columnRem(
										ground.presentation.subject,
									),
									true,
								).body
							: GROUND_LIST_WIDTH
					}
					/* the Pane bar is the Ground's: ← steps its line (not
					   while it is covered), X closes a Floating Pane with
					   everything on it. Each Cover carries its own bar. */
					back={
						rooted
							? {
									label: below
										? `Back to ${rungLabel(below, renderer, menu)}`
										: "At the Menu",
									enabled:
										below !== undefined &&
										!covered &&
										allows("collapse"),
									onPress: () => commands.back(pane.id),
								}
							: null
					}
					clear={
						rooted
							? null
							: {
									label: "Close pane",
									enabled: allows("collapse"),
									onPress: () => commands.back(pane.id),
								}
					}
					keys={
						lifts && groundSheet.presentation
							? [
									{
										text: "Lift",
										label: `Lift ${label(groundSheet.presentation.subject)}`,
										enabled: true,
										onPress: () => {
											const bar = handleIn(barSelector);
											if (!bar) return;
											if (rooted)
												keyboard.liftGround(
													groundSheet,
													bar,
												);
											else
												keyboard.liftSheet(
													groundSheet,
													bar,
												);
										},
									},
								]
							: []
					}
					title={
						!rooted && ground.kind === "Sheet"
							? renderer.render(
									ground.presentation.subject,
									{
										form: "sheet",
										place: "open",
										ground: true,
										lit: null,
										...(preview
											? inert
											: actionsOf(
													pane.id,
													ground.id,
													ground.presentation.id,
												)),
									},
									"heading",
								)
							: null
					}
					trail={pane.line.map((rung) =>
						rungLabel(rung, renderer, menu),
					)}
					onPointerDown={(event) => drags.paneBarDown(event, pane)}
					onPointerMove={drags.paneBarMove}
					onStop={drags.stopBarHold}
				/>
				{/* the Menu and a Menu Item are the Ground's first rungs:
				    lists, in the Pane */}
				{ground.kind === "Menu" ? (
					<GroundList
						title="Menu"
						items={menu}
						onPick={(item) => commands.openMenuItem(pane.id, item)}
					/>
				) : ground.kind === "MenuItem" ? (
					renderMenuItem(ground.item, {
						paneId: pane.id,
						select: (subject) => commands.select(pane.id, subject),
					})
				) : null}
			</section>
		);
	}

	function renderLayout(node: LayoutNode<S>): ReactNode {
		if (node.kind === "Pane") return renderPane(node);
		const [a, b] = node.children;
		return (
			/* keyed by its shape too: a preview that swaps sides is a new
			   split, and opens at its size rather than inheriting one */
			<ResizableSplit
				key={`${node.id}:${a.id}:${b.id}`}
				orientation={node.direction}
			>
				<ResizableSplitRegion
					id={a.id}
					minSize={240}
					defaultSize={
						node.fresh?.paneId === a.id
							? node.fresh.size
							: undefined
					}
				>
					{renderLayout(a)}
				</ResizableSplitRegion>
				<ResizableSplitHandle aria-label="Resize panes" />
				<ResizableSplitRegion
					id={b.id}
					minSize={240}
					defaultSize={
						node.fresh?.paneId === b.id
							? node.fresh.size
							: undefined
					}
				>
					{renderLayout(b)}
				</ResizableSplitRegion>
			</ResizableSplit>
		);
	}

	/**
	 * The top Sheet's Deck: Cards in slots one Heading row apart. While a
	 * ghost Cover hides the Deck, only the Card in hand is drawn, in the
	 * place it has on the Deck it will show again.
	 */
	function renderDeck(
		sheet: SheetView<S>,
		paneBox: Box,
		heldOnly: boolean,
	): ReactNode[] {
		const deck = sheet.deck;
		if (!deck) return [];
		const slots = deckSlotsIn(
			paneBox,
			deck.cards.filter((card) => !open.has(card.id)),
			deck.frontId,
			rem,
			OPEN_SCALE,
			deckTopRem,
		);
		/* a swiped Deck moves as a stack: every Card keeps its z, and every
		   Card wears the commit line */
		const swiping =
			drag?.phase === "swiping" && drag.deckSheet === sheet.sheetId;
		return slots.flatMap(({ card, place, box: slot, z: restingZ }) => {
			const held =
				drag !== null &&
				drag.phase !== "pressed" &&
				drag.card.id === card.id;
			if (heldOnly && !held) return [];
			/* a Held Card is over its Deck until it is let go */
			const z = held && !returning && !swiping ? Z.held : restingZ;
			const name = label(card.subject);
			return (
				<PresentationView
					key={card.id}
					renderer={renderer}
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
					lit={null}
					epoch={layoutEpoch}
					register={register}
					keys={[
						{
							text: "Open",
							label: `Open ${name} as a Cover`,
							enabled: allows("expand") && drag === null,
							onPress: () =>
								commands.expandCard(sheet.sheetId, card),
						},
						{
							text: "Lift",
							label: `Lift ${name}`,
							enabled: allows("drag") && drag === null,
							onPress: () => keyboard.liftCard(card, sheet),
						},
					]}
					actions={cardActionsOf(card.id)}
					onDown={(event) => drags.cardDown(event, card, sheet)}
				/>
			);
		});
	}

	/** The Panes drawn from the display layout: every one, or the Active Pane alone. */
	const drawn = narrow
		? shown.flatMap((pane) => {
				const at = findPane(displayLayout, pane.id);
				return at ? [at] : [];
			})
		: panesOf(displayLayout);

	/**
	 * Every Note, in whatever form it is in right now, with the box it
	 * should occupy: each Pane's Ground and Covers, the top Sheet's Deck,
	 * and a loose Card in hand. Read off the display layout, so a ghost is
	 * drawn by the same path as the Sheet it previews, and the Deck under
	 * a ghost Cover is hidden the way it would be. The Card in hand stays
	 * in hand: a ghost of it is a second element of the same Subject.
	 */
	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complexity baseline (#994): decompose to remove
	function renderNotes(): ReactNode {
		const notes: ReactNode[] = [];
		const rendered = new Set<string>();
		for (const pane of drawn) {
			const paneBox = paneBoxes[pane.id];
			if (!paneBox) continue;
			const sheets = sheetsOf(pane);
			const top = topSheetOf(pane);
			// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complexity baseline (#994): decompose to remove
			sheets.forEach((sheet, index) => {
				const card = sheet.presentation;
				if (!card) return;
				const isTop = index === sheets.length - 1;
				const ghost = sheet.preview;
				if (!ghost) rendered.add(card.id);
				/* a Cover's Heading is its bar: the ← and the handle ride
				   the Note's own box rather than sitting beside it */
				const grabs = isTop && !ghost && allows("lift");
				const live = !ghost && isTop;
				notes.push(
					<PresentationView
						key={
							ghost
								? `ghost-${pane.id}-${sheet.sheetId}`
								: card.id
						}
						renderer={renderer}
						card={card}
						form="sheet"
						place="open"
						box={
							sheet.ground
								? groundBoxIn(paneBox, rem, fold.barRemOf(pane))
								: coverBoxIn(paneBox, rem, narrow)
						}
						z={sheetZ(index)}
						held={false}
						fate={null}
						pastCommit={false}
						paneId={pane.id}
						sheetId={ghost ? null : sheet.sheetId}
						ground={sheet.ground}
						covered={!isTop}
						preview={ghost}
						lit={isTop ? (sheet.deck?.selection ?? null) : null}
						epoch={layoutEpoch}
						register={ghost ? ignore : register}
						back={
							sheet.ground
								? null
								: {
										label: deckHolding(layout, card.id)
											? "Collapse back to card"
											: "Close cover",
										enabled: live && allows("collapse"),
										onPress: () =>
											commands.coverBack(
												pane.id,
												sheet.sheetId,
											),
									}
						}
						clear={
							sheet.ground
								? null
								: {
										label: "Close every Cover",
										enabled: live && allows("collapse"),
										onPress: () =>
											commands.clearCovers(pane.id),
									}
						}
						keys={
							sheet.ground || !grabs
								? []
								: [
										{
											text: "Lift",
											label: `Lift ${label(card.subject)}`,
											enabled: true,
											onPress: () => {
												const heading = handleIn(
													`[data-sheet-id="${sheet.sheetId}"] [data-heading]`,
												);
												if (heading)
													keyboard.liftSheet(
														sheet,
														heading,
													);
											},
										},
									]
						}
						actions={
							ghost
								? inert
								: actionsOf(pane.id, sheet.sheetId, card.id)
						}
						onDown={
							grabs
								? (event) =>
										drags.coverHeadingDown(event, sheet)
								: ignore
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
				for (const card of restingCards(layout, realTop.deck))
					rendered.add(card.id);
			else if (drag) rendered.add(drag.card.id);
			notes.push(...renderDeck(realTop, paneBox, hidden));
			if (showZones && drag?.deckSheet === realTop.sheetId)
				notes.push(
					<ReturnZone
						key={`return-${realTop.sheetId}`}
						box={returnBandIn(
							paneBox,
							renderer.columnRem(drag.card.subject),
							rem,
							OPEN_SCALE,
							{ topRem: deckTopRem, narrow },
						)}
						active={destination?.kind === "return"}
						shown={zonesShown}
					/>,
				);
		}
		/* a Card from nowhere, or a Sheet in hand whose Deck is hidden or
		   gone: nothing above drew it, and the hand still holds it */
		const inHand = inHandOf(gesture.loose, drag, rendered);
		if (inHand) {
			const held = drag?.card.id === inHand.card.id;
			notes.push(
				<PresentationView
					key={inHand.card.id}
					renderer={renderer}
					card={inHand.card}
					form="card"
					place="open"
					box={held && drag ? drag.origin : inHand.box}
					z={Z.held}
					held={held}
					fate={held ? fate : null}
					pastCommit={false}
					paneId={drag?.paneId ?? activePaneId}
					sheetId={null}
					ground={false}
					lit={null}
					epoch={layoutEpoch}
					register={register}
					actions={cardActionsOf(inHand.card.id)}
					onDown={ignore}
				/>,
			);
		}
		notes.push(...renderZones());
		return notes;
	}

	const laidOut = narrow ? (drawn[0] ?? null) : displayLayout;
	return (
		<div
			ref={root}
			data-deck-frame=""
			data-narrow={narrow || undefined}
			tabIndex={-1}
			onPointerDownCapture={(event) => {
				root.current?.focus({ preventScroll: true });
				dismiss.pageDown(event);
			}}
			onPointerMoveCapture={dismiss.pageMove}
			onPointerUpCapture={dismiss.pageUp}
			onScrollCapture={(event) => {
				dismiss.pageScroll();
				fold.onScroll(event);
			}}
			onClickCapture={dismiss.pageClick}
			className="relative h-full min-h-0 overflow-hidden"
			onPointerMove={drags.frameMove}
			onPointerUp={drags.frameUp}
			onPointerCancel={drags.cancelDrag}
		>
			<HeadingDesignProvider value={{ linksDrag }}>
				{laidOut ? renderLayout(laidOut) : null}
				{/* every Note, in every form, placed over the Panes. No
				    AnimatePresence: nothing here has an exit to play, and
				    holding a swept Note for the frame it takes to find that
				    out leaves the old deck standing over the new one. */}
				<div
					data-deck-notes=""
					className="pointer-events-none absolute inset-0"
				>
					{renderNotes()}
				</div>
			</HeadingDesignProvider>
			<div aria-live="polite" className="sr-only">
				{keyboard.announcement}
			</div>
		</div>
	);
}
