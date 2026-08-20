import type { ReadingNoteRendererOverrideRegistry } from "../renderer-overrides";
import { renderHeaderDeLexemeVerb } from "./renderer-overrides/lexeme/verb/header/header-de-lexeme-verb-renderer";

export const DE_READING_NOTE_RENDERER_OVERRIDES = {
	Lexeme: {
		VERB: {
			Header: renderHeaderDeLexemeVerb,
		},
	},
} satisfies ReadingNoteRendererOverrideRegistry<"de">;
