import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "../utils";
import { linkToneClasses } from "./link-tone";

/**
 * Two independent axes describe a word in running text.
 *
 * `tone` is what the dictionary knows about it. It sets the colour and the
 * shape its underline would take: a hairline for a Unit or an unknown word,
 * a dashed rule while resolving. Idle words carry no rule at all; colour
 * alone marks them. A resolving word is not a colour but a motion: the
 * skeleton's band of light sweeping it from ink to blue. A word whose
 * resolution failed for good is dead
 * text: unknown ink, no rule, no pointer, whatever the interaction says.
 *
 * `interaction` is what the reader is doing with it. Previewed (hover or
 * focus) draws the tone's rule; selected firms it up to a solid weight and
 * also marks every member of the occurrence a focused Note points at.
 * `hover` lets CSS `:hover` and `:focus-visible` draw the previewed rule
 * where no React state tracks it, such as the members of a Quote.
 *
 * A word never has a background of its own; the only wash in running text
 * is the browser's selection.
 */
const readerSegmentVariants = cva(
	"relative cursor-pointer appearance-none border-0 bg-transparent p-0 font-[inherit] tracking-[inherit] text-[inherit] leading-[inherit] underline-offset-[0.18em] transition-colors duration-150 before:absolute before:inset-x-0 before:-inset-y-[0.2em] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-link disabled:cursor-wait motion-reduce:transition-none",
	{
		variants: {
			tone: {
				plain: "decoration-current/40 decoration-[0.06em]",
				unknown:
					"text-word-unknown decoration-current/40 decoration-[0.06em]",
				resolving:
					"word-sheen bg-ink bg-clip-text text-transparent decoration-dashed decoration-[0.09em] motion-reduce:animate-none motion-reduce:bg-none motion-reduce:text-word-resolving",
				known: "text-link decoration-current/40 decoration-[0.06em]",
				shadow: "text-word-shadow decoration-current/40 decoration-[0.06em]",
				failed: "text-word-unknown cursor-default disabled:cursor-default",
			},
			gender: {
				Fem: "",
				Masc: "",
				Neut: "",
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
				tone: "known",
				gender: "Fem",
				className: linkToneClasses.feminine,
			},
			{
				tone: "known",
				gender: "Masc",
				className: linkToneClasses.masculine,
			},
			{
				tone: "known",
				gender: "Neut",
				className: linkToneClasses.neuter,
			},
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
 * passage typography and only adds a colour for its knowledge state and an
 * underline for its interaction state.
 */
export function ReaderSegment({
	className,
	tone,
	interaction,
	gender,
	type = "button",
	...props
}: React.ComponentProps<"button"> &
	VariantProps<typeof readerSegmentVariants>) {
	return (
		<button
			data-slot="reader-segment"
			data-gender={tone === "known" ? gender : undefined}
			type={type}
			className={cn(
				readerSegmentVariants({ tone, interaction, gender }),
				className,
			)}
			{...props}
		/>
	);
}

/** Text between segments, kept addressable so a sentence can be scrolled to. */
export function ReaderPlainSegment({
	className,
	...props
}: React.ComponentProps<"span">) {
	return (
		<span
			data-slot="reader-plain-segment"
			className={cn(className)}
			{...props}
		/>
	);
}
