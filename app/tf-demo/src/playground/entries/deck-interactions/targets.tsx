import { Maximize2Icon, XIcon } from "lucide-react";
import { motion } from "motion/react";
import { type ReactNode, useEffect, useRef } from "react";
import type { Target } from "./decide";
import type { Rect } from "./geometry";
import type { TableTargets } from "./layout";
import { type MotionContext, SPRINGS, transition } from "./motion-kit";

const SHOWN = 0.6;
/** Arriving targets grow from this; a lit one swells to `LIT`. */
const ARRIVE_SCALE = 0.96;
const LIT = 1.04;
/** Targets arrive over 140 ms and leave in 80: the system answers faster than it offers. */
const ARRIVE = { ms: 140 };
const LEAVE = { ms: 80 };
/** The commit pulse: 1.0 → 1.04 → 1.0 over 180 ms. */
const PULSE = { ms: 180 };

/** A commit to the tray, counted so each one plays once. */
export type Pulse = number;

function TargetBox({
	rect,
	opacity,
	active,
	delayMs,
	motion: context,
	className,
	target,
	children,
}: {
	readonly rect: Rect;
	readonly opacity: number;
	readonly active: boolean;
	/** How long an arriving target waits, so the three come in turn. */
	readonly delayMs: number;
	readonly motion: MotionContext;
	readonly className: string;
	readonly target: Target;
	readonly children?: ReactNode;
}) {
	/* only an arrival waits its turn; lighting up and leaving answer at once */
	const was = useRef(0);
	const arriving = was.current === 0 && opacity > 0;
	useEffect(() => {
		was.current = opacity;
	});
	const reduce = context.reduce;
	const rest = opacity > 0 ? 1 : ARRIVE_SCALE;
	return (
		<motion.div
			aria-hidden="true"
			data-target={target}
			data-active={active || undefined}
			initial={{ opacity: 0, scale: reduce ? 1 : ARRIVE_SCALE }}
			animate={{
				opacity,
				scale: reduce ? 1 : active ? LIT : rest,
			}}
			transition={{
				opacity: {
					...transition(opacity > 0 ? ARRIVE : LEAVE, context),
					delay: arriving ? delayMs / 1000 / context.timeScale : 0,
				},
				scale: {
					...transition(
						active ? SPRINGS.pop : SPRINGS.settle,
						context,
					),
					delay: arriving ? delayMs / 1000 / context.timeScale : 0,
				},
			}}
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

/** The tray's commit: a ring that swells once, or under reduced motion a colour flash. */
function PulseRing({
	pulse,
	motion: context,
}: {
	readonly pulse: Pulse;
	readonly motion: MotionContext;
}) {
	const timing = transition(PULSE, context);
	return context.reduce ? (
		<motion.div
			key={pulse}
			className="absolute inset-0 rounded-[inherit] bg-destructive"
			initial={{ opacity: 0.5 }}
			animate={{ opacity: 0 }}
			transition={timing}
		/>
	) : (
		<motion.div
			key={pulse}
			className="absolute inset-0 rounded-[inherit] border-2 border-destructive"
			initial={{ scale: 1 }}
			animate={{ scale: [1, 1.04, 1] }}
			transition={timing}
		/>
	);
}

/**
 * B's three places: a dashed slot where the Card was, the tray at
 * inline-start and bottom, the open pad at inline-end and top. Shown ones
 * rest at 0.6 and arrive in turn; the one lit under the hand brightens
 * and swells, and only one is ever lit.
 */
export function TargetsView({
	targets,
	slot,
	shown,
	active,
	pulse,
	staggerMs,
	motion: context,
}: {
	readonly targets: TableTargets;
	readonly slot: Rect | null;
	readonly shown: (target: Target) => boolean;
	readonly active: Target | null;
	readonly pulse: Pulse;
	readonly staggerMs: number;
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
					delayMs={0}
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
					delayMs={staggerMs}
					motion={context}
					className="z-[5] rounded-[0.7rem] border-2 border-destructive/70 bg-destructive/15 text-destructive"
				>
					{index === tray.length - 1 ? (
						<XIcon aria-hidden="true" className="size-5" />
					) : null}
					{pulse > 0 ? (
						<PulseRing pulse={pulse} motion={context} />
					) : null}
				</TargetBox>
			))}
			<TargetBox
				target="pad"
				rect={targets.pad}
				opacity={opacity("pad")}
				active={active === "pad"}
				delayMs={2 * staggerMs}
				motion={context}
				className="z-[5] rounded-[0.9rem] border-2 border-link/70 bg-link/15 text-link"
			>
				<Maximize2Icon aria-hidden="true" className="size-5" />
			</TargetBox>
		</>
	);
}
