import {
	CARD_DEMO_KEYBOARD_ORDER,
	cardDemoRestingOffset,
} from "../card-demo-contract";
import type { CardDemoInteractionProps } from "../card-demo-interaction";
import {
	CardDemoCardView,
	CardDemoStackFrame,
} from "../card-demo-presentation";

export function PendingCardDemoInteraction({
	cards,
	selectedSegment,
}: CardDemoInteractionProps) {
	return (
		<div className="card-demo-pending">
			<CardDemoStackFrame aria-describedby="card-demo-engine-pending">
				{CARD_DEMO_KEYBOARD_ORDER.map((kind) =>
					cards.find((card) => card.kind === kind),
				).map((card) =>
					card ? (
						<CardDemoCardView
							card={card}
							key={card.kind}
							segment={selectedSegment}
							style={{
								transform: `translateY(${cardDemoRestingOffset(card.presentationLayer)}px)`,
								zIndex: card.presentationLayer + 1,
							}}
						/>
					) : null,
				)}
			</CardDemoStackFrame>
			<p id="card-demo-engine-pending" role="status">
				This variant adapter is ready for its interaction engine.
			</p>
		</div>
	);
}
