import { expect, test } from "bun:test";
import { DEFAULT_KNOWLEDGE_SETTINGS } from "dumrel";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
	KnowledgeSettingsChecklist,
	withKnowledgeSetting,
} from "../src/views/unit-reading-knowledge-settings";

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

	expect(markup.match(/type="checkbox"/g)).toHaveLength(13);
	expect(markup).toContain("English translations");
	expect(markup).toContain("near synonym");
	expect(markup).toContain("near antonym");
	expect(settings.definition).toBeFalse();
	expect(settings.semanticRelations.antonym).toBeFalse();
	expect(DEFAULT_KNOWLEDGE_SETTINGS.definition).toBeTrue();
});
