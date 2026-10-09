import type { CSSProperties, HTMLAttributes, Ref } from "react";

export type RegionSize = {
	asPercentage: number;
	inPixels: number;
};

type SplitResizeBehavior = "preserve-relative-size" | "preserve-pixel-size";

/**
 * Numeric Region constraints are represented as numeric percentages (0..100)
 * Values specified using other CSS units must be pre-converted.
 */
export type RegionConstraints = {
	collapsedSize: number;
	collapsible: boolean;
	defaultSize: number | undefined;
	disabled: boolean | undefined;
	splitResizeBehavior?: SplitResizeBehavior | undefined;
	maxSize: number;
	minSize: number;
	regionId: string;
};

export type SizeUnit = "px" | "%" | "em" | "rem" | "vh" | "vw";

export type RegisteredRegion = {
	id: string;
	idIsStable: boolean;
	element: HTMLDivElement;
	mutableValues: {
		expandToSize: number | undefined;
		prevSize: RegionSize | undefined;
	};
	onResize: OnRegionResize | undefined;
	regionConstraints: RegionConstraintProps;
};

/**
 * Reads and resizes a Region from outside React.
 */
export interface RegionImperativeHandle {
	/**
	 * Collapse the Region to it's `collapsedSize`.
	 *
	 * ⚠️ This method will do nothing if the Region is not `collapsible` or if it is already collapsed.
	 */
	collapse: () => void;

	/**
	 * Expand a collapsed Region to its most recent size.
	 *
	 * ⚠️ This method will do nothing if the Region is not currently collapsed.
	 */
	expand: () => void;

	/**
	 * Get the current size of the Region in pixels as well as a percentage of the parent split (0..100).
	 *
	 * @return Region size (in pixels and as a percentage of the parent split)
	 */
	getSize: () => {
		asPercentage: number;
		inPixels: number;
	};

	/**
	 * The Region is currently collapsed.
	 */
	isCollapsed: () => boolean;

	/**
	 * Update the Region's size.
	 *
	 * Size can be in the following formats:
	 * - Percentage of the parent Split (0..100)
	 * - Pixels
	 * - Relative font units (em, rem)
	 * - Viewport relative units (vh, vw)
	 *
	 * ℹ️ Numeric values are assumed to be pixels.
	 * Strings without explicit units are assumed to be percentages (0%..100%).
	 * Percentages may also be specified as strings ending with "%" (e.g. "33%")
	 * Pixels may also be specified as strings ending with the unit "px".
	 * Other units should be specified as strings ending with their CSS property units (e.g. 1rem, 50vh)
	 *
	 * @param size New region size
	 * @return Applied size (after validation)
	 */
	resize: (size: number | string) => void;
}

type BaseRegionAttributes = Omit<HTMLAttributes<HTMLDivElement>, "onResize">;

