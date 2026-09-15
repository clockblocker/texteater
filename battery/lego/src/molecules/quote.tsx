import type * as React from "react";

import { cn } from "../utils";

/**
 * A quoted passage from a source Text. The passage itself is ordinary,
 * selectable text; the words that form the occurrence are rendered inside
 * it as `ReaderSegment` links, and the quote bar lights up while one of them
 * is hovered or focused, echoing the reader.
 */
export function Quote({ className, ...props }: React.ComponentProps<"p">) {
	return (
		<p
			data-slot="quote"
			className={cn(
				"border-s-[3px] border-line py-1 ps-[clamp(1rem,2.5cqi,2.5rem)] text-start leading-[1.55] font-[430] tracking-[-0.012em] transition-colors duration-150 has-[[data-slot=reader-segment]:hover]:border-primary has-[[data-slot=reader-segment]:focus-visible]:border-primary motion-reduce:transition-none compact:ps-3",
				className,
			)}
			{...props}
		/>
	);
}
