import { defineLanguageOverlayPage } from "../../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineLanguageOverlayPage({
	description: "Overview of the public entity categories in doc-cite.",
	family: "entity",
	order: 1000,
	subject: "entity",
	title: "Entity",
	body: "Diese Übersicht erklärt, welche Art von öffentlichem Objekt doc-cite gerade beschreibt: das Lemma selbst, eine normalisierte Surface oder eine konkrete Attestation.\n\nDumling trennt die Ebenen, weil jede Route eine andere Frage beantwortet: Was ist die grammatische Identität, wie sieht ihre normalisierte Surface im Kontext aus, und welche exakten Mitglieder sind belegt?",
});

export default document;
