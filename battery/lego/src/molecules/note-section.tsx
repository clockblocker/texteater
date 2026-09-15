import type * as React from "react";

import { cn } from "../utils";

/**
 * A titled block of a Note. Comfortable density shows the label between
 * dashed rules; compact density drops the label and keeps a rule on top.
 */
export function NoteSection({
	label,
	className,
	children,
	...props
}: React.ComponentProps<"section"> & { readonly label?: React.ReactNode }) {
	return (
		<section
			data-slot="note-section"
			className={cn(
				"min-w-0 pt-5 compact:pt-3 compact:before:mb-2 compact:before:block compact:before:border-t compact:before:border-dashed compact:before:border-line compact:before:content-['']",
				className,
			)}
			{...props}
		>
			{label ? <NoteSectionLabel>{label}</NoteSectionLabel> : null}
			{children}
		</section>
	);
}

/** Small monospaced caps set into a dashed rule. */
export function NoteSectionLabel({
	className,
	...props
}: React.ComponentProps<"h2">) {
	return (
		<h2
			data-slot="note-section-label"
			className={cn(
				"mb-3 flex items-center font-mono text-[0.62rem] font-bold tracking-[0.12em] text-ink-muted uppercase before:me-1.5 before:flex-1 before:border-t before:border-dashed before:border-line before:content-[''] after:ms-1.5 after:w-1.5 after:border-t after:border-dashed after:border-line after:content-[''] compact:hidden",
				className,
			)}
			{...props}
		/>
	);
}
