import { Maximize2Icon, XIcon } from "lucide-react";
import { type MotionValue, motion, useTransform } from "motion/react";
import type { Rect } from "./geometry";
import type { Axis, Zone } from "./swipe-gesture";

/** What a swipe uncovers: which action, along which axis, and which way. */
export type Panel = {
	readonly id: string;
	readonly zone: Zone;
	readonly axis: Axis;
	/** The way the Card moved: -1 to inline-start or up, 1 to inline-end or down. */
	readonly sign: -1 | 1;
};

/** The values a panel is drawn from; the variant animates them. */
export type PanelValues = {
	/** 1 while a release would commit: the colour floods in. */
	readonly flood: MotionValue<number>;
	/** 0 centred in the uncovered strip, 1 locked to the Card's edge. */
	readonly lock: MotionValue<number>;
	/** The icon's pop at the threshold, a scale factor. */
	readonly pop: MotionValue<number>;
	/** The panel's opacity: 1 until a commit fades it out. */
	readonly fade: MotionValue<number>;
};

/** The icon and its label, as one box; the gap it keeps from the Card. */
const BOX_W = 80;
const BOX_H = 48;
const GAP = 8;
/** Where a locked icon stops as the Card leaves: this far inside the panel. */
const PAD = 12;

const TONE = {
	dismiss: { fill: "bg-destructive", text: "text-destructive" },
	expand: { fill: "bg-link", text: "text-link" },
} as const;

/**
 * The icon's centre along the axis, in px from the panel's start (its
 * inline-start or top). Free, it sits in the middle of the strip the Card
 * has uncovered, so it slides out at half the Card's speed; locked, it
 * keeps `GAP` from the Card's edge and rides with it, stopping `PAD` short
 * of the panel's far side when the Card leaves.
 */
function iconCentre(
	sign: -1 | 1,
	length: number,
	box: number,
	pull: number,
	lock: number,
): number {
	const uncovered = Math.abs(pull);
	if (sign < 0) {
		const free = length - uncovered / 2;
		const locked = length - uncovered + GAP + box / 2;
		return Math.max(PAD + box / 2, free + (locked - free) * lock);
	}
	const free = uncovered / 2;
	const locked = uncovered - GAP - box / 2;
	return Math.min(length - PAD - box / 2, free + (locked - free) * lock);
}

/**
 * The panel's clip: only the strip the Card has uncovered, `pull` px from
 * the side it moved away from. Under the Card the panel never shows, even
 * while the Card comes forward over the Deck and is not yet solid there.
 */
function uncovered(
	inline: boolean,
	length: number,
	pull: number,
	rtl: boolean,
): string {
	const hidden = `${Math.max(0, length - Math.abs(pull)).toFixed(2)}px`;
	/* the side the Card still lies over, as an inset(top right bottom left) slot */
	const toStart = pull < 0;
	const side = inline ? (toStart !== rtl ? 3 : 1) : toStart ? 0 : 2;
	const sides = ["0", "0", "0", "0"];
	sides[side] = hidden;
	return `inset(${sides.join(" ")})`;
}

/**
 * D's action panel, in the Card's own footprint and just under it, as an
 * iOS Mail row's actions are: red "Close deck" for inline-start and down,
 * blue "Open" for inline-end and up. Before the threshold the strip is tinted
 * and the icon, in the action's colour, grows and slides out centred in
 * it; once a release would commit the colour floods in, the icon turns to
 * ink, pops, and locks to the Card's edge. Its base is opaque, so the
 * Cards behind never show through.
 */
export function SwipePanel({
	panel,
	rect,
	visible,
	position,
	base,
	z,
	forward,
	values,
	armed,
	threshold,
	tint,
	labels,
	rtl,
	reduce,
}: {
	readonly panel: Panel;
	/** The Card's resting box as drawn; for a Card behind, its strip plus the tuck under the next. */
	readonly rect: Rect;
	/** How much of `rect` shows above the next Card, in px from its top. */
	readonly visible: number;
	/** The Card's position along the axis, logical px in the frame. */
	readonly position: MotionValue<number>;
	/** The Card's resting position along the axis. */
	readonly base: number;
	/** The Card's z-index: the panel shares it and is drawn first, so it lies under the Card and over every Card under it. */
	readonly z: MotionValue<number>;
	/** How far the Card has come forward over the Cards in front: Close deck's panel comes with it. */
	readonly forward: MotionValue<number>;
	readonly values: PanelValues;
	readonly armed: boolean;
	readonly threshold: number;
	readonly tint: number;
	readonly labels: boolean;
	readonly rtl: boolean;
	readonly reduce: boolean;
}) {
	const inline = panel.axis === "inline";
	const length = inline ? rect.w : rect.h;
	const box = inline ? BOX_W : BOX_H;
	const pull = useTransform(position, (p) => p - base);
	const along = useTransform(
		[pull, values.lock],
		([p = 0, l = 0]: number[]) => iconCentre(panel.sign, length, box, p, l),
	);
	const x = useTransform(along, (centre) => {
		const start = inline ? centre - BOX_W / 2 : rect.w / 2 - BOX_W / 2;
		return rtl ? -start : start;
	});
	const y = useTransform(along, (centre) =>
		inline ? visible / 2 - BOX_H / 2 : centre - BOX_H / 2,
	);
	const scale = useTransform(
		[pull, values.pop],
		([p = 0, k = 1]: number[]) =>
			reduce ? 1 : (0.8 + 0.2 * Math.min(1, Math.abs(p) / threshold)) * k,
	);
	const shown = useTransform(pull, (p) =>
		Math.min(1, Math.max(0, (Math.abs(p) - 8) / 40)),
	);
	const clipPath = useTransform(pull, (p) =>
		uncovered(inline, length, p, rtl),
	);
	const fill = useTransform(values.flood, (f) => tint + (1 - tint) * f);
	const opacity = useTransform(
		[values.fade, forward],
		([f = 1, k = 1]: number[]) => (panel.zone === "dismiss" ? f * k : f),
	);
	const toned = useTransform(values.flood, (f) => 1 - f);
	const tone = TONE[panel.zone];
	const Icon = panel.zone === "dismiss" ? XIcon : Maximize2Icon;
	const label = panel.zone === "dismiss" ? "Close deck" : "Open";
	const face = (
		<>
			<Icon aria-hidden="true" className="size-5" strokeWidth={2.25} />
			{labels ? (
				<span className="text-xs font-medium whitespace-nowrap">
					{label}
				</span>
			) : null}
		</>
	);
	return (
		<motion.div
			aria-hidden="true"
			data-panel={panel.zone}
			data-armed={armed || undefined}
			className="pointer-events-none absolute overflow-hidden rounded-[0.9rem] bg-canvas"
			style={{
				insetInlineStart: rect.u,
				top: rect.v,
				width: rect.w,
				height: rect.h,
				zIndex: z,
				opacity,
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
					x,
					y,
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
