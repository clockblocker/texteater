import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "../utils";
import { linkToneClasses } from "./link-tone";

export const noteTitleVariants = cva(
	"text-link m-0 text-base leading-[1.4] font-[570] tracking-[-0.025em] text-balance [overflow-wrap:anywhere]",
	{
		variants: {
			tone: linkToneClasses,
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

/**
 * A headword that leads somewhere. It is a known Unit and wears the same
 * rule family as one in the reader: nothing idle, a hairline while hovered
 * or focused, in whatever hue the title around it chose.
 */
export function NoteTitleLink({
	className,
	type = "button",
	...props
}: React.ComponentProps<"button">) {
	return (
		<button
			data-slot="note-title-link"
			type={type}
			className={cn(
				"cursor-pointer appearance-none rounded-sm border-0 bg-transparent p-0 text-start font-[inherit] tracking-[inherit] text-[inherit] leading-[inherit] text-balance decoration-current/40 decoration-[0.06em] underline-offset-[0.18em] hover:underline focus-visible:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-link/50",
				className,
			)}
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
