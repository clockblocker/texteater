import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { Id } from "../../../../convex/_generated/dataModel";
import { DEFAULT_KNOWLEDGE_SETTINGS } from "../../../../shared/knowledge-preferences";
import { renderNote, renderNoteParts } from "../../render-note";
import { bareCitation } from "../blocks/citation";
import { FormationsSection } from "../blocks/renderers/common/formations";
import {
	formatAttestationMetadata,
	formatLemmaClassLine,
	formatLemmaMetadata,
	formatShadowMetadata,
} from "../caption/metadata";
import type { NoteDataFor } from "./data";

function readingFixture(
	overrides: Partial<NoteDataFor<"Reading">> = {},
): NoteDataFor<"Reading"> {
	return {
		kind: "Reading",
		target: { kind: "Reading", readingId: "reading-1" as Id<"readings"> },
		reading: {
			unitKind: "Reading",
			ownerKind: "Reading",
			ownerKey: "reading:marktplatz",
			readingId: "reading-1" as Id<"readings">,
			emojiDescription: "🏛️",
			lemma: {
				unitKind: "Lemma",
				ownerKind: "Lemma",
				ownerKey: "lemma:marktplatz",
				lemmaId: "lemma-1" as Id<"lemmas">,
				language: "de",
				family: "Lexeme",
				kind: "NOUN",
				canonicalForm: "Marktplatz",
				coreFeatures: { gender: "Masc" },
			},
		},
		knowledgeState: { status: "Full", activity: "Idle" },
		personalAnnotation: "",
		knowledge: {
			transcription: "ˈmaʁktˌplats",
			translations: {
				en: [[{ kind: "Text", text: "marketplace" }]],
			},
			definition: "Ein öffentlicher Platz für Handel.",
		},
		knowledgeUpdatedAt: null,
		definitionText: { state: "Plain" },
		breakdown: {
			constituents: [
				{
					letters: "Markt",
					target: {
						canonicalForm: "Markt",
						link: {
							kind: "Lemma",
							lemmaId: "lemma-markt" as Id<"lemmas">,
						},
					},
				},
				{
					letters: "platz",
					target: {
						canonicalForm: "Platz",
						link: {
							kind: "Lemma",
							lemmaId: "lemma-platz" as Id<"lemmas">,
						},
					},
				},
			],
			morphemes: [
				{
					letters: "Markt",
					kind: "Root",
					target: {
						canonicalForm: "Markt",
						link: {
							kind: "Lemma",
							lemmaId: "lemma-markt" as Id<"lemmas">,
						},
					},
				},
				{
					letters: "platz",
					kind: "Root",
					target: {
						canonicalForm: "Platz",
						link: {
							kind: "Lemma",
							lemmaId: "lemma-platz" as Id<"lemmas">,
						},
					},
				},
				{
					letters: "",
					kind: "Ending",
					target: null,
				},
			],
		},
		relations: [],
		relationsTruncated: false,
		grammaticalAlternatives: [],
		pendingRelations: [],
		structuralReferences: [],
		sourceLinks: [
			{
				meaning: "Drifted",
				targetCanonicalForm: "handeln",
				target: {
					kind: "Shadow",
					shadowId: "shadow-handeln" as Id<"shadows">,
				},
			},
		],
		sourceContexts: {
			page: [
				{
					attestationId: "att-1" as Id<"attestations">,
					scrollId: "scroll-1" as Id<"scrolls">,
					sentencePosition: 0,
					sentenceSnippet: "Der Marktplatz ist belebt.",
					segments: [
						{ kind: "ResolvableText", text: "Der" },
						{ kind: "Whitespace", text: " " },
						{
							kind: "ResolvableText",
							text: "Marktplatz",
							gender: "Masc",
						},
						{ kind: "Punctuation", text: "." },
					],
					memberSegmentIndices: [2],
					memberTexts: ["Marktplatz"],
					origin: { kind: "Scroll" },
					target: {
						kind: "Scroll",
						scrollId: "scroll-1" as Id<"scrolls">,
						focusAttestationId: "att-1" as Id<"attestations">,
						title: "Der Marktplatz ist belebt.",
					},
				},
			],
			continueCursor: "",
			isDone: false,
		},
		...overrides,
	} as unknown as NoteDataFor<"Reading">;
}

