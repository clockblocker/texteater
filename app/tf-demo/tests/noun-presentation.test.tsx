import { expect, test } from "bun:test";
import type { FunctionReturnType } from "convex/server";
import {
	type ComponentProps,
	isValidElement,
	type ReactElement,
	type ReactNode,
} from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { api } from "../convex/_generated/api";
import { coreGender, nounHeadingArticle } from "../shared/grammatical-gender";
import { DEFAULT_KNOWLEDGE_SETTINGS } from "../shared/knowledge-preferences";
import { renderNote } from "../src/notes";
import { ReaderSentence } from "../src/views/reader-sentence";

type ReadingNote = Extract<
	NonNullable<FunctionReturnType<typeof api.readingNotes.get>>,
	{ readonly kind: "Reading" }
>;
type SurfaceNote = Extract<
	NonNullable<FunctionReturnType<typeof api.routeNotes.get>>,
	{ readonly kind: "Surface" }
>;
type NounArticleNavigation = NonNullable<
	Extract<
		Parameters<typeof renderNote>[0],
		{ readonly noteData: ReadingNote }
	>["capabilities"]
>["nounArticle"];

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
	const followed: unknown[] = [];
	const note = renderReading(readingNote(), {
		follow: (id) => followed.push(id),
		pending: false,
		error: null,
	});
	const markup = renderToStaticMarkup(blockOf(note, "Header"));
	expect(markup).toContain("[--link:var(--gender-masculine)]");
	expect(markup).toContain("der, open its authored DET Reading");
	expect(markup).toContain("Aufstieg, open its Lemma");
	expect(markup).toContain("⛰️⬆️");
	click(note, "der, open its authored DET Reading");
	expect(followed).toEqual(["lemma-1"]);
});

test("Surface heading links its existing article once and follows the exact analysis", () => {
	const follows: unknown[] = [];
	const follow = (...args: unknown[]) => follows.push(args);
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
	const surfaceNote = (analyses: readonly unknown[]) =>
		({
			kind: "Surface",
			target: {
				kind: "Surface",
				language: "de",
				normalizedSurface: "einem Aufstieg",
			},
			analyses,
			continueCursor: "",
			isDone: true,
		}) as unknown as SurfaceNote;
	const heading = (
		analyses: readonly unknown[],
		activeAnalysisKey?: string,
	) =>
		blockOf(
			renderNote({
				noteData: surfaceNote(analyses),
				capabilities: {
					follow,
					...(activeAnalysisKey
						? { activeAnalysisKey: activeAnalysisKey as never }
						: {}),
				},
			}),
			"Header",
		);
	const element = heading([analysis]);
	const markup = renderToStaticMarkup(element);
	expect(markup).toContain("[--link:var(--gender-masculine)]");
	expect(markup).toContain(">einem</button> Aufstieg");
	click(element, "einem, open its DET Surface");
	expect(follows).toEqual([[article.target, article.presentationContext]]);
	const ambiguous = [
		analysis,
		{
			...analysis,
			analysisKey: "other",
			presented: {
				lemma: { ...lemma, coreFeatures: { gender: "Fem" } },
			},
		},
	];
	expect(renderToStaticMarkup(heading(ambiguous))).not.toContain(
		"[--link:var(--gender-",
	);
	expect(renderToStaticMarkup(heading(ambiguous, "other"))).toContain(
		"[--link:var(--gender-feminine)]",
	);
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
	const quote = sourceQuote(sentence.segments, [0, 2]);
	expect(
		quote.match(
			/data-slot="reader-segment"[^>]*\[--link:var\(--gender-feminine\)\]/g,
		),
	).toHaveLength(2);
});

test("source quote rule receives only the occurrence members' gender tone", () => {
	const segments = [
		{ kind: "ResolvableText", text: "Aufstieg", gender: "Masc" as const },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "Frau", gender: "Fem" as const },
	];
	const markup = sourceQuote(segments, [0]);
	expect(markup).toContain(
		'data-slot="quote" class="[--link:var(--gender-masculine)]',
	);
	expect(markup).not.toContain("--gender-feminine");
	expect(
		sourceQuote(
			segments.map(({ kind, text }) => ({ kind, text })),
			[0],
		),
	).not.toContain("--gender-");
});

function readingNote(sourceContexts: readonly unknown[] = []): ReadingNote {
	return {
		kind: "Reading",
		target: { kind: "Reading", readingId: "reading-1" },
		reading: {
			unitKind: "Reading",
			ownerKind: "Reading",
			ownerKey: "reading:aufstieg",
			readingId: "reading-1",
			emojiDescription: "⛰️⬆️",
			lemma: {
				...lemma,
				unitKind: "Lemma",
				ownerKind: "Lemma",
				ownerKey: "lemma:aufstieg",
				lemmaId: "lemma-1",
			},
		},
		knowledgeState: { status: "Full", activity: "Idle" },
		personalAnnotation: "",
		knowledge: {},
		knowledgeUpdatedAt: null,
		definitionText: { state: "Absent" },
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
}

function renderReading(
	note: ReadingNote,
	nounArticle?: NounArticleNavigation,
): ReactElement {
	return renderNote({
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
			personalAnnotation: { isSaving: false, error: null, save: null },
			...(nounArticle ? { nounArticle } : {}),
			follow: () => {},
		},
	});
}

/** The Source Contexts Block of a Reading Note met in one Text Sentence. */
function sourceQuote(
	segments: readonly unknown[],
	memberSegmentIndices: readonly number[],
): string {
	const note = readingNote([
		{
			attestationId: "attestation-1",
			textId: "text-1",
			sentencePosition: 0,
			sentenceSnippet: "",
			segments,
			memberSegmentIndices,
			memberTexts: [],
			origin: { kind: "Text" },
			target: { kind: "Text", textId: "text-1" },
		},
	]);
	return renderToStaticMarkup(blockOf(renderReading(note), "SourceContexts"));
}

type Props = Readonly<Record<string, unknown>>;

/**
 * The first element whose props match, searching an element's children
 * before, when `render` is set, rendering it as a function component.
 * Rendering one runs its hooks, so such a search must run inside a render.
 */
function find(
	node: ReactNode,
	matches: (props: Props) => boolean,
	render = false,
): ReactElement<Props> | undefined {
	if (Array.isArray(node)) {
		for (const child of node) {
			const found = find(child, matches, render);
			if (found) return found;
		}
		return undefined;
	}
	if (!isValidElement<Props>(node)) return undefined;
	if (matches(node.props)) return node;
	const found = find(node.props.children as ReactNode, matches, render);
	const { type } = node;
	if (
		found ||
		!render ||
		typeof type !== "function" ||
		type.prototype?.isReactComponent
	)
		return found;
	return find(
		(type as (props: Props) => ReactNode)(node.props),
		matches,
		render,
	);
}

/** The element a rendered Note shows for one Block. */
function blockOf(note: ReactElement, blockKind: string): ReactElement {
	const block = find(note, (props) => props.blockKind === blockKind);
	if (!block) throw new Error(`The Note renders no ${blockKind} Block.`);
	return block.props.children as ReactElement;
}

/** Calls the click handler of the control labelled `label`, as a keyboard press would. */
function click(node: ReactElement, label: string): void {
	function Probe() {
		const control = find(
			node,
			(props) => props["aria-label"] === label,
			true,
		);
		if (!control) throw new Error(`Nothing is labelled ${label}.`);
		(control.props.onClick as (event: { detail: number }) => void)({
			detail: 0,
		});
		return null;
	}
	renderToStaticMarkup(<Probe />);
}
