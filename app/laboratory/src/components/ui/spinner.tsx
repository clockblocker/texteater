import { Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";

type SpinnerProps = Parameters<typeof Loader2Icon>[0];

function Spinner({ className, ...props }: SpinnerProps) {
	return (
		<Loader2Icon
			data-slot="spinner"
			role="status"
			aria-label="Loading"
			className={cn("size-4 animate-spin", className)}
			{...props}
		/>
	);
}

export { Spinner };
