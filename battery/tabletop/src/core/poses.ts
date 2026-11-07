import type { CardSize, Logical } from "./geometry";
import type { Posed, RegionId, SlotSpec } from "./place";

/**
 * A Deck's resting poses as Slots: each Card's box in its Region, written
 * as CSS from the Region's centre in rem, so it stays put through a resize.
 * Every pose is a centre plus a rotation about it.
 */

function rem(value: number): string {
	return `${Math.round(value * 1e4) / 1e4}rem`;
}

function slotId(region: RegionId, id: string): string {
	return `${region}:${id}`;
}

/** A Slot centred `centre` rem from its Region's centre. */
function centred(
	region: RegionId,
	id: string,
	centre: Logical,
	card: CardSize,
): SlotSpec {
	return {
		id: slotId(region, id),
		region,
		style: {
			insetInlineStart: `calc(50% + ${rem(centre.u - card.w / 2)})`,
			top: `calc(50% + ${rem(centre.v - card.h / 2)})`,
			width: rem(card.w),
			height: rem(card.h),
		},
	};
}

function posed(
	region: RegionId,
	id: string,
	centre: Logical,
	card: CardSize,
	rotate = 0,
): Posed {
	return { id, slot: centred(region, id, centre, card), rotate, centre };
}

const ORIGIN: Logical = { u: 0, v: 0 };

/** deck-of-cards' stack: each Card a quarter px up and to the start of the one before. */
export const STACK_STEP: Logical = { u: -1 / 64, v: -1 / 64 };

/**
 * A pile: Card `i` (0 at the bottom) `i` steps from `origin`. The default
 * step is deck-of-cards' thickness, −i/4 px on both axes; a step down by a
 * heading's height gives a Deck whose Cards show their tops.
 */
export function pile(
	ids: readonly string[],
	region: RegionId,
	{
		card,
		step = STACK_STEP,
		origin = ORIGIN,
	}: {
		readonly card: CardSize;
		readonly step?: Logical;
		readonly origin?: Logical;
	},
): Posed[] {
	return ids.map((id, i) =>
		posed(
			region,
			id,
			{ u: origin.u + i * step.u, v: origin.v + i * step.v },
			card,
		),
	);
}

/** deck-of-cards' fan radius, 55 px at a 16 px rem. */
const FAN_RADIUS = 55 / 16;

/**
 * deck-of-cards' fan: the Cards spread over `spread` degrees around
 * `origin`, each on a circle of `radius` rem, turned to point out of it.
 */
export function fan(
	ids: readonly string[],
	region: RegionId,
	{
		card,
		spread = 260,
		radius = FAN_RADIUS,
		origin = ORIGIN,
	}: {
		readonly card: CardSize;
		readonly spread?: number;
		readonly radius?: number;
		readonly origin?: Logical;
	},
): Posed[] {
	const last = ids.length - 1;
	return ids.map((id, i) => {
		const rotate = last > 0 ? (i / last) * spread - spread / 2 : 0;
		const radians = ((rotate - 90) * Math.PI) / 180;
		return posed(
			region,
			id,
			{
				u: origin.u + Math.cos(radians) * radius,
				v: origin.v + Math.sin(radians) * radius,
			},
			card,
			rotate,
		);
	});
}

/** Rows of `columns` Cards, `gap` rem apart, centred on `origin`. */
export function grid(
	ids: readonly string[],
	region: RegionId,
	{
		card,
		columns,
		gap = 1,
		origin = ORIGIN,
	}: {
		readonly card: CardSize;
		readonly columns: number;
		readonly gap?: number;
		readonly origin?: Logical;
	},
): Posed[] {
	const rows = Math.ceil(ids.length / columns);
	const width = columns * card.w + (columns - 1) * gap;
	const height = rows * card.h + (rows - 1) * gap;
	return ids.map((id, i) =>
		posed(
			region,
			id,
			{
				u:
					origin.u -
					width / 2 +
					card.w / 2 +
					(i % columns) * (card.w + gap),
				v:
					origin.v -
					height / 2 +
					card.h / 2 +
					Math.floor(i / columns) * (card.h + gap),
			},
			card,
		),
	);
}

/**
 * A row across the Region, centred on `origin`: `gap` rem between Cards
 * while they fit, overlapping as the Region narrows, in CSS alone, so the
 * row closes up in the same frame as a Split drag. The centres are those
 * of the row with its full gaps.
 */
export function row(
	ids: readonly string[],
	region: RegionId,
	{
		card,
		gap = 1,
		inset = 1,
		origin = ORIGIN,
	}: {
		readonly card: CardSize;
		readonly gap?: number;
		readonly inset?: number;
		readonly origin?: Logical;
	},
): Posed[] {
	const last = ids.length - 1;
	const step =
		last > 0
			? `max(0rem, min(${rem(card.w + gap)}, (100% - ${rem(card.w + 2 * inset)}) / ${last}))`
			: "0rem";
	return ids.map((id, i) => {
		const centre = {
			u: origin.u + (i - last / 2) * (card.w + gap),
			v: origin.v,
		};
		const slot = centred(region, id, centre, card);
		return {
			id,
			rotate: 0,
			centre,
			slot: {
				...slot,
				style: {
					...slot.style,
					insetInlineStart: `calc(50% + ${rem(origin.u - card.w / 2)} + ${i - last / 2} * ${step})`,
				},
			},
		};
	});
}

/**
 * The Cover a Card grows into: its Region inset by `inset` rem, centred
 * and at most `maxWidth` rem wide.
 */
export function cover(
	region: RegionId,
	{
		maxWidth = 40,
		inset = 1.5,
	}: { readonly maxWidth?: number; readonly inset?: number } = {},
): SlotSpec {
	const width = `min(${rem(maxWidth)}, 100% - ${rem(2 * inset)})`;
	return {
		id: slotId(region, "cover"),
		region,
		style: {
			insetInlineStart: `calc((100% - ${width}) / 2)`,
			top: rem(inset),
			width,
			height: `calc(100% - ${rem(2 * inset)})`,
		},
	};
}
