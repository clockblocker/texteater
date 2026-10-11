import { cn } from "lego";
import { PanelBottom, X } from "lucide-react";
import { animate, motion, useMotionValue } from "motion/react";
import {
	type KeyboardEvent,
	type PointerEvent,
	type ReactNode,
	useEffect,
	useRef,
} from "react";
import { handOffVariants } from "./hand-off";

export type Snap = "peek" | "half" | "full";

const snaps: readonly Snap[] = ["peek", "half", "full"];

/** Each snap's height, for a sheet in an area `areaHeight` tall. */
export function snapHeights(areaHeight: number): Record<Snap, number> {
	const full = Math.max(areaHeight - 12, 0);
	const half = Math.round(areaHeight * 0.5);
	return { peek: Math.min(150, half - 48), half, full };
}

const spring = { type: "spring", duration: 0.42, bounce: 0.12 } as const;

/**
 * A bottom sheet with a drag handle and three snaps. Dragging the top
 * strip resizes it; on release it settles on the snap nearest to where
 * the flick was heading, and a flick below the peek dismisses it. A tap
 * on the strip steps through the snaps. The grip is a button: arrow keys
 * step up and down, Escape anywhere in the sheet closes it.
 */
export function Sheet({
	snap,
	heights,
	onSnap,
	onClose,
	reducedMotion,
	children,
}: {
	readonly snap: Snap;
	readonly heights: Record<Snap, number>;
	readonly onSnap: (snap: Snap) => void;
	readonly onClose: () => void;
	readonly reducedMotion: boolean;
	readonly children: ReactNode;
}) {
	const height = useMotionValue(heights[snap]);
	const dragging = useRef(false);

	const settle = (target: number) => {
		if (reducedMotion) height.set(target);
		else animate(height, target, spring);
	};

	useEffect(() => {
		if (dragging.current) return;
		const target = heights[snap];
		if (reducedMotion) {
			height.set(target);
			return;
		}
		const controls = animate(height, target, spring);
		return () => controls.stop();
	}, [height, heights, snap, reducedMotion]);

	const step = (by: 1 | -1) => {
		const index = snaps.indexOf(snap) + by;
		const next = snaps[Math.min(Math.max(index, 0), snaps.length - 1)];
		if (next) onSnap(next);
	};
	const cycle = () =>
		onSnap(snaps[(snaps.indexOf(snap) + 1) % snaps.length] ?? "half");

	const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
		if (
			event.button !== 0 ||
			(event.target as Element).closest("[data-no-drag]")
		)
			return;
		event.preventDefault();
		const strip = event.currentTarget;
		strip.setPointerCapture(event.pointerId);
		height.stop();
		dragging.current = true;
		const startY = event.clientY;
		const startHeight = height.get();
		let last = { y: startY, t: event.timeStamp };
		let velocity = 0;
		let moved = false;

		const move = (moveEvent: globalThis.PointerEvent) => {
			const dy = moveEvent.clientY - startY;
			if (Math.abs(dy) > 4) moved = true;
			const raw = startHeight - dy;
			// Past full, the sheet resists like a rubber band.
			const next =
				raw > heights.full
					? heights.full + (raw - heights.full) * 0.2
					: raw;
			height.set(Math.max(0, next));
			const dt = moveEvent.timeStamp - last.t;
			if (dt > 0) velocity = (moveEvent.clientY - last.y) / dt;
			last = { y: moveEvent.clientY, t: moveEvent.timeStamp };
		};
		const up = (upEvent: globalThis.PointerEvent) => {
			strip.removeEventListener("pointermove", move);
			strip.removeEventListener("pointerup", up);
			strip.removeEventListener("pointercancel", up);
			dragging.current = false;
			if (!moved) {
				cycle();
				return;
			}
			// A pointer that stopped before letting go threw nothing.
			if (upEvent.timeStamp - last.t > 90) velocity = 0;
			const projected = height.get() - velocity * 220;
			if (projected < heights.peek * 0.55) {
				onClose();
				return;
			}
			const next = nearest(heights, projected);
			settle(heights[next]);
			onSnap(next);
		};
		strip.addEventListener("pointermove", move);
		strip.addEventListener("pointerup", up);
		strip.addEventListener("pointercancel", up);
	};

	const onGripKey = (event: KeyboardEvent<HTMLButtonElement>) => {
		const by = { ArrowUp: 1, ArrowDown: -1 }[event.key] as
			| 1
			| -1
			| undefined;
		if (by === undefined) return;
		event.preventDefault();
		step(by);
	};

	return (
		<motion.section
			aria-label="Lookup sheet"
			initial={{ y: "100%" }}
			animate={{ y: 0 }}
			exit="gone"
			variants={handOffVariants({ y: "100%" })}
			transition={reducedMotion ? { duration: 0 } : spring}
			style={{ height }}
			onKeyDown={(event) => {
				if (event.key === "Escape") onClose();
			}}
			className="absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-2xl border-t border-line bg-canvas shadow-[0_-18px_40px_-22px_oklch(0%_0_0/0.75)]"
		>
			<div
				onPointerDown={onPointerDown}
				className="shrink-0 cursor-grab touch-none px-3 pb-2 select-none active:cursor-grabbing"
			>
				<div className="flex justify-center pt-1.5">
					<button
						type="button"
						aria-label={`Sheet at ${snap}. Arrow keys resize it, Escape closes it.`}
						onKeyDown={onGripKey}
						onClick={(event) => {
							// Pointer taps step in onPointerDown's handler.
							if (event.detail === 0) cycle();
						}}
						className="flex h-5 w-20 cursor-grab items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-ring"
					>
						<span className="h-1.5 w-10 rounded-full bg-line-strong" />
					</button>
				</div>
				<div className="flex items-center gap-2">
					<span className="inline-flex items-center gap-1.5 font-mono text-xs text-ink-muted">
						<PanelBottom aria-hidden="true" className="size-3.5" />
						sheet
					</span>
					<div
						data-no-drag=""
						className="ms-auto flex rounded-lg border border-line p-0.5 text-xs"
					>
						{snaps.map((candidate) => (
							<button
								key={candidate}
								type="button"
								aria-pressed={candidate === snap}
								onClick={() => onSnap(candidate)}
								className={cn(
									"cursor-pointer rounded-md px-2 py-0.5 text-ink-muted hover:text-ink",
									candidate === snap && "bg-raised text-ink",
								)}
							>
								{candidate}
							</button>
						))}
					</div>
					<button
						type="button"
						data-no-drag=""
						aria-label="Close the lookup"
						onClick={onClose}
						className="cursor-pointer rounded-md p-1 text-ink-muted hover:bg-raised hover:text-ink"
					>
						<X aria-hidden="true" className="size-4" />
					</button>
				</div>
			</div>
			<div className="min-h-0 flex-1 overflow-auto overscroll-contain px-4 pt-5 pb-8">
				{children}
			</div>
		</motion.section>
	);
}

function nearest(heights: Record<Snap, number>, height: number): Snap {
	let best: Snap = "half";
	for (const candidate of snaps)
		if (
			Math.abs(heights[candidate] - height) <
			Math.abs(heights[best] - height)
		)
			best = candidate;
	return best;
}
