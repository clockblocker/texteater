import type { RegisteredRegion, SplitRegionProps } from "./types";

export function hasRegionOnResize(
	onResize: SplitRegionProps["onResize"] | null,
): boolean {
	return onResize != null;
}

export function createRegisteredRegion({
	element,
	hasOnResize,
	id,
	idIsStable,
	onResizeStable,
	regionConstraints,
}: {
	element: HTMLDivElement;
	hasOnResize: boolean;
	id: string;
	idIsStable: boolean;
	onResizeStable: NonNullable<SplitRegionProps["onResize"]>;
	regionConstraints: RegisteredRegion["regionConstraints"];
}): RegisteredRegion {
	return {
		element,
		id,
		idIsStable,
		mutableValues: {
			prevSize: undefined,
		},
		onResize: hasOnResize ? onResizeStable : undefined,
		regionConstraints,
	};
}
