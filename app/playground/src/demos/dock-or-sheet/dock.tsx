import { GripVertical, PanelRight, X } from "lucide-react";
import { motion } from "motion/react";
import { type ReactNode, useState } from "react";
import { handOffVariants } from "./hand-off";

/**
 * The docked pane at the text's inline end. It opens by growing from zero
 * width, so the text beside it reflows as it comes in. A grip on its
 * inline-start edge resizes it: drag it, use the arrow keys, or double-click
 * it for the default width.
 */
export function Dock({
	width,
	minWidth,
	maxWidth,
	defaultWidth,
	onWidth,
	dir,
	reducedMotion,
	onClose,
	children,
}: {
	readonly width: number;
	readonly minWidth: number;
	readonly maxWidth: number;
	readonly defaultWidth: number;
	readonly onWidth: (width: number) => void;
	readonly dir: "ltr" | "rtl";
	readonly reducedMotion: boolean;
	readonly onClose: () => void;
	readonly children: ReactNode;
}) {
	const [dragging, setDragging] = useState(false);
	const clamp = (value: number) =>
		Math.round(Math.min(Math.max(value, minWidth), maxWidth));
	// Pointer travel towards the inline end shrinks the dock.
	const towardsEnd = dir === "rtl" ? -1 : 1;

	return (
		<motion.aside
			aria-label="Lookup dock"
			initial={{ width: 0 }}
			animate={{ width }}
			exit="gone"
			variants={handOffVariants({ width: 0 })}
			transition={
				dragging || reducedMotion
					? { duration: 0 }
					: { type: "spring", duration: 0.42, bounce: 0 }
			}
			onKeyDown={(event) => {
				if (event.key === "Escape") onClose();
			}}
			className="relative shrink-0 border-s border-line bg-canvas"
		>
			<div className="absolute inset-0 overflow-hidden">
				<div style={{ width }} className="flex h-full flex-col">
					<header className="flex shrink-0 items-center gap-2 border-b border-line px-4 py-2">
						<span className="inline-flex items-center gap-1.5 font-mono text-xs text-ink-muted">
							<PanelRight
								aria-hidden="true"
								className="size-3.5 rtl:-scale-x-100"
							/>
							dock · {width}px
						</span>
						<button
							type="button"
							aria-label="Close the lookup"
							onClick={onClose}
							className="ms-auto cursor-pointer rounded-md p-1 text-ink-muted hover:bg-raised hover:text-ink"
						>
							<X aria-hidden="true" className="size-4" />
						</button>
					</header>
					<div className="min-h-0 flex-1 overflow-auto overscroll-contain px-4 pt-6 pb-8">
						{children}
					</div>
				</div>
			</div>
			<button
				type="button"
				aria-label={`Resize the dock, ${width}px: drag, use the arrow keys, or double-click to reset`}
				data-dragging={dragging ? "" : undefined}
				onDoubleClick={() => onWidth(defaultWidth)}
				onKeyDown={(event) => {
					const step = { ArrowLeft: -24, ArrowRight: 24 }[event.key];
					if (step === undefined) return;
					event.preventDefault();
					onWidth(clamp(width - step * towardsEnd));
				}}
				onPointerDown={(event) => {
					if (event.button !== 0) return;
					event.preventDefault();
					const grip = event.currentTarget;
					grip.setPointerCapture(event.pointerId);
					const startX = event.clientX;
					const startWidth = width;
					setDragging(true);
					const move = (moveEvent: PointerEvent) =>
						onWidth(
							clamp(
								startWidth -
									(moveEvent.clientX - startX) * towardsEnd,
							),
						);
					const up = () => {
						grip.removeEventListener("pointermove", move);
						grip.removeEventListener("pointerup", up);
						grip.removeEventListener("pointercancel", up);
						setDragging(false);
					};
					grip.addEventListener("pointermove", move);
					grip.addEventListener("pointerup", up);
					grip.addEventListener("pointercancel", up);
				}}
				className="group absolute inset-y-0 -start-2 z-10 flex w-4 cursor-col-resize touch-none items-center justify-center focus-visible:outline-none"
			>
				<span className="absolute inset-y-0 start-[7px] w-0.5 bg-transparent transition-colors group-hover:bg-link group-focus-visible:bg-link group-data-dragging:bg-link" />
				<span className="relative grid h-9 w-3 place-items-center rounded-full border border-line bg-paper text-ink-faint group-hover:text-link group-data-dragging:text-link">
					<GripVertical aria-hidden="true" className="size-3" />
				</span>
			</button>
		</motion.aside>
	);
}
