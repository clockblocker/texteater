/** The toolbar's settings for the frame a demo renders in. */
export type FrameSettings = {
	/** The frame's width in CSS px, or the whole stage. */
	readonly width: number | "fill";
	readonly dir: "ltr" | "rtl";
	readonly theme: "dark" | "light";
	readonly reducedMotion: boolean;
};

export const widthPresets: readonly {
	readonly label: string;
	readonly width: number | "fill";
}[] = [
	{ label: "Phone 390", width: 390 },
	{ label: "Tablet 800", width: 800 },
	{ label: "Desktop 1440", width: 1440 },
	{ label: "Fill", width: "fill" },
];

export const minFrameWidth = 280;

export function settingsFromParams(params: URLSearchParams): FrameSettings {
	const width = Number(params.get("w"));
	return {
		width:
			Number.isFinite(width) && width >= minFrameWidth
				? Math.round(width)
				: "fill",
		dir: params.get("dir") === "rtl" ? "rtl" : "ltr",
		theme: params.get("theme") === "light" ? "light" : "dark",
		reducedMotion: params.get("motion") === "reduced",
	};
}

/** The params for `settings`, omitting defaults so URLs stay short. */
export function paramsFromSettings(
	settings: FrameSettings,
): Record<string, string | null> {
	return {
		w: settings.width === "fill" ? null : String(settings.width),
		dir: settings.dir === "rtl" ? "rtl" : null,
		theme: settings.theme === "light" ? "light" : null,
		motion: settings.reducedMotion ? "reduced" : null,
	};
}
