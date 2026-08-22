import {
	type CardDemoNoteKind,
	type CardDemoVariant,
	isCardDemoNoteKind,
	isCardDemoVariant,
} from "./card-demo-contract";

export const CARD_DEMO_BASE_PATH = "/playground/card-demo";
export const CARD_DEMO_SELECTED_SEGMENT_STATE_KEY = "cardDemoSelectedSegmentId";

export type CardDemoTarget =
	| { readonly page: "text"; readonly variant: CardDemoVariant }
	| {
			readonly page: "note";
			readonly variant: CardDemoVariant;
			readonly noteKind: CardDemoNoteKind;
	  };

export type CardDemoLocation = {
	readonly pathname: string;
	readonly search: string;
};

export type CardDemoNoteNavigation = {
	readonly to: string;
	readonly state: {
		readonly cardDemoSelectedSegmentId: string;
	};
};

export function cardDemoHref(target: CardDemoTarget): string {
	const variantRoot = `${CARD_DEMO_BASE_PATH}/${target.variant}`;
	return target.page === "text"
		? `${variantRoot}/text`
		: `${variantRoot}/note/${target.noteKind}`;
}

export function cardDemoNoteNavigation(
	variant: CardDemoVariant,
	noteKind: CardDemoNoteKind,
	selectedSegmentId: string,
): CardDemoNoteNavigation {
	return {
		to: cardDemoHref({ page: "note", variant, noteKind }),
		state: { [CARD_DEMO_SELECTED_SEGMENT_STATE_KEY]: selectedSegmentId },
	};
}

export function cardDemoSelectedSegmentIdFromState(
	state: unknown,
): string | null {
	if (typeof state !== "object" || state === null) return null;
	const id = (state as Record<string, unknown>)[
		CARD_DEMO_SELECTED_SEGMENT_STATE_KEY
	];
	return typeof id === "string" ? id : null;
}

export function cardDemoTargetFromLocation(
	location: CardDemoLocation,
): CardDemoTarget | null {
	if (location.search !== "") return null;
	const segments = location.pathname.split("/");
	if (
		segments[0] !== "" ||
		segments.some((segment, index) => index > 0 && segment === "")
	) {
		return null;
	}
	if (
		segments[1] !== "playground" ||
		segments[2] !== "card-demo" ||
		!segments[3] ||
		!isCardDemoVariant(segments[3])
	) {
		return null;
	}
	const variant = segments[3];
	if (segments.length === 5 && segments[4] === "text") {
		return { page: "text", variant };
	}
	if (
		segments.length === 6 &&
		segments[4] === "note" &&
		segments[5] &&
		isCardDemoNoteKind(segments[5])
	) {
		return { page: "note", variant, noteKind: segments[5] };
	}
	return null;
}
