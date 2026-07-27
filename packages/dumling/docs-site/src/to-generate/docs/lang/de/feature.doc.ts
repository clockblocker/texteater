import { defineLanguageOverlayPage } from "../../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineLanguageOverlayPage({
  description: "Overview of grammatical, selection, and surface feature pages.",
  family: "feature",
  order: 8000,
  subject: "feature",
  title: "Feature",
  body: "Die Feature-Seiten bündeln alle öffentlichen Merkmalrouten für doc-cite. Grammatische Features bleiben flach unter `/feature`, während Selection- und Surface-Features eigene Unterfamilien bekommen.\n\nDas hält die öffentlichen URLs stabil, auch wenn ein Merkmal je nach Lemma-Subkind inhärent, flektionsgetragen oder beides sein kann."
});

export default document;
