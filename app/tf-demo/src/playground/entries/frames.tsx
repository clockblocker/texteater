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

/** Mirrors `.workspace__card` from the panels battery, tail included. */
export function CardFrame({
	tail,
	children,
}: {
	tail: string;
	children: ReactNode;
}) {
	return (
		<article
			data-presentation-form="Card"
			className="relative h-[34rem] w-[25.775rem] max-w-full overflow-hidden rounded-[0.7rem] border border-line-strong bg-paper pt-6 pb-[calc(28px+0.7rem)] shadow-[0_1rem_2rem_#0005]"
		>
			<div className="h-full overflow-auto">{children}</div>
			<div className="absolute inset-x-0 bottom-0 flex h-[calc(28px+0.7rem)] items-start justify-center border-t border-line bg-paper pt-[0.7rem] text-[0.7rem] text-ink-soft">
				{tail}
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
