import { defineLanguageOverlayPage } from "../../../../../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineLanguageOverlayPage({
	family: "pos",
	leaf: "ADJ",
	subject: "ADJ",
	title: "ADJ",
	body: `
A participial adjective's Canonical Form is the uninflected participle, whether
or not it is lexicalized: \`gekocht\`, \`lachend\`. \`ein gebildeter Mann\` and
\`ein aus Ton gebildeter Krug\` are both \`gebildet\`.
`,
});

export default document;
