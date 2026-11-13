import { motion, useTransform } from "motion/react";
import type { ReactNode, PointerEvent as ReactPointerEvent } from "react";
import type { PresentationForm } from "@/presentation/form";
import { PresentationBox } from "@/presentation/presentation-box";
import { paperShadow } from "@/presentation/skin";
import type { CardValues } from "./use-deck";

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
 * drawn as the element the Deck's motion values move. `children` is what
 * the box holds. The box is the
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
	aside,
	highlight,
	onPointerDown,
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
	/** Whether it is open in another Pane, not over its Deck. */
	readonly aside?: boolean;
	/** Whether hovering the Card lights its border while its layer is lit; left out, it never does. */
	readonly highlight?: boolean;
	readonly onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
}) {
	const expanded = form !== "card";
	const x = useTransform(values.u, (u) => (rtl ? -u : u));
	const rotate = useTransform(values.r, (r) => (rtl ? -r : r));
	const boxShadow = useTransform(values.lift, (lift) =>
		paperShadow(form, lift),
	);
	const opacity = useTransform(
		[values.o, values.veil],
		([own = 1, veil = 1]: number[]) => own * veil,
	);
	return (
		<PresentationBox
			as={motion.article}
			form={form}
			liftable={liftable}
			aria-label={label}
			data-card-id={id}
			data-held={held || undefined}
			data-expanded={expanded || undefined}
			data-aside={aside || undefined}
			onPointerDown={onPointerDown}
			style={{
				insetInlineStart: 0,
				top: 0,
				x,
				y: values.v,
				width: values.w,
				height: values.h,
				rotate,
				scale: values.s,
				opacity,
				zIndex: values.z,
				boxShadow,
			}}
			className={`absolute ${highlightClass(highlight && !expanded)} ${className}`}
		>
			{children}
		</PresentationBox>
	);
}
