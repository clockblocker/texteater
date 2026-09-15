import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "../utils";

export const noteTitleVariants = cva(
	"m-0 text-base leading-[1.4] font-[570] tracking-[-0.025em] text-balance [overflow-wrap:anywhere]",
	{
		variants: {
			tone: {
				default: "text-primary",
				feminine: "text-gender-feminine",
				masculine: "text-gender-masculine",
				neuter: "text-gender-neuter",
			},
		},
		defaultVariants: { tone: "default" },
	},
);

export type NoteTitleTone = NonNullable<
	VariantProps<typeof noteTitleVariants>["tone"]
>;

/** The headword of a Note, coloured by its grammatical tone. */
export function NoteTitle({
	className,
	tone,
	...props
}: React.ComponentProps<"h1"> & VariantProps<typeof noteTitleVariants>) {
	return (
		<h1
			data-slot="note-title"
			className={cn(noteTitleVariants({ tone }), className)}
			{...props}
		/>
	);
}

/** Lays a title and its aside (for example a transcription) on one baseline. */
export function NoteTitleRow({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="note-title-row"
			className={cn(
				"flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2",
				className,
			)}
			{...props}
		/>
	);
}
