import type { ReactElement } from "react";

import { renderErrorNote } from "./error-note";
import type { NoteData } from "./note-data";
import {
	type ReadingNoteData,
	type ReadingNotePresentationCapabilities,
	renderReadingNote,
} from "./reading";
import {
	type RouteNoteData,
	type RouteNotePresentationCapabilities,
	renderRouteNote,
} from "./route";
import {
	renderShadowNote,
	type ShadowNoteData,
	type ShadowNotePresentationCapabilities,
} from "./shadow";

export { renderErrorNote } from "./error-note";
export type { NoteBlockKind, NoteBlockKindFor } from "./note-block-kind";
export {
	NOTE_BLOCK_KIND_FOR,
	noteBlockKindSchema,
	routeNoteBlockKindSchema,
	shadowNoteBlockKindSchema,
	unitReadingNoteBlockKindSchema,
} from "./note-block-kind";
export {
	orderNoteBlockKinds,
	WEIGHT_FOR_NOTE_BLOCK_KIND,
} from "./note-block-order";
export type { NoteData, NoteDataFor } from "./note-data";
export type { NoteKind } from "./note-kind";
export { noteKindSchema } from "./note-kind";
export type { TargetLanguage } from "./target-language";
export { targetLanguageSchema } from "./target-language";

export function renderNote(
	note: ReadingNoteData,
	capabilities?: ReadingNotePresentationCapabilities,
): ReactElement;
export function renderNote(
	note: RouteNoteData,
	capabilities?: RouteNotePresentationCapabilities,
): ReactElement;
export function renderNote(
	note: ShadowNoteData,
	capabilities?: ShadowNotePresentationCapabilities,
): ReactElement;
export function renderNote(note: NoteData): ReactElement;
export function renderNote(
	note: NoteData,
	capabilities?:
		| ReadingNotePresentationCapabilities
		| RouteNotePresentationCapabilities
		| ShadowNotePresentationCapabilities,
): ReactElement {
	try {
		switch (note.kind) {
			case "UnitReadingNote":
				return renderReadingNote(
					note,
					capabilities as
						| ReadingNotePresentationCapabilities
						| undefined,
				);
			case "RouteNote":
				return renderRouteNote(
					note,
					capabilities as
						| RouteNotePresentationCapabilities
						| undefined,
				);
			case "ShadowNote":
				return renderShadowNote(
					note,
					capabilities as
						| ShadowNotePresentationCapabilities
						| undefined,
				);
			default:
				return renderUnknownNote(note);
		}
	} catch (cause) {
		return renderErrorNote(cause);
	}
}

function renderUnknownNote(note: never): ReactElement {
	const kind = (note as { readonly kind?: unknown }).kind;
	return renderErrorNote(
		`Unknown Note kind: ${typeof kind === "string" ? kind : "missing"}.`,
		"Unknown Note",
	);
}
