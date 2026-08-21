import type { FunctionReturnType } from "convex/server";

import type { api } from "../../convex/_generated/api";
import type { NoteKind } from "./note-kind";

export type NoteData = NonNullable<
	| FunctionReturnType<typeof api.readingNotes.get>
	| FunctionReturnType<typeof api.routeNotes.get>
	| FunctionReturnType<typeof api.shadowNotes.get>
>;

export type NoteDataFor<K extends NoteKind> = Extract<NoteData, { kind: K }>;
