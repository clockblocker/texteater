import { expect, test } from "bun:test";
import type { ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { coreGender, nounHeadingArticle } from "../shared/grammatical-gender";
import { DEFAULT_KNOWLEDGE_SETTINGS } from "../shared/knowledge-preferences";
import { linkMembers } from "../src/notes/universal/blocks/renderers/common/link-members";
import { NounArticle } from "../src/notes/universal/blocks/renderers/common/noun-article";
import { SourceQuote } from "../src/notes/universal/blocks/renderers/common/source-quote";
import { ReadingHeader } from "../src/notes/universal/blocks/renderers/reading/header/default";
import { renderDefaultSurfaceHeader } from "../src/notes/universal/blocks/renderers/surface/header/default";
import { ReaderSentence } from "../src/views/reader-sentence";

const lemma = {
	language: "de",
	family: "Lexeme",
	kind: "NOUN",
	canonicalForm: "Aufstieg",
	coreFeatures: { gender: "Masc" },
};

test("only noun and pronoun Core Features supply colour", () => {
	expect(coreGender(lemma)).toBe("Masc");
	expect(coreGender({ ...lemma, kind: "PRON" })).toBe("Masc");
	expect(coreGender({ ...lemma, kind: "PROPN" })).toBe("Masc");
	for (const kind of ["DET", "ADJ", "VERB"])
		expect(coreGender({ ...lemma, kind })).toBeUndefined();
	expect(
		coreGender({
			...lemma,
			coreFeatures: { "gender[psor]": "Fem", gender: null },
		}),
	).toBeUndefined();
	expect(nounHeadingArticle(lemma)).toBe("der");
	expect(
		nounHeadingArticle({ ...lemma, coreFeatures: { gender: null } }),
	).toBeUndefined();
});

test("noun Reading heading has separate article and noun destinations", () => {
	const props = {
		note: {
			reading: {
				lemma: { ...lemma, lemmaId: "lemma-1" },
				emojiDescription: "⛰️⬆️",
			},
			knowledge: {},
		},
		capabilities: {
			knowledgeSettings: DEFAULT_KNOWLEDGE_SETTINGS,
			follow: () => {},
			nounArticle: { follow: () => {}, pending: false, error: null },
		},
	} as unknown as ComponentProps<typeof ReadingHeader>;
	const markup = renderToStaticMarkup(<ReadingHeader {...props} />);
	expect(markup).toContain("[--link:var(--gender-masculine)]");
	expect(markup).toContain("der, open its authored DET Reading");
	expect(markup).toContain("Aufstieg, open its Lemma");
	expect(markup).toContain("⛰️⬆️");
	const followed: unknown[] = [];
	const article = NounArticle({
		lemma,
		lemmaId: props.note.reading.lemma.lemmaId,
		navigation: {
			follow: (id) => followed.push(id),
			pending: false,
			error: null,
		},
	});
	article?.props.children[0].props.onClick();
	expect(followed).toEqual(["lemma-1"]);
});

test("Surface heading links its existing article once and follows the exact analysis", () => {
	const follows: unknown[] = [];
	const article = {
		presented: { normalizedSurface: "einem" },
		target: { kind: "Surface", language: "de", normalizedSurface: "einem" },
		presentationContext: { activeAnalysisKey: "det-dative" },
	};
	const analysis = {
		analysisKey: "noun-dative",
		presented: { lemma },
		article,
	};
	const props = {
		noteData: {
			analyses: [analysis],
			target: { normalizedSurface: "einem Aufstieg" },
			isDone: true,
		},
		PresentationCapabilities: {
			follow: (...args: unknown[]) => follows.push(args),
		},
	} as unknown as Parameters<typeof renderDefaultSurfaceHeader>[0];
	const element = renderDefaultSurfaceHeader(props);
	const markup = renderToStaticMarkup(element);
	expect(markup).toContain("[--link:var(--gender-masculine)]");
	expect(markup).toContain(">einem</button> Aufstieg");
	const title = element.props.children.props.children[0];
	title.props.children.props.children[0].props.onClick();
	expect(follows).toEqual([[article.target, article.presentationContext]]);
	const ambiguous = {
		...props,
		noteData: {
			...props.noteData,
			analyses: [
				analysis,
				{
					...analysis,
					analysisKey: "other",
					presented: {
						lemma: { ...lemma, coreFeatures: { gender: "Fem" } },
					},
				},
			],
		},
	} as unknown as Parameters<typeof renderDefaultSurfaceHeader>[0];
	expect(
		renderToStaticMarkup(renderDefaultSurfaceHeader(ambiguous)),
	).not.toContain("[--link:var(--gender-");
	ambiguous.PresentationCapabilities = {
		...ambiguous.PresentationCapabilities,
		activeAnalysisKey: "other" as never,
	};
	expect(
		renderToStaticMarkup(renderDefaultSurfaceHeader(ambiguous)),
	).toContain("[--link:var(--gender-feminine)]");
});

test("reader and source quotations retain gender with selection, but not for an unencountered visitor", () => {
	const sentence = {
		sentenceId: "s1",
		language: "de",
		stitchedText: "der Frau",
		segments: [
			{
				index: 0,
				kind: "ResolvableText",
				text: "der",
				attestationId: "a1",
				encountered: true,
				gender: "Fem",
			},
			{ index: 1, kind: "Whitespace", text: " " },
			{
				index: 2,
				kind: "ResolvableText",
				text: "Frau",
				attestationId: "a1",
				encountered: true,
				gender: "Fem",
			},
		],
	} as unknown as ComponentProps<typeof ReaderSentence>["sentence"];
	const render = (value: typeof sentence) =>
		renderToStaticMarkup(
			<ReaderSentence
				sentence={value}
				selectedSegmentKey="s1:0"
				onSegmentClick={() => {}}
			/>,
		);
	const markup = render(sentence);
	expect(markup.match(/\[--link:var\(--gender-feminine\)\]/g)).toHaveLength(
		2,
	);
	expect(markup.match(/data-state="selected"/g)).toHaveLength(2);
	expect(
		render({
			...sentence,
			segments: sentence.segments.map((segment) => ({
				...segment,
				encountered: false,
			})),
		}),
	).not.toContain("[--link:var(--gender-");
	const quote = renderToStaticMarkup(
		linkMembers(sentence.segments, [0, 2], () => {}),
	);
	expect(quote.match(/\[--link:var\(--gender-feminine\)\]/g)).toHaveLength(2);
});

test("source quote rule receives only the occurrence members' gender tone", () => {
	const segments = [
		{ kind: "ResolvableText", text: "Aufstieg", gender: "Masc" as const },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "Frau", gender: "Fem" as const },
	];
	const quote = SourceQuote({
		segments,
		memberSegmentIndices: [0],
		origin: { kind: "Text" },
		follow: () => {},
	});
	const markup = renderToStaticMarkup(quote);
	expect(markup).toContain(
		'data-slot="quote" class="[--link:var(--gender-masculine)]',
	);
	expect(markup).not.toContain("--gender-feminine");
	const unencountered = renderToStaticMarkup(
		SourceQuote({
			segments: segments.map(({ kind, text }) => ({ kind, text })),
			memberSegmentIndices: [0],
			origin: { kind: "Text" },
			follow: () => {},
		}),
	);
	expect(unencountered).not.toContain("--gender-");
});
