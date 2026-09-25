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
type RealizedCase = "Acc" | "Dat" | "Gen";

// An ADP Reading has no Valency Frame: its block renders from Dumling's ADP
// Case Table, and each Source Context shows the case it realized (ADR 0034).
const lines = [
	["auf", "Prep", "auf `etw` · Akk: wohin? · Dat: wo?"],
	["für", "Prep", "für `etw` · Akk"],
	["mit", "Prep", "mit `etw` · Dat"],
	["wegen", "Prep", "wegen `etw` · Gen · Dat: umgangssprachlich"],
	["entlang", "Post", "`etw` entlang · Akk"],
	["entlang", "Prep", "entlang `etw` · Gen · Dat"],
	["um ... willen", "Circ", "um `etw` willen · Gen"],
] as const;
for (const [canonicalForm, adpType, line] of lines)
	test(`the ADP Valency Block reads ${line}`, () => {
		expect(valencyLine(renderAdposition(canonicalForm, adpType))).toBe(
			line,
		);
	});

test("an adposition the ADP Case Table does not list has no Valency Block", () => {
	expect(renderAdposition("versus", "Prep")).not.toContain(
		'aria-label="Valency"',
	);
});

test("each Source Context shows its realized case and marks a colloquial one", () => {
	expect(
		realizedCaseMarks(renderAdposition("auf", "Prep", ["Dat", "Acc"])),
	).toEqual(["Dat", "Akk"]);
	expect(
		realizedCaseMarks(renderAdposition("wegen", "Prep", ["Dat", "Gen"])),
	).toEqual(["Dat · umgangssprachlich", "Gen"]);
	expect(
		realizedCaseMarks(renderAdposition("entlang", "Post", ["Acc"])),
	).toEqual(["Akk"]);
	expect(realizedCaseMarks(renderAdposition("auf", "Prep", [null]))).toEqual(
		[],
	);
});

/** The rendered line, with the complement token written back as backticked text. */
function valencyLine(markup: string): string {
	const line = markup.match(
		/<section[^>]*aria-label="Valency"[^>]*>.*?<p data-slot="valency-line"[^>]*>(.*?)<\/p>/,
	)?.[1];
	if (line === undefined) throw new Error("no Valency Block rendered");
	return line
		.replace(/<span data-slot="valency-token"[^>]*>(.*?)<\/span>/g, "`$1`")
		.replace(/<[^>]+>/g, "");
}

function realizedCaseMarks(markup: string): string[] {
	return [
		...markup.matchAll(/<p data-slot="realized-case"[^>]*>(.*?)<\/p>/g),
	].map((match) => match[1] ?? "");
}

function renderAdposition(
	canonicalForm: string,
	adpType: "Prep" | "Post" | "Circ",
	realizedCases: readonly (RealizedCase | null)[] = [],
): string {
	const note = readingNote(canonicalForm, adpType, realizedCases);
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
	canonicalForm: string,
	adpType: "Prep" | "Post" | "Circ",
	realizedCases: readonly (RealizedCase | null)[],
): ReadingNote {
	return {
		kind: "Reading",
		target: { kind: "Reading", readingId: "reading-1" },
		reading: {
			unitKind: "Reading",
			ownerKind: "Reading",
			ownerKey: "reading-key-1",
			readingId: "reading-1",
			emojiDescription: "📍",
			lemma: {
				unitKind: "Lemma",
				ownerKind: "Lemma",
				ownerKey: "lemma-key-1",
				lemmaId: "lemma-1",
				language: "de",
				family: "Lexeme",
				kind: "ADP",
				canonicalForm,
				coreFeatures: {
					abbr: null,
					adpType,
					extPos: null,
					foreign: null,
					partType: null,
				},
			},
		},
		knowledgeState: { status: "Full", activity: "Idle" },
		personalAnnotation: "",
		knowledge: { translations: { en: ["on"] } },
		knowledgeUpdatedAt: null,
		definitionText: { state: "Plain" },
		relations: [],
		relationsTruncated: false,
		grammaticalAlternatives: [],
		pendingRelations: [],
		structuralReferences: [],
		sourceContexts: {
			page: realizedCases.map((realizedCase, index) => ({
				attestationId: `attestation-${index}`,
				textId: "text-1",
				sentencePosition: index,
				sentenceSnippet: "A source sentence.",
				segments: [{ kind: "ResolvableText", text: canonicalForm }],
				memberSegmentIndices: [0],
				memberTexts: [canonicalForm],
				origin: { kind: "Text" },
				target: {
					kind: "Text",
					textId: "text-1",
					focusAttestationId: `attestation-${index}`,
				},
				...(realizedCase ? { realizedCase } : {}),
			})),
			continueCursor: "",
			isDone: true,
		},
	} as unknown as ReadingNote;
}
