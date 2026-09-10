import type { ReactElement } from "react";

import { DE_RENDERER_REGISTRY } from "./de/registry";
import type { NoteBlockKind } from "./universal/blocks/kind";
import type { RendererRegistry } from "./universal/blocks/renderer-registry";
import type { NoteCoordinates } from "./universal/note/data";

export const RENDERER_REGISTRY = {
	de: DE_RENDERER_REGISTRY,
} satisfies RendererRegistry;

export type RegisteredBlockMap = Partial<
	Record<NoteBlockKind, (context: never) => ReactElement | null>
>;

export function registeredBlockMap(
	coordinates: NoteCoordinates,
): RegisteredBlockMap | null {
	const { language, noteKind, family, kind } = coordinates;
	if (language !== "de") return null;
	const noteRegistry = RENDERER_REGISTRY.de[noteKind];
	if (noteKind === "Surface") return noteRegistry as RegisteredBlockMap;
	if (!family || !kind) return null;
	return (
		(
			noteRegistry as Record<
				string,
				Record<string, RegisteredBlockMap> | undefined
			>
		)[family]?.[kind] ?? null
	);
}
