import { expect, test } from "bun:test";
import type { FunctionReturnType } from "convex/server";
import { DEFAULT_KNOWLEDGE_SETTINGS } from "dumrel";
import { renderToStaticMarkup } from "react-dom/server";

import type { api } from "../convex/_generated/api";
import { renderNote } from "../src/notes";

type ReadingNote = Extract<
	NonNullable<FunctionReturnType<typeof api.readingNotes.get>>,
	{ readonly kind: "Reading" }
>;

test("the public renderer preserves German Reading output and verb specialization", () => {
	const note = readingNote();
	const markup = renderToStaticMarkup(
		renderNote({
			noteData: note,
			capabilities: {
				knowledgeSettings: DEFAULT_KNOWLEDGE_SETTINGS,
				sourceContexts: {
					items: note.sourceContexts.page,
					hasMore: false,
					isLoading: false,
					error: null,
					loadMore: null,
				},
				definition: { isSaving: false, error: null, save: null },
				follow: () => {},
			},
		}),
	);

	expect(markup).toContain("sich ");
	expect(markup).toContain("reading-note__ipa");
	expect(markup).toContain("/zɪç/");
	expect(markup).toContain("de");
	expect(markup).not.toContain('role="alert"');
});

function readingNote(): ReadingNote {
	return {
		kind: "Reading",
		target: { kind: "Reading", readingId: "reading-1" },
		reading: {
			ownerKind: "Reading",
			ownerKey: "reading-key-1",
			readingId: "reading-1",
			emojiDescription: "🏃",
			lemma: {
				ownerKind: "Lemma",
				ownerKey: "lemma-key-1",
				language: "de",
				family: "Lexeme",
				kind: "VERB",
				canonicalForm: "sich freuen",
				coreFeatures: {
					lexicallyReflexive: "Yes",
					hasSepPrefix: null,
				},
			},
		},
		knowledgeState: { status: "Full", activity: "Idle" },
		knowledge: {
			transcription: "zɪç",
			translations: { en: ["to be happy"] },
		},
		knowledgeUpdatedAt: null,
		relations: [],
		pendingRelations: [],
		structuralReferences: [],
		sourceContexts: { page: [], continueCursor: "", isDone: true },
	} as unknown as ReadingNote;
}
