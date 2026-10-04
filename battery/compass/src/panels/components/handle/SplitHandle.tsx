"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import { subscribeToInteractionState } from "../../global/mutable-state/interactions";
import { subscribeToMountedSplit } from "../../global/mutable-state/splits";
import type { InteractionState } from "../../global/mutable-state/types";
import { calculateHandleAriaValues } from "../../global/utils/calculateHandleAriaValues";
import { useId } from "../../hooks/useId";
import { useIsomorphicLayoutEffect } from "../../hooks/useIsomorphicLayoutEffect";
import { useMergedRefs } from "../../hooks/useMergedRefs";
import { useStableObject } from "../../hooks/useStableObject";
import { useSplitContext } from "../split/useSplitContext";
import type { RegisteredHandle, SplitHandleProps } from "./types";

/**
 * A SplitHandle resizes the SplitRegions on either side of it by pointer or
 * keyboard. A Split resizes without one, but the handle is what keyboard
 * users reach.
 *
 * It renders a focusable window splitter: `role="separator"` with the
 * [WAI-ARIA value properties](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/separator_role#associated_wai-aria_roles_states_and_properties),
 * plus `data-split-handle` and the `id`. It must be a direct DOM child of its
 * Split's element.
 */
export function SplitHandle({
	children,
	className,
	disabled,
	disableDoubleClick,
	elementRef: elementRefProp,
	id: idProp,
	style,
	...rest
}: SplitHandleProps) {
	const id = useId(idProp);

	const stableProps = useStableObject({
		disabled,
		disableDoubleClick,
	});

	const [aria, setAria] = useState<{
		valueControls?: string | undefined;
		valueMin?: number | undefined;
		valueMax?: number | undefined;
		valueNow?: number | undefined;
	}>({});

	const [dragState, setDragState] =
		useState<InteractionState["state"]>("inactive");
	const [isFocused, setIsFocused] = useState(false);

	const elementRef = useRef<HTMLDivElement | null>(null);

	const mergedRef = useMergedRefs(elementRef, elementRefProp);

	const {
		disableCursor,
		id: splitId,
		orientation: splitOrientation,
		registerHandle,
		updateHandleProps,
	} = useSplitContext();

	const orientation =
		splitOrientation === "horizontal" ? "vertical" : "horizontal";

	// Register Handle with parent Split
	// Listen to global state for drag state related to this Handle
	useIsomorphicLayoutEffect(() => {
		const element = elementRef.current;
		if (element !== null) {
			const handle: RegisteredHandle = {
				disabled: stableProps.disabled,
				disableDoubleClick: stableProps.disableDoubleClick,
				element,
				id,
			};

			const unregisterHandle = registerHandle(handle);

			const removeInteractionStateChangeListener =
				subscribeToInteractionState((event) => {
					setDragState(
						event.next.state !== "inactive" &&
							event.next.hitAreas.some(
								(hitArea) => hitArea.handle === handle,
							)
							? event.next.state
							: "inactive",
					);
				});

			const removeMountedSplitsChangeListener = subscribeToMountedSplit(
				splitId,
				(event) => {
					const {
						derivedRegionConstraints,
						layout,
						handleToRegions,
					} = event.next;
					const regions = handleToRegions.get(handle);
					if (regions) {
						const primaryRegion = regions[0];
						const regionIndex = regions.indexOf(primaryRegion);

						setAria(
							calculateHandleAriaValues({
								layout,
								regionConstraints: derivedRegionConstraints,
								regionId: primaryRegion.id,
								regionIndex,
							}),
						);
					}
				},
			);

			return () => {
				removeInteractionStateChangeListener();
				removeMountedSplitsChangeListener();
				unregisterHandle();
			};
		}
	}, [splitId, id, registerHandle, stableProps]);

	// Not all props require re-registering the handle;
	useEffect(() => {
		updateHandleProps(id, { disabled, disableDoubleClick });
	}, [disabled, disableDoubleClick, id, updateHandleProps]);

	let cursor: CSSProperties["cursor"];
	if (disabled && !disableCursor) {
		cursor = "not-allowed";
	}

	let dataHandle: string;
	if (disabled) {
		dataHandle = "disabled";
	} else {
		switch (dragState) {
			case "active": {
				dataHandle = "active";
				break;
			}
			default: {
				if (isFocused) {
					dataHandle = "focus";
				} else {
					dataHandle = dragState;
				}
			}
		}
	}

	return (
		// biome-ignore lint/a11y/useSemanticElements: a focusable window splitter holds children and a value; <hr> can do neither.
		<div
			{...rest}
			aria-controls={aria.valueControls}
			aria-disabled={disabled || undefined}
			aria-orientation={orientation}
			aria-valuemax={aria.valueMax}
			aria-valuemin={aria.valueMin}
			aria-valuenow={aria.valueNow}
			children={children}
			className={className}
			data-split-handle={dataHandle}
			data-testid={id}
			id={id}
			onBlur={() => setIsFocused(false)}
			onFocus={() => setIsFocused(true)}
			ref={mergedRef}
			role="separator"
			style={{
				flexBasis: "auto",
				cursor,

				...style,

				flexGrow: 0,
				flexShrink: 0,

				// Inform the browser that the library is handling touch events for this element
				// See github.com/bvaughn/react-resizable-panels/issues/662
				touchAction: "none",
			}}
			tabIndex={disabled ? undefined : 0}
		/>
	);
}

// See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/displayName
SplitHandle.displayName = "SplitHandle";
