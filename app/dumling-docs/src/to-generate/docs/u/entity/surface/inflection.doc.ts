import { defineUniversalConceptPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineUniversalConceptPage({
	family: "surface",
	leaf: "Inflection",
	order: 12002,
	subject: "Inflection",
	title: "Inflection",
	body: "Inflectional features describe the grammatical realization of a Surface. Routes that represent inflection carry a nullable feature bag. Use `checkIfGrundform` to assess whether that realization is canonical, and preserve assessment failures as undetermined.",
});

export default document;
