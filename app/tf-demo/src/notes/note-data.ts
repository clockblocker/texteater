import type { FunctionReturnType } from "convex/server";

import type { api } from "../../convex/_generated/api";
import type { NoteKind } from "./note-kind";

type GetNoteData = NonNullable<
	FunctionReturnType<typeof api.presentation.getNote>
>;

export type NoteData = Exclude<GetNoteData, { kind: "ResolutionNote" }>;

export type NoteDataFor<K extends NoteKind> = Extract<NoteData, { kind: K }>;
