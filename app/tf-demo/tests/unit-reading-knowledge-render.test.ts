import { expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DEFAULT_KNOWLEDGE_SETTINGS } from "../shared/knowledge-preferences";

import { KnowledgeSettingsChecklist } from "../src/views/unit-reading-knowledge-settings";

test("renders every global setting and reflects disabled leaves", () => {
	const settings = {
		...DEFAULT_KNOWLEDGE_SETTINGS,
		definition: false,
		semanticRelations: {
			...DEFAULT_KNOWLEDGE_SETTINGS.semanticRelations,
			antonym: false,
		},
	};
	const markup = renderToStaticMarkup(
		createElement(KnowledgeSettingsChecklist, {
			settings,
			onChange: () => {},
		}),
	);

	expect(markup.match(/type="checkbox"/g)).toHaveLength(12);
	expect(markup).toContain("English translations");
	expect(markup).toContain("Russian translations");
	expect(markup).toContain("near synonym");
	expect(markup).toContain("near antonym");
	expect(isChecked(markup, "definition")).toBeFalse();
	expect(isChecked(markup, "semanticRelations.antonym")).toBeFalse();
	expect(isChecked(markup, "translations.ru")).toBeTrue();
});

/** Whether one setting's checkbox input renders checked. */
function isChecked(markup: string, id: string): boolean {
	const input = markup.match(
		new RegExp(
			`<input id="knowledge-setting-${id.replace(".", "\\.")}"[^>]*>`,
		),
	)?.[0];
	if (!input) throw new Error(`No checkbox for ${id}.`);
	return /\schecked=""/.test(input);
}
