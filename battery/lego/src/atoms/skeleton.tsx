import { cn } from "../utils";

/**
 * A block that has not arrived yet. It shares the Note bones' single band of
 * light, so every loading surface in an application sweeps together.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="skeleton"
			className={cn(
				"rounded-md bg-muted bone-sheen motion-reduce:animate-none",
				className,
			)}
			{...props}
		/>
	);
}

export { Skeleton };
