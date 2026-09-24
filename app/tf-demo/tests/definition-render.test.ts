import { expect, test } from "bun:test";
import type { FunctionReturnType } from "convex/server";
import { renderToStaticMarkup } from "react-dom/server";

import type { api } from "../convex/_generated/api";
import { DEFAULT_KNOWLEDGE_SETTINGS } from "../shared/knowledge-preferences";
import { renderNote } from "../src/notes";
import type { ReadingPresentationCapabilities } from "../src/notes/universal/note/capabilities";

type ReadingNote = Extract<
	NonNullable<FunctionReturnType<typeof api.readingNotes.get>>,
	{ readonly kind: "Reading" }
>;

const SENTENCE = {
	sentenceId: "sentences-definition",
	position: 0,
	language: "de",
	stitchedText: "Ein Haus ist ein Haus.",
	segments: [
		{ index: 0, kind: "ResolvableText", text: "Ein", encountered: false },
		{ index: 1, kind: "Whitespace", text: " ", encountered: false },
		{
			index: 2,
			kind: "ResolvableText",
			text: "Haus",
			attestationId: "attestations-1",
			encountered: true,
		},
		{ index: 3, kind: "Whitespace", text: " ", encountered: false },
		{ index: 4, kind: "ResolvableText", text: "ist", encountered: false },
		{ index: 5, kind: "Whitespace", text: " ", encountered: false },
		{ index: 6, kind: "ResolvableText", text: "ein", encountered: false },
		{ index: 7, kind: "Whitespace", text: " ", encountered: false },
		{ index: 8, kind: "ResolvableText", text: "Haus", encountered: false },
		{ index: 9, kind: "Punctuation", text: ".", encountered: false },
	],
} as const;

