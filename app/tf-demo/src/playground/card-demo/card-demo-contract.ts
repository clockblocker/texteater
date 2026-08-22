export const CARD_DEMO_VARIANTS = [
	"native",
	"motion",
	"dnd-kit",
	"gesture-spring",
] as const;

export type CardDemoVariant = (typeof CARD_DEMO_VARIANTS)[number];

export const CARD_DEMO_NOTE_KINDS = [
	"attestation",
	"surface",
	"lemma",
	"reading",
] as const;

export type CardDemoNoteKind = (typeof CARD_DEMO_NOTE_KINDS)[number];

/** Natural focus order follows the visible stack from front to back. */
export const CARD_DEMO_KEYBOARD_ORDER = [
	"reading",
	"lemma",
	"surface",
	"attestation",
] as const satisfies readonly CardDemoNoteKind[];

export type CardDemoFakeSegment = {
	readonly id: string;
	readonly ordinal: number;
	readonly text: string;
};

export type CardDemoResolutionCard = {
	readonly kind: CardDemoNoteKind;
	readonly label: string;
	/** Presentation depth only; this is not durable linguistic topology. */
	readonly presentationLayer: number;
	readonly summary: string;
};

export type CardDemoPoint = {
	readonly x: number;
	readonly y: number;
};

export type CardDemoRect = {
	readonly left: number;
	readonly top: number;
	readonly right: number;
	readonly bottom: number;
};

export const CARD_DEMO_GEOMETRY = {
	cardWidth: 320,
	cardHeight: 176,
	layerOffset: 14,
	stackWidth: 320,
	stackHeight: 218,
	dragActivationDistance: 6,
	outsideScale: 1.025,
	backdropOpacity: 0.06,
} as const;

export function isInsideCardDemoCancelZone(
	point: CardDemoPoint,
	zone: CardDemoRect,
): boolean {
	return (
		point.x >= zone.left &&
		point.x <= zone.right &&
		point.y >= zone.top &&
		point.y <= zone.bottom
	);
}

export function isCardDemoVariant(value: string): value is CardDemoVariant {
	return (CARD_DEMO_VARIANTS as readonly string[]).includes(value);
}

export function isCardDemoNoteKind(value: string): value is CardDemoNoteKind {
	return (CARD_DEMO_NOTE_KINDS as readonly string[]).includes(value);
}
