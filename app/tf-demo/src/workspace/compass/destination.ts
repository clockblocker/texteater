import {
	type Box,
	DECK_TOP_REM,
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
} from "compass";
import {
	type Destination,
	type Drag,
	deckZoneOf,
	type ThrowTuning,
} from "./gesture";
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
	/** A narrow screen, below `md`: a Deck's place reads it. */
	readonly narrow: boolean;
	/** Whether a Pane's side edges spawn a Floating Pane; see `splitsAt`. */
	readonly splits: boolean;
	/** The held Card's Sheet column; see `SubjectRenderer.columnRem`. */
	readonly columnRem: number;
	readonly barRemOf: (pane: PaneNode<S> | null) => number;
	/** Whether a swipe sweeps the Deck; see `CompassProps.sweeps`. */
	readonly sweeps: boolean;
	readonly tuning: ThrowTuning;
	/** How far a Card off its Deck is carried, or thrown, to reach a zone. */
	readonly commit: number;
	readonly openScale: number;
};

/**
 * Where letting go at (`x`, `y`) in frame coordinates, at `now`, sends the
 * Card: the one answer the preview and the release both read. A Card
 * carried off its Deck has three places to go, read off the way it is
 * headed: back on the Deck, its dismiss zone or its expand zone
 * (`deckZoneOf`). Any other Card in hand reads the drop regions. The
 * return band follows its Deck's Pane, so it is read live; everything
 * else is read off the Panes as they rested before any preview moved
 * them, so a ghost opening never moves the region that opened it. Leaving
 * a region takes a little more than entering it did. The Pane bar is
 * chrome; then the band, then the sides; the rest of a Pane opens a Cover.
 */
export function destinationAt<S>(
	x: number,
	y: number,
	d: Drag<S>,
	now: number,
	current: Destination | null,
	reading: DropReading<S>,
): Destination | null {
	const { layout, rem, direction, narrow, splits, columnRem } = reading;
	const holder = d.deckSheet === null ? null : findSheet(layout, d.deckSheet);
	if (holder?.deck && !d.lifted)
		return deckZoneOf(d, now, {
			tuning: reading.tuning,
			commit: reading.commit,
			hysteresis: HYSTERESIS_PX,
			direction,
			current,
			paneId: holder.paneId,
			dismisses: reading.sweeps,
		});
	const holderBox = holder ? reading.paneBoxes[holder.paneId] : undefined;
	if (
		holder?.deck &&
		holderBox &&
		!inside(
			dropRegions(holderBox, columnRem, rem, {
				barRem: reading.barRemOf(findPane(layout, holder.paneId)),
				direction,
				edges: splits,
			}).bar,
			x,
			y,
		) &&
		inside(
			returnBandIn(holderBox, columnRem, rem, reading.openScale, {
				topRem: DECK_TOP_REM,
				narrow,
			}),
			x,
			y,
		)
	)
		return { kind: "return" };
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
			edges: splits,
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
 * Every destination the keyboard can choose for `d`, in reading order. A
 * Card off its Deck has its three: back on the Deck, then its dismiss
 * zone and its expand zone. Anything else starts at home, where letting
 * go changes nothing, then each drawn Pane's inline-start edge, its
 * middle and its inline-end edge. Without splits there are no edges.
 */
export function keyboardDestinations<S>(
	d: Drag<S>,
	reading: Pick<
		DropReading<S>,
		| "layout"
		| "shown"
		| "restBoxes"
		| "rem"
		| "splits"
		| "columnRem"
		| "sweeps"
	>,
): readonly Destination[] {
	const { layout } = reading;
	const holder = d.deckSheet === null ? null : findSheet(layout, d.deckSheet);
	const homeAt = d.lifted && d.home !== "vanish" ? d.paneId : null;
	if (holder?.deck && !d.lifted)
		return [
			{ kind: "return" },
			...(reading.sweeps
				? [{ kind: "sweep", toward: "start" } as const]
				: []),
			{ kind: "sheet", paneId: holder.paneId },
		];
	const list: Destination[] = [];
	if (homeAt && reading.shown.some((pane) => pane.id === homeAt))
		list.push({ kind: "home", paneId: homeAt });
	for (const pane of reading.shown) {
		const edge = (side: "inline-start" | "inline-end"): Destination[] =>
			!reading.splits
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
		const opens = pane.id !== homeAt;
		list.push(
			...edge("inline-start"),
			...(opens ? [{ kind: "sheet", paneId: pane.id } as const] : []),
			...edge("inline-end"),
		);
	}
	return list;
}
