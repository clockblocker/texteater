import type { Layout, RegisteredSplit } from "../components/split/types";
import { assert } from "../utils/assert";
import { calculateAvailableSplitSize } from "./dom/calculateAvailableSplitSize";
import { calculateHitAreas } from "./dom/calculateHitAreas";
import { calculateRegionConstraints } from "./dom/calculateRegionConstraints";
import { onDocumentContextMenu } from "./event-handlers/onDocumentContextMenu";
import { onDocumentDoubleClick } from "./event-handlers/onDocumentDoubleClick";
import { onDocumentKeyDown } from "./event-handlers/onDocumentKeyDown";
import { onDocumentPointerDown } from "./event-handlers/onDocumentPointerDown";
import { onDocumentPointerLeave } from "./event-handlers/onDocumentPointerLeave";
import { onDocumentPointerMove } from "./event-handlers/onDocumentPointerMove";
import { onDocumentPointerOut } from "./event-handlers/onDocumentPointerOut";
import { onDocumentPointerUp } from "./event-handlers/onDocumentPointerUp";
import {
	deleteMutableSplit,
	getMountedSplitState,
	updateMountedSplit,
} from "./mutable-state/splits";
import type { HandleToRegionsMap } from "./mutable-state/types";
import { calculateDefaultLayout } from "./utils/calculateDefaultLayout";
import { layoutsEqual } from "./utils/layoutsEqual";
import { notifyRegionOnResize } from "./utils/notifyRegionOnResize";
import { preserveFixedRegionSizes } from "./utils/preserveFixedRegionSizes";
import { regionConstraintsEqual } from "./utils/regionConstraintsEqual";
import { validateLayoutKeys } from "./utils/validateLayoutKeys";
import { validateSplitLayout } from "./utils/validateSplitLayout";

const ownerDocumentReferenceCounts = new Map<Document, number>();

