import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "../utils";
import { linkToneClasses } from "./link-tone";

const linkButtonVariants = cva(
	"relative inline-flex cursor-pointer touch-manipulation items-baseline rounded-md text-start outline-2 outline-transparent transition-[color,opacity,text-decoration-color] duration-150 before:absolute before:inset-x-0 before:-inset-y-[0.25em] before:content-[''] active:opacity-75 focus-visible:outline-2 focus-visible:outline-transparent focus-visible:ring-2 focus-visible:ring-current/50 disabled:cursor-default disabled:opacity-50 disabled:active:opacity-50 motion-reduce:transition-none [&_svg]:me-[0.3em] [&_svg]:inline [&_svg]:size-[0.85em] [&_svg]:self-center",
	{
		variants: {
			/* Subject-only gender hue policy: outbound links default to `link`
			   (`--word-known`, isolated from any ancestor gender `--link`
			   override). Shadow links point at a Unit that has no Note yet. */
			tone: {
				link: "[--link:var(--word-known)] text-link",
				feminine: `text-link ${linkToneClasses.feminine}`,
				masculine: `text-link ${linkToneClasses.masculine}`,
				neuter: `text-link ${linkToneClasses.neuter}`,
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
