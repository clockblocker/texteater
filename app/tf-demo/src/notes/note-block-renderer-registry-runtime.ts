import type { ReactElement } from "react";
import { DE_NOTE_BLOCK_RENDERER_REGISTRY } from "./de/note-block-renderer-registry";
import type { NoteBlockKind } from "./note-block-kind";
import type { NoteKind } from "./note-kind";

export const NOTE_BLOCK_RENDERER_REGISTRY = {
	de: DE_NOTE_BLOCK_RENDERER_REGISTRY,
} satisfies import("./note-block-renderer-registry").NoteBlockRendererRegistry;

export type RegisteredNoteBlockMap = Partial<
	Record<NoteBlockKind, (context: never) => ReactElement | null>
>;

export function registeredNoteBlockMap(
	language: string,
	noteKind: NoteKind,
	family?: string,
	kind?: string,
): RegisteredNoteBlockMap | null {
	if (language !== "de") return null;
	const noteRegistry = NOTE_BLOCK_RENDERER_REGISTRY.de[noteKind];
	if (noteKind === "Surface") return noteRegistry as RegisteredNoteBlockMap;
	if (!family || !kind) return null;
	const families = noteRegistry as Record<
		string,
		Record<string, RegisteredNoteBlockMap> | undefined
	>;
	return families[family]?.[kind] ?? null;
}
