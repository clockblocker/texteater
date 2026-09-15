import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "../utils";

/**
 * Two independent axes describe a word in running text.
 *
 * `tone` is what the dictionary knows about it. It sets the colour and the
 * shape its underline would take: a hairline for a Unit or an unknown word,
 * a dashed rule while resolving. Idle words carry no rule at all; colour
 * alone marks them. A resolving word is not a colour but a motion: the
 * skeleton's band of light sweeping it from ink to blue. Its background is
 * clipped to the glyphs, so the occurrence wash moves to the `before`
 * pseudo-element behind it. A word whose resolution failed for good is dead
 * text: unknown ink, no rule, no pointer, whatever the interaction says.
 *
 * `interaction` is what the reader is doing with it. Previewed (hover or
 * focus) draws the tone's rule; selected firms it up to a solid weight.
 * `hover` lets CSS `:hover` and `:focus-visible` draw the previewed rule
 * where no React state tracks it, such as the members of a Quote.
 *
 * `highlighted` is orthogonal: a wash behind every member of the focused
 * occurrence.
 */
const readerSegmentVariants = cva(
	"relative cursor-pointer appearance-none border-0 bg-transparent p-0 font-[inherit] tracking-[inherit] text-[inherit] leading-[inherit] underline-offset-[0.18em] transition-colors duration-150 before:absolute before:inset-x-0 before:-inset-y-[0.2em] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-link disabled:cursor-wait motion-reduce:transition-none data-[highlighted=true]:bg-highlight/25",
	{
		variants: {
			tone: {
				plain: "decoration-current/40 decoration-[0.06em]",
				unknown:
					"text-word-unknown decoration-current/40 decoration-[0.06em]",
				resolving:
					"word-sheen isolate bg-ink bg-clip-text text-transparent decoration-dashed decoration-[0.09em] before:-z-10 data-[highlighted=true]:bg-ink data-[highlighted=true]:before:inset-y-0 data-[highlighted=true]:before:bg-highlight/25 motion-reduce:animate-none motion-reduce:bg-none motion-reduce:text-word-resolving",
				known: "text-word-known decoration-current/40 decoration-[0.06em]",
				shadow: "text-word-shadow decoration-current/40 decoration-[0.06em]",
				failed: "text-word-unknown cursor-default disabled:cursor-default",
			},
			interaction: {
				idle: "",
				previewed: "underline",
				selected: "underline decoration-current decoration-[0.11em]",
				hover: "hover:underline focus-visible:underline",
			},
		},
		compoundVariants: [
			{
				tone: "failed",
				className:
					"no-underline hover:no-underline focus-visible:no-underline",
			},
		],
		defaultVariants: { tone: "plain", interaction: "idle" },
	},
);

export type ReaderSegmentTone = NonNullable<
	VariantProps<typeof readerSegmentVariants>["tone"]
>;
export type ReaderSegmentInteraction = NonNullable<
	VariantProps<typeof readerSegmentVariants>["interaction"]
>;

/**
 * One selectable word inside continuous reading text. It inherits the
 * passage typography and only adds a colour for its knowledge state, an
 * underline for its interaction state, and a highlight for members of the
 * focused occurrence.
 */
export function ReaderSegment({
	className,
	tone,
	interaction,
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
				readerSegmentVariants({ tone, interaction }),
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
