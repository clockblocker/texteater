import { expect, test } from "bun:test";
import type { FunctionReturnType } from "convex/server";
import { renderToStaticMarkup } from "react-dom/server";
import type { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { renderNote } from "../src/notes";

/**
 * A German Surface's slotted line (#1293) where a Reading is in context:
 * the Surface Note's heading and the Attestation's caption.
 */

type NoteData = NonNullable<FunctionReturnType<typeof api.routeNotes.get>>;
type NoteDataFor<Kind extends NoteData["kind"]> = Extract<
	NoteData,
	{ readonly kind: Kind }
>;

const lemma = {
	language: "de",
	canonicalForm: "mit zu tun haben",
	family: "Locution",
	kind: "VERB",
	coreFeatures: {},
};
const surface = {
	language: "de",
	normalizedSurface: "mit zu tun hatte",
	spelling: { kind: "Canonical" },
	grundform: false,
	surfaceFeatures: { historicalStatus: null },
	lemma,
	inflectionalFeatures: {
		verbForm: "Fin",
		mood: "Ind",
		tense: "Past",
		person: "3",
		number: "Sing",
	},
};
const valency = [
	{
		status: "Required",
		complements: [
			{ kind: "Case", governedCase: "Nom", referent: "Someone" },
		],
	},
	{
		status: "Required",
		complements: [
			{
				kind: "Preposition",
				preposition: {
					unitKind: "Lemma",
					language: "de",
					family: "Lexeme",
					kind: "ADP",
					canonicalForm: "mit",
					coreFeatures: {},
				},
				governedCase: "Dat",
				referent: "Something",
			},
		],
	},
];

function surfaceNote(
	activeReading: { readonly lemmaId: string } | null,
): NoteDataFor<"Surface"> {
	return {
		kind: "Surface",
		target: {
			kind: "Surface",
			language: "de",
			normalizedSurface: "mit zu tun hatte",
		},
		analyses: [
			{
				analysisKey: "surface-1",
				surfaceId: "surface-1",
				lemmaId: "lemma-1",
				presented: surface,
				lemmaTarget: { kind: "Lemma", lemmaId: "lemma-1" },
			},
		],
		activeReading: activeReading && {
			readingId: "reading-1",
			lemmaId: activeReading.lemmaId,
			valency,
		},
		continueCursor: "",
		isDone: true,
	} as unknown as NoteDataFor<"Surface">;
}

function surfaceTitle(note: NoteDataFor<"Surface">): string {
	const markup = renderToStaticMarkup(
		renderNote({
			noteData: note,
			capabilities: {
				presentation: "Sheet",
				activeAnalysisKey: "surface-1" as Id<"surfaces">,
				follow: () => {},
			},
		}),
	);
	const title = markup.match(/data-surface-title=""[^>]*>(.*?)<\/h\d>/s);
	return title?.[1] ?? "";
}

const text = (markup: string) => markup.replaceAll(/<[^>]+>/g, "");

test("a Surface Note heads its active analysis with the slotted line of the Reading in context", () => {
	const title = surfaceTitle(surfaceNote({ lemmaId: "lemma-1" }));
	expect(text(title)).toBe("jD mit jM zu tun hatte");
	// The slots and the preposition take the Reading heading's styles.
	expect(title).toContain('data-slot="valency-token"');
	expect(title).toMatch(/data-slot="valency-preposition"[^>]*>mit</);
});

test("without a Reading of the analysis's Lemma, the heading is the stored form", () => {
	expect(text(surfaceTitle(surfaceNote(null)))).toBe("mit zu tun hatte");
	expect(text(surfaceTitle(surfaceNote({ lemmaId: "lemma-2" })))).toBe(
		"mit zu tun hatte",
	);
});

test("an Attestation's caption names its Surface by the slotted line", () => {
	const words = ["Vielleicht", "hatte", "es", "damit", "zu", "tun"];
	const attestation = {
		kind: "Attestation",
		target: { kind: "Attestation", attestationId: "attestation-1" },
		source: {
			scrollId: "text-1",
			sentencePosition: 0,
			sentenceSnippet: words.join(" "),
			segments: words.flatMap((word, index) => [
				...(index > 0 ? [{ kind: "Whitespace", text: " " }] : []),
				{ kind: "ResolvableText", text: word },
			]),
			// hatte, damit, zu, tun; the referential es is a free unit.
			memberSegmentIndices: [2, 6, 8, 10],
			origin: { kind: "Scroll" },
			target: { kind: "Scroll", scrollId: "text-1" },
		},
		presented: {
			members: ["hatte", "damit", "zu", "tun"].map((attested) => ({
				attested,
				orthography: "Standard",
			})),
			valencyMembers: [1],
			realizationCoverage: "Full",
			surface,
			fusions: [],
		},
		surfaceTarget: {
			kind: "Surface",
			language: "de",
			normalizedSurface: "mit zu tun hatte",
		},
		reading: {
			emojiDescription: "🔗",
			reflexive: null,
			valency,
			target: { kind: "Reading", readingId: "reading-1" },
		},
	} as unknown as NoteDataFor<"Attestation">;
	const markup = renderToStaticMarkup(
		renderNote({
			noteData: attestation,
			capabilities: {
				presentation: "Sheet",
				follow: () => {},
				pagination: {
					hasMore: false,
					isLoading: false,
					error: null,
					loadMore: null,
				},
			},
		}),
	);
	expect(text(markup)).toContain("split form of jD mit jM zu tun hatte");
});
