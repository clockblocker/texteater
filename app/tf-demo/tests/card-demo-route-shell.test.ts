import { expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { CARD_DEMO_FAKE_TEXT } from "../src/playground/card-demo/card-demo-fixtures";
import { cardDemoNoteNavigation } from "../src/playground/card-demo/card-demo-navigation";
import {
	CardDemoRouteShell,
	CardDemoTextPage,
} from "../src/playground/card-demo/card-demo-route-shell";
import { PendingCardDemoInteraction } from "../src/playground/card-demo/variants/pending-card-demo-interaction";

function renderRoute(
	path: string | { pathname: string; state: unknown },
	Component: typeof CardDemoRouteShell = CardDemoRouteShell,
): string {
	return renderToStaticMarkup(
		createElement(
			MemoryRouter,
			{ initialEntries: [path] },
			createElement(Component),
		),
	);
}

test("renders the shared fake Text shell without production data", () => {
	const markup = renderRoute("/playground/card-demo/native/text");
	expect(markup).toContain('data-card-demo-variant="native"');
	expect(markup).toContain('data-card-demo-segment="playground-segment-01"');
	expect(markup).toContain("Lorem");
	expect(markup).not.toContain("Card interaction playground");
	expect(markup).not.toContain("Every word is a fake Segment");
	expect(markup).not.toContain("convex");
});

test("lists every playground version at the playground root", () => {
	const markup = renderRoute("/playground/card-demo");
	expect(markup).toContain('data-card-demo-index=""');
	expect(markup).toContain("Native");
	expect(markup).toContain("Motion");
	expect(markup).toContain("dnd-kit");
	expect(markup).toContain("Gesture + Spring");
	expect(
		markup.match(/href="\/playground\/card-demo\/[^"]+\/text"/g),
	).toHaveLength(4);
});

test("renders a matching fake Note route with the same presentation vocabulary", () => {
	const markup = renderRoute("/playground/card-demo/motion/note/lemma");
	expect(markup).toContain('data-card-demo-variant="motion"');
	expect(markup).toContain('data-card-demo-note="lemma"');
	expect(markup).toContain("Fake Lemma");
	expect(markup).not.toContain("not a production tf-demo Note");
});

test("preserves selected Segment content through Note navigation state", () => {
	const destination = cardDemoNoteNavigation(
		"motion",
		"attestation",
		"playground-segment-03",
	);
	const markup = renderRoute({
		pathname: destination.to,
		state: destination.state,
	});
	expect(markup).toContain("Segment 3 in the lorem-ipsum fixture");
});

test("keeps Text interactive while the nonmodal cards are open", () => {
	const markup = renderToStaticMarkup(
		createElement(
			MemoryRouter,
			{},
			createElement(CardDemoTextPage, {
				Interaction: PendingCardDemoInteraction,
				variant: "native",
				selectedSegment: CARD_DEMO_FAKE_TEXT.segments[2],
				onSelectedSegmentChange() {},
				onOpenNote() {},
			}),
		),
	);
	expect(markup).not.toContain('inert=""');
	expect(markup).not.toContain('aria-hidden="true"');
	expect(markup).not.toContain("data-card-demo-backdrop");
	expect(markup).not.toContain('aria-modal="true"');
});
