import { expect, test } from "bun:test";
import { slotsOf } from "../../../src/segment/de/candidates.js";
import { authoredInventory } from "../../../src/segment/de/inventory.js";
import { writtenGermanSegments } from "../../../src/segment/de/segments.js";
import { type Sentence, sentenceOf } from "../../../src/segment/de/sentence.js";

const sentence = (text: string) =>
	sentenceOf({ segments: writtenGermanSegments(text).segments });

const particleHosts = (of: Sentence, particle: string) =>
	slotsOf(of, authoredInventory)
		.find(
			(slot) => slot.kind === "particle" && slot.piece.text === particle,
		)
		?.hosts.map((host) => host.text);

test("a particle that closes the bracket is offered its finite verb past the window", () => {
	const hosts = particleHosts(
		sentence(
			"Und lachend, verwirrt, in der Aufregung der Ankunft und des Wiedersehens reichte Hans Castorp ihm Handtasche und Wintermantel, die Plaidrolle mit Stock und Schirm und schließlich auch ›Ocean steamships‹ hinaus.",
		),
		"hinaus",
	);
	expect(hosts).toContain("reichte");
	// Past the window, nouns and the names are no hosts.
	expect(hosts).not.toContain("Aufregung");
	expect(hosts).not.toContain("Hans");
});

test("a sentence-initial verb past the window hosts a closing particle", () => {
	const hosts = particleHosts(
		sentence(
			"Gib mir bitte den Hut, den Mantel, die Handschuhe, den Schal, die Mütze, den Stock und schließlich auch noch den alten Schirm zurück!",
		),
		"zurück",
	);
	expect(hosts?.[0]).toBe("Gib");
});

test("a sentence break ends the reach, and a particle inside the clause keeps the window", () => {
	const broken = sentence(
		"Er reichte ihr die Hand; dann gingen sie mit Stock und Schirm, mit Mantel und Hut, mit Koffer und Kiste und schließlich auch mit dem Hund hinaus.",
	);
	const hosts = particleHosts(broken, "hinaus");
	expect(hosts).not.toContain("reichte");
	expect(hosts).toContain("gingen");
	const inside = sentence(
		"Er reichte ihm Handtasche und Wintermantel, die Plaidrolle mit Stock und Schirm und schließlich auch den Koffer hinaus und lachte.",
	);
	expect(particleHosts(inside, "hinaus")).not.toContain("reichte");
});

test("a word before an opening quote closes no bracket", () => {
	const hosts = particleHosts(
		sentence(
			"Obwohl im Gespräch zuvor die Redewendung „den Nagel auf den Kopf treffen“ gefallen war, kommentierte sie die selbst gewählte Lage mit „Wie man sich bettet, so liegt man“.",
		),
		"mit",
	);
	expect(hosts).not.toContain("Obwohl");
});
