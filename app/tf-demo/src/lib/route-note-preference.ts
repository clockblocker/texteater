import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "tf-demo.route-notes-enabled.v1";
const CHANGE_EVENT = "tf-demo:route-note-preference";

export function shouldRequestRouteNote(
	preferenceEnabled: boolean,
	altKey: boolean,
): boolean {
	return preferenceEnabled || altKey;
}

export function readRouteNotePreference(storage?: Pick<Storage, "getItem">) {
	const source =
		storage ??
		(typeof window === "undefined" ? undefined : window.localStorage);
	return source?.getItem(STORAGE_KEY) === "true";
}

export function writeRouteNotePreference(
	enabled: boolean,
	storage?: Pick<Storage, "setItem">,
): void {
	const target =
		storage ??
		(typeof window === "undefined" ? undefined : window.localStorage);
	target?.setItem(STORAGE_KEY, String(enabled));
	if (!storage && typeof window !== "undefined") {
		window.dispatchEvent(new Event(CHANGE_EVENT));
	}
}

export function useRouteNotePreference() {
	const [enabled, setEnabledState] = useState(readRouteNotePreference);
	useEffect(() => {
		const refresh = () => setEnabledState(readRouteNotePreference());
		window.addEventListener("storage", refresh);
		window.addEventListener(CHANGE_EVENT, refresh);
		return () => {
			window.removeEventListener("storage", refresh);
			window.removeEventListener(CHANGE_EVENT, refresh);
		};
	}, []);
	const setEnabled = useCallback((next: boolean) => {
		writeRouteNotePreference(next);
		setEnabledState(next);
	}, []);
	return [enabled, setEnabled] as const;
}
