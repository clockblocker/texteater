"use client";

import {
	type CSSProperties,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useSyncExternalStore,
} from "react";
import { subscribeToMountedSplit } from "../../global/mutable-state/splits";
import { useId } from "../../hooks/useId";
import { useIsomorphicLayoutEffect } from "../../hooks/useIsomorphicLayoutEffect";
import { useMergedRefs } from "../../hooks/useMergedRefs";
import { useStableCallback } from "../../hooks/useStableCallback";
import { useStableObject } from "../../hooks/useStableObject";
import { useSplitContext } from "../split/useSplitContext";
import {
	createRegisteredRegion,
	hasRegionOnResize,
} from "./createRegisteredRegion";
import type { RegionSize, SplitRegionProps } from "./types";

/**
 * A SplitRegion holds one part of a Split's space. It can be configured with
 * min/max size constraints and collapsible behavior.
 *
 * Size props can be in the following formats:
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
 * Its element always carries `data-split-region` and the `id`, and must be a
 * direct DOM child of its Split's element.
 */
export function SplitRegion({
	children,
	className,
	collapsedSize = "0%",
	collapsible = false,
	defaultSize,
	disabled,
	elementRef: elementRefProp,
	splitResizeBehavior = "preserve-relative-size",
	id: idProp,
	maxSize = "100%",
	minSize = "0%",
	onResize: onResizeUnstable,
	style,
	...rest
}: SplitRegionProps) {
	const idIsStable = !!idProp;

	const id = useId(idProp);

	const stableProps = useStableObject({
		disabled,
	});

	const elementRef = useRef<HTMLDivElement | null>(null);

	const mergedRef = useMergedRefs(elementRef, elementRefProp);

	const {
		getRegionStyleSnapshot,
		id: splitId,
		orientation,
		registerRegion,
		updateRegionProps,
	} = useSplitContext();

	const hasOnResize = hasRegionOnResize(onResizeUnstable);
	const onResizeStable = useStableCallback(
		(
			regionSize: RegionSize,
			_: string | number | undefined,
			prevRegionSize: RegionSize | undefined,
		) => {
			onResizeUnstable?.(regionSize, idProp, prevRegionSize);
		},
	);

	// Register Region with parent Split
	useIsomorphicLayoutEffect(() => {
		const element = elementRef.current;
		if (element !== null) {
			const registeredRegion = createRegisteredRegion({
				element,
				hasOnResize,
				id,
				idIsStable,
				onResizeStable,
				regionConstraints: {
					splitResizeBehavior,
					collapsedSize,
					collapsible,
					defaultSize,
					disabled: stableProps.disabled,
					maxSize,
					minSize,
				},
			});

			return registerRegion(registeredRegion);
		}
	}, [
		splitResizeBehavior,
		collapsedSize,
		collapsible,
		defaultSize,
		hasOnResize,
		id,
		idIsStable,
		maxSize,
		minSize,
		onResizeStable,
		registerRegion,
		stableProps,
	]);

	// Not all props require re-registering the region;
	useEffect(() => {
		updateRegionProps(id, { disabled });
	}, [disabled, id, updateRegionProps]);

	const subscribe = useCallback(
		(onStoreChange: () => void) =>
			subscribeToMountedSplit(splitId, onStoreChange),
		[splitId],
	);

	const read = () => getRegionStyleSnapshot(splitId, id);

	const regionStyleSnapshot = useSyncExternalStore(subscribe, read, read);

	const regionStyles = useMemo<CSSProperties>(() => {
		if (regionStyleSnapshot !== undefined) {
			const separatorIndex = regionStyleSnapshot.indexOf("|");
			const flexGrow = Number(
				regionStyleSnapshot.slice(0, separatorIndex),
			);
			const dragActive =
				regionStyleSnapshot.charCodeAt(separatorIndex + 1) === 49;
			return {
				flexGrow,
				pointerEvents: dragActive ? "none" : undefined,
			};
		}
		if (defaultSize !== undefined) {
			return {
				flexGrow: undefined,
				flexShrink: undefined,
				flexBasis: defaultSize,
			};
		}
		return { flexGrow: 1 };
	}, [defaultSize, regionStyleSnapshot]);

	return (
		<div
			{...rest}
			data-disabled={disabled || undefined}
			data-split-region
			data-testid={id}
			id={id}
			ref={mergedRef}
			style={{
				...PROHIBITED_CSS_PROPERTIES,

				display: "flex",
				flexBasis: 0,
				flexShrink: 1,
				overflow: "visible",

				...regionStyles,
			}}
		>
			<div
				className={className}
				style={{
					maxHeight: "100%",
					maxWidth: "100%",
					flexGrow: 1,
					overflow: "auto",

					...style,

					// Inform the browser that the library is handling touch events for this element
					// but still allow users to scroll content within regions in the non-resizing direction
					// NOTE This is not an inherited style
					// See github.com/bvaughn/react-resizable-panels/issues/662
					touchAction:
						orientation === "horizontal" ? "pan-y" : "pan-x",
				}}
			>
				{children}
			</div>
		</div>
	);
}

// See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/displayName
SplitRegion.displayName = "SplitRegion";

const PROHIBITED_CSS_PROPERTIES: CSSProperties = {
	minHeight: 0,
	maxHeight: "100%",
	height: "auto",

	minWidth: 0,
	maxWidth: "100%",
	width: "auto",

	border: "none",
	borderWidth: 0,
	padding: 0,
	margin: 0,
};