function render(
	definitionText: ReadingNote["definitionText"],
	overrides: Partial<ReadingPresentationCapabilities> & {
		activity?: "Idle" | "Loading";
		definition?: ReadingPresentationCapabilities["definition"];
	} = {},
	sourceContexts: ReadingNote["sourceContexts"]["page"] = [],
) {
	const note = {
		kind: "Reading",
		target: { kind: "Reading", readingId: "readings-1" },
		reading: {
			unitKind: "Reading",
			ownerKind: "Reading",
			ownerKey: "reading:haus",
			readingId: "readings-1",
			emojiDescription: "🏠",
			lemma: {
				unitKind: "Lemma",
				ownerKind: "Lemma",
				ownerKey: "lemma:haus",
				lemmaId: "lemmas-1",
				language: "de",
				family: "Lexeme",
				kind: "NOUN",
				canonicalForm: "Haus",
				coreFeatures: { gender: "Neut", hyph: null },
			},
		},
		knowledgeState: {
			status: "Full",
			activity: overrides.activity ?? "Idle",
		},
		personalAnnotation: "",
		knowledge:
			definitionText.state === "Absent"
				? {}
				: { definition: "Ein Haus ist ein Haus." },
		knowledgeUpdatedAt: null,
		definitionText,
		relations: [],
		relationsTruncated: false,
		grammaticalAlternatives: [],
		pendingRelations: [],
		structuralReferences: [],
		sourceContexts: {
			page: sourceContexts,
			continueCursor: "",
			isDone: true,
		},
	} as unknown as ReadingNote;
	return renderToStaticMarkup(
		renderNote({
			noteData: note,
			capabilities: {
				presentation: overrides.presentation ?? "Sheet",
				knowledgeSettings: DEFAULT_KNOWLEDGE_SETTINGS,
				sourceContexts: {
					items: sourceContexts,
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
				...(overrides.definition
					? { definition: overrides.definition }
					: {}),
				follow: () => {},
			},
		}),
	);
}

const selection = {
	focus: null,
	selectedSegmentKey: null,
	error: null,
	selectSegment: async () => {},
};

test("a Sheet reads the definition as a Sentence of selectable Segments", () => {
	const markup = render(
		{ state: "Ready", sentence: SENTENCE },
		{ definition: selection },
	);
	expect(markup).toContain('aria-label="Definition"');
	expect(markup).toContain(">Definition</h2>");
	expect(markup.match(/data-slot="reader-segment"/g)).toHaveLength(5);
	expect(markup).toContain('aria-label="Haus, part of a known occurrence"');
	expect(markup).toContain('aria-label="ist, click to resolve"');
	expect(markup).not.toContain('data-focused="true"');
});

test("a focused occurrence sets the block back and lights only its members", () => {
	const markup = render(
		{ state: "Ready", sentence: SENTENCE },
		{
			definition: {
				...selection,
				focus: { attestationId: "attestations-1" },
			},
		},
	);
	expect(markup).toContain('data-focused="true"');
	expect(markup.match(/aria-pressed="true"/g)).toHaveLength(1);
	expect(markup).toMatch(/aria-pressed="true"[^>]*>Haus<\/button>/);
});

test("a Card and a definition without a Definition Text stay plain prose", () => {
	const card = render(
		{ state: "Ready", sentence: SENTENCE },
		{ presentation: "Card" },
	);
	expect(card).toContain("Ein Haus ist ein Haus.");
	expect(card).not.toContain('data-slot="reader-segment"');
	const plain = render({ state: "Plain" }, { definition: selection });
	expect(plain).toContain("Ein Haus ist ein Haus.");
	expect(plain).not.toContain('data-slot="reader-segment"');
});

test("the block waits for generation and segmentation, and keeps the prose when segmentation failed", () => {
	const pending = render({ state: "Pending" }, { definition: selection });
	expect(pending).toContain('aria-busy="true"');
	expect(pending).not.toContain("Ein Haus ist ein Haus.");
	const generating = render({ state: "Absent" }, { activity: "Loading" });
	expect(generating).toContain('aria-busy="true"');
	const absent = render({ state: "Absent" });
	expect(absent).not.toContain('aria-label="Definition"');
	const failed = render(
		{ state: "Failed", failureMessage: "Segmenter unavailable." },
		{ definition: selection },
	);
	expect(failed).toContain("Ein Haus ist ein Haus.");
	expect(failed).toContain('role="alert"');
	expect(failed).toContain("Segmenter unavailable.");
});

test("a definition-sourced Source Context is prefixed with the defined Reading and leads back to it", () => {
	const markup = render({ state: "Plain" }, {}, [
		{
			attestationId: "attestations-9",
			textId: "texts-definition",
			sentencePosition: 0,
			sentenceSnippet: "Ein Bauwerk mit Dach.",
			segments: [
				{ kind: "ResolvableText", text: "Ein" },
				{ kind: "Whitespace", text: " " },
				{ kind: "ResolvableText", text: "Bauwerk" },
				{ kind: "Whitespace", text: " " },
				{ kind: "ResolvableText", text: "mit" },
				{ kind: "Whitespace", text: " " },
				{ kind: "ResolvableText", text: "Dach" },
				{ kind: "Punctuation", text: "." },
			],
			memberSegmentIndices: [6],
			memberTexts: ["Dach"],
			origin: {
				kind: "Definition",
				readingId: "readings-2",
				emojiDescription: "🏡",
				canonicalForm: "Gebäude",
			},
			target: {
				kind: "Reading",
				readingId: "readings-2",
				focus: { kind: "Definition", attestationId: "attestations-9" },
			},
		} as unknown as ReadingNote["sourceContexts"]["page"][number],
	]);
	expect(markup).toContain('data-origin="Definition"');
	expect(markup).toContain('aria-label="Gebäude, open its Reading Note"');
	expect(markup).toContain("🏡");
	expect(markup).toContain("Gebäude:");
	expect(markup).toContain(
		'aria-label="Dach, open in the definition of Gebäude"',
	);
});

test("a Source Context lights the attested instance of a repeated word, by index", () => {
	const markup = render({ state: "Plain" }, {}, [
		{
			attestationId: "attestations-2",
			textId: "texts-1",
			sentencePosition: 0,
			sentenceSnippet: "Haus und Haus",
			segments: [
				{ kind: "ResolvableText", text: "Haus" },
				{ kind: "Whitespace", text: " " },
				{ kind: "ResolvableText", text: "und" },
				{ kind: "Whitespace", text: " " },
				{ kind: "ResolvableText", text: "Haus" },
			],
			memberSegmentIndices: [4],
			memberTexts: ["Haus"],
			origin: { kind: "Text" },
			target: { kind: "Text", textId: "texts-1" },
		} as unknown as ReadingNote["sourceContexts"]["page"][number],
	]);
	expect(markup.match(/data-slot="reader-segment"/g)).toHaveLength(1);
	expect(markup).toMatch(/Haus und <\/span><button[^>]*>Haus<\/button>/);
});
