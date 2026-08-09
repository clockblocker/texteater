import { defineLanguageOverlayPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";
import { attestation as bvgAbbreviation } from "../../../../attestations/de/attestation/In_Berlin_betreibt_die_BVG_die_UBahn/In_Berlin_betreibt_die_[BVG]_die_UBahn.ts";

const document = defineLanguageOverlayPage({
	description: "German Abbr.",
	examples: [bvgAbbreviation],
	family: "feature",
	leaf: "Abbr",
	order: 8010,
	subject: "Abbr",
	title: "Abbr",
});

export default document;
