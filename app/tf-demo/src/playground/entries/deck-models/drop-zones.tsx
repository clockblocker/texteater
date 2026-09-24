import { type DropRegions, Z } from "./geometry";
import type { Destination, Drag, Fate } from "./model";
import { useDeckMotion } from "./runtime-config";

/** The drop regions as drawn, and what letting go over one does to a Card. */

/** What a release in the held Card's own Pane does, as the zone says it. */
export function homeLabel(drag: Drag): string {
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
export function fateOf(drag: Drag, destination: Destination | null): Fate {
	if (destination?.kind === "sheet" || destination?.kind === "pane")
		return "open";
	/* anywhere else it goes home, and for a Card from nowhere, or a Cover
	   on no live Deck, home is away */
	return drag.home === "close" || drag.home === "vanish" ? "leave" : "rest";
}

export function DropZones({
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
