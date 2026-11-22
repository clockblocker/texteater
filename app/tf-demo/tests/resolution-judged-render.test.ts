import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { Id } from "../convex/_generated/dataModel";
import { DEFAULT_KNOWLEDGE_SETTINGS } from "../shared/knowledge-preferences";
import { renderNote } from "../src/notes";
import {
	type ResolutionNote,
	resolutionDeckCards,
} from "../src/views/resolution-deck";
import { resolvingReadingNoteData } from "../src/views/resolving-reading-note";

/*
 * A running click's Card shows what jev judged before Grammar arrives
 * (#1329): the GrammarAvailable state's word class and features, under the
 * clicked words while the headword is on its way.
 */

/** A click on `Bnaken`, a one-Segment NOUN unit still resolving. */
function runningNote(
	overrides: Partial<Pick<ResolutionNote, "judged" | "grammar">> = {},
): ResolutionNote {
	return {
		kind: "ResolutionNote",
		target: { kind: "Resolution", requestId: "request-1" },
		lifecycle: {
			state: "Active",
			progress: "RouteAvailable",
			activity: "Running",
		},
		route: {
			scrollId: "text-1" as Id<"scrolls">,
			sentenceId: "sentence-1" as Id<"sentences">,
			stitchedText: "Die Bnaken.",
			clickedSegmentIndex: 2,
			selectedSegment: "Bnaken",
		},
		source: {
			segments: [
				{ kind: "ResolvableText", text: "Die" },
				{ kind: "Whitespace", text: " " },
				{ kind: "ResolvableText", text: "Bnaken" },
				{ kind: "Punctuation", text: "." },
			],
			memberSegmentIndices: [2],
			scrollTitle: "Die Bnaken.",
		},
		unit: {
			segments: [2],
			route: { language: "de", family: "Lexeme", kind: "NOUN" },
		},
		...overrides,
		updatedAt: 1,
	};
}

const judged = {
	coreFeatures: { nounKind: "Common" },
	members: [{ orthography: "Typo" as const }],
};

function render(note: ResolutionNote) {
	const noteData = resolvingReadingNoteData({ requestId: "request-1", note });
	if (!noteData) throw new Error("A route is required");
	return {
		noteData,
		markup: renderToStaticMarkup(
			renderNote({
				noteData,
				capabilities: {
					presentation: "Card",
					knowledgeSettings: DEFAULT_KNOWLEDGE_SETTINGS,
					sourceContexts: {
						items: noteData.sourceContexts.page,
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
		),
	};
}

test("the judged Card shows jev's Core Features under the clicked words, still resolving", () => {
	const before = render(runningNote());
	const { noteData, markup } = render(runningNote({ judged }));
	expect(before.markup).not.toContain("<span>common</span>");
	expect(noteData.reading.lemma.coreFeatures as unknown).toEqual(
		judged.coreFeatures,
	);
	expect(noteData.pending?.headword).toEqual({
		words: "Bnaken",
		resolving: true,
	});
	expect(markup).toContain("<span>common</span>");
	expect(markup).toContain("Bnaken");
});

test("a member jev judged a Typo deals the Attestation before Grammar arrives", () => {
	const keys = (note: ResolutionNote) =>
		resolutionDeckCards(note).map(({ key }) => key);
	expect(keys(runningNote())).toEqual(["request-1:Reading"]);
	expect(keys(runningNote({ judged }))).toEqual([
		"request-1:Reading",
		"request-1:Attestation",
	]);
});
