import { XIcon } from "lucide-react";
import { motion, useTransform } from "motion/react";
import type { ReactNode, PointerEvent as ReactPointerEvent } from "react";
import type { CardValues, Mark } from "./use-deck";
import type { DummyCard } from "./words";

const TONE_TEXT: Record<Mark["tone"], string> = {
	dismiss: "border-destructive text-destructive",
	expand: "border-link text-link",
	back: "border-ink-muted text-ink-muted",
};

const TONE_GLOW: Record<Mark["tone"], string> = {
	dismiss: "var(--destructive)",
	expand: "var(--link)",
	back: "var(--ink-muted)",
};

/** Where the stamp sits: the top corner the Card trails, as Tinder's does. */
function stampPlace(mark: Mark): string {
	return mark.edge === "start" || mark.edge === "bottom"
		? "end-4 rotate-[8deg] rtl:-rotate-[8deg]"
		: "start-4 -rotate-[8deg] rtl:rotate-[8deg]";
}

/** The 8 px glow along the edge the Card is headed for. */
function glowStyle(mark: Mark, rtl: boolean) {
	const colour = TONE_GLOW[mark.tone];
	const along = mark.edge === "start" || mark.edge === "end";
	const side =
		mark.edge === "start" || mark.edge === "end"
			? (mark.edge === "start") !== rtl
				? "to left"
				: "to right"
			: mark.edge === "top"
				? "to top"
				: "to bottom";
	return {
		className: along
			? `inset-y-0 w-2 ${mark.edge === "start" ? "start-0" : "end-0"}`
			: `inset-x-0 h-2 ${mark.edge === "top" ? "top-0" : "bottom-0"}`,
		background: `linear-gradient(${side}, transparent, ${colour})`,
	};
}

/**
 * The border a hovered Card lights, under a mouse or pen only: brighter
 * in 150 ms, back in 200. A Card that never lights (`undefined`) has no
 * transition either.
 */
function highlightClass(highlight: boolean | undefined): string {
	if (highlight === undefined) return "";
	const lit = highlight
		? " pointer-fine:hover:border-ink-muted pointer-fine:hover:duration-150"
		: "";
	return `transition-[border-color] duration-200 ease-out${lit}`;
}

/**
 * How a Card's box is drawn around its face: its shape and fill, its
 * cursor while it can be picked up, and its shadow for a lift of 0 to 1.
 */
export type CardSkin = {
	readonly box: string;
	readonly grab: string;
	readonly shadow: (lift: number) => string;
};

/** tf-demo's Card: paper, the Card border and a shadow that grows with the lift. */
const PAPER_SKIN: CardSkin = {
	box: "flex flex-col overflow-hidden rounded-[0.9rem] border border-line-strong bg-paper",
	grab: "cursor-grab active:cursor-grabbing",
	shadow: (l) => {
		const offset = (0.25 + 1.25 * l).toFixed(2);
		const blur = (0.75 + 2.25 * l).toFixed(2);
		const alpha = (0.2 + 0.25 * l).toFixed(2);
		return `0 ${offset}rem ${blur}rem rgb(0 0 0 / ${alpha})`;
	},
};

/**
 * One Card: `children` is its face, `skin` the box around it, tf-demo's
 * paper Card unless a Deck names another. Its box is its motion values; a
 * Card in the Cover takes no grab cursor.
 */
