import type { CardDemoVariant } from "../card-demo-contract";
import type { CardDemoInteraction } from "../card-demo-interaction";
import { DndKitCardDemoInteraction } from "./dnd-kit-card-demo-interaction";
import { GestureSpringCardDemoInteraction } from "./gesture-spring-card-demo-interaction";
import { MotionCardDemoInteraction } from "./motion-card-demo-interaction";
import { NativeCardDemoInteraction } from "./native-card-demo-interaction";

export const CARD_DEMO_INTERACTIONS = {
	native: NativeCardDemoInteraction,
	motion: MotionCardDemoInteraction,
	"dnd-kit": DndKitCardDemoInteraction,
	"gesture-spring": GestureSpringCardDemoInteraction,
} as const satisfies Record<CardDemoVariant, CardDemoInteraction>;
