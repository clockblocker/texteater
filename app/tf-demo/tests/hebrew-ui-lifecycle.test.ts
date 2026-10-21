import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { Id } from "../convex/_generated/dataModel";
import { renderNote } from "../src/notes";
import { resolvingAttestationCaption } from "../src/notes/universal/caption/resolving";
import { resolvingReadingNoteData } from "../src/views/resolving-reading-note";
import { isWorkspaceSubject } from "../src/workspace/workspace-subject";

const hebrewRoute = { language: "he", family: "Lexeme", kind: "NOUN" } as const;

test("a pending Hebrew Reading keeps its language before the first server result", () => {
	const note = resolvingReadingNoteData({
		requestId: "he-pending",
		note: null,
		unitRoute: hebrewRoute,
	});
	expect(note?.reading.lemma.language).toBe("he");
	expect(note?.pending?.identity).toBe(true);
});

test("workspace readback accepts registered Hebrew Surface and resolution presentation identities", () => {
	expect(
		isWorkspaceSubject({
			kind: "Note",
			target: {
				kind: "Surface",
				language: "he",
				normalizedSurface: "בַּיִת",
			},
		}),
	).toBe(true);
	expect(
		isWorkspaceSubject({
			kind: "Note",
			target: {
				kind: "ResolutionStep",
				requestId: "he-request",
				stepKind: "Reading",
			},
			presentationContext: { unitRoute: hebrewRoute },
		}),
	).toBe(true);
	expect(
		isWorkspaceSubject({
			kind: "Note",
			target: {
				kind: "Surface",
				language: "unknown",
				normalizedSurface: "בית",
			},
		}),
	).toBe(false);
});

test("Hebrew grammar does not change a running Reading back to German", () => {
	const note = resolvingReadingNoteData({
		requestId: "he-grammar",
		note: {
			kind: "ResolutionNote",
			target: { kind: "Resolution", requestId: "he-grammar" },
			lifecycle: {
				state: "Active",
				progress: "GrammarAvailable",
				activity: "Running",
			},
			route: {
				scrollId: "he-scroll" as Id<"scrolls">,
				sentenceId: "he-sentence" as Id<"sentences">,
				stitchedText: "הַבַּיִת.",
				selectedSegment: "הַ",
				clickedSegmentIndex: 0,
			},
			unit: { segments: [0, 1], route: hebrewRoute },
			source: {
				segments: [
					{ kind: "ResolvableText", text: "הַ" },
					{ kind: "ResolvableText", text: "בַּיִת" },
					{ kind: "Punctuation", text: "." },
				],
				memberSegmentIndices: [0, 1],
				scrollTitle: "בית",
			},
			grammar: {
				language: "he",
				family: "Lexeme",
				kind: "NOUN",
				canonicalForm: "בַּיִת",
				coreFeatures: { gender: "Masc", abbr: null },
				normalizedSurface: "בַּיִת",
				spelling: { kind: "Canonical" },
				grundform: true,
				members: [
					{ attested: "הַ", orthography: "Standard" },
					{ attested: "בַּיִת", orthography: "Standard" },
				],
				valencyMembers: [],
				realizationCoverage: "Full",
			},
			updatedAt: 1,
		},
	});
	expect(note?.reading.lemma.language).toBe("he");
	expect(note?.reading.lemma.canonicalForm).toBe("בַּיִת");
	expect(note?.sourceContexts.page[0]?.memberSegmentIndices).toEqual([0, 1]);
	if (!note) throw new Error("Expected a routed Hebrew Reading");
	const markup = renderToStaticMarkup(renderNote({ noteData: note }));
	expect(markup).toContain('<bdi lang="he" dir="rtl">בַּיִת</bdi>');
	expect(markup).not.toContain('role="alert"');
});

test("a running Hebrew Attestation never borrows German caption rules", () => {
	expect(
		resolvingAttestationCaption({
			grammar: {
				language: "he",
				family: "Lexeme",
				kind: "NOUN",
				normalizedSurface: "בַּיִת",
				canonicalForm: "בַּיִת",
				grundform: true,
				spelling: { kind: "Canonical" },
				members: [{ attested: "בית", orthography: "Typo" }],
				valencyMembers: [],
				coreFeatures: { gender: "Masc", abbr: null },
			},
			source: {
				segments: [{ kind: "ResolvableText", text: "בית" }],
				memberSegmentIndices: [0],
			},
		} as Parameters<typeof resolvingAttestationCaption>[0]),
	).toBeNull();
});
