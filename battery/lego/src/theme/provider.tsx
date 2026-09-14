import * as React from "react";

import {
	applyTheme,
	COLOR_SCHEME_QUERY,
	getSystemTheme,
	isTheme,
	readStoredTheme,
	type Theme,
	writeStoredTheme,
} from "./bootstrap";

export type ThemeProviderProps = {
	children: React.ReactNode;
	defaultTheme?: Theme;
	storageKey?: string;
	disableTransitionOnChange?: boolean;
};

type ThemeProviderState = {
	theme: Theme;
	setTheme: (theme: Theme) => void;
};

const ThemeProviderContext = React.createContext<
	ThemeProviderState | undefined
>(undefined);

function disableTransitionsTemporarily() {
	const style = document.createElement("style");
	style.appendChild(
		document.createTextNode(
			"*,*::before,*::after{-webkit-transition:none!important;transition:none!important}",
		),
	);
	document.head.appendChild(style);

	return () => {
		window.getComputedStyle(document.body);
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				style.remove();
			});
		});
	};
}

function isEditableTarget(target: EventTarget | null) {
	if (!(target instanceof HTMLElement)) return false;
	if (target.isContentEditable) return true;
	return (
		target.closest("input, textarea, select, [contenteditable='true']") !==
		null
	);
}

/**
 * Owns the persisted theme choice, keeps `<html>` in sync with it, follows
 * system changes, and toggles on the `d` key outside editable targets.
 */
export function ThemeProvider({
	children,
	defaultTheme = "system",
	storageKey = "theme",
	disableTransitionOnChange = true,
}: ThemeProviderProps) {
	const [theme, setThemeState] = React.useState<Theme>(
		() => readStoredTheme(storageKey) ?? defaultTheme,
	);

	const setTheme = React.useCallback(
		(nextTheme: Theme) => {
			writeStoredTheme(storageKey, nextTheme);
			setThemeState(nextTheme);
		},
		[storageKey],
	);

	React.useEffect(() => {
		const restoreTransitions = disableTransitionOnChange
			? disableTransitionsTemporarily()
			: null;
		applyTheme(theme);
		restoreTransitions?.();

		if (theme !== "system") return undefined;
		const mediaQuery = window.matchMedia(COLOR_SCHEME_QUERY);
		const handleChange = () => {
			applyTheme("system");
		};
		mediaQuery.addEventListener("change", handleChange);
		return () => mediaQuery.removeEventListener("change", handleChange);
	}, [theme, disableTransitionOnChange]);

	React.useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.repeat) return;
			if (event.metaKey || event.ctrlKey || event.altKey) return;
			if (isEditableTarget(event.target)) return;
			if (event.key.toLowerCase() !== "d") return;

			setThemeState((currentTheme) => {
				const nextTheme: Theme =
					currentTheme === "dark"
						? "light"
						: currentTheme === "light"
							? "dark"
							: getSystemTheme() === "dark"
								? "light"
								: "dark";
				writeStoredTheme(storageKey, nextTheme);
				return nextTheme;
			});
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [storageKey]);

	React.useEffect(() => {
		const handleStorageChange = (event: StorageEvent) => {
			if (event.storageArea !== localStorage) return;
			if (event.key !== storageKey) return;
			setThemeState(
				isTheme(event.newValue) ? event.newValue : defaultTheme,
			);
		};

		window.addEventListener("storage", handleStorageChange);
		return () => window.removeEventListener("storage", handleStorageChange);
	}, [defaultTheme, storageKey]);

	const value = React.useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

	return (
		<ThemeProviderContext.Provider value={value}>
			{children}
		</ThemeProviderContext.Provider>
	);
}

export function useTheme(): ThemeProviderState {
	const context = React.useContext(ThemeProviderContext);
	if (context === undefined) {
		throw new Error("useTheme must be used within a ThemeProvider");
	}
	return context;
}
