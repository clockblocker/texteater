import type * as React from "react";

import { cn } from "../utils";

/**
 * Grouped translation rows shared across Card and Sheet forms: one row per
 * language with an uppercase monospace key on the leading edge and
 * `·`-separated translations beside it.
 *
 * In Card form the shared CSS rules tighten the label column and keep each
 * row compact on a single line; as `--note-morph` rises toward Sheet, the
 * column aligns with `Quote` / `Mark` (`1.75rem`) and rows wrap freely.
 */
export function NoteTranslationList({
	className,
	...props
}: React.ComponentProps<"dl">) {
	return (
		<dl
			data-slot="note-translation-list"
			className={cn("grid items-baseline", className)}
			{...props}
		/>
	);
}

/** One language row inside `NoteTranslationList`. */
export function NoteTranslationRow({
	language,
	children,
}: {
	readonly language: string;
	readonly children: React.ReactNode;
}) {
	return (
		<div className="contents">
			<dt className="font-mono text-[0.6875rem] leading-[1.45] font-medium tracking-[0.06em] text-ink-muted uppercase">
				{language}
			</dt>
			<dd lang={language}>{children}</dd>
		</div>
	);
}
