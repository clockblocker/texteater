import * as Panes from "compass";
import type { Destination } from "./gesture";
import type { MenuItem, SubjectRenderer } from "./subject";

/**
 * The renderer's view of the battery's Pane algebra: Sheets with their
 * ghosts marked, and the layout as it would be if the Held Card were let
 * go where it is now.
 */

/** A Sheet a Deck can belong to: a Ground rung or a Cover, found by id. */
export type SheetView<S> = Panes.SheetRef<S> & {
	/** A ghost: what a drop would make, not something the reader can touch. */
	readonly preview: boolean;
};

/**
 * The ghost Pane a Held Card would spawn if dropped on an edge, inserted
 * while it hovers so the other Panes make room. Minted ids never take it.
 */
export const PREVIEW_PANE = "preview";

/** The Sheet id every ghost wears, Cover or Ground; never a real Sheet's. */
const PREVIEW_SHEET = "preview";

/** Every Sheet in a Pane, bottom first, with its ghosts marked. */
export function sheetsOf<S>(pane: Panes.PaneNode<S>): readonly SheetView<S>[] {
	return Panes.sheetsOf(pane).map((sheet) => ({
		...sheet,
		preview: sheet.sheetId === PREVIEW_SHEET,
	}));
}

/** A Pane's Ground as a Sheet: the battery's `sheetsOf` always yields it first. */
export function groundSheetOf<S>(pane: Panes.PaneNode<S>): SheetView<S> {
	const ground = sheetsOf(pane)[0];
	if (!ground) throw new Error(`Pane ${pane.id} has no Ground`);
	return ground;
}

/** A Pane's top Sheet: its last Cover, or its Ground when it has none. */
export function topSheetOf<S>(pane: Panes.PaneNode<S>): SheetView<S> {
	const top = sheetsOf(pane).at(-1);
	if (!top) throw new Error(`Pane ${pane.id} has no Ground`);
	return top;
}

export function findSheet<S>(
	node: Panes.LayoutNode<S>,
	sheetId: string,
): SheetView<S> | null {
	const sheet = Panes.findSheet(node, sheetId);
	return sheet ? { ...sheet, preview: sheetId === PREVIEW_SHEET } : null;
}

/**
 * What is laid out while a Card is in hand: the real layout with what a
 * drop here would make already in it, marked as a ghost. On an edge, the
 * Pane it would spawn, so the others shift to make room the way Obsidian
 * previews a split; in the centre, the Cover it would push, so the Pane's
 * Deck is hidden under it the way it would be. The drop only makes it real.
 */
export function previewLayout<S>(
	layout: Panes.LayoutNode<S>,
	held: Panes.Presentation<S> | null,
	destination: Destination | null,
): Panes.LayoutNode<S> {
	if (!held || !destination) return layout;
	if (destination.kind === "sheet")
		return Panes.updatePane(layout, destination.paneId, (pane) => ({
			...pane,
			covers: [
				...pane.covers,
				{ id: PREVIEW_SHEET, presentation: held, deck: null },
			],
		}));
	if (destination.kind !== "pane") return layout;
	const fresh: Panes.PaneNode<S> = {
		kind: "Pane",
		id: PREVIEW_PANE,
		line: [
			{
				id: PREVIEW_SHEET,
				kind: "Sheet",
				presentation: held,
				deck: null,
			},
		],
		covers: [],
	};
	return Panes.splitBeside(
		layout,
		destination.paneId,
		destination.edge,
		fresh,
		{ id: `split-${PREVIEW_PANE}`, size: destination.size },
	);
}

/** The Panes drawn on this screen: every one, or on a narrow screen the Active Pane. */
export function shownPanes<S>(
	layout: Panes.LayoutNode<S>,
	activePaneId: string,
	narrow: boolean,
): readonly Panes.PaneNode<S>[] {
	const panes = Panes.panesOf(layout);
	if (!narrow) return panes;
	const active =
		panes.find((pane) => pane.id === activePaneId) ?? panes[0] ?? null;
	return active ? [active] : [];
}

/** What a rung is called in the trail. */
export function rungLabel<S>(
	rung: Panes.Rung<S>,
	renderer: SubjectRenderer<S>,
	menu: readonly MenuItem[],
): string {
	if (rung.kind === "Sheet") return renderer.label(rung.presentation.subject);
	if (rung.kind === "Menu") return "Menu";
	return menu.find((item) => item.key === rung.item)?.label ?? rung.item;
}
