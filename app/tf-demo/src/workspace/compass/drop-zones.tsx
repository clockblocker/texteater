import {
	type Box,
	type DropRegions,
	sideOf,
	type WritingDirection,
	Z,
} from "react-resizable-panels/workspace";
import { useDeckMotion } from "@/workspace/motion/runtime-config";
import type { Destination } from "./gesture";

/**
 * The drop regions as drawn. They are read whether or not they are drawn:
 * the regions are the battery's `dropRegions`, and the hit test, these
 * zones and the preview all read the same boxes.
 */

const ZONE =
	"pointer-events-none absolute grid place-items-center border border-dashed border-link/40 bg-link/5 transition-colors data-[shown=false]:invisible data-[active=true]:border-link data-[active=true]:bg-link/15";
const LABEL =
	"rounded-md bg-raised px-2 py-0.5 font-mono text-[0.62rem] font-bold tracking-[0.12em] text-link uppercase";

export function DropZones({
	paneId,
	regions,
	destination,
	homeLabel,
	shown,
	direction,
}: {
	paneId: string;
	regions: DropRegions;
	destination: Destination | null;
	/** What the cover region says when it is the held Card's home. */
	homeLabel: string;
	/** The regions are read whether or not they are drawn; this draws them. */
	shown: boolean;
	direction: WritingDirection;
}) {
	const { ZONE_FEEDBACK_MS } = useDeckMotion();
	const here =
		destination && "paneId" in destination && destination.paneId === paneId
			? destination
			: null;
	return (
		<>
			{regions.edges.map(({ edge, box }) => {
				const active = here?.kind === "pane" && here.edge === edge;
				return (
					<div
						key={edge}
						aria-hidden="true"
						data-edge={sideOf(edge, direction)}
						data-active={active}
						data-shown={shown}
						className={ZONE}
						style={{
							...box,
							zIndex: Z.zone,
							transitionDuration: `${ZONE_FEEDBACK_MS}ms`,
						}}
					>
						{active ? (
							<span className={LABEL}>New pane</span>
						) : null}
					</div>
				);
			})}
			<div
				aria-hidden="true"
				data-zone="cover"
				data-active={here?.kind === "sheet" || here?.kind === "home"}
				data-shown={shown}
				className={ZONE}
				style={{
					...regions.cover,
					zIndex: Z.zone,
					transitionDuration: `${ZONE_FEEDBACK_MS}ms`,
				}}
			>
				{here?.kind === "sheet" ? (
					<span className={LABEL}>Open as Cover</span>
				) : here?.kind === "home" ? (
					<span className={LABEL}>{homeLabel}</span>
				) : null}
			</div>
		</>
	);
}

/** The return band over a Deck's footprint: drawn on demand, where it is read. */
export function ReturnZone({
	box,
	active,
	shown,
}: {
	box: Box;
	active: boolean;
	shown: boolean;
}) {
	const { ZONE_FEEDBACK_MS } = useDeckMotion();
	return (
		<div
			aria-hidden="true"
			data-return-zone="return"
			data-active={active}
			data-shown={shown}
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
