import type * as React from "react";

import { cn } from "../utils";

/** A phonetic transcription set quietly beside a headword. */
export function Ipa({
	transcription,
	className,
	...props
}: Omit<React.ComponentProps<"span">, "children"> & {
	readonly transcription: string;
}) {
	return (
		<span
			data-slot="ipa"
			className={cn(
				"text-sm text-ink-muted italic [overflow-wrap:anywhere]",
				className,
			)}
			{...props}
		>
			/{transcription}/
		</span>
	);
}
