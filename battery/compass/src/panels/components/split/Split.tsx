"use client";

import { type CSSProperties, useEffect, useMemo, useRef } from "react";
import { calculateRegionConstraints } from "../../global/dom/calculateRegionConstraints";
import { mountSplit } from "../../global/mountSplit";
import { getInteractionState } from "../../global/mutable-state/interactions";
import {
	getMountedSplitState,
	getRegisteredSplit,
	subscribeToMountedSplit,
	updateMountedSplit,
} from "../../global/mutable-state/splits";
import { layoutNumbersEqual } from "../../global/utils/layoutNumbersEqual";
import { layoutsEqual } from "../../global/utils/layoutsEqual";
import { useForceUpdate } from "../../hooks/useForceUpdate";
import { useId } from "../../hooks/useId";
import { useIsomorphicLayoutEffect } from "../../hooks/useIsomorphicLayoutEffect";
import { useMergedRefs } from "../../hooks/useMergedRefs";
import { useStableCallback } from "../../hooks/useStableCallback";
import { useStableObject } from "../../hooks/useStableObject";
import type { RegisteredHandle } from "../handle/types";
import type { RegisteredRegion } from "../region/types";
import { SplitContext } from "./SplitContext";
import { sortByElementOffset } from "./sortByElementOffset";
import type {
	Layout,
	RegisteredSplit,
	ResizeTargetMinimumSize,
	SplitProps,
} from "./types";

/**
 * A Split divides its space among SplitRegions, along its inline axis
 * (`horizontal`) or its block axis (`vertical`). SplitHandles between them
 * resize them.
 *
 * Its element always carries `data-split` and the `id`.
 */
