import type {
	CardDemoFakeSegment,
	CardDemoNoteKind,
	CardDemoResolutionCard,
} from "./card-demo-contract";

const loremParagraphs = [
	"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer mollis neque vel sem interdum, vitae facilisis urna ullamcorper. Donec luctus nisi sed augue consequat, id feugiat sapien tincidunt.",
	"Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium. Totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt.",
	"Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit. Sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt, neque porro quisquam est qui dolorem ipsum.",
	"Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam. Nisi ut aliquid ex ea commodi consequatur, quis autem vel eum iure reprehenderit qui in ea voluptate velit esse.",
	"At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium. Voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident.",
	"Similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga. Et harum quidem rerum facilis est et expedita distinctio, nam libero tempore cum soluta nobis eligendi optio.",
	"Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet. Ut et voluptates repudiandae sint et molestiae non recusandae, itaque earum rerum hic tenetur a sapiente delectus.",
	"Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur. Vel illum qui dolorem eum fugiat quo voluptas nulla pariatur, at vero eos et accusamus.",
] as const;

const loremParagraphWords = loremParagraphs.map((paragraph) =>
	paragraph.split(/\s+/),
);

const loremParagraphSegments = loremParagraphWords.map(
	(paragraph, paragraphIndex) => {
		const startOrdinal = loremParagraphWords
			.slice(0, paragraphIndex)
			.reduce((total, words) => total + words.length, 0);
		return paragraph.map((text, index): CardDemoFakeSegment => {
			const ordinal = startOrdinal + index;
			return {
				id: `playground-segment-${String(ordinal + 1).padStart(2, "0")}`,
				ordinal,
				text,
			};
		});
	},
);

export const CARD_DEMO_FAKE_TEXT = {
	id: "playground-lorem-text",
	disclaimer: "Fake playground data; it carries no linguistic identity.",
	paragraphs: loremParagraphSegments,
	segments: loremParagraphSegments.flat(),
} as const;

export function cardDemoFakeSegmentById(
	segmentId: string | null,
): CardDemoFakeSegment | null {
	if (!segmentId) return null;
	return (
		CARD_DEMO_FAKE_TEXT.segments.find(
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
		summary: "The fake occurrence selected in the playground text.",
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
