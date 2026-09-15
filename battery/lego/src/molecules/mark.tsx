import type * as React from "react";

import { cn } from "../utils";

/** A fixed-width monospaced glyph that labels the item after it. */
export function Mark({ className, ...props }: React.ComponentProps<"span">) {
	return (
		<span
			data-slot="mark"
			className={cn(
				"me-3 inline-block min-w-4 text-center font-mono text-ink-soft",
				className,
			)}
			{...props}
		/>
	);
}
