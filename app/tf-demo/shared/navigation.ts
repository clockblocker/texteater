export type LibraryTarget = {
	readonly kind: "Library";
};

export type SettingsTarget = {
	readonly kind: "Settings";
	readonly textId?: string;
};

export type TextTarget = {
	readonly kind: "Text";
	readonly textId: string;
	readonly focusAttestationId?: string;
};

export type UnitReadingNoteTarget = {
	readonly kind: "UnitReadingNote";
	readonly readingId: string;
};

export type RouteNoteKind = "Attestation" | "Surface" | "Lemma";

export type RouteNoteTarget = {
	readonly kind: "RouteNote";
	readonly routeKind: RouteNoteKind;
	readonly id: string;
};

export type ShadowNoteTarget = {
	readonly kind: "ShadowNote";
	readonly shadowId: string;
};

export type ResolutionTarget = {
	readonly kind: "Resolution";
	readonly requestId: string;
};

export type NavigationTarget =
	| LibraryTarget
	| SettingsTarget
	| TextTarget
	| UnitReadingNoteTarget
	| RouteNoteTarget
	| ShadowNoteTarget
	| ResolutionTarget;
