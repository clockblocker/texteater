import {
	type Box,
	dropRegions,
	type PaneNode,
	type PlacementStyle,
	sheetZ,
	type WritingDirection,
	Z,
} from "compass";
import type { ReactNode } from "react";
import { DropZones } from "./drop-zones";
import { type Destination, type Drag, homeLabel } from "./gesture";
import type { SubjectRenderer } from "./subject";

/** Drop zone overlays rendered across shown Panes while a Card is held. */
export function renderDropZones<S>({
	shown,
	restBoxes,
	drag,
	renderer,
	rem,
	barRemOf,
	direction,
	splits,
	destination,
	zonesShown,
}: {
	readonly shown: readonly PaneNode<S>[];
	readonly restBoxes: Readonly<Record<string, Box>>;
	readonly drag: Drag<S>;
	readonly renderer: SubjectRenderer<S>;
	readonly rem: number;
	readonly barRemOf: (pane: PaneNode<S>) => number;
	readonly direction: WritingDirection;
	readonly splits: boolean;
	readonly destination: Destination | null;
	readonly zonesShown: boolean;
}): ReactNode[] {
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
								barRem: barRemOf(pane),
								direction,
								edges: splits,
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

/** Pane-scoped backdrop scrim dimmed beneath open Covers. */
export function CoverScrim({
	paneId,
	placement,
	visible,
	interactive,
}: {
	readonly paneId: string;
	readonly placement: PlacementStyle;
	readonly visible: boolean;
	readonly interactive: boolean;
}) {
	return (
		<div
			aria-hidden="true"
			data-scrim="cover"
			data-pane={paneId}
			style={{
				...placement,
				zIndex: visible ? sheetZ(1) : sheetZ(0),
			}}
			className={`absolute bg-scrim/60 transition-opacity duration-200 ease-out ${visible ? "opacity-100" : "opacity-0"} ${interactive ? "pointer-events-auto overflow-hidden overscroll-contain" : "pointer-events-none"}`}
		/>
	);
}

/** Pane-scoped backdrop scrim dimmed beneath a dealt Deck. */
export function DeckScrim({
	paneId,
	placement,
	visible,
}: {
	readonly paneId: string;
	readonly placement: PlacementStyle;
	readonly visible: boolean;
}) {
	return (
		<div
			aria-hidden="true"
			data-scrim="deck"
			data-pane={paneId}
			style={{
				...placement,
				zIndex: Z.deck - 1,
			}}
			className={`pointer-events-none absolute bg-scrim/45 transition-opacity duration-200 ease-out ${visible ? "opacity-100" : "opacity-0"}`}
		/>
	);
}
