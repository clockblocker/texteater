import { expect, test } from "bun:test";
import { specExample } from "../src/lib/docs/spec-examples";

test("a page example brackets its target's members in the record sentence", () => {
	expect(specExample("de/ich-bin-im-wald").sentenceMarkdown).toBe(
		"Ich bin [i]m Wald.",
	);
	expect(specExample("de/ich-bin-im-wald", 1).sentenceMarkdown).toBe(
		"Ich bin i[m Wald].",
	);
	expect(
		specExample("de/es-zog-der-wilde-jaegersmann", 1).sentenceMarkdown,
	).toBe("Es [zog] der wilde Jägersmann\nsein grasgrün neues Röcklein [an];");
});

test("a page example names its record and target", () => {
	const example = specExample("de/pass-auf-dich-auf", 1);
	expect(example.record).toBe("de/pass-auf-dich-auf");
	expect(example.attestation.surface.lemma.canonicalForm).toBe("dich");
	expect(() => specExample("de/pass-auf-dich-auf", 2)).toThrow();
	expect(() => specExample("de/no-such-record")).toThrow();
});
