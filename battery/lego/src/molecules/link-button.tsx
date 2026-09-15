import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "../utils";

const linkButtonVariants = cva(
	"inline-flex cursor-pointer items-baseline rounded-md text-start transition-colors hover:underline hover:underline-offset-[0.16em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-default disabled:opacity-50 disabled:hover:no-underline [&_svg]:me-[0.3em] [&_svg]:inline [&_svg]:size-[0.85em] [&_svg]:self-center",
	{
		variants: {
			/* A link is a known Unit; a shadow link points at a Unit that has
			   no Note yet and wears the dimmer step of the same hue. */
			tone: {
				link: "text-link",
				shadow: "text-link-shadow",
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