export type SplitRegionProps = BaseRegionAttributes & {
	/**
	 * CSS class name.
	 *
	 * ⚠️ Class is applied to nested `HTMLDivElement` to avoid styles that interfere with Flex layout.
	 */
	className?: string | undefined;

	/**
	 * Region size when collapsed; defaults to 0%.
	 */
	collapsedSize?: number | string | undefined;

	/**
	 * This region can be collapsed.
	 *
	 * ℹ️ A collapsible region will collapse when it's size is less than of the specified `minSize`
	 */
	collapsible?: boolean | undefined;

	/**
	 * Default size of Region within its parent split; default is auto-assigned based on the total number of Regions.
	 *
	 * ℹ️ Interpretation rules:
	 * - Numbers are interpreted as pixels (e.g. `defaultSize={200}` is 200 pixels)
	 * - Strings without explicit units are interpreted as percentage (e.g. `defaultSize="50"` is 50 percent)
	 * - Use explicit units (e.g. "px", "%", "em", "rem", "vh", or "vw") to change interpretation
	 *
	 * ⚠️ Percentage based sizes may cause slight layout shift when server-rendering.
	 * For more information see the documentation.
	 */
	defaultSize?: number | string | undefined;

	/**
	 * When disabled, a region cannot be resized either directly or indirectly (by resizing another region).
	 */
	disabled?: boolean | undefined;

	/**
	 * Ref attached to the root `HTMLDivElement`.
	 */
	elementRef?: Ref<HTMLDivElement | null> | undefined;

	/**
	 * How should this Region behave if the parent Split is resized?
	 * Defaults to `preserve-relative-size`.
	 *
	 * - `preserve-relative-size`: Retain the current relative size (as a percentage of the Split)
	 * - `preserve-pixel-size`: Retain its current size (in pixels)
	 *
	 * ℹ️ Region min/max size constraints may impact this behavior.
	 *
	 * ⚠️ A Split must contain at least one Region with `preserve-relative-size` resize behavior.
	 */
	splitResizeBehavior?:
		| "preserve-relative-size"
		| "preserve-pixel-size"
		| undefined;

	/**
	 * Uniquely identifies this region within the parent split.
	 * Falls back to `useId` when not provided.
	 *
	 * ℹ️ This prop is used to associate persisted split layouts with the original region.
	 *
	 * ℹ️ This value will also be assigned to the `data-split-region` attribute.
	 */
	id?: string | number | undefined;

	/**
	 * Maximum size of Region within its parent split; defaults to `"100%"`.
	 *
	 * ℹ️ Interpretation rules:
	 * - Numbers are interpreted as pixels (e.g. `maxSize={200}` is 200 pixels)
	 * - Strings without explicit units are interpreted as percentage (e.g. `maxSize="50"` is 50 percent)
	 * - Use explicit units (e.g. "px", "%", "em", "rem", "vh", or "vw") to change interpretation
	 */
	maxSize?: number | string | undefined;

	/**
	 * Minimum size of Region within its parent split; defaults to 0%.
	 *
	 * ℹ️ Interpretation rules:
	 * - Numbers are interpreted as pixels (e.g. `minSize={200}` is 200 pixels)
	 * - Strings without explicit units are interpreted as percentage (e.g. `minSize="50"` is 50 percent)
	 * - Use explicit units (e.g. "px", "%", "em", "rem", "vh", or "vw") to change interpretation
	 */
	minSize?: number | string | undefined;

	/**
	 * Called when region sizes change. Not called while the parent Split has
	 * no size (e.g. inside a hidden subtree), since no percentage can be given.
	 *
	 * @param regionSize Region size (both as a percentage of the parent Split and in pixels)
	 * @param id Region id (if one was provided as a prop)
	 * @param prevRegionSize Previous region size (will be undefined on mount)
	 */
	onResize?:
		| ((
				regionSize: RegionSize,
				id: string | number | undefined,
				prevRegionSize: RegionSize | undefined,
		  ) => void)
		| undefined;

	/**
	 * CSS properties.
	 *
	 * ⚠️ Style is applied to nested `HTMLDivElement` to avoid styles that interfere with Flex layout.
	 */
	style?: CSSProperties | undefined;
};

type OnRegionResize = SplitRegionProps["onResize"];

/**
 * Size constraints may be specified in a variety of ways:
 * - Percentage of the parent Split (0..100)
 * - Pixels
 * - Relative font units (em, rem)
 * - Viewport relative units (vh, vw)
 *
 * Numeric values are assumed to be pixels.
 * Strings without explicit units are assumed to be percentages (0%..100%).
 *
 * Percentages may also be specified as strings ending with "%" (e.g. "33%")
 * Pixels may also be specified as strings ending with the unit "px".
 *
 * Other units should be specified as strings ending with their CSS property units (e.g. 1rem, 50vh)
 */
type RegionConstraintProps = Pick<
	SplitRegionProps,
	| "collapsedSize"
	| "collapsible"
	| "defaultSize"
	| "disabled"
	| "splitResizeBehavior"
	| "maxSize"
	| "minSize"
>;
