import type * as React from "react";

import { cn } from "../utils";

const ICON_CLASS =
	"col-start-1 row-start-1 transition-[opacity,scale,filter] duration-300 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none";
const HIDDEN_CLASS = "scale-25 opacity-0 blur-[4px]";

/**
 * One icon slot that holds two icons stacked in the same cell and cross-fades
 * between them, so a control that turns busy keeps its width and its label
 * stays put. Pass `data-icon="inline-start"` through for `Button` padding.
 */
export function IconSwap({
	busy,
	idle,
	active,
	className,
	...props
}: Omit<React.ComponentProps<"span">, "children"> & {
	/** The icon shown while nothing is happening. */
	readonly idle: React.ReactNode;
	/** The icon shown while the control is busy, for example a spinner. */
	readonly busy: React.ReactNode;
	/** Whether the busy icon is showing. */
	readonly active: boolean;
}) {
	return (
		<span
			data-slot="icon-swap"
			data-active={active || undefined}
			aria-hidden="true"
			className={cn("grid shrink-0 place-items-center", className)}
			{...props}
		>
			<span className={cn(ICON_CLASS, "flex", active && HIDDEN_CLASS)}>
				{idle}
			</span>
			<span className={cn(ICON_CLASS, "flex", !active && HIDDEN_CLASS)}>
				{busy}
			</span>
		</span>
	);
}
