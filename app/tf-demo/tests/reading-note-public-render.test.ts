import { expect, test } from "bun:test";
import type { FunctionReturnType } from "convex/server";
import { renderToStaticMarkup } from "react-dom/server";
import type { api } from "../convex/_generated/api";
import { DEFAULT_KNOWLEDGE_SETTINGS } from "../shared/knowledge-preferences";
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
				personalAnnotation: {
					isSaving: false,
					error: null,
					save: null,
				},
				follow: () => {},
			},
		}),
	);

	// The frame's Reflexive Slot is cited; the Canonical Form is bare (ADR 0052).
	expect(markup).toContain(">sich freuen<");
	expect(markup).toContain('data-slot="ipa"');
	expect(markup).toMatch(/\/<\/span>zɪç<span[^>]*>\//);
	expect(markup).toContain("<span>Verb</span>");
	expect(markup).toMatch(
		/<span data-slot="reader-plain-segment"[^>]*>A <\/span><button data-slot="reader-segment"[^>]*>source<\/button><span data-slot="reader-plain-segment"[^>]*> sentence\.<\/span>/,
	);
	expect(markup).not.toMatch(/<button[^>]*>A <\/button>/);
	expect(markup).toContain('aria-label="traurig, not yet in dictionary"');
	// A Sheet's translations are a row per language: `en`, then its words.
	expect(markup).toContain('>en</dt><dd lang="en">to be happy</dd>');
	expect(markup).toContain("To experience happiness.");
	expect(markup).toContain("Remember the reflexive form.");
	expect(markup.match(/<textarea/g)).toHaveLength(1);
	// The title link, the quote surface, the quoted member, and the Shadow relation.
	expect(markup.match(/<button[^>]*type="button"/g)).toHaveLength(4);
	expect(markup).not.toContain("href=");
	expect(markup.indexOf('data-reading-title=""')).toBeLessThan(
		markup.indexOf(">Translations</h2>"),
	);
	expect(markup.indexOf(">Translations</h2>")).toBeLessThan(
		markup.indexOf(">Definition</h2>"),
	);
	expect(markup.indexOf(">Definition</h2>")).toBeLessThan(
		markup.indexOf(">Relations</h2>"),
	);
	expect(markup.indexOf(">Relations</h2>")).toBeLessThan(
		markup.indexOf(">In context</h2>"),
	);
	expect(markup.indexOf(">In context</h2>")).toBeLessThan(
		markup.indexOf(">Margin note</label></h2>"),
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
				personalAnnotation: {
					isSaving: false,
					error: null,
					save: null,
				},
				follow: () => {},
			},
		}),
	);

	expect(note.knowledge.transcription).toBe("zɪç");
	expect(markup).not.toContain("/zɪç/");
	expect(markup).not.toContain("en: to be happy");
	expect(markup).not.toContain("To experience happiness.");
});

test("the Relations block says quietly when more relations exist than it shows", () => {
	const render = (relationsTruncated: boolean) => {
		const note = { ...readingNote(), relationsTruncated };
		return renderToStaticMarkup(
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
					personalAnnotation: {
						isSaving: false,
						error: null,
						save: null,
					},
					follow: () => {},
				},
			}),
		);
	};

	expect(render(true)).toContain("Some related words aren’t shown");
	expect(render(false)).not.toContain("Some related words aren’t shown");
});

function readingNote(): ReadingNote {
	return {
		kind: "Reading",
		target: { kind: "Reading", readingId: "reading-1" },
		reading: {
			unitKind: "Reading",
			ownerKind: "Reading",
			ownerKey: "reading-key-1",
			readingId: "reading-1",
			emojiDescription: "🪞😊",
			lemma: {
				unitKind: "Lemma",
				ownerKind: "Lemma",
				ownerKey: "lemma-key-1",
				language: "de",
				family: "Lexeme",
				kind: "VERB",
				canonicalForm: "freuen",
				coreFeatures: { hasSepPrefix: null },
			},
		},
		knowledgeState: { status: "Full", activity: "Idle" },
		personalAnnotation: "Remember the reflexive form.",
		knowledge: {
			transcription: "zɪç",
			translations: { en: [[{ kind: "Text", text: "to be happy" }]] },
			definition: "To experience happiness.",
			valency: [[{ kind: "Reflexive", governedCase: "Acc" }]],
		},
		knowledgeUpdatedAt: null,
		definitionText: { state: "Plain" },
		relations: [],
		relationsTruncated: false,
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
					scrollId: "text-1",
					sentencePosition: 0,
					sentenceSnippet: "A source sentence.",
					segments: [
						{ kind: "ResolvableText", text: "A" },
						{ kind: "Whitespace", text: " " },
						{ kind: "ResolvableText", text: "source" },
						{ kind: "Whitespace", text: " " },
						{ kind: "ResolvableText", text: "sentence" },
						{ kind: "Punctuation", text: "." },
					],
					memberSegmentIndices: [2],
					memberTexts: ["source"],
					origin: { kind: "Scroll" },
					target: {
						kind: "Scroll",
						scrollId: "text-1",
						focusAttestationId: "attestation-1",
						title: "A source sentence.",
					},
				},
			],
			continueCursor: "",
			isDone: true,
		},
	} as unknown as ReadingNote;
}