test("formats plain learner metadata across families, kinds, and Note types", () => {
	expect(
		formatLemmaMetadata({
			language: "de",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: { gender: "Masc" },
		}),
	).toEqual(["Noun", "masculine (der)"]);
	expect(
		formatLemmaMetadata({
			language: "de",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: { hasSepPrefix: null },
		}),
	).toEqual(["Verb"]);
	expect(
		formatLemmaMetadata({
			language: "de",
			family: "Locution",
			kind: "VERB",
			coreFeatures: {},
		}),
	).toEqual(["Phrase", "verb"]);
	expect(
		formatLemmaMetadata({
			language: "de",
			family: "Saying",
			kind: "Saying",
			coreFeatures: {},
		}),
	).toEqual(["Saying"]);
	expect(
		formatLemmaMetadata({
			language: "de",
			family: "Morpheme",
			kind: "Prefix",
			coreFeatures: {},
		}),
	).toEqual(["Prefix"]);
	expect(formatLemmaClassLine("Locution", "NOUN")).toBe("Phrase · noun");
	expect(
		formatAttestationMetadata({
			members: [{ orthography: "Standard" }],
			realizationCoverage: "Full",
		}),
	).toEqual(["In text"]);
	expect(formatShadowMetadata({ family: "Lexeme", kind: "NOUN" })).toEqual([
		"Not yet in dictionary",
		"Noun",
	]);
});

test("Reading Note renders in lookup priority order with humanized labels, A11y semantics, and MorphemesLine polish", () => {
	const note = readingFixture();
	const capabilities = {
		presentation: "Sheet" as const,
		knowledgeSettings: DEFAULT_KNOWLEDGE_SETTINGS,
		sourceContexts: {
			items: note.sourceContexts.page,
			hasMore: true,
			isLoading: false,
			error: null,
			loadMore: async () => {},
		},
		personalAnnotation: {
			isSaving: false,
			error: "Network error",
			save: async () => {},
		},
		follow: () => {},
	};
	const markup = renderToStaticMarkup(
		renderNote({ noteData: note, capabilities }),
	);

	// Mid-sentence reading lookup priority order
	const positions = [
		markup.indexOf('data-reading-title=""'),
		markup.indexOf(">Translations</h2>"),
		markup.indexOf(">Definition</h2>"),
		markup.indexOf(">Breakdown</h2>"),
		markup.indexOf(">In context</h2>"),
		markup.indexOf(">Margin note</label></h2>"),
	];
	for (let i = 1; i < positions.length; i++) {
		const previous = positions[i - 1] ?? -1;
		expect(previous).toBeGreaterThan(-1);
		expect(positions[i]).toBeGreaterThan(previous);
	}

	// Heading emoji silenced & spaced via margin rather than whitespace-pre hack
	expect(markup).toContain(
		'<span aria-hidden="true" class="me-[0.38em] inline-flex shrink-0 items-center text-[0.88em] leading-none translate-y-[-0.03em] text-ink">🏛️</span>',
	);
	expect(markup).not.toContain("whitespace-pre");

	// Target language attributes on German containers
	expect(markup).toMatch(/data-reading-title=""[^>]*lang="de"/);
	expect(markup).toMatch(/<div data-slot="note-prose"[^>]*lang="de"/);
	expect(markup).toMatch(/<blockquote data-slot="quote"[^>]*lang="de"/);
	expect(markup).toMatch(/data-slot="note-list"[^>]*lang="de"/);

	// MorphemesLine wrapped in NoteMorphReveal, scaled, quiet resting marks, focus-visible & min-w-6
	expect(markup).toContain(
		'<div data-slot="note-morph-reveal" data-visibility="sheet"',
	);
	expect(markup).toContain(
		'data-breakdown-line="morphemes" class="text-[1.0625em] tracking-[0.02em]"',
	);
	const morphemesHtml =
		markup.match(
			/data-breakdown-line="morphemes".*?<\/div><\/div><\/div>/,
		)?.[0] ?? "";
	expect(morphemesHtml).toContain("opacity:0.32");
	expect(morphemesHtml).toContain(
		"min-w-6 cursor-pointer touch-manipulation pt-[0.45em]",
	);
	expect(morphemesHtml).toContain("focus-visible:outline-link");
	expect(morphemesHtml).not.toContain("outline-none");

	// ConstituentsLine: non-breaking space before `+`, omits redundant `, shown as`
	expect(markup).toContain("\u00A0+ ");
	expect(markup).not.toContain("Markt, shown as Markt");
	expect(markup).toContain('aria-label="Platz, shown as platz"');

	// SourceLine: no faux italic, leads aria-label with visible word
	const sourceLineHtml =
		markup.match(/data-breakdown-line="source".*?<\/div>/)?.[0] ?? "";
	expect(sourceLineHtml).toContain("font-normal text-ink-soft");
	expect(sourceLineHtml).not.toContain("italic");
	expect(sourceLineHtml).toContain('aria-label="handeln, pending note"');

	// Calm copy & form semantics
	expect(markup).toContain("Load more passages");
	expect(markup).toContain('name="personal-annotation"');
	expect(markup).toContain('aria-invalid="true"');
	expect(markup).toContain("field-sizing-content");
	expect(markup).toContain(
		'placeholder="Jot a memory hook, nuance, or example…"',
	);
	expect(markup).toContain('<p role="status" class="sr-only"></p>');
	expect(markup).toContain("Try again");

	// Footer metadata in plain learner language
	expect(markup).toContain("<span>Noun</span><span>masculine (der)</span>");

	// No redundant aria-label on NoteSection when label is provided
	expect(markup).not.toContain('aria-label="Translations"');
	expect(markup).not.toContain('aria-label="Definition"');
	expect(markup).not.toContain('aria-label="Breakdown"');
	expect(markup).not.toContain('aria-label="In context"');
	expect(markup).not.toContain('aria-label="Margin note"');
});

