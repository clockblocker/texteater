import { CheckIcon, PanelRightOpenIcon } from "lucide-react";
import { motion, motionValue } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Rect } from "./geometry";
import { type MotionContext, tweenTo } from "./motion-kit";

/** How long the pad says a drop was taken, in ms. */
const ACK_MS = 700;
/** Its fade in as a Card lifts, and out once it has gone back. */
const IN_MS = 120;
const OUT_MS = 160;

/**
 * The stand-in drop target while a Card is carried: a Pane's inline-end
 * edge, where in the app a drop spawns a Floating Pane. It shows only
 * while a Card is in the hand, lights while the hand is over it, and on
 * a drop shows a tick for a moment before it fades: the drop itself is
 * out of scope, so the Card goes back to its slot. It is drawn under the
 * Deck, and the hand, not the Card, is what is over it. It only fades,
 * so reduced motion leaves it as it is.
 */
export function CarryPad({
	rect,
	shown,
	over,
	drops,
	motion: context,
}: {
	readonly rect: Rect;
	readonly shown: boolean;
	readonly over: boolean;
	/** Bumped by every drop on it. */
	readonly drops: number;
	readonly motion: MotionContext;
}) {
	const [acked, setAcked] = useState(false);
	const [opacity] = useState(() => motionValue(0));
	const seen = useRef(drops);
	useLayoutEffect(() => {
		if (seen.current === drops) return;
		seen.current = drops;
		setAcked(true);
		const timer = window.setTimeout(() => setAcked(false), ACK_MS);
		return () => window.clearTimeout(timer);
	}, [drops]);
	const visible = shown || acked;
	useEffect(() => {
		tweenTo(opacity, visible ? 1 : 0, visible ? IN_MS : OUT_MS, context);
	}, [visible, opacity, context]);
	const lit = over || acked;
	return (
		<motion.div
			aria-hidden="true"
			data-carry-pad=""
			data-over={over || undefined}
			data-acknowledged={acked || undefined}
			className={`pointer-events-none absolute flex flex-col items-center justify-center gap-2 rounded-xl border-2 text-sm font-medium transition-colors duration-150 ${
				lit
					? "border-link bg-link/15 text-link"
					: "border-dashed border-line text-ink-muted"
			}`}
			style={{
				insetInlineStart: rect.u,
				top: rect.v,
				width: rect.w,
				height: rect.h,
				opacity,
			}}
		>
			{acked ? (
				<CheckIcon className="size-6" strokeWidth={2.25} />
			) : (
				<PanelRightOpenIcon
					className="size-6 rtl:-scale-x-100"
					strokeWidth={2}
				/>
			)}
			<span>{acked ? "Moved" : "Move to pane"}</span>
		</motion.div>
	);
}
