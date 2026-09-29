import { defineUniversalConceptPage } from "../../../../lib/docs/source-mirrored-doc-pages.ts";
import { specExample } from "../../../../lib/docs/spec-examples.ts";

const sus = specExample(
	"de/im-deutschsprachigen-spielchat-wirkte-die-erklaerung-sehr",
);
const whatever = specExample(
	"de/in-der-sonst-deutschen-unterhaltung-antwortete-sie-nur",
);

const document = defineUniversalConceptPage({
	description:
		"Custom Dumling reference for the sourceLang feature on Foreign Lemmas.",
	family: "feature",
	leaf: "SourceLang",
	order: 18037.25,
	subject: "SourceLang",
	title: "SourceLang",
	body: `
\`sourceLang\` names the language a [\`Foreign\`](/u/entity/lemma/foreign/foreign/) Lemma comes from. It is the Foreign route's only Core Feature, part of the Lemma's identity together with the text's language and the Canonical Form (ADR 0045).

## Values

A lowercase ISO 639 code of two or three letters: \`en\`, \`fr\`, \`la\`, \`yi\`, \`grc\`. Any language may appear, not only the languages Dumling supports. \`und\` marks a unit whose language can't be told. The value is never \`null\`.
`,
	examples: [sus, whatever],
	subsections: [
		{
			heading: "Current Dumling support",
			body: `
Current concrete Dumling schemas expose \`sourceLang\` on the German, English and Hebrew Foreign routes. Dumling checks the code's shape only.
`,
		},
	],
});

export default document;
