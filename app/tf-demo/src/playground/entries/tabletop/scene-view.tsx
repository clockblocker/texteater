import {
	ResizableSplit,
	ResizableSplitHandle,
	ResizableSplitRegion,
} from "lego";
import { type ReactNode, useEffect, useMemo, useRef } from "react";
import { Region, Slot, type TableHandle, useHand } from "tabletop/react";
import { type CardHandlers, NoteBody } from "./note-body";
import { DEALT, placesOf, REGIONS, slotsOf } from "./scene";
import type { SceneActions } from "./use-scene";

const REGION_LOOK = {
	ground: "bg-canvas",
	pane: "bg-paper/60",
} as const;

function typing(target: EventTarget | null): boolean {
	return (
		target instanceof HTMLElement &&
		!!target.closest("input, textarea, select, [contenteditable]")
	);
}

/**
 * Escape closes the open Cover, and F turns the Card under the pointer
 * over. Both listen on the document, before the Inspector's window
 * listener, and mark the event used when they act (as Card to Cover does).
 */
function useSceneKeys(
	actions: SceneActions,
	hovered: { current: string | null },
) {
	const latest = useRef(actions);
	latest.current = actions;
	useEffect(() => {
		const onKey = (event: globalThis.KeyboardEvent) => {
			if (event.defaultPrevented || typing(event.target)) return;
			if (event.key === "Escape" && latest.current.close())
				event.preventDefault();
			if (
				(event.key === "f" || event.key === "F") &&
				hovered.current &&
				!event.metaKey &&
				!event.ctrlKey
			) {
				event.preventDefault();
				latest.current.turn(hovered.current);
			}
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [hovered]);
}

/**
 * The surface: two Regions in a Split, the Ground with its Deck and a Pane
 * beside it, and every Note Card as one Body on the Table. Nothing else.
 */
export function SceneView({
	table,
	actions,
}: {
	readonly table: TableHandle;
	readonly actions: SceneActions;
}) {
	const { scene } = actions;
	const slots = slotsOf(scene);
	const places = placesOf(scene);
	const hovered = useRef<string | null>(null);
	useSceneKeys(actions, hovered);
	const press = useHand(table, {
		onTap: (id) => actions.open(id),
		onRelease: (letting) => actions.release(letting),
	});
	const latest = useRef({ actions, press });
	latest.current = { actions, press };
	const handlers = useMemo<CardHandlers>(
		() => ({
			press: (id, open, event) => {
				/* a Cover at rest stays put; one still growing can be caught */
				if (!open || table.moving(id)) latest.current.press(id, event);
			},
			hover: (id, over) => {
				if (over) hovered.current = id;
				else if (hovered.current === id) hovered.current = null;
			},
			key: (id, open, event) => {
				if ((event.key === "Enter" || event.key === " ") && !open) {
					event.preventDefault();
					latest.current.actions.open(id);
				} else if (event.key === "f" || event.key === "F") {
					event.preventDefault();
					latest.current.actions.turn(id);
				}
			},
			close: () => latest.current.actions.close(),
		}),
		[table],
	);
	return (
		<>
			<ResizableSplit
				orientation="horizontal"
				data-tabletop-scene=""
				className="overflow-hidden rounded-[0.7rem] border border-line"
			>
				{REGIONS.map((region, index) => (
					<RegionPanel
						key={region}
						region={region}
						withHandle={index > 0}
					>
						{slots[region].map((spec) => (
							<Slot key={spec.id} spec={spec} />
						))}
					</RegionPanel>
				))}
			</ResizableSplit>
			{DEALT.map((id) => {
				const place = places.get(id);
				return place ? (
					<NoteBody
						key={id}
						id={id}
						place={place}
						handlers={handlers}
					/>
				) : null;
			})}
		</>
	);
}

function RegionPanel({
	region,
	withHandle,
	children,
}: {
	readonly region: (typeof REGIONS)[number];
	readonly withHandle: boolean;
	readonly children: ReactNode;
}) {
	return (
		<>
			{withHandle ? (
				<ResizableSplitHandle aria-label="Resize Regions" withHandle />
			) : null}
			<ResizableSplitRegion id={`tabletop-${region}`} minSize={280}>
				<Region
					id={region}
					className={`h-full w-full ${REGION_LOOK[region]}`}
				>
					{children}
				</Region>
			</ResizableSplitRegion>
		</>
	);
}
