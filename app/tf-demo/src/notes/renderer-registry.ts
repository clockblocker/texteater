import type { ReactElement } from "react";

import type { SupportedTargetLanguage } from "../../shared/supported-target-language";
import { germanCitation } from "./de/citation";
import { DE_RENDERER_REGISTRY } from "./de/registry";
import { HE_RENDERER_REGISTRY } from "./he/registry";
import {
	bareCitation,
	type CitationPresenter,
} from "./universal/blocks/citation";

import type { NoteBlockKind } from "./universal/blocks/kind";
import type { RendererRegistry } from "./universal/blocks/renderer-registry";
import type { NoteCoordinates } from "./universal/note/data";

export const RENDERER_REGISTRY = {
	de: DE_RENDERER_REGISTRY,
	he: HE_RENDERER_REGISTRY,
} satisfies RendererRegistry;

/** How each language prints a Reading's Citation (ADR 0052). */
const CITATION_PRESENTERS = {
	de: germanCitation,
	he: bareCitation,
} satisfies Record<SupportedTargetLanguage, CitationPresenter>;

export function citationFor(language: string): CitationPresenter {
	return language === "de" ? CITATION_PRESENTERS.de : bareCitation;
}

export type RegisteredBlockMap = Partial<
	Record<NoteBlockKind, (context: never) => ReactElement | null>
>;

/**
 * Erase the route-specific context only at lookup. Language registries keep
 * checking their own renderers against RendererRegistry before entering here.
 */
type RegisteredLanguageMap = Partial<
	Record<
		NoteCoordinates["noteKind"],
		| RegisteredBlockMap
		| Partial<Record<string, Partial<Record<string, RegisteredBlockMap>>>>
	>
>;

/** A new language supplies its registry; dispatch never names a language. */
export function createRegistryLookup(
	registry: Readonly<Record<string, RegisteredLanguageMap>>,
): (coordinates: NoteCoordinates) => RegisteredBlockMap | null {
	return ({ language, noteKind, family, kind }) => {
		const noteRegistry = registry[language]?.[noteKind];
		if (!noteRegistry) return null;
		if (noteKind === "Surface") return noteRegistry as RegisteredBlockMap;
		if (!family || !kind) return null;
		return (
			(
				noteRegistry as Partial<
					Record<string, Partial<Record<string, RegisteredBlockMap>>>
				>
			)[family]?.[kind] ?? null
		);
	};
}

export const registeredBlockMap = createRegistryLookup(RENDERER_REGISTRY);
