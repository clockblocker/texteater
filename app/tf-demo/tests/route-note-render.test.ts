import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { type NoteDataFor, renderNote } from "../src/notes";

test("renders Lemma and Attestation subjects through the common renderer", () => {
	const lemma = {
		kind: "Lemma",
		target: { kind: "Lemma", lemmaId: "lemma-1" },
		presented: presentedLemma("Bank", "NOUN"),
		connections: {
			surfaces: [],
			readings: [
				{
					readingId: "reading-1",
					emojiDescription: "🏦",
					target: { kind: "Reading", readingId: "reading-1" },
				},
			],
			sameWrittenForm: [],
			continueCursor: "",
			isDone: true,
		},
	} as unknown as NoteDataFor<"Lemma">;
	const attestation = {
		kind: "Attestation",
		target: { kind: "Attestation", attestationId: "attestation-1" },
		source: {
			textId: "text-1",
			sentencePosition: 0,
			sentenceSnippet: "Er steht auf.",
			memberSegmentIndices: [1, 2],
			target: {
				kind: "Text",
				textId: "text-1",
				focusAttestationId: "attestation-1",
			},
		},
		presented: {
			members: [
				{ attested: "steht", orthography: "Standard" },
				{ attested: "auf", orthography: "Standard" },
			],
			realizationCoverage: "Full",
			surface: presentedSurface("steht auf", "aufstehen", "VERB"),
		},
		surfaceTarget: {
			kind: "Surface",
			language: "de",
			normalizedSurface: "steht auf",
		},
		reading: {
			emojiDescription: "🧍",
			target: { kind: "Reading", readingId: "reading-1" },
		},
	} as unknown as NoteDataFor<"Attestation">;

	const lemmaMarkup = renderToStaticMarkup(renderNote(lemma));
	const attestationMarkup = renderToStaticMarkup(renderNote(attestation));
	expect(lemmaMarkup).toContain("Lemma Note");
	expect(lemmaMarkup).toContain("Unit Readings");
	expect(attestationMarkup).toContain("Attestation Note");
	expect(attestationMarkup).toContain("Er steht auf.");
	expect(attestationMarkup).not.toContain("href=");
});

test("Surface Notes retain heterogeneous analyses without an outer route", () => {
	const surface = surfaceNote();
	const markup = renderToStaticMarkup(renderNote(surface));
	expect(markup).toContain("Surface Note");
	expect(markup).toContain("Bank · Lexeme · NOUN");
	expect(markup).toContain("banken · Lexeme · VERB");
	expect(markup).not.toContain("Active analysis");
});

test("active Surface analysis is contextual in Card and highlighted in Sheet", () => {
	const surface = surfaceNote();
	const card = renderToStaticMarkup(
		renderNote(surface, {
			presentation: "Card",
			activeAnalysisKey: "surface-verb",
			follow: () => {},
		}),
	);
	const sheet = renderToStaticMarkup(
		renderNote(surface, {
			presentation: "Sheet",
			activeAnalysisKey: "surface-noun",
			follow: () => {},
		}),
	);
	expect(card).toContain('data-active-surface-analysis="surface-verb"');
	expect(card).toContain("Mood: Ind");
	expect(card).not.toContain("Bank · Lexeme · NOUN");
	expect(sheet).toContain(
		'data-surface-analysis="surface-noun" data-active="true"',
	);
	expect(sheet).toContain('data-surface-analysis="surface-verb"');
});

test("layout changes order and visibility but cannot make an unavailable Block render", () => {
	const markup = renderToStaticMarkup(
		renderNote(surfaceNote(), {
			follow: () => {},
			blockLayout: {
				order: ["Routes", "Relations", "Header", "Routes"],
				hidden: new Set(["Header"]),
			},
		}),
	);
	expect(markup).toContain('aria-label="Surface analyses"');
	expect(markup).not.toContain("Surface Note</p>");
	expect(markup).not.toContain("Semantic relations");
});

function surfaceNote(): NoteDataFor<"Surface"> {
	return {
		kind: "Surface",
		target: { kind: "Surface", language: "de", normalizedSurface: "Bank" },
		analyses: [
			{
				analysisKey: "surface-noun",
				surfaceId: "surface-noun",
				lemmaId: "lemma-noun",
				presented: presentedSurface("Bank", "Bank", "NOUN"),
				lemmaTarget: { kind: "Lemma", lemmaId: "lemma-noun" },
			},
			{
				analysisKey: "surface-verb",
				surfaceId: "surface-verb",
				lemmaId: "lemma-verb",
				presented: {
					...presentedSurface("Bank", "banken", "VERB"),
					inflectionalFeatures: { Mood: "Ind" },
				},
				lemmaTarget: { kind: "Lemma", lemmaId: "lemma-verb" },
			},
		],
	} as unknown as NoteDataFor<"Surface">;
}

function presentedLemma(canonicalForm: string, kind: string) {
	return {
		language: "de",
		canonicalForm,
		family: "Lexeme",
		kind,
		coreFeatures: {},
	};
}

function presentedSurface(
	normalizedSurface: string,
	canonicalForm: string,
	kind: string,
) {
	return {
		language: "de",
		normalizedSurface,
		spelling: "Canonical",
		surfaceKind: "Citation",
		surfaceFeatures: {},
		lemma: presentedLemma(canonicalForm, kind),
		inflectionalFeatures: {},
	};
}
