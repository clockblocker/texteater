import { motion } from "motion/react";
import type { ReactNode, PointerEvent as ReactPointerEvent } from "react";
import { BAR_REM } from "react-resizable-panels/workspace";
import { useDeckReducedMotion } from "@/workspace/motion/reduced-motion";
import { useDeckMotion } from "@/workspace/motion/runtime-config";
import { type HeadingControl, KeyHandles, SheetChrome } from "./heading";
import { COVER_GUTTER_REM } from "./layout";

/** A Pane's own chrome: the Pane bar, and the lists a Ground's first rungs show. */

/** The Menu's and a Menu Item's column, gutters included, as a Text's. */
export const GROUND_LIST_WIDTH = "43rem";

/**
 * A list a Ground walks by tapping: the Menu, or what a Menu Item lists.
 * An application may draw its Menu Items' rungs with it too.
 */
export function GroundList({
	title,
	items,
	onPick,
}: {
	title: string;
	items: readonly { readonly key: string; readonly label: string }[];
	onPick: (key: string) => void;
}) {
	return (
		<div
			className="h-full overflow-auto"
			style={{ paddingTop: `${BAR_REM.toString()}rem` }}
		>
			<div
				className="mx-auto w-full pt-10 pb-12"
				style={{
					maxWidth: GROUND_LIST_WIDTH,
					paddingInline: `${COVER_GUTTER_REM.toString()}rem`,
				}}
			>
				<h2 className="mb-5 font-sans text-[0.68rem] font-bold tracking-[0.12em] text-ink-muted uppercase">
					{title}
				</h2>
				<ul className="flex flex-col gap-1">
					{items.map((item) => (
						<li key={item.key}>
							<button
								type="button"
								data-ground-item={item.key}
								onClick={() => onPick(item.key)}
								className="-mx-3 w-[calc(100%+1.5rem)] rounded-md px-3 py-2 text-start font-serif text-[1.15rem] text-ink hover:bg-raised"
							>
								{item.label}
							</button>
						</li>
					))}
				</ul>
			</div>
		</div>
	);
}

/** How a Pane bar handles its Ground: held to lift, dragged to lift, or not at all. */
export type BarHandle = "press" | "drag" | "none";

/**
 * The Pane bar: Sheet chrome, owned by the Pane, and the Ground's handle
 * (ADR 0006). A Rooted Pane's shows ← and its trail, and lifts its Ground
 * by a hold that fills it from inline-start; a Floating Pane's shows ×
 * and its Ground's title, and lifts by a plain drag.
 */
export function PaneBar({
	rem,
	barRem,
	covered,
	preview,
	handle,
	holding,
	columnWidth,
	back,
	clear,
	keys,
	title,
	trail,
	onPointerDown,
	onPointerMove,
	onStop,
}: {
	rem: number;
	/** The bar's height; a Floating Pane's folds with its Ground's body. */
	barRem: number;
	/** A Cover lies over the bar and carries its own. */
	covered: boolean;
	preview: boolean;
	handle: BarHandle;
	/** The hold is under way; see `GROUND_PRESS_MS`. */
	holding: boolean;
	/** The column the bar's words sit on, gutters included. */
	columnWidth: string;
	back: HeadingControl | null;
	clear: HeadingControl | null;
	keys: readonly (HeadingControl & { readonly text: string })[];
	/** The Floating Ground's title; a Rooted Pane shows its trail instead. */
	title: ReactNode | null;
	trail: readonly string[];
	onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
	onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
	onStop: () => void;
}) {
	const {
		transition,
		MORPH,
		GROUND_FILL,
		HOLD_RELEASE,
		BAR_ENTER,
		BAR_EXIT,
	} = useDeckMotion();
	const reduce = useDeckReducedMotion();
	/* a bar drawn as a Heading has no rule until it folds */
	const ruled = barRem === BAR_REM;
	return (
		<motion.div
			data-pane-bar=""
			data-handle={handle}
			data-holding={holding}
			/* a Cover lies over the bar and carries its own, so the Pane's
			   steps back under it rather than peek past its sides */
			inert={covered}
			initial={false}
			animate={{ height: barRem * rem, opacity: covered ? 0 : 1 }}
			/* the bar's height and its Ground's box move as one */
			transition={{
				height: MORPH,
				opacity: transition(covered ? BAR_EXIT : BAR_ENTER),
			}}
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={onStop}
			onPointerCancel={onStop}
			onPointerLeave={onStop}
			className={`absolute inset-x-0 top-0 border-b bg-paper select-none ${covered ? "pointer-events-none z-0" : "z-20"} ${preview ? "border-dashed border-link/60" : ruled ? "border-line" : "border-transparent"} ${handle === "drag" ? "cursor-grab touch-none active:cursor-grabbing" : handle === "press" ? "cursor-pointer touch-none" : ""}`}
		>
			{/* the hold's countdown: it fills from the inline-start edge in
			    exactly the press time, and drains fast when let go. Reduced,
			    it deepens in place instead of sweeping across. Under the
			    bar's words, over its paper */}
			<motion.div
				aria-hidden="true"
				data-hold-fill=""
				initial={false}
				animate={{
					scaleX: reduce || holding ? 1 : 0,
					opacity: !reduce || holding ? 1 : 0,
				}}
				transition={transition(holding ? GROUND_FILL : HOLD_RELEASE)}
				className="pointer-events-none absolute inset-0 -z-10 origin-left bg-link/15 rtl:origin-right"
			/>
			<SheetChrome
				ruled={false}
				maxWidth={columnWidth}
				back={back}
				clear={clear}
			>
				{title ?? (
					<nav
						aria-label="Trail"
						className="flex min-w-0 items-center gap-1 truncate font-mono text-[0.62rem] tracking-[0.08em] text-ink-muted uppercase"
					>
						{/* the trail changes on every step, and changes at
						    once: the step is the motion, the words follow */}
						{trail.map((crumb, index) => (
							<span
								key={`${index.toString()}-${crumb}`}
								className="contents"
							>
								{index > 0 ? (
									<span aria-hidden="true">›</span>
								) : null}
								<span
									className={
										index === trail.length - 1
											? holding
												? "text-link"
												: "text-ink"
											: undefined
									}
								>
									{crumb}
								</span>
							</span>
						))}
					</nav>
				)}
			</SheetChrome>
			{keys.length && !preview ? <KeyHandles controls={keys} /> : null}
		</motion.div>
	);
}
