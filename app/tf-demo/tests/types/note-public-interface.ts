import type { FunctionReturnType } from "convex/server";
import { DEFAULT_KNOWLEDGE_SETTINGS } from "dumrel";

import type { api } from "../../convex/_generated/api";
import { renderNote } from "../../src/notes";

type ReadingNote = Extract<
	NonNullable<FunctionReturnType<typeof api.readingNotes.get>>,
	{ readonly kind: "Reading" }
>;
type ShadowNote = Extract<
	NonNullable<FunctionReturnType<typeof api.shadowNotes.get>>,
	{ readonly kind: "Shadow" }
>;

declare const reading: ReadingNote;
declare const shadow: ShadowNote;

renderNote({
	noteData: reading,
	capabilities: {
		knowledgeSettings: DEFAULT_KNOWLEDGE_SETTINGS,
		sourceContexts: {
			items: reading.sourceContexts.page,
			hasMore: !reading.sourceContexts.isDone,
			isLoading: false,
			error: null,
			loadMore: null,
		},
		definition: { isSaving: false, error: null, save: null },
		follow: () => {},
	},
});

// @ts-expect-error Reading and Shadow capabilities cannot be paired.
renderNote({
	noteData: reading,
	capabilities: {
		references: {
			items: shadow.references.page,
			hasMore: false,
			isLoading: false,
			error: null,
			loadMore: null,
		},
		cleanup: {
			activeLocator: null,
			actionError: null,
			outcome: null,
			resolve: null,
		},
		follow: () => {},
	},
});

// @ts-expect-error The public renderer accepts one object, never positional arguments.
renderNote(reading, {});
