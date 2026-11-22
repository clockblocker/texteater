import type * as React from "react";

import { cn } from "../utils";
import { type LinkTone, linkToneClasses } from "./link-tone";

/* Consistent typography and rounded 2.5px tinted pseudo-rail across Card and
   Sheet; inline-start indent interpolates smoothly from 0.875rem (Card) to
   1.75rem (Sheet, aligned with a Mark's word) via `--note-quote-indent` in
   `styles.css`. */
const passage =
	"max-w-[38rem] py-0.5 text-start leading-[1.55] font-[430] text-ink-soft text-pretty";

/**
 * A quoted passage from a source Text. The passage itself is ordinary,
 * selectable text; the words that form the occurrence are rendered inside
 * it as `ReaderSegment` links, and the quote rail lights up while one of them
 * is hovered (on fine-pointer devices) or focused, echoing the reader.
 *
 * With `onFollow`, the quote as a whole leads where its members lead: the
 * rail and the empty space around the passage hover and click like a member
 * (the rail lights, the members underline), so the reader need not aim for a
 * word. The passage stays on top of that surface and keeps its selection,
 * which is why its plain runs must be elements, not bare text nodes.
 */
export function Quote({
	className,
	children,
	tone = "default",
	onFollow,
	followLabel = "Open in the source Text",
	...props
}: React.ComponentProps<"blockquote"> & {
	readonly tone?: LinkTone;
	readonly onFollow?: () => void;
	readonly followLabel?: string;
}) {
	if (!onFollow) {
		return (
			<blockquote
				data-slot="quote"
				data-quote-static=""
				className={cn(linkToneClasses[tone], "m-0", passage, className)}
				{...props}
			>
				{children}
			</blockquote>
		);
	}
	return (
		<blockquote
			data-slot="quote"
			className={cn(linkToneClasses[tone], "relative m-0", className)}
			{...props}
		>
			{/* Pointer-only: the members already give keyboard and assistive
			    users the same destination, so this adds no tab stop. */}
			<button
				data-slot="quote-surface"
				type="button"
				tabIndex={-1}
				aria-hidden
				title={followLabel}
				className="absolute inset-0 cursor-pointer appearance-none rounded-r-md border-0 bg-transparent p-0 transition-colors duration-150 motion-reduce:transition-none"
				onClick={(event) => {
					if (event.detail > 0) event.currentTarget.blur();
					onFollow();
				}}
			/>
			<p
				data-slot="quote-passage"
				className={cn(
					passage,
					"pointer-events-none relative m-0 [&>*]:pointer-events-auto",
				)}
			>
				{children}
			</p>
		</blockquote>
	);
}
