import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { CheckIcon, MinusIcon } from "lucide-react";

import { cn } from "../utils";

/**
 * One checkbox for every form. It renders `role="checkbox"`, so a horizontal
 * `Field` aligns it with the first line of its label the same way everywhere.
 */
function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
	return (
		<CheckboxPrimitive.Root
			data-slot="checkbox"
			className={cn(
				"peer relative flex size-4 shrink-0 items-center justify-center rounded-[min(var(--radius-sm),6px)] border border-input bg-background transition-[background-color,border-color,box-shadow,scale] duration-150 ease-out outline-none after:absolute after:-inset-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-disabled:scale-[0.92] aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground data-indeterminate:border-primary data-indeterminate:bg-primary data-indeterminate:text-primary-foreground data-disabled:cursor-not-allowed data-disabled:opacity-50 dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
				className,
			)}
			{...props}
		>
			<CheckboxPrimitive.Indicator
				data-slot="checkbox-indicator"
				className="grid place-items-center text-current [&_svg]:size-3 [&_svg]:stroke-[2.5]"
			>
				<CheckIcon
					className="hidden in-data-checked:block"
					aria-hidden="true"
				/>
				<MinusIcon
					className="hidden in-data-indeterminate:block"
					aria-hidden="true"
				/>
			</CheckboxPrimitive.Indicator>
		</CheckboxPrimitive.Root>
	);
}

export { Checkbox };
