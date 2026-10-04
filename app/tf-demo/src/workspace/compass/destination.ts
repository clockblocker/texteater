import {
	type Box,
	dropRegions,
	findPane,
	HYSTERESIS_PX,
	inside,
	type LayoutNode,
	type PaneNode,
	type Region,
	regionAt,
	returnBandIn,
	spawnSize,
	type WritingDirection,
} from "react-resizable-panels/workspace";
import {
	type Destination,
	type Drag,
	flickOf,
	projected,
	type ThrowTuning,
} from "./gesture";
import type { DeckInteraction } from "./interaction-policy";
import { findSheet } from "./sheets";

/** Everything a destination is read against, besides the pointer. */
export type DropReading<S> = {
	readonly layout: LayoutNode<S>;
	/** The Panes drawn; see `shownPanes`. */
	readonly shown: readonly PaneNode<S>[];
	readonly paneBoxes: Readonly<Record<string, Box>>;
	/** The Panes as they rested before any preview moved them. */
	readonly restBoxes: Readonly<Record<string, Box>>;
	readonly rem: number;
	readonly direction: WritingDirection;
	readonly narrow: boolean;
	/** The held Card's Sheet column; see `SubjectRenderer.columnRem`. */
	readonly columnRem: number;
	readonly barRemOf: (pane: PaneNode<S> | null) => number;
	readonly allows: (interaction: DeckInteraction) => boolean;
	readonly tuning: ThrowTuning;
	/** How far up a Card is carried, or thrown, to open over its Deck. */
	readonly commit: number;
	readonly openScale: number;
	readonly deckTopRem: number;
};

/**
 * Where letting go at (`x`, `y`) in frame coordinates, at `now`, sends the
 * Card: the one answer the preview and the release both read. The return
 * band follows its Deck's Pane, so it is read live; everything else is
 * read off the Panes as they rested before any preview moved them, so a
 * ghost opening never moves the region that opened it. Leaving a region
 * takes a little more than entering it did. The Pane bar is chrome; then
 * a Card taken up off its Deck, which opens over it; then the band, then
 * the sides; the rest of a Pane opens a Cover.
 */
export function destinationAt<S>(
	x: number,
	y: number,
	d: Drag<S>,
	now: number,
	current: Destination | null,
	reading: DropReading<S>,
): Destination | null {
	const { layout, rem, direction, narrow, columnRem, allows } = reading;
	const holder = d.deckSheet === null ? null : findSheet(layout, d.deckSheet);
	const holderBox = holder ? reading.paneBoxes[holder.paneId] : undefined;
	/* a Card off its Deck thrown toward inline-end goes back to it,
	   wherever it is let go: the throw says where it is headed, not where
	   it is */
	if (
		holder?.deck &&
		!d.lifted &&
		flickOf(d, now, reading.tuning, direction) === "end"
	)
		return { kind: "return" };
	if (
		holder?.deck &&
		holderBox &&
		!inside(
			dropRegions(holderBox, columnRem, rem, {
				barRem: reading.barRemOf(findPane(layout, holder.paneId)),
				direction,
				narrow,
			}).bar,
			x,
			y,
		)
	) {
		const band = inside(
			returnBandIn(holderBox, columnRem, rem, reading.openScale, {
				topRem: reading.deckTopRem,
				narrow,
			}),
			x,
			y,
		);
		/* a Card taken up off its Deck, far enough or fast enough, opens
		   over it: a move, not a place, since the band reaches up the
		   whole Deck and the Card may start at its foot */
		const line =
			current?.kind === "sheet"
				? HYSTERESIS_PX - reading.commit
				: -reading.commit;
		if (
			!d.lifted &&
			allows("expand") &&
			projected(d, now, reading.tuning).dy < line &&
			(band || (!allows("drop") && inside(holderBox, x, y)))
		)
			return { kind: "sheet", paneId: holder.paneId };
		if (band) return { kind: "return" };
	}
	if (!allows("drop")) return null;
	/* no drop until the rest boxes describe the Panes drawn */
	const { shown, restBoxes } = reading;
	if (
		shown.length !== Object.keys(restBoxes).length ||
		shown.some((pane) => !restBoxes[pane.id])
	)
		return null;
	const regions = shown.map((pane) => ({
		paneId: pane.id,
		regions: dropRegions(restBoxes[pane.id] as Box, columnRem, rem, {
			barRem: reading.barRemOf(pane),
			direction,
			narrow,
		}),
	}));
	/* the destination the pointer was over holds it a little longer */
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
		return {
			kind: "pane",
			paneId: hit.paneId,
			edge: hit.edge,
			size: spawnSize(columnRem, restBoxes[hit.paneId]?.width ?? 0, rem),
		};
	return d.lifted && d.home !== "vanish" && hit.paneId === d.paneId
		? { kind: "home", paneId: hit.paneId }
		: { kind: "sheet", paneId: hit.paneId };
}

/**
 * Every destination the keyboard can choose for `d`, in reading order:
 * home first, where letting go changes nothing, then each drawn Pane's
 * inline-start edge, its middle and its inline-end edge. A narrow screen
 * has no edges.
 */
export function keyboardDestinations<S>(
	d: Drag<S>,
	reading: Pick<
		DropReading<S>,
		| "layout"
		| "shown"
		| "restBoxes"
		| "rem"
		| "narrow"
		| "columnRem"
		| "allows"
	>,
): readonly Destination[] {
	const { layout, allows } = reading;
	const holder = d.deckSheet === null ? null : findSheet(layout, d.deckSheet);
	const homeAt = d.lifted && d.home !== "vanish" ? d.paneId : null;
	const list: Destination[] = [];
	if (holder?.deck && !d.lifted) list.push({ kind: "return" });
	if (homeAt && reading.shown.some((pane) => pane.id === homeAt))
		list.push({ kind: "home", paneId: homeAt });
	for (const pane of reading.shown) {
		const edge = (side: "inline-start" | "inline-end"): Destination[] =>
			reading.narrow || !allows("drop")
				? []
				: [
						{
							kind: "pane",
							paneId: pane.id,
							edge: side,
							size: spawnSize(
								reading.columnRem,
								reading.restBoxes[pane.id]?.width ?? 0,
								reading.rem,
							),
						},
					];
		/* a Card off its Deck opens over it by an Expand; anywhere else a
		   Cover is a drop */
		const opens =
			pane.id === homeAt
				? false
				: pane.id === d.paneId && !d.lifted
					? allows("expand") || allows("drop")
					: allows("drop");
		list.push(
			...edge("inline-start"),
			...(opens ? [{ kind: "sheet", paneId: pane.id } as const] : []),
			...edge("inline-end"),
		);
	}
	return list;
}
