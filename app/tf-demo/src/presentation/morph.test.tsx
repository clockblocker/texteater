import { describe, expect, test } from "bun:test";
import { BAR_REM, HEADER_REM } from "compass";
import { renderToStaticMarkup } from "react-dom/server";
import type { Id } from "../../convex/_generated/dataModel";
import { DEFAULT_KNOWLEDGE_SETTINGS } from "../../shared/knowledge-preferences";
import { renderNote } from "../notes";
import type { NoteDataFor } from "../notes/universal/note/data";
import { coverHeadingRem } from "./form";
import {
	CARD_CLIP_FADE_OPACITY_CSS,
	HEADING_CHROME_OPACITY_CSS,
	HEADING_CHROME_SCALE_CSS,
	headingGutterCss,
	headingHeightRemAt,
	headingMaxWidthCss,
	headingTitleStyle,
	presentationMorphTarget,
} from "./morph";
import { PresentationContent } from "./presentation-content";

describe("Presentation declarative morph contract", () => {
	test("maps forms to morph targets and interpolates heading height", () => {
		expect(presentationMorphTarget("card")).toBe(0);
		expect(presentationMorphTarget("tail-above")).toBe(0);
		expect(presentationMorphTarget("tail-below")).toBe(0);
		expect(presentationMorphTarget("cover")).toBe(1);
		expect(presentationMorphTarget("ground")).toBe(1);
		expect(presentationMorphTarget("sheet")).toBe(1);

		expect(headingHeightRemAt(0, false)).toBe(HEADER_REM);
		expect(headingHeightRemAt(1, false)).toBe(coverHeadingRem(false));
		expect(headingHeightRemAt(1, true)).toBe(BAR_REM);
		expect(headingHeightRemAt(0.5, false)).toBe(
			(HEADER_REM + coverHeadingRem(false)) / 2,
		);
	});

	test("declares CSS formulas for gutter, rail-locked width, delayed chrome, and title scaling", () => {
		expect(headingGutterCss()).toContain("var(--note-morph)");
		expect(headingMaxWidthCss(50)).toBe(
			"min(53rem, var(--container-note))",
		);
		expect(headingTitleStyle(false)).toMatchObject({
			"--note-title-size": expect.stringContaining(
				"1.125rem + (clamp(1.5rem, 5.5cqi, 1.875rem) - 1.125rem) * var(--note-morph)",
			),
			"--note-title-weight": "calc(580 + 20 * var(--note-morph))",
			"--note-title-leading": "calc(1.25 - 0.1 * var(--note-morph))",
			"--note-title-tracking":
				"calc(-0.02em - 0.008em * var(--note-morph))",
		});
		expect(headingTitleStyle(true)).toMatchObject({
			"--note-title-size": "1rem",
			"--note-title-weight": "570",
			"--note-title-leading": "1.25",
			"--note-title-tracking": "-0.02em",
		});
		expect(HEADING_CHROME_OPACITY_CSS).toContain("- 0.55) / 0.45");
		expect(HEADING_CHROME_SCALE_CSS).toContain("0.92 + 0.08");
		expect(CARD_CLIP_FADE_OPACITY_CSS).toContain(
			"1 - var(--note-morph) * 1.5",
		);
	});

	test("renders one unified PresentationHeading, suppresses fold transition while scrubbed, and enables it on settled Covers", () => {
		for (const chrome of ["reveal", "hairline", "compact-label"] as const) {
			const scrubbed = renderToStaticMarkup(
				<PresentationContent
					form="card"
					columnRem={50}
					morph={0.6}
					sectionChrome={chrome}
					heading={<h1>Bank</h1>}
					body={<p>Body</p>}
				/>,
			);

			expect(scrubbed).toContain("--note-morph:0.6");
			expect(scrubbed).toContain('data-morphing="true"');
			expect(scrubbed).not.toContain("data-title-fold-transition");
			expect(scrubbed).toContain(`data-section-chrome="${chrome}"`);
			expect(scrubbed).toContain('data-title-bar=""');
			expect(scrubbed).toContain('data-under-heading-bar=""');
			expect(scrubbed).toContain("overscroll-y-contain");
			expect(scrubbed).toContain("bg-linear-to-t/oklab");
			expect(scrubbed).toContain("<h1>Bank</h1>");
		}

		const settledCover = renderToStaticMarkup(
			<PresentationContent
				form="cover"
				columnRem={50}
				heading={<h1>Bank</h1>}
				body={<p>Body</p>}
			/>,
		);
		expect(settledCover).toContain('data-title-fold-transition="true"');
		expect(settledCover).not.toContain("data-morphing");
	});
});

