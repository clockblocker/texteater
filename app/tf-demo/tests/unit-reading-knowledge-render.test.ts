import { expect, test } from "bun:test";
import { DEFAULT_KNOWLEDGE_SETTINGS } from "dumrel";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
	KnowledgeActivityPresentation,
	KnowledgeSettingsChecklist,
	withKnowledgeSetting,
} from "../src/views/unit-reading-note-view";

test("renders an in-place loading state while Knowledge is absent", () => {
	const markup = renderToStaticMarkup(
		createElement(KnowledgeActivityPresentation, {
			state: { status: "Absent", activity: "Loading" },
			canRetry: false,
		}),
	);

	expect(markup).toContain('aria-label="Knowledge status"');
	expect(markup).toContain('aria-busy="true"');
	expect(markup).toContain("Knowledge pending");
	expect(markup).toContain("Generating knowledge for this Reading");
});

test("renders a generation failure with a retry affordance", () => {
	const markup = renderToStaticMarkup(
		createElement(KnowledgeActivityPresentation, {
			state: {
				status: "Partial",
				activity: "Failed",
				failureMessage: "The provider timed out.",
			},
			canRetry: true,
		}),
	);

	expect(markup).toContain("Partial knowledge");
	expect(markup).toContain("The provider timed out.");
	expect(markup).toContain("Retry knowledge generation");
	expect(markup).not.toContain('disabled=""');
});

test("renders Full Knowledge as ready without a retry action", () => {
	const markup = renderToStaticMarkup(
		createElement(KnowledgeActivityPresentation, {
			state: { status: "Full", activity: "Idle" },
			canRetry: true,
		}),
	);

	expect(markup).toContain("Knowledge ready");
	expect(markup).not.toContain("Retry knowledge generation");
});

test("renders every global setting and reflects disabled leaves", () => {
	const settings = withKnowledgeSetting(
		withKnowledgeSetting(DEFAULT_KNOWLEDGE_SETTINGS, "definition", false),
		"semanticRelations.antonym",
		false,
	);
	const markup = renderToStaticMarkup(
		createElement(KnowledgeSettingsChecklist, {
			settings,
			onChange: () => {},
		}),
	);

	expect(markup.match(/type="checkbox"/g)).toHaveLength(12);
	expect(markup).toContain("English translations");
	expect(markup).toContain("near synonym");
	expect(settings.definition).toBeFalse();
	expect(settings.semanticRelations.antonym).toBeFalse();
	expect(DEFAULT_KNOWLEDGE_SETTINGS.definition).toBeTrue();
});
