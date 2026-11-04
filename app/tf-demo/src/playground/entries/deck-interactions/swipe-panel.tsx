import { Maximize2Icon, XIcon } from "lucide-react";
import { type MotionValue, motion, useTransform } from "motion/react";
import type { Rect } from "./geometry";
import { type MotionContext, SPRINGS, transition } from "./motion-kit";

/** What a swipe uncovers: which action, along which axis, and which way. */
export type Panel = {
	readonly id: string;
	readonly zone: "dismiss" | "expand";
	readonly axis: "inline" | "block";
	/** The way the Card moved: -1 to inline-start or up, 1 to inline-end or down. */
	readonly sign: -1 | 1;
};

/** The icon sits in the strip the Card uncovers, at the far edge from it. */
function iconPlace(panel: Panel): string {
	if (panel.axis === "inline")
		return panel.sign < 0
			? "inset-y-0 end-0 pe-6 items-center"
			: "inset-y-0 start-0 ps-6 items-center";
	return panel.sign > 0
		? "inset-x-0 top-0 pt-5 justify-center"
		: "inset-x-0 bottom-0 pb-5 justify-center";
}

const TINT_SHOWN = 0.35;
const FILL = { ms: 120 };

/**
 * D's action panel, under the Card in its own footprint: red "Close deck"
 * for inline-start and down, blue "Open" for inline-end and up. Its icon
 * grows with the swipe; at the detent the colour fills and the icon jumps
 * 2 px. Under reduced motion the colour cross-fades with the swipe instead.
 */
export function SwipePanel({
	panel,
	rect,
	progress,
	past,
	labels,
	motion: context,
}: {
	readonly panel: Panel;
	readonly rect: Rect;
	readonly progress: MotionValue<number>;
	readonly past: boolean;
	readonly labels: boolean;
	readonly motion: MotionContext;
}) {
	const scale = useTransform(progress, [0, 1], [0.8, 1]);
	const tint = useTransform(progress, [0, 1], [0, 1]);
	const dismiss = panel.zone === "dismiss";
	return (
		<div
			aria-hidden="true"
			data-panel={panel.zone}
			className="pointer-events-none absolute overflow-hidden rounded-[0.9rem]"
			style={{
				insetInlineStart: rect.u,
				top: rect.v,
				width: rect.w,
				height: rect.h,
				zIndex: 99,
			}}
		>
			<motion.div
				className={`absolute inset-0 ${dismiss ? "bg-destructive" : "bg-link"}`}
				initial={false}
				animate={
					context.reduce
						? undefined
						: { opacity: past ? 1 : TINT_SHOWN }
				}
				transition={transition(FILL, context)}
				style={context.reduce ? { opacity: tint } : undefined}
			/>
			<div className={`absolute flex gap-2 text-ink ${iconPlace(panel)}`}>
				<motion.div
					className="flex flex-col items-center gap-1"
					initial={false}
					animate={{ y: past && !context.reduce ? -2 : 0 }}
					transition={transition(SPRINGS.settle, context)}
					style={context.reduce ? undefined : { scale }}
				>
					{dismiss ? (
						<XIcon aria-hidden="true" className="size-5" />
					) : (
						<Maximize2Icon aria-hidden="true" className="size-5" />
					)}
					{labels ? (
						<span className="text-xs font-medium whitespace-nowrap">
							{dismiss ? "Close deck" : "Open"}
						</span>
					) : null}
				</motion.div>
			</div>
		</div>
	);
}