export function CardView({
	id,
	label,
	skin = PAPER_SKIN,
	children,
	values,
	rtl,
	held,
	expanded,
	mark,
	highlight,
	onPointerDown,
	onPointerEnter,
	onPointerLeave,
}: {
	readonly id: string;
	/** The Card's accessible name. */
	readonly label: string;
	readonly skin?: CardSkin;
	readonly children: ReactNode;
	readonly values: CardValues;
	readonly rtl: boolean;
	readonly held: boolean;
	readonly expanded: boolean;
	readonly mark: Mark | null;
	/** Whether hovering the Card lights its border now; left out, it never does. */
	readonly highlight?: boolean;
	readonly onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
	readonly onPointerEnter?: (event: ReactPointerEvent<HTMLElement>) => void;
	readonly onPointerLeave?: (event: ReactPointerEvent<HTMLElement>) => void;
}) {
	const x = useTransform(values.u, (u) => (rtl ? -u : u));
	const rotate = useTransform(values.r, (r) => (rtl ? -r : r));
	const boxShadow = useTransform(values.lift, skin.shadow);
	const glow = mark ? glowStyle(mark, rtl) : null;
	return (
		<motion.article
			aria-label={label}
			data-card-id={id}
			data-held={held || undefined}
			data-expanded={expanded || undefined}
			onPointerDown={onPointerDown}
			onPointerEnter={onPointerEnter}
			onPointerLeave={onPointerLeave}
			style={{
				insetInlineStart: 0,
				top: 0,
				x,
				y: values.v,
				width: values.w,
				height: values.h,
				rotate,
				scale: values.s,
				opacity: values.o,
				zIndex: values.z,
				boxShadow,
			}}
			className={`absolute ${skin.box} select-none ${expanded ? "" : `${skin.grab} touch-none`} ${highlightClass(highlight && !expanded)}`}
		>
			{children}
			{mark && glow ? (
				<>
					<motion.div
						aria-hidden="true"
						className={`pointer-events-none absolute ${glow.className}`}
						style={{
							opacity: values.glow,
							background: glow.background,
						}}
					/>
					<motion.span
						data-stamp={mark.tone}
						className={`pointer-events-none absolute top-3 rounded-md border-2 bg-paper px-2 py-0.5 font-mono text-[0.72rem] font-bold tracking-[0.12em] uppercase ${TONE_TEXT[mark.tone]} ${stampPlace(mark)}`}
						style={{ opacity: values.stamp }}
					>
						{mark.label}
					</motion.span>
				</>
			) : null}
		</motion.article>
	);
}

/**
 * A dummy Card's face, drawn as tf-demo's Cards are: a serif title and its
 * Caption in the Heading row, with the Cover's × when expanded, then its
 * Source Contexts and lines.
 */
export function CardFace({
	card,
	expanded,
	onClose,
}: {
	readonly card: DummyCard;
	readonly expanded: boolean;
	readonly onClose?: () => void;
}) {
	return (
		<>
			<div className="flex h-12 shrink-0 items-end gap-4 px-4 pb-3">
				<h2
					dir="auto"
					className="min-w-0 flex-1 truncate font-serif text-[1rem] leading-tight font-normal text-ink"
				>
					{card.title}
				</h2>
				<span className="shrink-0 pb-[0.15rem] text-[0.72rem] text-ink-muted">
					{card.caption}
				</span>
				{expanded ? (
					<button
						type="button"
						aria-label="Close"
						onClick={onClose}
						className="-my-1.5 grid size-8 place-items-center rounded-md text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-link/50 [&_svg]:size-4"
					>
						<XIcon aria-hidden="true" />
					</button>
				) : null}
			</div>
			<div
				className={`relative min-h-0 flex-1 px-4 pb-4 ${expanded ? "overflow-y-auto" : "overflow-hidden"}`}
			>
				<div className="flex flex-col gap-1">
					<div className="flex items-baseline justify-between font-mono text-[0.58rem] font-bold tracking-[0.12em] text-ink-muted uppercase">
						<span>Source contexts</span>
						<span>{card.contexts.length.toString()}</span>
					</div>
					<ul className="flex flex-col gap-0.5 text-[0.8rem] leading-relaxed text-ink-soft">
						{card.contexts.map((context) => (
							<li key={context} dir="auto">
								{context}
							</li>
						))}
					</ul>
				</div>
				<div className="mt-3 space-y-1.5 text-[0.85rem] leading-relaxed text-ink-soft">
					{card.lines.map((line) => (
						<p key={line} dir="auto">
							{line}
						</p>
					))}
				</div>
				{expanded ? null : (
					<div
						aria-hidden="true"
						className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-paper to-transparent"
					/>
				)}
			</div>
		</>
	);
}
