import { expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { SentenceList } from "../src/views/text-view";

test("a revealed occurrence selects all and only its discontinuous members", () => {
	// An arrival selects one member; the rest of the occurrence follows by attestation.
	const markup = renderToStaticMarkup(
		createElement(SentenceList, {
			sentences: [
				{
					sentenceId: "sentence_1",
					position: 0,
					language: "de",
					stitchedText: "eins dazwischen vier",
					sourceText: "eins dazwischen vier",
					segments: [
						segment(1, "eins", { attestationId: "attestation_1" }),
						segment(2, "dazwischen"),
						segment(4, "vier", { attestationId: "attestation_1" }),
					],
				},
			],
			selectedSegmentKey: "sentence_1:1",
			onSegmentClick: async () => {},
		}),
	);

	expect(markup.match(/data-state="selected"/g)).toHaveLength(2);
	expect(buttonMarkup(markup, "eins")).toContain('data-state="selected"');
	expect(buttonMarkup(markup, "dazwischen")).not.toContain("data-state");
	expect(buttonMarkup(markup, "vier")).toContain('data-state="selected"');
});

test("renders visitor-filtered terminal states with distinct failure color hooks", () => {
	const markup = renderToStaticMarkup(
		createElement(SentenceList, {
			sentences: [
				{
					sentenceId: "sentence_1",
					position: 0,
					language: "de",
					stitchedText: "active unresolved failed known",
					sourceText: "active unresolved failed known",
					segments: [
						segment(0, "active", {
							encountered: true,
							resolutionState: "Active",
						}),
						segment(1, "unresolved", {
							encountered: true,
							resolutionState: "Unresolved",
						}),
						segment(2, "failed", {
							encountered: true,
							resolutionState: "PermanentFailure",
						}),
						segment(3, "known", {
							attestationId: "attestation_1",
							encountered: true,
						}),
					],
				},
			],
			focus: { kind: "None" },
			selectedSegmentKey: null,
			onSegmentClick: async () => {},
		}),
	);

	expect(buttonMarkup(markup, "active")).toContain('data-state="resolving"');
	expect(buttonMarkup(markup, "active")).toContain("disabled");
	expect(buttonMarkup(markup, "unresolved")).toContain(
		'data-state="unresolved"',
	);
	expect(buttonMarkup(markup, "failed")).toContain('data-state="failed"');
	expect(buttonMarkup(markup, "known")).toContain('data-state="retained"');
});

test("selecting one known member colors the complete occurrence", () => {
	const markup = renderToStaticMarkup(
		createElement(SentenceList, {
			sentences: [
				{
					sentenceId: "sentence_1",
					position: 0,
					language: "de",
					stitchedText: "rufe dich an",
					sourceText: "rufe dich an",
					segments: [
						segment(0, "rufe", {
							attestationId: "attestation_1",
						}),
						segment(1, " dich "),
						segment(2, "an", {
							attestationId: "attestation_1",
						}),
					],
				},
			],
			selectedSegmentKey: "sentence_1:2",
			onSegmentClick: async () => {},
		}),
	);

	expect(buttonMarkup(markup, "rufe")).toContain('data-state="selected"');
	expect(buttonMarkup(markup, "an")).toContain('data-state="selected"');
});

function segment(
	index: number,
	text: string,
	overrides: Partial<{
		attestationId: string;
		encountered: boolean;
		resolutionState: "Active" | "Unresolved" | "PermanentFailure";
	}> = {},
) {
	return {
		index,
		kind: "ResolvableText" as const,
		text,
		encountered: false,
		...overrides,
	};
}

function buttonMarkup(markup: string, text: string): string {
	return markup.match(new RegExp(`<button[^>]*>${text}</button>`))?.[0] ?? "";
}
