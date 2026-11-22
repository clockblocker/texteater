import type { FunctionReturnType } from "convex/server";
import { renderToStaticMarkup } from "react-dom/server";
import type { api } from "../../convex/_generated/api";
import { DEFAULT_KNOWLEDGE_SETTINGS } from "../../shared/knowledge-preferences";
import { renderNote } from "../../src/notes";

export type ReadingNote = Extract<
	NonNullable<FunctionReturnType<typeof api.readingNotes.get>>,
	{ readonly kind: "Reading" }
>;
export type ValencyFrame = NonNullable<ReadingNote["knowledge"]["valency"]>;
type ValencyPattern = ValencyFrame[number];
export type ValencyComplement = ValencyPattern[number];
export type Lemma = {
	readonly family: "Lexeme" | "Locution";
	readonly kind: string;
	readonly canonicalForm: string;
	readonly coreFeatures: Record<string, unknown>;
};

export const verb = (
	canonicalForm: string,
	hasSepPrefix: string | null,
): Lemma => ({
	family: "Lexeme",
	kind: "VERB",
	canonicalForm,
	coreFeatures: { hasSepPrefix },
});

type GermanPreposition = Extract<
	Extract<ValencyComplement, { readonly kind: "Preposition" }>["preposition"],
	{ readonly language: "de" }
>;

export const adp = (canonicalForm: string): GermanPreposition => ({
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "ADP",
	canonicalForm,
	coreFeatures: {},
});

export const locution = (canonicalForm: string): Lemma => ({
	family: "Locution",
	kind: "VERB",
	canonicalForm,
	coreFeatures: {},
});

/** A Reflexive complement, with the preposition a fixed phrase puts it after. */
export const reflexive = (
	governedCase: "Acc" | "Dat",
	preposition?: string,
): ValencyComplement => ({
	kind: "Reflexive",
	governedCase,
	...(preposition === undefined ? {} : { preposition: adp(preposition) }),
});

/** The Reading's title, emoji included, with slot tokens written back as backticked text. */
export function headingLine(markup: string): string {
	const title = markup.match(/data-reading-title=""[^>]*>(.*?)<\/h\d>/)?.[1];
	if (title === undefined) throw new Error("no Reading title rendered");
	return plainText(
		title.replace(/(<span aria-hidden="true"[^>]*>.*?<\/span>)/, "$1 "),
	);
}

/** The bulleted lines rendered in the Reading's Valency Block, with slot tokens backticked. */
export function valencyLines(markup: string): string[] {
	return [
		...markup.matchAll(/data-slot="valency-pattern"[^>]*>(.*?)<\/li>/g),
	].map((match) => plainText(match[1] ?? ""));
}

function plainText(html: string): string {
	return html
		.replace(/<span data-slot="valency-token"[^>]*>(.*?)<\/span>/g, "`$1`")
		.replace(/<[^>]+>/g, "")
		.replaceAll("&gt;", ">")
		.replaceAll("&lt;", "<");
}

export function renderReading(
	lemma: Lemma,
	valency: ValencyFrame | undefined,
	options?: {
		readonly translations?: ReadingNote["knowledge"]["translations"];
		readonly emojiDescription?: string;
	},
): string {
	const note = readingNote(
		lemma,
		valency,
		options?.translations,
		options?.emojiDescription,
	);
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
	translations: ReadingNote["knowledge"]["translations"] = {
		en: [[{ kind: "Text", text: "a translation" }]],
	},
	emojiDescription = "🧩",
): ReadingNote {
	return {
		kind: "Reading",
		target: { kind: "Reading", readingId: "reading-1" },
		reading: {
			unitKind: "Reading",
			ownerKind: "Reading",
			ownerKey: "reading-key-1",
			readingId: "reading-1",
			emojiDescription,
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
			translations,
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
					scrollId: "text-1",
					sentencePosition: 0,
					sentenceSnippet: "A source sentence.",
					segments: [{ kind: "ResolvableText", text: "source" }],
					memberSegmentIndices: [0],
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
