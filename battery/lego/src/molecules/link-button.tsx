import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "../utils";

const linkButtonVariants = cva(
	"inline-flex cursor-pointer items-baseline rounded-md text-left transition-colors hover:underline hover:underline-offset-[0.16em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-default disabled:opacity-50 disabled:hover:no-underline [&_svg]:mr-[0.3em] [&_svg]:inline [&_svg]:size-[0.85em] [&_svg]:self-center",
	{
		variants: {
			tone: {
				link: "text-primary",
				pending: "text-primary opacity-70",
				quiet: "text-ink-soft",
			},
		},
		defaultVariants: { tone: "link" },
	},
);

/** A button that reads as a link inside running text or a list. */
export function LinkButton({
	className,
	tone,
	type = "button",
	...props
}: React.ComponentProps<"button"> & VariantProps<typeof linkButtonVariants>) {
	return (
		<button
			data-slot="link-button"
			type={type}
			className={cn(linkButtonVariants({ tone }), className)}
			{...props}
		/>
	);
}
