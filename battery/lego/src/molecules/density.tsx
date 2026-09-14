import type * as React from "react";

import { cn } from "../utils";

export type Density = "comfortable" | "compact";

/**
 * Declares how much room the content below has. Molecules read it through
 * the `compact:` variant, so a Card and a Sheet can share one component tree.
 */
export function DensityScope({
	density,
	className,
	...props
}: React.ComponentProps<"div"> & { readonly density: Density }) {
	return (
		<div
			data-density={density}
			className={cn("min-w-0", className)}
			{...props}
		/>
	);
}