export function Split({
	children,
	className,
	defaultLayout,
	disableCursor,
	disabled,
	elementRef: elementRefProp,
	id: idProp,
	onLayoutChange: onLayoutChangeUnstable,
	onLayoutChanged: onLayoutChangedUnstable,
	orientation = "horizontal",
	resizeTargetMinimumSize = {
		coarse: 20,
		fine: 10,
	},
	style,
	...rest
}: SplitProps) {
	const prevLayoutRef = useRef<{
		onLayoutChange: Layout;
		onLayoutChanged: Layout;
	}>({
		onLayoutChange: {},
		onLayoutChanged: {},
	});

	const onLayoutChangeStable = useStableCallback((layout: Layout) => {
		if (layoutsEqual(prevLayoutRef.current.onLayoutChange, layout)) {
			// Memoize callback
			return;
		}

		prevLayoutRef.current.onLayoutChange = layout;
		onLayoutChangeUnstable?.(layout);
	});

	const onLayoutChangedStable = useStableCallback(
		(layout: Layout, isUserInteraction: boolean) => {
			if (layoutsEqual(prevLayoutRef.current.onLayoutChanged, layout)) {
				// Memoize callback
				return;
			}

			prevLayoutRef.current.onLayoutChanged = layout;
			onLayoutChangedUnstable?.(layout, { isUserInteraction });
		},
	);

	const id = useId(idProp);

	const elementRef = useRef<HTMLDivElement | null>(null);

	const [regionOrHandleChangeSigil, forceUpdate] = useForceUpdate();

	const inMemoryValuesRef = useRef<{
		lastExpandedRegionSizes: { [regionIds: string]: number };
		layouts: { [regionIds: string]: Layout };
		regions: RegisteredRegion[];
		resizeTargetMinimumSize: ResizeTargetMinimumSize;
		handles: RegisteredHandle[];
	}>({
		lastExpandedRegionSizes: {},
		layouts: {},
		regions: [],
		resizeTargetMinimumSize,
		handles: [],
	});

	const mergedRef = useMergedRefs(elementRef, elementRefProp);

	// TRICKY Don't read for state; it will always lag behind by one tick
	const getRegionStyles = useStableCallback(
		(splitId: string, regionId: string) => {
			const interactionState = getInteractionState();
			const split = getRegisteredSplit(splitId);
			const splitState = getMountedSplitState(splitId);
			if (splitState) {
				let dragActive = false;
				switch (interactionState.state) {
					case "active": {
						dragActive = interactionState.hitAreas.some(
							(current) => current.split === split,
						);
						break;
					}
				}

				return {
					flexGrow: splitState.layout[regionId] ?? 1,
					pointerEvents: dragActive ? "none" : undefined,
				} satisfies CSSProperties;
			}

			// This is unexpected except for the initial mount (before the split has registered with the global store)
			if (defaultLayout?.[regionId]) {
				return {
					flexGrow: defaultLayout?.[regionId],
				} satisfies CSSProperties;
			}
		},
	);

	const stableProps = useStableObject({
		defaultLayout,
		disableCursor,
	});

	const context = useMemo(
		() => ({
			get disableCursor() {
				return !!stableProps.disableCursor;
			},
			getRegionStyles,
			id,
			orientation,
			registerRegion: (region: RegisteredRegion) => {
				const inMemoryValues = inMemoryValuesRef.current;
				inMemoryValues.regions = sortByElementOffset(orientation, [
					...inMemoryValues.regions,
					region,
				]);

				forceUpdate();

				return () => {
					inMemoryValues.regions = inMemoryValues.regions.filter(
						(current) => current !== region,
					);

					forceUpdate();
				};
			},
			registerHandle: (handle: RegisteredHandle) => {
				const inMemoryValues = inMemoryValuesRef.current;
				inMemoryValues.handles = sortByElementOffset(orientation, [
					...inMemoryValues.handles,
					handle,
				]);

				forceUpdate();

				return () => {
					inMemoryValues.handles = inMemoryValues.handles.filter(
						(current) => current !== handle,
					);

					forceUpdate();
				};
			},
			updateRegionProps: (
				regionId: string,
				{ disabled }: { disabled: boolean | undefined },
			) => {
				const inMemoryValues = inMemoryValuesRef.current;
				const region = inMemoryValues.regions.find(
					(current) => current.id === regionId,
				);
				if (region) {
					region.regionConstraints.disabled = disabled;
				}

				const split = getRegisteredSplit(id);
				const splitState = getMountedSplitState(id);
				if (split && splitState) {
					updateMountedSplit(split, {
						...splitState,
						derivedRegionConstraints:
							calculateRegionConstraints(split),
					});
				}
			},
			updateHandleProps: (
				handleId: string,
				{
					disabled,
					disableDoubleClick,
				}: {
					disabled: boolean | undefined;
					disableDoubleClick: boolean | undefined;
				},
			) => {
				const inMemoryValues = inMemoryValuesRef.current;
				const handle = inMemoryValues.handles.find(
					(current) => current.id === handleId,
				);
				if (handle) {
					handle.disabled = disabled;
					handle.disableDoubleClick = disableDoubleClick;
				}
			},
		}),
		[getRegionStyles, id, forceUpdate, orientation, stableProps],
	);

	const registeredSplitRef = useRef<RegisteredSplit | null>(null);

	// Register Split and child Regions/Handles with global state
	// Listen to global state for drag state related to this Split
	useIsomorphicLayoutEffect(() => {
		const element = elementRef.current;
		if (element === null) {
			return;
		}

		const inMemoryValues = inMemoryValuesRef.current;

		// Guard against unexpected layout attribute ordering by pre-sorting region ids/keys; see issues/656
		let preSortedDefaultLayout: Layout | undefined;
		if (stableProps.defaultLayout !== undefined) {
			if (
				Object.keys(stableProps.defaultLayout).length ===
				inMemoryValues.regions.length
			) {
				preSortedDefaultLayout = {};
				for (const region of inMemoryValues.regions) {
					const size = stableProps.defaultLayout[region.id];
					if (size !== undefined) {
						preSortedDefaultLayout[region.id] = size;
					}
				}
			}
		}

		const split: RegisteredSplit = {
			disabled: !!disabled,
			element,
			id,
			mutableState: {
				defaultLayout: preSortedDefaultLayout,
				disableCursor: !!stableProps.disableCursor,
				expandedRegionSizes:
					inMemoryValuesRef.current.lastExpandedRegionSizes,
				layouts: inMemoryValuesRef.current.layouts,
			},
			orientation,
			regions: inMemoryValues.regions,
			resizeTargetMinimumSize: inMemoryValues.resizeTargetMinimumSize,
			handles: inMemoryValues.handles,
		};

		registeredSplitRef.current = split;

		const unmountSplit = mountSplit(split);

		const { defaultLayoutDeferred, derivedRegionConstraints, layout } =
			getMountedSplitState(split.id, true);

		if (!defaultLayoutDeferred && derivedRegionConstraints.length > 0) {
			onLayoutChangeStable(layout);
			// Initial mount is not a user interaction (#716).
			onLayoutChangedStable(layout, false);
		}

		const removeChangeEventListener = subscribeToMountedSplit(
			id,
			(event) => {
				const {
					defaultLayoutDeferred,
					derivedRegionConstraints,
					layout,
				} = event.next;

				if (
					defaultLayoutDeferred ||
					derivedRegionConstraints.length === 0
				) {
					// This indicates that the Split has not finished mounting yet
					// Likely because it has been rendered inside of a hidden DOM subtree
					// Ignore layouts in this case because they will not have been validated
					return;
				}

				// Save the layout to in-memory cache so it persists when region configuration changes
				// This improves UX for conditionally rendered regions without requiring defaultLayout
				const regionIdsKey = split.regions
					.map(({ id }) => id)
					.join(",");
				split.mutableState.layouts[regionIdsKey] = layout;

				// Also check if any collapsible Regions were collapsed in this update,
				// and record their previous sizes so we can restore them on expand
				derivedRegionConstraints.forEach((constraints) => {
					if (constraints.collapsible) {
						const { layout: prevLayout } = event.prev ?? {};
						const size = layout[constraints.regionId];
						const prevSize = prevLayout?.[constraints.regionId];
						if (size !== undefined && prevSize !== undefined) {
							const isCollapsed = layoutNumbersEqual(
								constraints.collapsedSize,
								size,
							);
							const wasCollapsed = layoutNumbersEqual(
								constraints.collapsedSize,
								prevSize,
							);
							if (isCollapsed && !wasCollapsed) {
								split.mutableState.expandedRegionSizes[
									constraints.regionId
								] = prevSize;
							}
						}
					}
				});

				// Lastly notify layout-change(d) handlers of the update
				const interactionState = getInteractionState();
				const isCompleted = interactionState.state !== "active";
				onLayoutChangeStable(layout);
				if (isCompleted) {
					onLayoutChangedStable(layout, event.isUserInteraction);
				}
			},
		);

		return () => {
			registeredSplitRef.current = null;

			unmountSplit();
			removeChangeEventListener();
		};
	}, [
		disabled,
		id,
		onLayoutChangedStable,
		onLayoutChangeStable,
		orientation,
		regionOrHandleChangeSigil,
		stableProps,
	]);

	// Not all props require re-registering the split;
	// Some can be updated after the split has been registered
	useEffect(() => {
		const registeredSplit = registeredSplitRef.current;
		if (registeredSplit) {
			registeredSplit.mutableState.defaultLayout = defaultLayout;
			registeredSplit.mutableState.disableCursor = !!disableCursor;
		}
	});

	return (
		<SplitContext.Provider value={context}>
			<div
				{...rest}
				className={className}
				data-split
				data-testid={id}
				id={id}
				ref={mergedRef}
				style={{
					height: "100%",
					width: "100%",
					overflow: "hidden",

					...style,

					display: "flex",
					flexDirection:
						orientation === "horizontal" ? "row" : "column",
					flexWrap: "nowrap",

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
		</SplitContext.Provider>
	);
}

// See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/displayName
Split.displayName = "Split";
