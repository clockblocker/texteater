import type { ComponentType } from "react";

import type {
	CardDemoFakeSegment,
	CardDemoNoteKind,
	CardDemoResolutionCard,
} from "./card-demo-contract";

export type CardDemoInteractionProps = {
	readonly cards: readonly CardDemoResolutionCard[];
	readonly selectedSegment: CardDemoFakeSegment;
	readonly onOpenNote: (kind: CardDemoNoteKind) => void;
};

/** Each variant owns one implementation of this seam and no shared drag engine. */
export type CardDemoInteraction = ComponentType<CardDemoInteractionProps>;
