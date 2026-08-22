import type {
	CardDemoFakeSegment,
	CardDemoNoteKind,
	CardDemoResolutionCard,
} from "./card-demo-contract";

const loremWords = [
	"Lorem",
	"ipsum",
	"dolor",
	"sit",
	"amet",
	"consectetur",
	"adipiscing",
	"elit",
	"sed",
	"do",
	"eiusmod",
	"tempor",
	"incididunt",
	"ut",
	"labore",
	"et",
	"dolore",
	"magna",
	"aliqua",
] as const;

export const CARD_DEMO_FAKE_SENTENCE = {
	id: "playground-lorem-sentence",
	disclaimer: "Fake playground data; it carries no linguistic identity.",
	segments: loremWords.map(
		(text, ordinal): CardDemoFakeSegment => ({
			id: `playground-segment-${String(ordinal + 1).padStart(2, "0")}`,
			ordinal,
			text,
		}),
	),
} as const;

export function cardDemoFakeSegmentById(
	segmentId: string | null,
): CardDemoFakeSegment | null {
	if (!segmentId) return null;
	return (
		CARD_DEMO_FAKE_SENTENCE.segments.find(
			(segment) => segment.id === segmentId,
		) ?? null
	);
}

/**
 * The order below is a card-stack presentation order only. It must not be used
 * to infer or persist relationships between linguistic entities.
 */
export const CARD_DEMO_RESOLUTION_CHAIN = [
	{
		kind: "attestation",
		label: "Attestation",
		presentationLayer: 0,
		summary: "The fake occurrence selected in the playground sentence.",
	},
	{
		kind: "surface",
		label: "Surface",
		presentationLayer: 1,
		summary: "A fake normalized surface for interaction comparison.",
	},
	{
		kind: "lemma",
		label: "Lemma",
		presentationLayer: 2,
		summary: "A fake canonical form with no dictionary identity.",
	},
	{
		kind: "reading",
		label: "Reading",
		presentationLayer: 3,
		summary: "A deliberately invented sense for the playground.",
	},
] as const satisfies readonly CardDemoResolutionCard[];

export type CardDemoCardPresentation = {
	readonly eyebrow: string;
	readonly title: string;
	readonly detail: string;
};

export function cardDemoCardPresentation(
	kind: CardDemoNoteKind,
	segment: CardDemoFakeSegment,
): CardDemoCardPresentation {
	const normalized = segment.text.toLocaleLowerCase("en");
	switch (kind) {
		case "attestation":
			return {
				eyebrow: "Fake Occurrence Attestation",
				title: segment.text,
				detail: `Segment ${segment.ordinal + 1} in the lorem-ipsum fixture`,
			};
		case "surface":
			return {
				eyebrow: "Fake Surface",
				title: normalized,
				detail: "Normalized playground spelling",
			};
		case "lemma":
			return {
				eyebrow: "Fake Lemma",
				title: normalized,
				detail: "Canonical playground form",
			};
		case "reading":
			return {
				eyebrow: "Fake Reading",
				title: `💭 ${normalized}`,
				detail: "An invented sense used only to compare interactions",
			};
	}
}
