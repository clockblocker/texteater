import { expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import {
	completionNavigation,
	completionTarget,
	ResolutionNoteFrame,
} from "../src/views/resolution-note-view";

test("renders learner-safe Resolution sections in lifecycle order", () => {
	const markup = renderToStaticMarkup(
		createElement(
			MemoryRouter,
			{},
			createElement(ResolutionNoteFrame, {
				note: {
					kind: "ResolutionNote",
					target: { kind: "Resolution", requestId: "request-1" },
					progress: "ReadingAvailable",
					activity: "Running",
					route: {
						textId: "text-1" as never,
						sentenceId: "sentence-1" as never,
						stitchedText: "Die Banken.",
						clickedSegmentIndex: 2,
						selectedSegment: "Banken",
					},
					grammar: {
						members: [
							{ attested: "Banken", orthography: "Standard" },
						],
						realizationCoverage: "Full",
						normalizedSurface: "Banken",
						spelling: "Canonical",
						surfaceKind: "Inflection",
						canonicalForm: "Bank",
						family: "Lexeme",
						kind: "NOUN",
					},
					reading: {
						emojiDescription: "🏦",
						canonicalForm: "Bank",
						family: "Lexeme",
						kind: "NOUN",
					},
					updatedAt: 1,
				},
			}),
		),
	);

	expect(markup.indexOf('aria-label="Source"')).toBeLessThan(
		markup.indexOf('aria-label="Grammar"'),
	);
	expect(markup.indexOf('aria-label="Grammar"')).toBeLessThan(
		markup.indexOf('aria-label="Reading"'),
	);
	expect(markup).toContain("Die Banken.");
	expect(markup).toContain("🏦 Bank");
	expect(markup).not.toContain("visitor");
	expect(markup).not.toContain("provider");
});

test("completion navigation preserves its canonical Route Note destination", () => {
	const note = {
		kind: "ResolutionNote",
		target: { kind: "Resolution", requestId: "request-1" },
		progress: "Committing",
		activity: "Terminal",
		outcome: "Complete",
		route: {
			textId: "text-1" as never,
			sentenceId: "sentence-1" as never,
			stitchedText: "Die Banken.",
			clickedSegmentIndex: 2,
			selectedSegment: "Banken",
		},
		terminal: {
			kind: "Complete",
			attestationId: "attestation-1" as never,
			target: {
				kind: "RouteNote",
				routeKind: "Attestation",
				id: "attestation-1" as never,
			},
		},
		updatedAt: 1,
	} as const;
	expect(completionTarget(note)).toEqual({
		kind: "RouteNote",
		routeKind: "Attestation",
		id: "attestation-1",
	});
	expect(completionNavigation(note)).toEqual({
		href: "/note/route/attestation/attestation-1",
		options: { replace: true },
	});
});
