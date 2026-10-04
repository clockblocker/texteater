import type { CSSProperties, HTMLAttributes, Ref } from "react";

export type RegisteredHandle = {
	disabled?: boolean | undefined;
	disableDoubleClick?: boolean | undefined;
	element: HTMLDivElement;
	id: string;
};

type BaseHandleAttributes = Omit<
	HTMLAttributes<HTMLDivElement>,
	"role" | "tabIndex"
>;

export type SplitHandleProps = BaseHandleAttributes & {
	/**
	 * CSS class name.
	 *
	 * ℹ️ Use the `data-split-handle` attribute for custom _hover_ and _active_ styles
	 *
	 * ⚠️ The following properties cannot be overridden: `flex-grow`, `flex-shrink`
	 */
	className?: string | undefined;

	/**
	 * When disabled, the handle cannot be used to resize its neighboring regions.
	 *
	 * ℹ️ The regions may still be resized indirectly (while other regions are being resized).
	 * To prevent a region from being resized at all, it needs to also be disabled.
	 */
	disabled?: boolean | undefined;

	/**
	 * When true, double-clicking this `Handle` will not reset its `Region` to its default size.
	 */
	disableDoubleClick?: boolean;

	/**
	 * Ref attached to the root `HTMLDivElement`.
	 */
	elementRef?: Ref<HTMLDivElement> | undefined;

	/**
	 * Uniquely identifies the handle within the parent split.
	 * Falls back to `useId` when not provided.
	 *
	 * ℹ️ This value will also be assigned to the `data-split-handle` attribute.
	 */
	id?: string | number | undefined;

	/**
	 * CSS properties.
	 *
	 * ℹ️ Use the `data-split-handle` attribute for custom _hover_ and _active_ styles
	 *
	 * ⚠️ The following properties cannot be overridden: `flex-grow`, `flex-shrink`
	 */
	style?: CSSProperties | undefined;
};
