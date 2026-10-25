import type { ReactElement } from "react";

import type { SupportedTargetLanguage } from "../../shared/supported-target-language";
import { germanCitation } from "./de/citation";
import { DE_RENDERER_REGISTRY } from "./de/registry";
import {
	bareCitation,
	type CitationPresenter,
} from "./universal/blocks/citation";
import type { NoteBlockKind } from "./universal/blocks/kind";
import type { RendererRegistry } from "./universal/blocks/renderer-registry";
import type { NoteCoordinates } from "./universal/note/data";

export const RENDERER_REGISTRY = {
	de: DE_RENDERER_REGISTRY,
} satisfies RendererRegistry;

/** How each language prints a Reading's Citation (ADR 0052). */
const CITATION_PRESENTERS = {
	de: germanCitation,
} satisfies Record<SupportedTargetLanguage, CitationPresenter>;

export function citationFor(language: string): CitationPresenter {
	return language === "de" ? CITATION_PRESENTERS.de : bareCitation;
}

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
