import * as ResizablePrimitive from "compass/panels";

import { cn } from "../utils";

function ResizableSplit({
	className,
	...props
}: ResizablePrimitive.SplitProps) {
	return (
		<ResizablePrimitive.Split
			data-slot="resizable-split"
			className={cn(
				"flex h-full w-full aria-[orientation=vertical]:flex-col",
				className,
			)}
			{...props}
		/>
	);
}

function ResizableSplitRegion({
	...props
}: ResizablePrimitive.SplitRegionProps) {
	return (
		<ResizablePrimitive.SplitRegion
			data-slot="resizable-split-region"
			{...props}
		/>
	);
}

function ResizableSplitHandle({
	withHandle,
	className,
	...props
}: ResizablePrimitive.SplitHandleProps & {
	withHandle?: boolean;
}) {
	return (
		<ResizablePrimitive.SplitHandle
			data-slot="resizable-split-handle"
			className={cn(
				"relative flex w-px items-center justify-center bg-border ring-offset-background after:absolute after:inset-y-0 after:start-1/2 after:w-1 after:-translate-x-1/2 rtl:after:translate-x-1/2 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-hidden aria-[orientation=horizontal]:h-px aria-[orientation=horizontal]:w-full aria-[orientation=horizontal]:after:start-0 aria-[orientation=horizontal]:after:h-1 aria-[orientation=horizontal]:after:w-full aria-[orientation=horizontal]:after:translate-x-0 aria-[orientation=horizontal]:after:-translate-y-1/2 [&[aria-orientation=horizontal]>div]:rotate-90",
				className,
			)}
			{...props}
		>
			{withHandle && (
				<div className="z-10 flex h-6 w-1 shrink-0 rounded-lg bg-border" />
			)}
		</ResizablePrimitive.SplitHandle>
	);
}

export { ResizableSplit, ResizableSplitHandle, ResizableSplitRegion };
