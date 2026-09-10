import { expect, test } from "bun:test";
import type { FunctionReturnType } from "convex/server";
import { renderToStaticMarkup } from "react-dom/server";

import type { api } from "../convex/_generated/api";
import { renderNote } from "../src/notes";
import { createPaginatedNoteLoader } from "../src/views/paginated-note-loading";

type NoteData = NonNullable<FunctionReturnType<typeof api.routeNotes.get>>;
type NoteDataFor<Kind extends NoteData["kind"]> = Extract<
	NoteData,
	{ readonly kind: Kind }
>;

test("routes Lemma and Attestation subjects through the universal pipeline", () => {
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

	const lemmaMarkup = renderToStaticMarkup(renderNote({ noteData: lemma }));
	const attestationMarkup = renderToStaticMarkup(
		renderNote({ noteData: attestation }),
	);
	expect(lemmaMarkup).not.toContain('role="alert"');
	expect(attestationMarkup).not.toContain('role="alert"');
});

test("Surface Notes use the universal pipeline without an outer route", () => {
	const surface = surfaceNote();
	const markup = renderToStaticMarkup(renderNote({ noteData: surface }));
	expect(markup).not.toContain('role="alert"');
});

test("Surface Note pages merge every analysis without replacing the aggregate", async () => {
	const first = {
		...surfaceNote(),
		analyses: surfaceNote().analyses.slice(0, 1),
		continueCursor: "surface-page-2",
		isDone: false,
	};
	const second = {
		...surfaceNote(),
		analyses: surfaceNote().analyses.slice(1),
		continueCursor: "",
		isDone: true,
	};
	const loader = createPaginatedNoteLoader(first, async (cursor) => {
		expect(cursor).toBe("surface-page-2");
		return second;
	});
	await loader.loadMore();
	expect(loader.current().note.analyses).toHaveLength(2);
	expect(loader.current().hasMore).toBe(false);
});

test("Surface capability objects remain accepted at the public seam", () => {
	const surface = surfaceNote();
	const card = renderToStaticMarkup(
		renderNote({
			noteData: surface,
			capabilities: {
				presentation: "Card",
				activeAnalysisKey: "surface-verb",
				follow: () => {},
			},
		}),
	);
	const sheet = renderToStaticMarkup(
		renderNote({
			noteData: surface,
			capabilities: {
				presentation: "Sheet",
				activeAnalysisKey: "surface-noun",
				follow: () => {},
			},
		}),
	);
	expect(card).not.toContain('role="alert"');
	expect(sheet).not.toContain('role="alert"');
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
		continueCursor: "",
		isDone: true,
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
