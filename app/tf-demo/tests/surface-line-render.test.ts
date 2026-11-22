import { expect, test } from "bun:test";
import type { FunctionReturnType } from "convex/server";
import { renderToStaticMarkup } from "react-dom/server";
import type { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { renderNote } from "../src/notes";

/**
 * A German Surface's display line (ADR 0056, ADR 0034): clean base-order
 * form (with `sich` for Required lexical reflexives), never crowded with
 * `jD` or open valency slots.
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
	[
		{ kind: "Case", governedCase: "Nom" },
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
		},
	],
];

function surfaceNote(
	activeReading: {
		readonly lemmaId: string;
		readonly emojiDescription?: string;
		readonly reflexive?: {
			readonly status: "Required" | "Optional";
			readonly governedCase: "Acc" | "Dat" | null;
			readonly preposition: string | null;
		} | null;
	} | null,
	overrideSurface = surface,
): NoteDataFor<"Surface"> {
	return {
		kind: "Surface",
		target: {
			kind: "Surface",
			language: "de",
			normalizedSurface: overrideSurface.normalizedSurface,
		},
		analyses: [
			{
				analysisKey: "surface-1",
				surfaceId: "surface-1",
				lemmaId: "lemma-1",
				presented: overrideSurface,
				lemmaTarget: { kind: "Lemma", lemmaId: "lemma-1" },
			},
		],
		activeReading: activeReading && {
			readingId: "reading-1",
			lemmaId: activeReading.lemmaId,
			emojiDescription: activeReading.emojiDescription,
			reflexive: activeReading.reflexive ?? null,
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

test("a Surface Note heads its active analysis cleanly without jD or open valency slots", () => {
	const title = surfaceTitle(surfaceNote({ lemmaId: "lemma-1" }));
	expect(text(title)).toBe("mit zu tun hatte");
	expect(title).not.toContain('data-slot="valency-token"');
});

test("a Surface Note shows sich when the active Reading is lexically reflexive", () => {
	const erinnertSurface = {
		...surface,
		normalizedSurface: "erinnert",
		lemma: {
			language: "de",
			canonicalForm: "erinnern",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: { hasSepPrefix: null },
		},
	};
	expect(
		text(
			surfaceTitle(
				surfaceNote(
					{
						lemmaId: "lemma-1",
						emojiDescription: "🪞🧠",
						reflexive: {
							status: "Required",
							governedCase: "Acc",
							preposition: null,
						},
					},
					erinnertSurface,
				),
			),
		),
	).toBe("sich erinnert");
	expect(text(surfaceTitle(surfaceNote(null, erinnertSurface)))).toBe(
		"erinnert",
	);
	expect(
		text(
			surfaceTitle(surfaceNote({ lemmaId: "lemma-2" }, erinnertSurface)),
		),
	).toBe("erinnert");
});

test("an Attestation's caption names its Surface cleanly without jD or open valency slots", () => {
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
	expect(text(markup)).toContain("split form of mit zu tun hatte");
	expect(text(markup)).not.toContain("jD");
});
