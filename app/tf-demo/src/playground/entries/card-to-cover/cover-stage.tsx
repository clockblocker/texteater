import type { Transition } from "motion/react";
import { memo, type RefObject, useMemo, useState } from "react";
import { type CardSkin, CardView } from "../deck-interactions/card-view";
import type { Slot } from "../deck-interactions/geometry";
import { type Frame, pileSlots } from "../deck-interactions/layout";
import type { MotionContext } from "../deck-interactions/motion-kit";
import { SLOP_PX, trackPointer } from "../deck-interactions/pointer";
import { createReadouts } from "../deck-interactions/readouts";
import { type CardValues, useDeck } from "../deck-interactions/use-deck";
import type { PartOffsets } from "./box-glide";
import { COVER_DECK, type CoverCard, coverCardById } from "./cover-deck";
import { CoverFace, type Form, type Reveal } from "./cover-face";
import type { Recorder } from "./recorder";
import type { MorphFeel } from "./timing";
import { INSTANT, useCoverMorph } from "./use-cover-morph";

/** The Card's gutter either side of its content column. */
const GUTTER_PX = 16;

/** The real Deck's pile, its front Card at rest unscaled: a box here only ever resizes. */
function flatPile(frame: Frame, count: number): Slot[] {
	return pileSlots(frame, count).map((slot) => ({ ...slot, s: 1 }));
}

/** tf-demo's paper Card, contained or not; a tap opens it. */
function coverSkin(contain: boolean): CardSkin {
	return {
		box: `flex flex-col overflow-hidden rounded-[0.9rem] border border-line-strong bg-paper${contain ? " [contain:layout_paint]" : ""}`,
		grab: "cursor-pointer",
		shadow: (lift) => {
			const offset = (0.25 + 1.25 * lift).toFixed(2);
			const blur = (0.75 + 2.25 * lift).toFixed(2);
			const alpha = (0.2 + 0.25 * lift).toFixed(2);
			return `0 ${offset}rem ${blur}rem rgb(0 0 0 / ${alpha})`;
		},
	};
}

/**
 * One Card on the table. Memoised: every prop but `form` and the
 * transitions of the Card whose form changes keeps its identity, so a tap
 * re-renders only the Card it opens.
 */
const CoverCardView = memo(function CoverCardView({
	card,
	form,
	values,
	skin,
	rtl,
	column,
	clock,
	crossing,
	offsets,
	parts,
	leave,
	cardFade,
	reveal,
	onOpen,
	onClose,
	onMeasure,
}: {
	readonly card: CoverCard;
	readonly form: Form;
	readonly values: CardValues;
	readonly skin: CardSkin;
	readonly rtl: boolean;
	readonly column: number;
	readonly clock: MorphFeel["clock"];
	readonly crossing: MorphFeel["crossing"];
	readonly offsets: PartOffsets;
	readonly parts: Transition;
	readonly leave: Transition;
	readonly cardFade: Transition;
	readonly reveal: Reveal;
	readonly onOpen: (id: string) => void;
	readonly onClose: () => void;
	readonly onMeasure: Recorder["measured"];
}) {
	return (
		<CardView
			id={card.id}
			label={`${card.title} card`}
			skin={skin}
			values={values}
			rtl={rtl}
			held={false}
			expanded={form === "cover"}
			mark={null}
			onPointerDown={(event) => {
				if (event.button !== 0 || form === "cover") return;
				let moved = false;
				trackPointer(event, rtl, {
					move: (drag) => {
						if (Math.hypot(drag.dx, drag.dy) >= SLOP_PX)
							moved = true;
					},
					up: () => {
						if (!moved) onOpen(card.id);
					},
				});
			}}
		>
			<CoverFace
				card={card}
				form={form}
				column={column}
				clock={clock}
				crossing={crossing}
				offsets={offsets}
				parts={parts}
				leave={leave}
				cardFade={cardFade}
				reveal={reveal}
				rtl={rtl}
				onClose={onClose}
				onMeasure={onMeasure}
			/>
		</CardView>
	);
});

/**
 * The Deck on the table: `useDeck`'s pile and values, each Card a
 * `CardView` whose face is a `CoverFace`. A tap opens a Card into the
 * Cover; its × or Escape puts it back.
 */
export function CoverStage({
	frame,
	rtl,
	motion,
	feel,
	contain,
	frameRef,
	recorder,
}: {
	readonly frame: Frame;
	readonly rtl: boolean;
	readonly motion: MotionContext;
	readonly feel: MorphFeel;
	readonly contain: boolean;
	readonly frameRef: RefObject<HTMLDivElement | null>;
	readonly recorder: Recorder;
}) {
	const [readouts] = useState(createReadouts);
	const deck = useDeck({
		cards: COVER_DECK,
		frame,
		motion,
		readouts,
		deal: 0,
		layout: flatPile,
	});
	const morph = useCoverMorph({
		deck,
		frame,
		motion,
		feel,
		rtl,
		frameRef,
		recorder,
	});
	const skin = useMemo(() => coverSkin(contain), [contain]);
	const column = (deck.slots[0]?.w ?? 0) - 2 * GUTTER_PX;
	return deck.order.map((id) => {
		const card = coverCardById(id);
		if (!card) return null;
		const active = morph.activeId === id;
		return (
			<CoverCardView
				key={id}
				card={card}
				form={morph.openId === id ? "cover" : "card"}
				values={deck.valuesOf(id)}
				skin={skin}
				rtl={rtl}
				column={column}
				clock={feel.clock}
				crossing={feel.crossing}
				offsets={morph.offsetsOf(id)}
				parts={active ? morph.parts : INSTANT}
				leave={morph.leave}
				cardFade={active ? morph.cardFade : INSTANT}
				reveal={morph.reveal}
				onOpen={morph.open}
				onClose={morph.close}
				onMeasure={recorder.measured}
			/>
		);
	});
}
