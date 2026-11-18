import type * as React from "react";

import { cn } from "../utils";

/**
 * A phonetic transcription set quietly beside a headword: upright, as IPA
 * is printed, and never broken mid-transcription. Compact density keeps
 * its slanted, breakable form.
 */
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
				"text-sm whitespace-nowrap text-ink-muted compact:whitespace-normal compact:italic compact:[overflow-wrap:anywhere]",
				className,
			)}
			{...props}
		>
			/{transcription}/
		</span>
	);
}
