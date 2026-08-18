import { expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { SentenceList } from "../src/views/text-view";

test("renders focus markers on all and only discontinuous occurrence members", () => {
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
						segment(1, "eins"),
						segment(2, "dazwischen"),
						segment(4, "vier"),
					],
				},
			],
			focus: {
				kind: "Occurrence",
				attestationId: "attestation_1",
				sentenceId: "sentence_1",
				memberSegmentIndices: [1, 4],
			},
			isResolving: false,
			selectedSegmentKey: null,
			onSegmentClick: async () => {},
		}),
	);

	expect(markup.match(/data-source-context-member="true"/g)).toHaveLength(2);
	expect(buttonMarkup(markup, "eins")).toContain(
		'data-source-context-member="true"',
	);
	expect(buttonMarkup(markup, "dazwischen")).not.toContain(
		"data-source-context-member",
	);
	expect(buttonMarkup(markup, "vier")).toContain(
		'data-source-context-member="true"',
	);
});

function segment(index: number, text: string) {
	return {
		index,
		kind: "ResolvableText" as const,
		text,
		isClicked: false,
		isResolutionMember: false,
	};
}

function buttonMarkup(markup: string, text: string): string {
	return markup.match(new RegExp(`<button[^>]*>${text}</button>`))?.[0] ?? "";
}
