import { defineLanguageOverlayPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineLanguageOverlayPage({
  description: "Overview of selection features in the public doc-cite tree.",
  family: "feature-selection",
  order: 8100,
  subject: "selection-features",
  title: "Selection Features",
  body: "Selection-Features beschreiben nicht das Lemma, sondern die Beziehung zwischen markierter Spanne und aufgelöster Surface im konkreten Beleg.\n\nSie sind für doc-cite entscheidend, weil eine Selektion teilweise, orthographisch fehlerhaft oder absichtlich als Variante markiert sein kann, ohne dass sich das zugrunde liegende Lemma ändert."
});

export default document;
