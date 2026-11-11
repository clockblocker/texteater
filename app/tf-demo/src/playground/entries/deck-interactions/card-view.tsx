import { motion, useTransform } from "motion/react";
import type { ReactNode, PointerEvent as ReactPointerEvent } from "react";
import type { PresentationForm } from "@/presentation/form";
import { PresentationBox } from "@/presentation/presentation-box";
import { paperShadow } from "@/presentation/skin";
import type { CardValues, Mark } from "./use-deck";

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
 * The border a hovered Card lights, under a mouse or pen only, while the
 * layer it is in (a `group/deck`) says `data-lit`: brighter in 150 ms,
 * back in 200. The layer switches it for every Card, so none re-renders
 * for it. A Card that never lights (`undefined`) has no transition either.
 */
function highlightClass(highlight: boolean | undefined): string {
	if (highlight === undefined) return "";
	const lit = highlight
		? " pointer-fine:group-data-[lit]/deck:hover:border-ink-muted pointer-fine:group-data-[lit]/deck:hover:duration-150"
		: "";
	return `transition-[border-color] duration-200 ease-out${lit}`;
}

/**
 * One Card on this engine's values: the Presentation foundation's box,
 * drawn as the element the Deck's motion values move, with the marks a
 * gesture stamps on it. `children` is what the box holds. The box is the
 * app's in every form; its shadow follows the Card's lift.
 */
export function CardView({
	id,
	label,
	form,
	liftable = true,
	className = "",
	children,
	values,
	rtl,
	held,
	mark,
	highlight,
	onPointerDown,
	onPointerEnter,
	onPointerLeave,
}: {
	readonly id: string;
	/** The Card's accessible name. */
	readonly label: string;
	/** The form it is drawn in: a Card on the Deck or in the hand, a Cover once opened. */
	readonly form: PresentationForm;
	/** A hand can pick the Card up; off where a press only opens it. */
	readonly liftable?: boolean;
	readonly className?: string;
	readonly children: ReactNode;
	readonly values: CardValues;
	readonly rtl: boolean;
	readonly held: boolean;
	readonly mark: Mark | null;
	/** Whether hovering the Card lights its border while its layer is lit; left out, it never does. */
	readonly highlight?: boolean;
	readonly onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
	readonly onPointerEnter?: (event: ReactPointerEvent<HTMLElement>) => void;
	readonly onPointerLeave?: (event: ReactPointerEvent<HTMLElement>) => void;
}) {
	const expanded = form !== "card";
	const x = useTransform(values.u, (u) => (rtl ? -u : u));
	const rotate = useTransform(values.r, (r) => (rtl ? -r : r));
	const boxShadow = useTransform(values.lift, (lift) =>
		paperShadow(form, lift),
	);
	const glow = mark ? glowStyle(mark, rtl) : null;
	return (
		<PresentationBox
			as={motion.article}
			form={form}
			liftable={liftable}
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
			className={`absolute ${highlightClass(highlight && !expanded)} ${className}`}
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
		</PresentationBox>
	);
}
