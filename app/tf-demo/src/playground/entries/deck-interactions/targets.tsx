import { Maximize2Icon, XIcon } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import type { Target } from "./decide";
import type { Rect } from "./geometry";
import type { TableTargets } from "./layout";
import { type MotionContext, transition } from "./motion-kit";

const SHOWN = 0.6;
/** Targets fade in over 120 ms; the tray's commit pulse lasts 180 ms. */
const TARGET_FADE = { ms: 120 };
const PULSE = { ms: 180 };

function TargetBox({
	rect,
	opacity,
	active,
	motion: context,
	className,
	target,
	children,
}: {
	readonly rect: Rect;
	readonly opacity: number;
	readonly active: boolean;
	readonly motion: MotionContext;
	readonly className: string;
	readonly target: Target;
	readonly children?: ReactNode;
}) {
	return (
		<motion.div
			aria-hidden="true"
			data-target={target}
			data-active={active || undefined}
			initial={{ opacity: 0 }}
			animate={{
				opacity,
				scale: active && !context.reduce ? 1.03 : 1,
			}}
			transition={transition(TARGET_FADE, context)}
			className={`pointer-events-none absolute grid place-items-center ${className}`}
			style={{
				insetInlineStart: rect.u,
				top: rect.v,
				width: rect.w,
				height: rect.h,
			}}
		>
			{children}
		</motion.div>
	);
}

/** A tray's commit: a pulse, or under reduced motion a colour flash. */
function Pulse({
	pulse,
	motion: context,
}: {
	readonly pulse: number;
	readonly motion: MotionContext;
}) {
	if (pulse === 0) return null;
	const timing = transition(PULSE, context);
	return context.reduce ? (
		<motion.div
			key={pulse}
			className="absolute inset-0 rounded-[0.7rem] bg-destructive"
			initial={{ opacity: 0.5 }}
			animate={{ opacity: 0 }}
			transition={timing}
		/>
	) : (
		<motion.div
			key={pulse}
			className="absolute inset-0 rounded-[0.7rem] border-2 border-destructive"
			initial={{ scale: 1 }}
			animate={{ scale: [1, 1.04, 1] }}
			transition={timing}
		/>
	);
}

/**
 * B's three places: a dashed slot where the Card was, the tray at
 * inline-start and bottom, the open pad at inline-end and top. Shown ones
 * rest at 0.6; the one the Card is pulled toward brightens and grows.
 */
export function TargetsView({
	targets,
	slot,
	shown,
	active,
	pulse,
	motion: context,
}: {
	readonly targets: TableTargets;
	readonly slot: Rect | null;
	readonly shown: (target: Target) => boolean;
	readonly active: Target | null;
	readonly pulse: number;
	readonly motion: MotionContext;
}) {
	const opacity = (target: Target) =>
		active === target ? 1 : shown(target) ? SHOWN : 0;
	const tray = targets.tray;
	return (
		<>
			{slot ? (
				<TargetBox
					target="slot"
					rect={slot}
					opacity={opacity("slot")}
					active={active === "slot"}
					motion={context}
					className="z-[5] rounded-[0.9rem] border-2 border-dashed border-line-strong"
				/>
			) : null}
			{tray.map((rect, index) => (
				<TargetBox
					key={`${rect.u.toString()}-${rect.v.toString()}`}
					target="tray"
					rect={rect}
					opacity={opacity("tray")}
					active={active === "tray"}
					motion={context}
					className="z-[5] rounded-[0.7rem] border-2 border-destructive/70 bg-destructive/15 text-destructive"
				>
					{index === tray.length - 1 ? (
						<XIcon aria-hidden="true" className="size-5" />
					) : null}
					<Pulse pulse={pulse} motion={context} />
				</TargetBox>
			))}
			<TargetBox
				target="pad"
				rect={targets.pad}
				opacity={opacity("pad")}
				active={active === "pad"}
				motion={context}
				className="z-[5] rounded-[0.9rem] border-2 border-link/70 bg-link/15 text-link"
			>
				<Maximize2Icon aria-hidden="true" className="size-5" />
			</TargetBox>
		</>
	);
}
