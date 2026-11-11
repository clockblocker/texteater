import { Maximize2Icon, XIcon } from "lucide-react";
import { type MotionValue, motion, useTransform } from "motion/react";
import { PAPER_INNER_CORNERS } from "@/presentation/skin";
import type { Anchor } from "./swipe-collapse";
import { type Axis, iconAt, type Zone } from "./swipe-gesture";
import type { CardValues } from "./use-deck";

/** What a swipe uncovers: which action, along which axis, and which way. */
export type Panel = {
	readonly id: string;
	readonly zone: Zone;
	readonly axis: Axis;
	/** The way the Card moved: -1 to inline-start or up, 1 to inline-end or down. */
	readonly sign: -1 | 1;
};

/**
 * The box and stacking a panel is drawn in: its Card's own values while
 * the hand has the Card, and the same values held still once it has let
 * go on Open, when the Card leaves for the Cover.
 */
export type PanelBox = Pick<CardValues, "u" | "v" | "w" | "h" | "s" | "z">;

/** The values a panel is drawn from; the variant animates them. */
export type PanelValues = {
	/** 1 while a release would commit: the colour floods in. */
	readonly flood: MotionValue<number>;
	/** The icon's pop at the threshold, a scale factor. */
	readonly pop: MotionValue<number>;
	/** The panel's opacity: 1 until a commit fades it out. */
	readonly fade: MotionValue<number>;
};

/** The icon and its label, as one box; the room it keeps each side once it stops. */
const BOX_W = 80;
const BOX_H = 48;
const GAP = 8;
/**
 * The Card's border, its skin's `border`: across the axis the panel stays
 * this far inside the Card's edges, so it never shows past the Card.
 */
const BORDER_PX = 1;

const TONE = {
	dismiss: { fill: "bg-destructive", text: "text-destructive" },
	expand: { fill: "bg-link", text: "text-link" },
} as const;

/**
 * The icon's centre along the axis, in the panel's own px from its
 * inline-start or top: `iconAt`'s, from the edge the strip opens at. A
 * pull is in the frame's px; the panel's own are the Card's, before its
 * scale.
 */
function alongOf(
	sign: -1 | 1,
	pull: number,
	scale: number,
	length: number,
	full: number,
): number {
	const { centre } = iconAt(pull / scale, full / scale);
	return sign < 0 ? length - centre : centre;
}

/**
 * D's action panel, in the Card's own box and just under it, as an iOS
 * Mail row's actions are: red "Close deck" for inline-start and down,
 * blue "Open" for inline-end and up. It is the Card's box at its anchor,
 * less the border across the axis, drawn by the Card's own
 * values and scaled about the same centre, so its edges sit exactly
 * inside the Card's at any scale. As the Card uncovers it the strip is
 * tinted, and the icon, in the action's colour, grows and slides out in
 * its middle until the strip is full (the threshold, or the icon's room
 * if that is more); there it stays, and the Card travels on past it.
 * Once a release would commit the colour floods in, the icon turns to
 * ink and pops. Its base is opaque, so the Cards behind never show
 * through. Let go on Open, it is drawn where the hand left it and cut to
 * the strip the Card had uncovered: the Card, opening into the Cover over
 * it, never uncovers more of it.
 */