export function mountSplit(split: RegisteredSplit) {
	let isMounted = true;

	assert(
		split.element.ownerDocument.defaultView,
		"Cannot register an unmounted Split",
	);

	const ResizeObserver =
		split.element.ownerDocument.defaultView.ResizeObserver;

	const regionIds = new Set<string>();
	const handleIds = new Set<string>();

	// Add Regions with onResize callbacks to ResizeObserver
	// Add Split to ResizeObserver also in order to sync % based constraints
	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complexity baseline (#994): decompose to remove
	const resizeObserver = new ResizeObserver((entries) => {
		for (const entry of entries) {
			const { borderBoxSize, target } = entry;
			if (target === split.element) {
				if (isMounted) {
					const splitSize = calculateAvailableSplitSize({ split });
					if (splitSize === 0) {
						// Can't calculate anything meaningful if the split has a width/height of 0
						// (This could indicate that it's within a hidden subtree)
						return;
					}

					const splitState = getMountedSplitState(split.id);
					if (!splitState) {
						// Not mounted yet
						return;
					}

					// Update non-percentage based constraints
					const nextDerivedRegionConstraints =
						calculateRegionConstraints(split);

					// Revalidate layout in case constraints have changed or split size changed
					const prevLayout = splitState.defaultLayoutDeferred
						? calculateDefaultLayout(nextDerivedRegionConstraints)
						: splitState.layout;
					const unsafeLayout = preserveFixedRegionSizes({
						split,
						nextSplitSize: splitSize,
						prevSplitSize: splitState.splitSize,
						prevLayout,
					});
					const nextLayout = validateSplitLayout({
						layout: unsafeLayout,
						regionConstraints: nextDerivedRegionConstraints,
					});

					if (
						!splitState.defaultLayoutDeferred &&
						layoutsEqual(splitState.layout, nextLayout) &&
						regionConstraintsEqual(
							splitState.derivedRegionConstraints,
							nextDerivedRegionConstraints,
						) &&
						splitState.splitSize === splitSize
					) {
						continue;
					}

					updateMountedSplit(split, {
						defaultLayoutDeferred: false,
						derivedRegionConstraints: nextDerivedRegionConstraints,
						splitSize,
						layout: nextLayout,
						handleToRegions: splitState.handleToRegions,
					});
				}
			} else {
				notifyRegionOnResize(
					split,
					target as HTMLElement,
					borderBoxSize,
				);
			}
		}
	});

	resizeObserver.observe(split.element);

	split.regions.forEach((region) => {
		assert(
			!regionIds.has(region.id),
			`Region ids must be unique; id "${region.id}" was used more than once`,
		);

		regionIds.add(region.id);

		if (region.onResize) {
			resizeObserver.observe(region.element);
		}
	});

	const splitSize = calculateAvailableSplitSize({ split });

	// Calculate initial layout for the new Region configuration
	const derivedRegionConstraints = calculateRegionConstraints(split);
	const regionIdsKey = split.regions.map(({ id }) => id).join(",");

	// Gracefully handle an invalid default layout
	// This could happen when e.g. a stored layout is combined with dynamic Regions
	// In this case the best we can do is ignore the incoming layout
	let defaultLayout: Layout | undefined = split.mutableState.defaultLayout;
	if (defaultLayout) {
		if (!validateLayoutKeys(split.regions, defaultLayout)) {
			defaultLayout = undefined;
		}
	}

	const defaultLayoutUnsafe: Layout =
		split.mutableState.layouts[regionIdsKey] ??
		defaultLayout ??
		calculateDefaultLayout(derivedRegionConstraints);
	const defaultLayoutSafe = validateSplitLayout({
		layout: defaultLayoutUnsafe,
		regionConstraints: derivedRegionConstraints,
	});

	const ownerDocument = split.element.ownerDocument;

	ownerDocumentReferenceCounts.set(
		ownerDocument,
		(ownerDocumentReferenceCounts.get(ownerDocument) ?? 0) + 1,
	);

	const handleToRegions: HandleToRegionsMap = new Map();
	const hitAreas = calculateHitAreas(split);
	hitAreas.forEach((hitArea) => {
		if (hitArea.handle) {
			handleToRegions.set(hitArea.handle, hitArea.regions);
		}
	});

	updateMountedSplit(split, {
		defaultLayoutDeferred: splitSize === 0,
		derivedRegionConstraints,
		splitSize,
		layout: defaultLayoutSafe,
		handleToRegions,
	});

	split.handles.forEach((handle) => {
		assert(
			!handleIds.has(handle.id),
			`Handle ids must be unique; id "${handle.id}" was used more than once`,
		);

		handleIds.add(handle.id);

		handle.element.addEventListener("keydown", onDocumentKeyDown);
	});

	// If this is the first split to be mounted, initialize event handlers
	if (ownerDocumentReferenceCounts.get(ownerDocument) === 1) {
		ownerDocument.addEventListener(
			"contextmenu",
			onDocumentContextMenu,
			true,
		);
		ownerDocument.addEventListener("dblclick", onDocumentDoubleClick, true);
		ownerDocument.addEventListener(
			"pointerdown",
			onDocumentPointerDown,
			true,
		);
		ownerDocument.addEventListener("pointerleave", onDocumentPointerLeave);
		ownerDocument.addEventListener("pointermove", onDocumentPointerMove);
		ownerDocument.addEventListener("pointerout", onDocumentPointerOut);
		ownerDocument.addEventListener("pointerup", onDocumentPointerUp, true);
	}

	return function unmountSplit() {
		isMounted = false;

		ownerDocumentReferenceCounts.set(
			ownerDocument,
			Math.max(
				0,
				(ownerDocumentReferenceCounts.get(ownerDocument) ?? 0) - 1,
			),
		);

		deleteMutableSplit(split);

		split.handles.forEach((handle) => {
			handle.element.removeEventListener("keydown", onDocumentKeyDown);
		});

		// If this was the last split to be mounted, tear down event handlers
		if (!ownerDocumentReferenceCounts.get(ownerDocument)) {
			ownerDocument.removeEventListener(
				"contextmenu",
				onDocumentContextMenu,
				true,
			);
			ownerDocument.removeEventListener(
				"dblclick",
				onDocumentDoubleClick,
				true,
			);
			ownerDocument.removeEventListener(
				"pointerdown",
				onDocumentPointerDown,
				true,
			);
			ownerDocument.removeEventListener(
				"pointerleave",
				onDocumentPointerLeave,
			);
			ownerDocument.removeEventListener(
				"pointermove",
				onDocumentPointerMove,
			);
			ownerDocument.removeEventListener(
				"pointerout",
				onDocumentPointerOut,
			);
			ownerDocument.removeEventListener(
				"pointerup",
				onDocumentPointerUp,
				true,
			);
		}

		resizeObserver.disconnect();
	};
}
