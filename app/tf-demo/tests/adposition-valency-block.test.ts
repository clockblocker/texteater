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
type AdpositionFamily = "Lexeme" | "Locution";

// An ADP Reading has no Valency Frame: its block renders from dumcorpus's ADP
// Case Table, and each Source Context shows the case it realized (ADR 0034).
// The Lemma records no position, so a Lexeme ADP shows one line for each
// position the table lists, the preposition first.
const lines = [
	["Lexeme", "auf", ["auf `etw` · Akk: wohin? · Dat: wo?"]],
	["Lexeme", "für", ["für `etw` · Akk"]],
	["Lexeme", "mit", ["mit `etw` · Dat"]],
	[
		"Lexeme",
		"wegen",
		["wegen `etw` · Gen · Dat: umgangssprachlich", "`etw` wegen · Gen"],
	],
	[
		"Lexeme",
		"entlang",
		[
			"entlang `etw` · Gen · Dat",
			"`etw` entlang · Akk · Dat: umgangssprachlich",
		],
	],
	["Lexeme", "zuliebe", ["`etw` zuliebe · Dat"]],
	["Locution", "um … willen", ["um `etw` willen · Gen"]],
	["Locution", "im Vergleich zu", ["im Vergleich zu `etw` · Dat"]],
] as const;
for (const [family, canonicalForm, expected] of lines)
	test(`the ADP Valency Block of ${canonicalForm} reads ${expected.join(" | ")}`, () => {
		expect(valencyLines(renderAdposition(family, canonicalForm))).toEqual([
			...expected,
		]);
	});

test("an adposition the ADP Case Table does not list has no Valency Block", () => {
	expect(renderAdposition("Lexeme", "quend")).not.toContain(
		'aria-label="Valency"',
	);
});

test("each Source Context shows its realized case and marks a colloquial one", () => {
	expect(
		realizedCaseMarks(renderAdposition("Lexeme", "auf", ["Dat", "Acc"])),
	).toEqual(["Dat", "Akk"]);
	expect(
		realizedCaseMarks(renderAdposition("Lexeme", "wegen", ["Dat", "Gen"])),
	).toEqual(["Dat · umgangssprachlich", "Gen"]);
	expect(
		realizedCaseMarks(
			renderAdposition("Lexeme", "entlang", ["Acc", "Dat"]),
		),
	).toEqual(["Akk", "Dat"]);
	expect(
		realizedCaseMarks(renderAdposition("Lexeme", "auf", [null])),
	).toEqual([]);
});

/** The rendered lines, with the complement token written back as backticked text. */
function valencyLines(markup: string): string[] {
	const section = markup.match(
		/<section[^>]*aria-label="Valency"[^>]*>(.*?)<\/section>/,
	)?.[1];
	if (section === undefined) throw new Error("no Valency Block rendered");
	return [
		...section.matchAll(/<p data-slot="valency-line"[^>]*>(.*?)<\/p>/g),
	].map((match) =>
		(match[1] ?? "")
			.replace(
				/<span data-slot="valency-token"[^>]*>(.*?)<\/span>/g,
				"`$1`",
			)
			.replace(/<[^>]+>/g, ""),
	);
}

function realizedCaseMarks(markup: string): string[] {
	return [
		...markup.matchAll(/<p data-slot="realized-case"[^>]*>(.*?)<\/p>/g),
	].map((match) => match[1] ?? "");
}

function renderAdposition(
	family: AdpositionFamily,
	canonicalForm: string,
	realizedCases: readonly (RealizedCase | null)[] = [],
): string {
	const note = readingNote(family, canonicalForm, realizedCases);
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
	family: AdpositionFamily,
	canonicalForm: string,
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
				family,
				kind: "ADP",
				canonicalForm,
				coreFeatures: {},
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
					title: "A source sentence.",
				},
				...(realizedCase ? { realizedCase } : {}),
			})),
			continueCursor: "",
			isDone: true,
		},
	} as unknown as ReadingNote;
}