export function SwipePanel({
	panel,
	card,
	anchor,
	shows,
	kept,
	values,
	armed,
	threshold,
	tint,
	labels,
	rtl,
	reduce,
}: {
	readonly panel: Panel;
	/** The swiped Card's values, or them held still: the panel shares its size, scale and z-index, and is drawn first, so it lies under the Card, under the Cards in front and over the Cards behind. */
	readonly card: PanelBox;
	/** Where a pull of 0 puts the Card: the panel lies there along the axis. */
	readonly anchor: Anchor;
	/** How much of the Card shows from its drawn top, in px, where the Cards in front hide the rest; null where all of it does. */
	readonly shows: number | null;
	/** Once the hand has let go on Open: how much of the panel the Card had uncovered along the axis, in px; the panel shows only that strip. Null while the hand has the Card or brings it home. */
	readonly kept: number | null;
	readonly values: PanelValues;
	readonly armed: boolean;
	readonly threshold: number;
	readonly tint: number;
	readonly labels: boolean;
	readonly rtl: boolean;
	readonly reduce: boolean;
}) {
	const inline = panel.axis === "inline";
	const b = BORDER_PX;
	const full = Math.max(threshold, (inline ? BOX_W : BOX_H) + 2 * GAP);
	const x = useTransform(inline ? anchor.u : card.u, (u) => {
		const at = inline ? u : u + b;
		return rtl ? -at : at;
	});
	const y = useTransform(inline ? card.v : anchor.v, (v) =>
		inline ? v + b : v,
	);
	const width = useTransform(card.w, (w) => (inline ? w : w - 2 * b));
	const height = useTransform(card.h, (h) => (inline ? h - 2 * b : h));
	const pull = useTransform(
		inline ? [card.u, anchor.u] : [card.v, anchor.v],
		([p = 0, from = 0]: number[]) => p - from,
	);
	const iconX = useTransform(
		[pull, card.s, card.w],
		([p = 0, s = 1, w = 0]: number[]) => {
			const centre = inline
				? alongOf(panel.sign, p, s, w, full)
				: w / 2 - b;
			return rtl ? -(centre - BOX_W / 2) : centre - BOX_W / 2;
		},
	);
	const iconY = useTransform(
		[pull, card.s, card.h],
		([p = 0, s = 1, h = 0]: number[]) => {
			if (!inline) return alongOf(panel.sign, p, s, h, full) - BOX_H / 2;
			const across = shows === null ? h - 2 * b : shows / s - b;
			return across / 2 - BOX_H / 2;
		},
	);
	const scale = useTransform(
		[pull, values.pop],
		([p = 0, k = 1]: number[]) =>
			reduce ? 1 : (0.8 + 0.2 * iconAt(p, full).grown) * k,
	);
	const shown = useTransform(pull, (p) =>
		Math.min(1, Math.max(0, (Math.abs(p) - 8) / 40)),
	);
	/* the strip lies at the end the Card left, away from the way it went:
	   the rest, cut off in the panel's own px, is what the Card still covered */
	const clipPath = useTransform(
		[card.w, card.h, card.s],
		([w = 0, h = 0, s = 1]: number[]) => {
			if (kept === null) return "none";
			const cut = Math.max(0, (inline ? w : h) - kept / s);
			const cutsStart = panel.sign < 0;
			if (!inline)
				return cutsStart
					? `inset(${cut}px 0 0 0)`
					: `inset(0 0 ${cut}px 0)`;
			return cutsStart !== rtl
				? `inset(0 0 0 ${cut}px)`
				: `inset(0 ${cut}px 0 0)`;
		},
	);
	const fill = useTransform(values.flood, (f) => tint + (1 - tint) * f);
	const toned = useTransform(values.flood, (f) => 1 - f);
	const tone = TONE[panel.zone];
	const Icon = panel.zone === "dismiss" ? XIcon : Maximize2Icon;
	const label = panel.zone === "dismiss" ? "Close deck" : "Open";
	const face = (
		<>
			<Icon aria-hidden="true" className="size-5" strokeWidth={2.25} />
			{labels ? (
				<span
					data-panel-label=""
					className="text-xs font-medium whitespace-nowrap"
				>
					{label}
				</span>
			) : null}
		</>
	);
	return (
		<motion.div
			aria-hidden="true"
			data-panel={panel.zone}
			data-panel-card={panel.id}
			data-armed={armed || undefined}
			className={`pointer-events-none absolute overflow-hidden ${PAPER_INNER_CORNERS} bg-canvas`}
			style={{
				insetInlineStart: 0,
				top: 0,
				x,
				y,
				width,
				height,
				scale: card.s,
				zIndex: card.z,
				opacity: values.fade,
				clipPath,
			}}
		>
			<motion.div
				data-panel-fill=""
				className={`absolute inset-0 ${tone.fill}`}
				style={{ opacity: fill }}
			/>
			<motion.div
				data-panel-icon=""
				className="absolute start-0 top-0"
				style={{
					width: BOX_W,
					height: BOX_H,
					x: iconX,
					y: iconY,
					scale,
					opacity: shown,
				}}
			>
				<motion.div
					className={`absolute inset-0 flex flex-col items-center justify-center gap-1 ${tone.text}`}
					style={{ opacity: toned }}
				>
					{face}
				</motion.div>
				<motion.div
					className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-primary-foreground"
					style={{ opacity: values.flood }}
				>
					{face}
				</motion.div>
			</motion.div>
		</motion.div>
	);
}
