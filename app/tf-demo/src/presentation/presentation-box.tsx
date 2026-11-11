import type { ComponentPropsWithRef, ElementType } from "react";
import type { PresentationForm } from "./form";
import { boxClass, paperShadow } from "./skin";

/**
 * The paper surface of one Presentation: its skin in `form`, and nothing
 * about where it sits or how it moves. A host draws it as the element its
 * engine moves (`as`), and adds its own placement, handlers and motion:
 * the app's renderer as a `motion.article` placed in CSS against its
 * Pane, Deck interactions as one on its own px values, a gallery as a
 * plain element in the page's flow.
 */
export function PresentationBox<T extends ElementType = "article">({
	as,
	form,
	lift = 0,
	className = "",
	style,
	...rest
}: {
	/** The element the box is drawn as; an `article` unless a host names one. */
	readonly as?: T;
	readonly form: PresentationForm;
	/**
	 * How far the Card is lifted, 0 at rest to 1 in the hand: its shadow
	 * follows. A host that animates the lift passes its own `boxShadow`
	 * from `paperShadow` instead.
	 */
	readonly lift?: number;
} & Omit<ComponentPropsWithRef<T>, "as" | "form" | "lift">) {
	const Element: ElementType = as ?? "article";
	const shadow = (style as { boxShadow?: unknown } | undefined)?.boxShadow;
	return (
		<Element
			data-presentation={form}
			{...rest}
			className={`${boxClass(form)} ${className as string}`}
			style={
				shadow === undefined
					? { boxShadow: paperShadow(form, lift), ...style }
					: style
			}
		/>
	);
}
