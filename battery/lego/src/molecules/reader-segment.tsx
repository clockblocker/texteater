import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "../utils";

const readerSegmentVariants = cva(
	"relative cursor-pointer appearance-none border-0 bg-transparent p-0 font-[inherit] tracking-[inherit] text-[inherit] leading-[inherit] transition-colors duration-150 before:absolute before:inset-x-0 before:-inset-y-[0.2em] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-segment-known disabled:cursor-wait motion-reduce:transition-none data-[highlighted=true]:bg-highlight/25",
	{
		variants: {
			/* Each tone carries a cue besides colour: known words keep a hairline,
			   unresolved ones a dotted rule, failed ones a wavy rule. Unknown words
			   only appear while previewed, where the solid underline marks them. */
			tone: {
				plain: "",
				unknown: "text-segment-unknown",
				known: "text-segment-known underline decoration-current/40 decoration-[0.06em] underline-offset-[0.18em]",
				unresolved:
					"text-segment-unresolved underline decoration-dotted decoration-current decoration-[0.09em] underline-offset-[0.18em]",
				failed: "text-segment-failed underline decoration-wavy decoration-current decoration-[0.07em] underline-offset-[0.18em]",
			},
			underlined: {
				true: "underline decoration-current decoration-[0.11em] underline-offset-[0.18em]",
				false: "",
			},
		},
		defaultVariants: { tone: "plain", underlined: false },
	},
);

export type ReaderSegmentTone = NonNullable<
	VariantProps<typeof readerSegmentVariants>["tone"]
>;

/**
 * One selectable word inside continuous reading text. It inherits the
 * passage typography and only adds colour, an optional underline, and a
 * highlight for members of the focused occurrence.
 */
export function ReaderSegment({
	className,
	tone,
	underlined,
	highlighted = false,
	type = "button",
	...props
}: React.ComponentProps<"button"> &
	VariantProps<typeof readerSegmentVariants> & {
		readonly highlighted?: boolean;
	}) {
	return (
		<button
			data-slot="reader-segment"
			data-highlighted={highlighted || undefined}
			type={type}
			className={cn(
				readerSegmentVariants({ tone, underlined }),
				className,
			)}
			{...props}
		/>
	);
}

/** Text between segments that still takes part in occurrence highlighting. */
export function ReaderPlainSegment({
	className,
	highlighted = false,
	...props
}: React.ComponentProps<"span"> & { readonly highlighted?: boolean }) {
	return (
		<span
			data-slot="reader-plain-segment"
			data-highlighted={highlighted || undefined}
			className={cn("data-[highlighted=true]:bg-highlight/25", className)}
			{...props}
		/>
	);
}
