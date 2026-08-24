import type { ComponentType } from "react";

import type {
	CardDemoFakeSegment,
	CardDemoNoteKind,
	CardDemoResolutionCard,
} from "./card-demo-contract";

export type CardDemoOpenOrigin = "direct" | "drop";

export type CardDemoViewportPoint = {
	readonly x: number;
	readonly y: number;
};

export type CardDemoOpenRequest =
	| {
			readonly kind: CardDemoNoteKind;
			readonly origin: "direct";
	  }
	| {
			readonly kind: CardDemoNoteKind;
			readonly origin: "drop";
			readonly point: CardDemoViewportPoint;
	  };

export type CardDemoInteractionProps = {
	readonly cards: readonly CardDemoResolutionCard[];
	readonly selectedSegment: CardDemoFakeSegment;
	readonly onOpenNote: (request: CardDemoOpenRequest) => boolean | undefined;
	readonly onDragPointChange?: (point: CardDemoViewportPoint | null) => void;
};

/** Each variant owns one implementation of this seam and no shared drag engine. */
export type CardDemoInteraction = ComponentType<CardDemoInteractionProps>;
