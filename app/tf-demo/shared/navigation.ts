import type { Id } from "../convex/_generated/dataModel";

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

export type ReadingNoteTarget = {
	readonly kind: "Reading";
	readonly readingId: string;
};

export type LemmaNoteTarget = {
	readonly kind: "Lemma";
	readonly lemmaId: Id<"lemmas">;
};

export type SurfaceNoteTarget = {
	readonly kind: "Surface";
	readonly language: "de";
	readonly normalizedSurface: string;
};

export type AttestationNoteTarget = {
	readonly kind: "Attestation";
	readonly attestationId: Id<"attestations">;
};

export type ShadowNoteTarget = {
	readonly kind: "Shadow";
	readonly shadowId: string;
};

export type NoteTarget =
	| ReadingNoteTarget
	| LemmaNoteTarget
	| SurfaceNoteTarget
	| AttestationNoteTarget
	| ShadowNoteTarget;

/** @deprecated Prefer the individual Note target types. */
export type UnitReadingNoteTarget = ReadingNoteTarget;

/** @deprecated Prefer LemmaNoteTarget, SurfaceNoteTarget, or AttestationNoteTarget. */
export type RouteNoteTarget =
	| LemmaNoteTarget
	| SurfaceNoteTarget
	| AttestationNoteTarget;

export type ResolutionTarget = {
	readonly kind: "Resolution";
	readonly requestId: string;
};

export type NavigationTarget =
	| LibraryTarget
	| SettingsTarget
	| TextTarget
	| NoteTarget
	| ResolutionTarget;
