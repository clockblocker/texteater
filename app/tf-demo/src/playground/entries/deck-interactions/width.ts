import { isNarrow } from "compass";
import { useSyncExternalStore } from "react";
import { remPx } from "@/presentation/deck-geometry";

/**
 * How wide the screen reads to D: a phone below `md`, compass's
 * `isNarrow`, the breakpoint the app's layout reads, and wide from it.
 * On a phone a swipe toward inline-end opens the Card into a Cover; on a
 * wide screen it opens the Card in the other Pane.
 */
export type Width = "phone" | "wide";

/** The inspector's override: "auto" reads the screen, the others pin a width so both can be judged without resizing. */
export const WIDTH_SETTINGS = ["auto", "phone", "wide"] as const;
export type WidthSetting = (typeof WIDTH_SETTINGS)[number];

/** The width `setting` gives a viewport `viewport` px wide, at the `rem` given. */
export function widthOf(
	setting: WidthSetting,
	viewport: number,
	rem: number,
): Width {
	if (setting !== "auto") return setting;
	return isNarrow(viewport, rem) ? "phone" : "wide";
}

function subscribe(onChange: () => void) {
	window.addEventListener("resize", onChange);
	return () => window.removeEventListener("resize", onChange);
}

function screenWidth(): Width {
	return widthOf("auto", document.documentElement.clientWidth, remPx());
}

/** The width `setting` gives this screen, kept current as the window changes. */
export function useWidth(setting: WidthSetting): Width {
	const screen = useSyncExternalStore(
		subscribe,
		screenWidth,
		(): Width => "wide",
	);
	return setting === "auto" ? screen : setting;
}
