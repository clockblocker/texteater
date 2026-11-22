import type * as React from "react";

import { NoteSurface } from "./note-surface";

export type Density = "comfortable" | "compact";

/**
 * Compatibility wrapper over `NoteSurface` for consumers that declare density
 * as `"compact"` | `"comfortable"`. New code should prefer `NoteSurface` or
 * `NoteFrame` directly.
 */
export function DensityScope({
	density,
	...props
}: React.ComponentProps<"div"> & { readonly density: Density }) {
	return (
		<NoteSurface
			mode={density === "compact" ? "card" : "sheet"}
			{...props}
		/>
	);
}
