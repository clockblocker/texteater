import type { CSSProperties, HTMLAttributes, ReactNode, Ref } from "react";
import type { RegisteredHandle } from "../handle/types";
import type { RegisteredRegion } from "../region/types";

/**
 * The axis a Split lays its SplitRegions out along and resizes them in:
 * `horizontal` is the inline axis, `vertical` the block axis. A SplitHandle's
 * `aria-orientation` is the other one.
 */
export type Orientation = "horizontal" | "vertical";

/**
 * Map of Region id to flexGrow value;
 */
export type Layout = {
	[id: string]: number;
};

/**
 * Metadata describing a completed layout change, passed as the second argument
 * to the `onLayoutChanged` callback. See #716.
 */
type LayoutChangedMeta = {
	/**
	 * `true` when the change was caused by the user directly manipulating a
	 * handle — releasing a pointer drag or pressing a resize key (arrow keys,
	 * Home/End, Enter). `false` for every other source (programmatic `setLayout`
	 * and other imperative API calls, constraint recompute, default-size change,
	 * initial mount), because the library cannot attribute the caller's intent
	 * there.
	 */
	isUserInteraction: boolean;
};

export type ResizeTargetMinimumSize = {
	coarse: number;
	fine: number;
};

export type RegisteredSplit = Readonly<{
	disabled: boolean;
	element: HTMLElement;
	id: string;
	mutableState: {
		defaultLayout: Readonly<Layout> | undefined;
		disableCursor: boolean;
		expandedRegionSizes: {
			[regionId: string]: number;
		};
		layouts: {
			[regionIds: string]: Layout;
		};
	};
	orientation: Orientation;
	regions: RegisteredRegion[];
	resizeTargetMinimumSize: ResizeTargetMinimumSize;
	handles: RegisteredHandle[];
}>;

export type SplitContextType = {
	disableCursor: boolean;
	getRegionStyles: (
		splitId: string,
		regionId: string,
	) => CSSProperties | undefined;
	id: string;
	orientation: Orientation;
	registerRegion: (region: RegisteredRegion) => () => void;
	registerHandle: (handle: RegisteredHandle) => () => void;
	updateRegionProps: (
		id: string,
		props: { disabled: boolean | undefined },
	) => void;
	updateHandleProps: (
		id: string,
		props: {
			disabled: boolean | undefined;
			disableDoubleClick: boolean | undefined;
		},
	) => void;
};

/**
 * Reads and sets a Split's layout from outside React.
 */
export interface SplitImperativeHandle {
	/**
	 * Get the Split's current layout as a map of Region id to percentage (0..100)
	 *
	 * @return Map of Region id to percentages (specified as numbers ranging between 0..100)
	 */
	getLayout: () => { [regionId: string]: number };

	/**
	 * Set a new layout for the Split
	 *
	 * @param layout Map of Region id to percentage (a number between 0..100)
	 * @return Applied layout (after validation)
	 */
	setLayout: (layout: { [regionId: string]: number }) => Layout;
}

export type SplitProps = HTMLAttributes<HTMLDivElement> & {
	/**
	 * Region and Handle components that comprise this split.
	 */
	children?: ReactNode | undefined;

	/**
	 * CSS class name.
	 */
	className?: string | undefined;

	/**
	 * Default layout for the Split.
	 *
	 * ℹ️ This value allows layouts to be remembered between page reloads.
	 *
	 * ⚠️ Slight layout shift may occur when server-rendering regions with percentage-based default sizes.
	 * Refer to the documentation for suggestions on how to minimize the impact of this.
	 */
	defaultLayout?: Layout | undefined;

	/**
	 * This library sets custom mouse cursor styles to indicate drag state.
	 * Use this prop to disable that behavior for Regions and Handles in this split.
	 */
	disableCursor?: boolean | undefined;

	/**
	 * Disable resize functionality.
	 */
	disabled?: boolean | undefined;

	/**
	 * Ref attached to the root `HTMLDivElement`.
	 */
	elementRef?: Ref<HTMLDivElement | null> | undefined;

	/**
	 * Uniquely identifies this split within an application.
	 * Falls back to `useId` when not provided.
	 *
	 * ℹ️ This value will also be assigned to the `data-split` attribute.
	 */
	id?: string | number | undefined;

	/**
	 * Called when the Split's layout is changing.
	 *
	 * ⚠️ For layout changes caused by pointer events, this method is called each time the pointer is moved.
	 * For most cases, it is recommended to use the `onLayoutChanged` callback instead.
	 */
	onLayoutChange?: (layout: Layout) => void;

	/**
	 * Called after the Split's layout has  been changed.
	 *
	 * ℹ️ For layout changes caused by pointer events, this method is not called until the pointer has been released.
	 * This method is recommended when saving layouts to some storage api.
	 *
	 * ℹ️ The second argument contains meta information about the layout change.
	 * The `isUserInteraction` attribute signals whether the resize was caused by direct user input.
	 * It is true for resizes caused by pointer or keyboard input
	 * and false for other triggers (e.g. imperative API calls, initial mount, etc.)
	 */
	onLayoutChanged?: (layout: Layout, meta: LayoutChangedMeta) => void;

	/**
	 * Minimum size of the resizable hit target area (either `Handle` or `Region` edge)
	 * This threshold ensures are large enough to avoid mis-clicks.
	 *
	 * - Coarse inputs (typically a finger on a touchscreen) have reduced accuracy;
	 * to ensure accessibility and ease of use, hit targets should be larger to prevent mis-clicks.
	 * - Fine inputs (typically a mouse) can be smaller
	 *
	 * ℹ️ [Apple interface guidelines](https://developer.apple.com/design/human-interface-guidelines/accessibility) suggest `20pt` (`27px`) on desktops and `28pt` (`37px`) for touch devices
	 * In practice this seems to be much larger than many of their own applications use though.
	 */
	resizeTargetMinimumSize?: {
		coarse: number;
		fine: number;
	};

	/**
	 * Specifies the resizable orientation ("horizontal" or "vertical"); defaults to "horizontal"
	 */
	orientation?: "horizontal" | "vertical" | undefined;

	/**
	 * CSS properties.
	 *
	 * ⚠️ The following styles cannot be overridden: `display`, `flex-direction`, `flex-wrap`, and `overflow`.
	 */
	style?: CSSProperties | undefined;
};
