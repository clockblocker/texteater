import type { FunctionReturnType } from "convex/server";

import type { api } from "../../../../convex/_generated/api";
import type { NoteKind } from "./kind";

type LoadedNoteData = NonNullable<
	| FunctionReturnType<typeof api.readingNotes.get>
	| FunctionReturnType<typeof api.routeNotes.get>
	| FunctionReturnType<typeof api.shadowNotes.get>
>;

/**
 * Which parts of a Reading Note are still on the way. A resolving Reading is
 * rendered by the same renderer as a stored one, fed a model whose missing
 * parts are marked here so each block can show a bone in their place.
 */
export type ReadingNotePending = {
	/** No Reading or Lemma exists yet: identities are placeholders and must not be followed. */
	readonly identity: true;
	/** The Emoji Description has not been generated yet. */
	readonly emojiDescription: boolean;
	/** The emoji arrived while this Presentation was showing its bone, so it animates in. */
	readonly emojiArrived?: boolean;
};

export type NoteData =
	| Exclude<LoadedNoteData, { readonly kind: "Reading" }>
	| (Extract<LoadedNoteData, { readonly kind: "Reading" }> & {
			readonly pending?: ReadingNotePending;
	  });

export type NoteDataFor<K extends NoteKind> = Extract<NoteData, { kind: K }>;

/** A registry address derived from a Note, rather than supplied by callers. */
export type NoteCoordinates = {
	readonly language: string;
	readonly noteKind: NoteKind;
	readonly family?: string;
	readonly kind?: string;
};

export function describeNote(note: NoteData): {
	readonly coordinates: NoteCoordinates;
	readonly identity: string;
} {
	switch (note.kind) {
		case "Reading":
			return {
				coordinates: { ...note.reading.lemma, noteKind: note.kind },
				identity: note.reading.ownerKey,
			};
		case "Lemma":
			return {
				coordinates: { ...note.presented, noteKind: note.kind },
				identity: note.target.lemmaId,
			};
		case "Attestation":
			return {
				coordinates: {
					...note.presented.surface.lemma,
					noteKind: note.kind,
				},
				identity: note.target.attestationId,
			};
		case "Shadow":
			return {
				coordinates: { ...note.descriptor, noteKind: note.kind },
				identity: note.target.shadowId,
			};
		case "Surface":
			return {
				coordinates: {
					language: note.target.language,
					noteKind: note.kind,
				},
				identity: `${note.target.language}:${note.target.normalizedSurface}`,
			};
	}
}
