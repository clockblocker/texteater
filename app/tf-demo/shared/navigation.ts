import type { Id } from "../convex/_generated/dataModel";

/**
 * A Text to open. `focusAttestationId` names the occurrence Go to source
 * lands on: the Text arrives scrolled to its Sentence with its members lit.
 * `title` is what the Library calls the Text. Both are presentation state
 * and add no identity.
 */
export type TextTarget = {
	readonly kind: "Text";
	readonly textId: string;
	readonly focusAttestationId?: string;
	readonly title?: string;
};

/**
 * Where Go to source lands: a Text at one occurrence, named as the Library
 * names it, so its Cover is titled before the Text loads (tf-demo ADR 0008).
 */
export type SourceTextTarget = TextTarget & {
	readonly focusAttestationId: string;
	readonly title: string;
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
