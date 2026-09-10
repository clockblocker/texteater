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

test("the public renderer preserves ordered German Reading output, workspace commands, and verb specialization", () => {
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
	expect(markup).toContain("A source sentence.");
	expect(markup).toContain("relation to Unit Shadow traurig");
	expect(markup).toContain("en: to be happy");
	expect(markup).toContain("To experience happiness.");
	expect(markup.match(/<button type="button"/g)).toHaveLength(2);
	expect(markup).not.toContain("href=");
	expect(markup.indexOf('data-reading-title=""')).toBeLessThan(
		markup.indexOf('aria-label="Source Contexts"'),
	);
	expect(markup.indexOf('aria-label="Source Contexts"')).toBeLessThan(
		markup.indexOf('aria-label="Relations"'),
	);
	expect(markup.indexOf('aria-label="Relations"')).toBeLessThan(
		markup.indexOf('aria-label="Translations"'),
	);
	expect(markup.indexOf('aria-label="Translations"')).toBeLessThan(
		markup.indexOf('aria-label="Definition"'),
	);
	expect(markup).not.toContain('role="alert"');
});

test("the public renderer applies capability visibility without reshaping NoteData", () => {
	const note = readingNote();
	const markup = renderToStaticMarkup(
		renderNote({
			noteData: note,
			capabilities: {
				knowledgeSettings: {
					...DEFAULT_KNOWLEDGE_SETTINGS,
					transcription: false,
					definition: false,
					translations: { en: false, ru: true },
				},
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

	expect(note.knowledge.transcription).toBe("zɪç");
	expect(markup).not.toContain("/zɪç/");
	expect(markup).not.toContain("en: to be happy");
	expect(markup).not.toContain("To experience happiness.");
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
			definition: "To experience happiness.",
		},
		knowledgeUpdatedAt: null,
		relations: [],
		pendingRelations: [
			{
				locatorKey: "pending-1",
				relation: "antonym",
				targetCanonicalForm: "traurig",
				targetFamily: "Lexeme",
				targetKind: "ADJ",
				target: { kind: "Shadow", shadowId: "shadow-1" },
			},
		],
		structuralReferences: [],
		sourceContexts: {
			page: [
				{
					attestationId: "attestation-1",
					textId: "text-1",
					sentencePosition: 0,
					sentenceSnippet: "A source sentence.",
					memberSegmentIndices: [1],
					target: {
						kind: "Text",
						textId: "text-1",
						focusAttestationId: "attestation-1",
					},
				},
			],
			continueCursor: "",
			isDone: true,
		},
	} as unknown as ReadingNote;
}
