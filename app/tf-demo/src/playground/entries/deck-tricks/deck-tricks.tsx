import { memo, type PointerEvent, useRef, useState } from "react";
import {
	DEFAULT_TURN,
	KEEP_POSE,
	type SlotSpec,
	type TurnFeel,
} from "tabletop/core";
import { Region, Slot, Table, useHand, useTable } from "tabletop/react";
import { useMotionPreference } from "@/lib/motion-preference";
import { FELT, placesOf, slotsOf } from "./deck";
import {
	DeckTricksInspector,
	type ReducedChoice,
	type TimeScale,
} from "./deck-tricks-inspector";
import { PlayingCardBody } from "./playing-card-body";
import { PLAYING_DECK } from "./playing-cards";
import { useDeckTricks } from "./use-deck-tricks";

/* mounted bottom first, as the library mounts them, so that Cards of the
   same z-index stack as its do */
const MOUNT_ORDER = [...PLAYING_DECK].reverse();

/**
 * deck-of-cards' tricks on the tabletop battery: the felt is a Region,
 * each of the 52 Cards a Body resting in its Slot there, and each trick a
 * plan of waypoints off the Cards' final rest, queued as the library
 * queues them. The hand keeps a Card's pose, as the library's does. The surface shows only the felt and the Cards; the tricks
 * and the motion knobs are in the inspector (playground ADR 0001).
 *
 * The tricks, faces and felt are pakastin's deck-of-cards
 * (github.com/deck-of-cards/deck-of-cards at 54f2c4787ea5). Its code is MIT;
 * the art in `faces/` is Chris Aguilar's Vector Playing Cards, LGPL-3.0
 * (`LICENSE`).
 */
export function DeckTricks() {
	const [reducedMotion, setReducedMotion] = useState<ReducedChoice>("off");
	const [timeScale, setTimeScale] = useState<TimeScale>(1);
	const [turn, setTurn] = useState<TurnFeel>(DEFAULT_TURN);
	const [rtl, setRtl] = useState(false);
	const { preference } = useMotionPreference();
	const table = useTable();
	const { deck, actions } = useDeckTricks(table);
	const press = useHand(table, {
		onTap: (id) => actions.turn(id),
		onRelease: (letting) => actions.putDown(letting),
	});
	const latest = useRef(press);
	latest.current = press;
	const [onPress] = useState(
		() => (id: string, event: PointerEvent<HTMLElement>) =>
			latest.current(id, event),
	);
	const places = placesOf(deck);
	return (
		<>
			<div className="flex h-full min-h-0 p-6 lg:pe-[23rem]">
				<Table
					table={table}
					dir={rtl ? "rtl" : "ltr"}
					hand={KEEP_POSE}
					reducedMotion={reducedMotion}
					alwaysPlay={preference === "ignore"}
					timeScale={timeScale}
					turn={turn}
					assert={import.meta.env.DEV}
					className="flex min-h-[36rem] min-w-0 flex-1 select-none"
				>
					<Felt slots={slotsOf(deck)} />
					{MOUNT_ORDER.map((card) => {
						const place = places.get(card.id);
						return place ? (
							<PlayingCardBody
								key={card.id}
								card={card}
								place={place}
								onPress={onPress}
							/>
						) : null;
					})}
				</Table>
			</div>
			<DeckTricksInspector
				actions={actions}
				reducedMotion={reducedMotion}
				onReducedMotion={setReducedMotion}
				timeScale={timeScale}
				onTimeScale={setTimeScale}
				turn={turn}
				onTurn={setTurn}
				rtl={rtl}
				onRtl={setRtl}
			/>
		</>
	);
}

function sameSlots(a: readonly SlotSpec[], b: readonly SlotSpec[]): boolean {
	return (
		a.length === b.length &&
		a.every((spec, index) => {
			const other = b[index];
			return (
				!!other &&
				spec.id === other.id &&
				spec.style.insetInlineStart === other.style.insetInlineStart &&
				spec.style.top === other.style.top &&
				spec.style.width === other.style.width &&
				spec.style.height === other.style.height
			);
		})
	);
}

/**
 * deck-of-cards' felt, the one Region, with every Card's Slot in it. It
 * renders again only when a Slot moves.
 */
const Felt = memo(
	function Felt({ slots }: { readonly slots: readonly SlotSpec[] }) {
		return (
			<Region
				id={FELT}
				className="min-h-[36rem] flex-1 touch-none overflow-hidden rounded-[0.7rem] border border-line bg-[hsl(150_40%_45%)]"
			>
				{slots.map((spec) => (
					<Slot key={spec.id} spec={spec} />
				))}
			</Region>
		);
	},
	(before, after) => sameSlots(before.slots, after.slots),
);
