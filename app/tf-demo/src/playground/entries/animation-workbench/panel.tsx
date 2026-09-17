import { ChevronDownIcon, SlidersHorizontalIcon } from "lucide-react";
import type { ReactNode } from "react";

import { LABEL } from "./controls";

/**
 * The inspector: everything you can turn, folded into one panel over the
 * stage. It is hidden by default the moment you do not need it, so the
 * animation is the only thing on screen. The panel stays mounted while
 * hidden, so its scroll and its open sections survive a look.
 */
export function Panel({
	open,
	onOpenChange,
	title,
	children,
}: {
	open: boolean;
	onOpenChange: (next: boolean) => void;
	title: string;
	children: ReactNode;
}) {
	return (
		<>
			<div
				data-panel
				data-open={open || undefined}
				aria-hidden={!open}
				inert={open ? undefined : true}
				className={`absolute end-6 bottom-[4.75rem] z-20 flex max-h-[min(34rem,calc(100%-7rem))] w-[23.5rem] max-w-[calc(100%-3rem)] flex-col rounded-[0.8rem] border border-line-strong bg-paper/95 shadow-[0_1.5rem_3rem_-1rem_rgb(0_0_0/0.55)] backdrop-blur-md transition-[opacity,transform] duration-200 ease-out ${open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"}`}
			>
				<div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
					<h2 className={LABEL}>{title}</h2>
					<button
						type="button"
						onClick={() => onOpenChange(false)}
						title="Hide the controls"
						aria-label="Hide the controls"
						className="flex size-6 items-center justify-center rounded-[0.3rem] text-ink-muted hover:text-ink focus-visible:ring-2 focus-visible:ring-link focus-visible:outline-none"
					>
						<ChevronDownIcon size={14} strokeWidth={1.75} />
					</button>
				</div>
				<div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
					{children}
				</div>
			</div>

			<button
				type="button"
				data-panel-toggle
				aria-expanded={open}
				onClick={() => onOpenChange(!open)}
				title={open ? "Hide the controls" : "Show the controls"}
				aria-label={open ? "Hide the controls" : "Show the controls"}
				className="absolute end-6 bottom-6 z-20 flex size-11 items-center justify-center rounded-[0.7rem] border border-line-strong bg-paper/95 text-ink-soft shadow-[0_0.75rem_2rem_-0.75rem_rgb(0_0_0/0.6)] backdrop-blur-md hover:border-link hover:text-ink focus-visible:ring-2 focus-visible:ring-link focus-visible:outline-none aria-expanded:border-link aria-expanded:text-link"
			>
				<SlidersHorizontalIcon size={17} strokeWidth={1.5} />
			</button>
		</>
	);
}

/** A titled run of rows inside the panel, with a rule above it. */
export function Section({
	title,
	children,
}: {
	title: string;
	children: ReactNode;
}) {
	return (
		<section className="flex flex-col gap-1 border-t border-line pt-2 first:border-t-0 first:pt-0">
			<h3 className={`${LABEL} pb-0.5`}>{title}</h3>
			{children}
		</section>
	);
}
