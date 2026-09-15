import type * as React from "react";

import { cn } from "../utils";

/** A quoted passage that can be followed back to its source. */
export function QuoteButton({
	className,
	type = "button",
	...props
}: React.ComponentProps<"button">) {
	return (
		<button
			data-slot="quote-button"
			type={type}
			className={cn(
				"block w-full cursor-pointer border-s-[3px] border-line py-1 ps-[clamp(1rem,2.5cqi,2.5rem)] text-start leading-[1.55] font-[430] tracking-[-0.012em] transition-colors duration-150 hover:border-primary focus-visible:border-primary focus-visible:outline-none motion-reduce:transition-none compact:ps-3",
				className,
			)}
			{...props}
		/>
	);
}
