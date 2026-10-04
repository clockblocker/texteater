import type { Id } from "../convex/_generated/dataModel";

/**
 * A Text to open. `focusAttestationId` is a one-shot arrival gesture: on
 * landing, the reader scrolls to that occurrence's Sentence and selects its
 * members, exactly as a click would. It is presentation state and adds no
 * identity: the workspace Subject keeps only the Text.
 */
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

/** @deprecated Prefer LemmaNoteTarget, SurfaceNoteTarget, or AttestationNoteTarget. */
export type RouteNoteTarget =
	| LemmaNoteTarget
	| SurfaceNoteTarget
	| AttestationNoteTarget;

export type ResolutionTarget = {
	readonly kind: "Resolution";
	readonly requestId: string;
};
