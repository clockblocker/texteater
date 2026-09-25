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
type ValencyFrame = NonNullable<ReadingNote["knowledge"]["valency"]>;
type Lemma = {
	readonly family: "Lexeme" | "Phraseme";
	readonly kind: string;
	readonly canonicalForm: string;
	readonly coreFeatures: Record<string, unknown>;
};

const verb = (canonicalForm: string, hasSepPrefix: string | null): Lemma => ({
	family: "Lexeme",
	kind: "VERB",
	canonicalForm,
	coreFeatures: { lexicallyReflexive: null, hasSepPrefix },
});
const adp = (canonicalForm: string) => ({
	unitKind: "Lemma" as const,
	language: "de",
	family: "Lexeme",
	kind: "ADP",
	canonicalForm,
	coreFeatures: {},
});

const cases: readonly {
	readonly lemma: Lemma;
	readonly frame: ValencyFrame;
	readonly line: string;
}[] = [
	{
		lemma: verb("aufpassen", "auf"),
		frame: [
			{
				status: "Optional",
				complement: {
					kind: "Preposition",
					preposition: adp("auf"),
					case: "Acc",
					referent: "Either",
				},
			},
		],
		line: ">passen (auf `jN/etw`) auf<",
	},
	{
		lemma: verb("anfangen", "an"),
		frame: [
			{
				status: "Optional",
				complement: {
					kind: "Preposition",
					preposition: adp("mit"),
					case: "Dat",
					referent: "Something",
				},
			},
		],
		line: ">fangen (mit `etw`) an<",
	},
	{
		lemma: verb("warten", null),
		frame: [
			{
				status: "Required",
				complement: { kind: "Case", case: "Nom", referent: "Someone" },
			},
			{
				status: "Optional",
				complement: {
					kind: "Preposition",
					preposition: adp("auf"),
					case: "Acc",
					referent: "Either",
				},
			},
		],
		line: "warten (auf `jN/etw`)",
	},
	{
		lemma: {
			family: "Lexeme",
			kind: "ADJ",
			canonicalForm: "stolz",
			coreFeatures: {},
		},
		frame: [
			{
				status: "Optional",
				complement: {
					kind: "Preposition",
					preposition: adp("auf"),
					case: "Acc",
					referent: "Either",
				},
			},
		],
		line: "stolz (auf `jN/etw`)",
	},
	{
		lemma: {
			family: "Phraseme",
			kind: "Idiom",
			canonicalForm: "auf den Keks gehen",
			coreFeatures: {},
		},
		frame: [
			{
				status: "Required",
				complement: { kind: "Case", case: "Dat", referent: "Someone" },
			},
		],
		line: "gehen `jM` auf den Keks",
	},
	{
		lemma: {
			family: "Phraseme",
			kind: "Collocation",
			canonicalForm: "zur Verfügung stellen",
			coreFeatures: {},
		},
		// Frame order is not display order: Dat comes before Acc.
		frame: [
			{
				status: "Required",
				complement: {
					kind: "Case",
					case: "Acc",
					referent: "Something",
				},
			},
			{
				status: "Optional",
				complement: { kind: "Case", case: "Dat", referent: "Someone" },
			},
		],
		line: "stellen (`jM`) `etw` zur Verfügung",
	},
	{
		// Not one of ADR 0034's lines: a lexical reflexive follows the head.
		lemma: {
			family: "Lexeme",
			kind: "VERB",
			canonicalForm: "sich vorstellen",
			coreFeatures: { lexicallyReflexive: "Yes", hasSepPrefix: "vor" },
		},
		frame: [
			{
				status: "Required",
				complement: { kind: "Case", case: "Acc", referent: "Either" },
			},
		],
		line: ">stellen sich `jN/etw` vor<",
	},
];

for (const { lemma, frame, line } of cases) {
	test(`the Valency Block reads ${line}`, () => {
		expect(valencyLine(renderReading(lemma, frame))).toBe(line);
	});
}

test("only separable verbs carry the split marks", () => {
	const marked = cases.filter(({ lemma, frame }) =>
		renderReading(lemma, frame).includes('data-slot="valency-split"'),
	);
	expect(marked.map(({ lemma }) => lemma.canonicalForm)).toEqual([
		"aufpassen",
		"anfangen",
		"sich vorstellen",
	]);
});

test("a Reading with no frame, an empty frame, or only a subject has no Valency Block", () => {
	const warten = verb("warten", null);
	for (const frame of [
		undefined,
		[],
		[
			{
				status: "Required",
				complement: { kind: "Case", case: "Nom", referent: "Someone" },
			},
		] satisfies ValencyFrame,
	]) {
		expect(renderReading(warten, frame)).not.toContain(
			'aria-label="Valency"',
		);
	}
});

test("the Valency Block follows the anchor Blocks", () => {
	const { lemma, frame } = cases[0] ?? {};
	if (!lemma || !frame) throw new Error("missing case");
	const markup = renderReading(lemma, frame);
	expect(markup.indexOf('aria-label="Source Contexts"')).toBeLessThan(
		markup.indexOf('aria-label="Valency"'),
	);
	expect(markup.indexOf('aria-label="Valency"')).toBeLessThan(
		markup.indexOf('aria-label="Translations"'),
	);
});

/** The rendered line, with slot tokens written back as backticked text. */
function valencyLine(markup: string): string {
	const section = markup.match(
		/<section[^>]*aria-label="Valency"[^>]*>.*?<p data-slot="valency-line"[^>]*>(.*?)<\/p>/,
	)?.[1];
	if (section === undefined) throw new Error("no Valency Block rendered");
	return section
		.replace(/<span data-slot="valency-token"[^>]*>(.*?)<\/span>/g, "`$1`")
		.replace(/<[^>]+>/g, "")
		.replaceAll("&gt;", ">")
		.replaceAll("&lt;", "<");
}

function renderReading(
	lemma: Lemma,
	valency: ValencyFrame | undefined,
): string {
	const note = readingNote(lemma, valency);
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
}

function readingNote(
	lemma: Lemma,
	valency: ValencyFrame | undefined,
): ReadingNote {
	return {
		kind: "Reading",
		target: { kind: "Reading", readingId: "reading-1" },
		reading: {
			unitKind: "Reading",
			ownerKind: "Reading",
			ownerKey: "reading-key-1",
			readingId: "reading-1",
			emojiDescription: "🧩",
			lemma: {
				unitKind: "Lemma",
				ownerKind: "Lemma",
				ownerKey: "lemma-key-1",
				lemmaId: "lemma-1",
				language: "de",
				...lemma,
			},
		},
		knowledgeState: { status: "Full", activity: "Idle" },
		personalAnnotation: "",
		knowledge: {
			translations: { en: ["a translation"] },
			...(valency ? { valency } : {}),
		},
		knowledgeUpdatedAt: null,
		definitionText: { state: "Plain" },
		relations: [],
		relationsTruncated: false,
		grammaticalAlternatives: [],
		pendingRelations: [],
		structuralReferences: [],
		sourceContexts: {
			page: [
				{
					attestationId: "attestation-1",
					textId: "text-1",
					sentencePosition: 0,
					sentenceSnippet: "A source sentence.",
					segments: [{ kind: "ResolvableText", text: "source" }],
					memberSegmentIndices: [0],
					memberTexts: ["source"],
					origin: { kind: "Text" },
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
