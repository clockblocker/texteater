import { CARD_WIDTH_REM } from "compass";
import type { ReactNode } from "react";

export function Stage({
	label,
	className = "",
	children,
}: {
	label: string;
	className?: string;
	children: ReactNode;
}) {
	return (
		<section aria-label={label} className={`grid gap-2 ${className}`}>
			<h2 className="font-mono text-[0.62rem] font-bold tracking-[0.12em] text-ink-muted uppercase">
				{label}
			</h2>
			{children}
		</section>
	);
}

/**
 * A Card-sized paper surface: the width and edge a Compass Card rests at.
 * Its Heading is the Note's own, and its content fades out at the clip.
 */
export function CardFrame({ children }: { children: ReactNode }) {
	return (
		<article
			data-presentation-form="Card"
			className="relative flex h-[34rem] max-w-full flex-col overflow-hidden rounded-[0.9rem] border border-line-strong bg-paper shadow-[0_1rem_2rem_#0005]"
			style={{ width: `${CARD_WIDTH_REM.toString()}rem` }}
		>
			<div className="min-h-0 flex-1 overflow-auto">
				{children}
				<div
					aria-hidden="true"
					className="pointer-events-none sticky bottom-0 -mt-8 h-8 bg-gradient-to-t from-paper to-transparent"
				/>
			</div>
		</article>
	);
}

/** A Pane-sized paper surface, the way a Sheet sits in the workspace. */
export function SheetFrame({ children }: { children: ReactNode }) {
	return (
		<div
			data-presentation-form="Sheet"
			className="min-h-[34rem] overflow-auto rounded-[0.7rem] border border-line bg-paper"
		>
			{children}
		</div>
	);
}
