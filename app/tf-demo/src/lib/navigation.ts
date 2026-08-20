import type { NavigationTarget, RouteNoteKind } from "../../shared/navigation";

export type {
	LibraryTarget,
	NavigationTarget,
	ResolutionTarget,
	RouteNoteKind,
	RouteNoteTarget,
	SettingsTarget,
	ShadowNoteTarget,
	TextTarget,
	UnitReadingNoteTarget,
} from "../../shared/navigation";

export type NavigationLocation = {
	readonly pathname: string;
	readonly search: string;
};

const ID_PATTERN = /^[A-Za-z0-9_-]{1,256}$/;
const routeKinds = {
	attestation: "Attestation",
	surface: "Surface",
	lemma: "Lemma",
} as const satisfies Record<string, RouteNoteKind>;

export function hrefFor(target: NavigationTarget): string {
	switch (target.kind) {
		case "Library":
			return "/library";
		case "Settings":
			return target.textId
				? `/settings?text=${encodeNavigationId(target.textId)}`
				: "/settings";
		case "Text": {
			const href = `/text/${encodeNavigationId(target.textId)}`;
			return target.focusAttestationId
				? `${href}?at=${encodeNavigationId(target.focusAttestationId)}`
				: href;
		}
		case "UnitReadingNote":
			return `/note/reading/${encodeNavigationId(target.readingId)}`;
		case "RouteNote":
			return `/note/route/${target.routeKind.toLowerCase()}/${encodeNavigationId(target.id)}`;
		case "ShadowNote":
			return `/note/shadow/${encodeNavigationId(target.shadowId)}`;
		case "Resolution":
			return `/resolve/${encodeNavigationId(target.requestId)}`;
	}
}

export function targetFromLocation(
	location: NavigationLocation,
): NavigationTarget | null {
	const segments = location.pathname.split("/");
	if (
		segments[0] !== "" ||
		segments.slice(1).some((segment) => segment === "")
	) {
		return null;
	}

	if (matchesPath(segments, "library") && location.search === "") {
		return { kind: "Library" };
	}

	if (matchesPath(segments, "settings")) {
		const search = new URLSearchParams(location.search);
		if ([...search.keys()].some((key) => key !== "text")) return null;
		const textValues = search.getAll("text");
		if (textValues.length === 0) return { kind: "Settings" };
		if (textValues.length > 1) return null;
		const textId = decodeNavigationId(textValues[0]);
		return textId ? { kind: "Settings", textId } : null;
	}

	if (matchesPath(segments, "text", undefined)) {
		const textId = decodeNavigationId(segments[2]);
		if (!textId) return null;
		const search = new URLSearchParams(location.search);
		const focusValues = search.getAll("at");
		if ([...search.keys()].some((key) => key !== "at")) return null;
		if (focusValues.length > 1) return null;
		if (focusValues.length === 0) return { kind: "Text", textId };
		const focusAttestationId = decodeNavigationId(focusValues[0]);
		return focusAttestationId
			? { kind: "Text", textId, focusAttestationId }
			: null;
	}

	if (
		matchesPath(segments, "note", "reading", undefined) &&
		location.search === ""
	) {
		const readingId = decodeNavigationId(segments[3]);
		return readingId ? { kind: "UnitReadingNote", readingId } : null;
	}

	if (
		matchesPath(segments, "note", "route", undefined, undefined) &&
		location.search === ""
	) {
		const routeKindSegment = segments[3];
		const routeKind = routeKindSegment
			? routeKinds[routeKindSegment as keyof typeof routeKinds]
			: undefined;
		const id = decodeNavigationId(segments[4]);
		return routeKind && id ? { kind: "RouteNote", routeKind, id } : null;
	}

	if (
		matchesPath(segments, "note", "shadow", undefined) &&
		location.search === ""
	) {
		const shadowId = decodeNavigationId(segments[3]);
		return shadowId ? { kind: "ShadowNote", shadowId } : null;
	}

	if (matchesPath(segments, "resolve", undefined) && location.search === "") {
		const requestId = decodeNavigationId(segments[2]);
		return requestId ? { kind: "Resolution", requestId } : null;
	}

	return null;
}

function matchesPath(
	segments: readonly string[],
	...expected: readonly (string | undefined)[]
): boolean {
	return (
		segments.length === expected.length + 1 &&
		expected.every(
			(segment, index) =>
				segment === undefined || segments[index + 1] === segment,
		)
	);
}

function encodeNavigationId(id: string): string {
	if (!ID_PATTERN.test(id)) {
		throw new TypeError("Navigation identifiers must be URL-safe.");
	}
	return encodeURIComponent(id);
}

function decodeNavigationId(value: string | undefined): string | null {
	if (!value) return null;
	try {
		const decoded = decodeURIComponent(value);
		return ID_PATTERN.test(decoded) ? decoded : null;
	} catch {
		return null;
	}
}
