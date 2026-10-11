import { cn } from "lego";
import { MotionConfig } from "motion/react";
import { type ReactNode, useCallback, useState } from "react";
import { PlaygroundEnvContext } from "./env";
import { type FrameSettings, minFrameWidth } from "./settings";

/**
 * The box a demo renders in. It is a size container (`@container/frame`),
 * so a demo's container queries answer to the frame's width, not the
 * window's. Its layout containment also makes it the containing block for
 * `position: fixed`, so a bottom sheet pinned with `fixed bottom-0` sits at
 * the frame's bottom. The frame clips and never scrolls: the demo owns
 * its scrolling.
 *
 * `dir`, the theme class and `data-reduced-motion` are set on the frame,
 * and Motion's `MotionConfig` follows the reduced-motion toggle.
 */
export function Frame({
	settings,
	onFrame,
	onResize,
	children,
}: {
	readonly settings: FrameSettings;
	readonly onFrame: (frame: HTMLElement | null) => void;
	/** A drag on the handle ended at this width. */
	readonly onResize: (width: number) => void;
	readonly children: ReactNode;
}) {
	const [frame, setFrame] = useState<HTMLElement | null>(null);
	const [dragWidth, setDragWidth] = useState<number | null>(null);
	const width = dragWidth ?? settings.width;
	const frameRef = useCallback(
		(element: HTMLElement | null) => {
			setFrame(element);
			onFrame(element);
		},
		[onFrame],
	);

	return (
		<div className="min-h-0 flex-1 overflow-auto bg-scrim p-4">
			<div
				className="relative mx-auto h-full"
				style={{ width: width === "fill" ? "100%" : `${width}px` }}
			>
				<div
					ref={frameRef}
					data-playground-frame=""
					data-theme={settings.theme}
					data-reduced-motion={
						settings.reducedMotion ? "true" : "false"
					}
					dir={settings.dir}
					className={cn(
						"@container/frame relative h-full w-full overflow-hidden bg-background text-foreground ring-1 ring-line-strong",
						settings.theme,
					)}
				>
					<MotionConfig
						reducedMotion={
							settings.reducedMotion ? "always" : "user"
						}
					>
						<PlaygroundEnvContext.Provider
							value={{ ...settings, frame }}
						>
							{children}
						</PlaygroundEnvContext.Provider>
					</MotionConfig>
				</div>
				{frame ? (
					<ResizeHandle
						frame={frame}
						onDrag={setDragWidth}
						onDrop={(dropped) => {
							setDragWidth(null);
							onResize(dropped);
						}}
					/>
				) : null}
			</div>
		</div>
	);
}

/**
 * A grip on the frame's end edge. The shell around the frame is always
 * left-to-right, so that is its right edge; the frame is centred, so the
 * width grows by twice the pointer's travel.
 */
function ResizeHandle({
	frame,
	onDrag,
	onDrop,
}: {
	readonly frame: HTMLElement;
	readonly onDrag: (width: number) => void;
	readonly onDrop: (width: number) => void;
}) {
	return (
		<button
			type="button"
			aria-label="Resize the frame: drag, or use the arrow keys"
			className="absolute inset-y-0 -end-4 flex w-4 cursor-ew-resize touch-none items-center justify-center focus-visible:outline-2 focus-visible:outline-ring"
			onKeyDown={(event) => {
				const step = { ArrowLeft: -20, ArrowRight: 20 }[event.key];
				if (step === undefined) return;
				event.preventDefault();
				onDrop(
					Math.max(
						minFrameWidth,
						Math.round(frame.getBoundingClientRect().width) + step,
					),
				);
			}}
			onPointerDown={(event) => {
				event.preventDefault();
				const handle = event.currentTarget;
				handle.setPointerCapture(event.pointerId);
				const startX = event.clientX;
				const startWidth = frame.getBoundingClientRect().width;
				const widthAt = (x: number) =>
					Math.max(
						minFrameWidth,
						Math.round(startWidth + 2 * (x - startX)),
					);
				const move = (moveEvent: PointerEvent) =>
					onDrag(widthAt(moveEvent.clientX));
				const up = (upEvent: PointerEvent) => {
					handle.removeEventListener("pointermove", move);
					handle.removeEventListener("pointerup", up);
					handle.removeEventListener("pointercancel", up);
					onDrop(widthAt(upEvent.clientX));
				};
				handle.addEventListener("pointermove", move);
				handle.addEventListener("pointerup", up);
				handle.addEventListener("pointercancel", up);
			}}
		>
			<span className="h-10 w-1 rounded-full bg-line-strong" />
		</button>
	);
}