test("Breakdown section folds to sheet-only when only morphemes are present, and split Body uses div frame", () => {
	const morphemesOnly = readingFixture({
		breakdown: {
			morphemes: [
				{ letters: "schick", kind: "Root", target: null },
				{ letters: "en", kind: "Ending", target: null },
			],
		},
		sourceLinks: [],
	});
	const parts = renderNoteParts({
		noteData: morphemesOnly,
		capabilities: {
			presentation: "Card",
			knowledgeSettings: DEFAULT_KNOWLEDGE_SETTINGS,
			sourceContexts: {
				items: [],
				hasMore: false,
				isLoading: false,
				error: null,
				loadMore: null,
			},
			personalAnnotation: { isSaving: false, error: null, save: null },
			follow: () => {},
		},
	});
	const bodyMarkup = renderToStaticMarkup(parts.body);
	expect(bodyMarkup).toContain('<div data-slot="note-frame"');
	expect(bodyMarkup).not.toContain("<article");
	expect(bodyMarkup).toMatch(
		/<section data-slot="note-section" data-visibility="sheet"[^>]*>[\s\S]*?>Breakdown<\/h2>/,
	);
});

test("Formations toggle uses verb-first copy with tabular-nums", () => {
	const formation = (id: string, canonicalForm: string) => ({
		readingId: id as Id<"readings">,
		canonicalForm,
		emojiDescription: "🔹",
		kind: "VERB",
		reflexive: null,
		target: { kind: "Reading" as const, readingId: id as Id<"readings"> },
	});
	const markup = renderToStaticMarkup(
		<FormationsSection
			formations={[
				{
					group: "Prefixed",
					formations: [
						formation("r1", "abkaufen"),
						formation("r2", "einkaufen"),
						formation("r3", "verkaufen"),
						formation("r4", "ankaufen"),
						formation("r5", "aufkaufen"),
					],
				},
			]}
			follow={() => {}}
			cite={bareCitation}
		/>,
	);
	expect(markup).toContain("Show 2 more");
	expect(markup).toContain("tabular-nums");
	expect(markup).not.toContain('aria-label="Formations"');
});
