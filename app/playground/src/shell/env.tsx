import { createContext, useContext, useEffect, useState } from "react";
import type { FrameSettings } from "./settings";

/** The frame's settings, plus the frame element itself. */
export type PlaygroundEnv = FrameSettings & {
	/**
	 * The frame: the `@container/frame` box and the containing block for
	 * `position: fixed` inside it. Portal overlays here, not into
	 * `document.body`, so they stay inside the frame.
	 */
	readonly frame: HTMLElement | null;
};

export const PlaygroundEnvContext = createContext<PlaygroundEnv>({
	width: "fill",
	dir: "ltr",
	theme: "dark",
	reducedMotion: false,
	frame: null,
});

export function usePlaygroundEnv(): PlaygroundEnv {
	return useContext(PlaygroundEnvContext);
}

type Size = { readonly inlineSize: number; readonly blockSize: number };

/** `element`'s border-box size, kept current with a ResizeObserver. */
export function useElementSize(element: Element | null): Size {
	const [size, setSize] = useState<Size>({ inlineSize: 0, blockSize: 0 });
	useEffect(() => {
		if (!element) return;
		const observer = new ResizeObserver(([entry]) => {
			const box = entry?.borderBoxSize[0];
			if (box)
				setSize({
					inlineSize: Math.round(box.inlineSize),
					blockSize: Math.round(box.blockSize),
				});
		});
		observer.observe(element);
		return () => observer.disconnect();
	}, [element]);
	return size;
}

/**
 * The frame's size, for logic that CSS container queries can't express
 * (`window.innerWidth` and `matchMedia` measure the window, not the frame).
 */
export function useFrameSize(): Size {
	return useElementSize(usePlaygroundEnv().frame);
}
