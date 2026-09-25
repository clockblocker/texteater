import { defineUniversalConceptPage } from "../../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineUniversalConceptPage({
	family: "entity",
	leaf: "Attestation",
	order: 11003,
	subject: "Attestation",
	title: "Attestation",
	body: `
An Attestation is one occurrence of one Surface: its ordered attested members
and Full or Partial \`realizationCoverage\`. It has value equality and no
durable identity. A member's orthography is Standard, Typo, Fused or
Shorthand. Every record target in the spec is an Attestation, and each has its
own attestation page.
`,
});

export default document;