describe("Card and Sheet Notes share unified molecules", () => {
	test("Reading translations and personal annotation keep the same unified structure in Card and Sheet", () => {
		const renderWith = (
			presentation: "Card" | "Sheet",
			personalAnnotation: string,
		) =>
			renderToStaticMarkup(
				renderNote({
					noteData: {
						...readingFixture(),
						personalAnnotation,
					},
					capabilities: {
						presentation,
						knowledgeSettings: DEFAULT_KNOWLEDGE_SETTINGS,
						sourceContexts: {
							items: [],
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

		const cardEmpty = renderWith("Card", "");
		const sheetEmpty = renderWith("Sheet", "");
		const cardFilled = renderWith("Card", "Important note");

		// Both Card and Sheet render grouped uppercase EN/RU translation rows with `·`.
		for (const markup of [cardEmpty, sheetEmpty]) {
			expect(markup).toContain('data-slot="note-translation-list"');
			expect(markup).toContain(">en</dt>");
			expect(markup).toContain(">ru</dt>");
			expect(markup).toContain(" · ");
			// Empty annotation field renders a discoverable dashed well (#1353),
			// never the legacy `"…"` Card box.
			expect(markup).toContain('data-slot="note-annotation-field"');
			expect(markup).not.toContain('placeholder="…"');
			expect(markup).toContain("border-dashed");
		}

		// Empty annotation collapses in Card via `visibility="sheet"`, while a
		// filled annotation stays visible in Card (`data-empty="false"`).
		expect(cardEmpty).toMatch(
			/<section[^>]*data-visibility="sheet"[^>]*data-empty="true"/,
		);
		expect(cardFilled).toMatch(/<section[^>]*data-empty="false"/);
		expect(cardFilled).not.toMatch(
			/<section[^>]*data-visibility="sheet"[^>]*data-empty="false"/,
		);
	});
});

function readingFixture(): NoteDataFor<"Reading"> {
	return {
		kind: "Reading",
		target: { kind: "Reading", readingId: "reading-1" as Id<"readings"> },
		reading: {
			unitKind: "Reading",
			ownerKind: "Reading",
			ownerKey: "reading-1",
			readingId: "reading-1" as Id<"readings">,
			emojiDescription: "🏦",
			lemma: {
				unitKind: "Lemma",
				ownerKind: "Lemma",
				ownerKey: "lemma-1",
				lemmaId: "lemma-1" as Id<"lemmas">,
				language: "de",
				family: "Lexeme",
				kind: "NOUN",
				canonicalForm: "Bank",
				coreFeatures: { gender: "Fem" },
			},
		},
		knowledgeState: { status: "Full", activity: "Idle" },
		personalAnnotation: "",
		knowledge: {
			transcription: "baŋk",
			translations: {
				en: [
					[{ kind: "Text", text: "bank" }],
					[{ kind: "Text", text: "financial institution" }],
				],
				ru: [
					[{ kind: "Text", text: "банк" }],
					[{ kind: "Text", text: "кредитная организация" }],
				],
			},
			definition: "Ein Geldinstitut.",
		},
		knowledgeUpdatedAt: null,
		definitionText: { state: "Plain" },
		relations: [],
		relationsTruncated: false,
		grammaticalAlternatives: [],
		pendingRelations: [],
		structuralReferences: [],
		sourceLinks: [],
		sourceContexts: { page: [], continueCursor: "", isDone: true },
	};
}
