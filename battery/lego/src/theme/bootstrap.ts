export type Theme = "dark" | "light" | "system";
export type ResolvedTheme = Exclude<Theme, "system">;

export type ThemeBootstrapOptions = {
	defaultTheme?: Theme;
	document?: Document;
	storageKey?: string;
};

export const COLOR_SCHEME_QUERY = "(prefers-color-scheme: dark)";
const THEME_VALUES: readonly Theme[] = ["dark", "light", "system"];

export function isTheme(value: string | null): value is Theme {
	return value !== null && THEME_VALUES.includes(value as Theme);
}

export function getSystemTheme(): ResolvedTheme {
	if (typeof window === "undefined") return "dark";
	return window.matchMedia(COLOR_SCHEME_QUERY).matches ? "dark" : "light";
}

export function resolveTheme(theme: Theme): ResolvedTheme {
	return theme === "system" ? getSystemTheme() : theme;
}

/** Applies a theme choice without reading or writing persistent preference. */
export function applyTheme(
	theme: Theme,
	documentOverride?: Document,
): ResolvedTheme {
	const root = (documentOverride ?? document).documentElement;
	const resolved = resolveTheme(theme);
	root.classList.remove("light", "dark");
	root.classList.add(resolved);
	root.style.colorScheme = resolved;
	return resolved;
}

export function readStoredTheme(storageKey: string): Theme | null {
	try {
		const stored = localStorage.getItem(storageKey);
		return isTheme(stored) ? stored : null;
	} catch {
		return null;
	}
}

export function writeStoredTheme(storageKey: string, theme: Theme): void {
	try {
		localStorage.setItem(storageKey, theme);
	} catch {
		// Storage can be unavailable in privacy modes; the in-memory theme still applies.
	}
}

/**
 * Applies the semantic theme before React mounts so the first paint already
 * carries the right color scheme. Call it from the synchronous browser entry
 * point after importing `lego/styles.css`.
 */
export function initializeTheme({
	defaultTheme = "system",
	document: documentOverride,
	storageKey = "theme",
}: ThemeBootstrapOptions = {}): Theme {
	const theme = readStoredTheme(storageKey) ?? defaultTheme;
	applyTheme(theme, documentOverride);
	return theme;
}
