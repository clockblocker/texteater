import {
	groundOf,
	isRooted,
	type LayoutNode,
	type PaneNode,
	paneAnchor,
} from "compass";
import {
	ResizableSplit,
	ResizableSplitHandle,
	ResizableSplitRegion,
} from "lego";
import type { ReactNode } from "react";
import type { DeckInteraction } from "./interaction-policy";
import { sheetColumn } from "./layout";
import { GROUND_COLUMN_STYLE, GroundList, PaneBar } from "./pane-chrome";
import type { SheetActions } from "./presentation-view";
import { groundSheetOf, PREVIEW_PANE, rungLabel } from "./sheets";
import type { MenuItem, MenuItemView, SubjectRenderer } from "./subject";
import type { useDrag } from "./use-drag";
import type { useGroundFold } from "./use-ground-fold";
import type { useKeyboardLift } from "./use-keyboard-lift";
import type { WorkspaceCommands } from "./use-workspace-commands";

/**
 * The Compass's Panes, beneath the layer of Notes: the layout's splits,
 * and each Pane's bar and the list its Ground shows while it is the Menu
 * or a Menu Item. These are render functions, not components, so the
 * Compass's element tree is the one it draws inline.
 */

/** What the Panes read from the Compass that draws them. */
export type PaneScope<S> = {
	renderer: SubjectRenderer<S>;
	menu: readonly MenuItem[];
	renderMenuItem: (item: string, view: MenuItemView<S>) => ReactNode;
	allows: (interaction: DeckInteraction) => boolean;
	rem: number;
	fold: ReturnType<typeof useGroundFold>;
	drags: ReturnType<typeof useDrag<S>>;
	commands: WorkspaceCommands<S>;
	keyboard: ReturnType<typeof useKeyboardLift<S>>;
	inert: SheetActions<S>;
	actionsOf: (
		paneId: string,
		sheetId: string,
		presentationId: string,
	) => SheetActions<S>;
	handleIn: (selector: string) => HTMLElement | null;
};

function renderPane<S>(pane: PaneNode<S>, scope: PaneScope<S>): ReactNode {
	const {
		renderer,
		menu,
		renderMenuItem,
		allows,
		rem,
		fold,
		drags,
		commands,
		keyboard,
		inert,
		actionsOf,
		handleIn,
	} = scope;
	const { label } = renderer;
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
				rooted ? `Rooted pane ${pane.id}` : `Floating pane ${pane.id}`
			}
			data-preview={preview || undefined}
			/* the anchor its Notes are placed against */
			style={{ anchorName: paneAnchor(pane.id) }}
			className={`relative h-full min-h-0 overflow-hidden bg-paper ${preview ? "pointer-events-none" : ""}`}
		>
			<PaneBar
				rem={rem}
				barRem={fold.barRemOf(pane)}
				covered={covered}
				preview={preview}
				handle={lifts ? (rooted ? "press" : "drag") : "none"}
				holding={drags.barHolding === pane.id}
				/* a Rooted Pane's trail sits on its Ground's column; a
				   Floating Pane's title on its Note's */
				columnWidth={
					!rooted && ground.kind === "Sheet"
						? sheetColumn(
								renderer.columnRem(ground.presentation.subject),
								true,
							).body
						: GROUND_COLUMN_STYLE.maxWidth
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
				trail={pane.line.map((rung) => rungLabel(rung, renderer, menu))}
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

export function renderLayout<S>(
	node: LayoutNode<S>,
	scope: PaneScope<S>,
): ReactNode {
	if (node.kind === "Pane") return renderPane(node, scope);
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
					node.fresh?.paneId === a.id ? node.fresh.size : undefined
				}
			>
				{renderLayout(a, scope)}
			</ResizableSplitRegion>
			<ResizableSplitHandle aria-label="Resize panes" />
			<ResizableSplitRegion
				id={b.id}
				minSize={240}
				defaultSize={
					node.fresh?.paneId === b.id ? node.fresh.size : undefined
				}
			>
				{renderLayout(b, scope)}
			</ResizableSplitRegion>
		</ResizableSplit>
	);
}
