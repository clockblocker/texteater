import { describe, expect, it } from "bun:test";
import { parseTableSchemaFor } from "dumling";
import type * as Dumling from "dumling/types";

import { inflectionPacks } from "../../src/inflection.js";
import { authoredMembers } from "../../src/inventories/registry.js";
import { lexeme, noun, pack, verb } from "./support.js";

const stem = authoredMembers.find(
	({ lemma }) => lemma.kind === "PRON" && pack.schemaFor(lemma) !== undefined,
)?.lemma as Dumling.Lemma<"de">;
const sein = authoredMembers.find(
	({ lemma }) => lemma.kind === "AUX" && lemma.canonicalForm === "sein",
)?.lemma as Dumling.Lemma<"de">;
const lemmas: readonly Dumling.Lemma<"de">[] = [
	noun("Tag", "Masc"),
	verb("fahren"),
	sein,
	lexeme("ADJ", "schnell", { comparable: "Yes" }),
	lexeme("ADV", "gern", { comparable: "Yes" }),
	authoredMembers.find(
		({ lemma }) => lemma.kind === "DET" && lemma.canonicalForm === "dieser",
	)?.lemma as Dumling.Lemma<"de">,
	stem,
];

describe("the German Inflection Pack", () => {
	it("is the registry's de pack, versioned", () => {
		expect(Object.keys(inflectionPacks)).toEqual(["de"]);
		expect(pack.language).toBe("de");
		expect(pack.version).toBe("3");
	});

	it("gives each tabulated route a schema Dumling accepts for it", () => {
		for (const lemma of lemmas) {
			const schema = pack.schemaFor(lemma);
			expect(schema?.id).toBe(`de/Lexeme/${lemma.kind}`);
			const parsed = parseTableSchemaFor(schema, lemma);
			expect([lemma.kind, parsed.success]).toEqual([lemma.kind, true]);
		}
	});

	it("declares the dictionary notes' panels core", () => {
		const core = (lemma: Dumling.Lemma<"de">) =>
			pack
				.schemaFor(lemma)
				?.panels.map(
					({ id, core }) => `${id}${core ? "" : " (not core)"}`,
				);
		expect(core(noun("Tag", "Masc"))).toEqual(["declension"]);
		expect(core(verb("fahren"))).toEqual([
			"present",
			"preterite",
			"subjunctive2",
			"participle",
			"subjunctive1 (not core)",
			"imperative (not core)",
		]);
		expect(core(lexeme("ADJ", "schnell", { comparable: "Yes" }))).toEqual([
			"comparison",
		]);
		expect(core(stem)).toEqual(["declension"]);
	});

	it("tabulates no Locution, uninflecting Kind or uncomparable ADJ", () => {
		const locution = {
			...verb("die Katze aus dem Sack lassen"),
			family: "Locution",
		} as unknown as Dumling.Lemma<"de">;
		expect(pack.schemaFor(locution)).toBeUndefined();
		expect(
			pack.schemaFor(lexeme("ADJ", "tot", { comparable: null })),
		).toBeUndefined();
		const conjunction = authoredMembers.find(
			({ lemma }) => lemma.kind === "CCONJ",
		)?.lemma;
		if (conjunction) expect(pack.schemaFor(conjunction)).toBeUndefined();
	});

	it("labels panels, axes and bundles in German grammar terms", () => {
		const { labels } = pack;
		expect(
			[
				"present",
				"preterite",
				"subjunctive2",
				"participle",
				"imperative",
			].map(labels.panel),
		).toEqual([
			"Präsens",
			"Präteritum",
			"Konjunktiv II",
			"Partizip II",
			"Imperativ",
		]);
		expect(
			["Nom", "Acc", "Gen", "Dat"].map((name) =>
				labels.axis({ case: name }),
			),
		).toEqual(["N", "A", "G", "D"]);
		expect(labels.axis({ number: "Sing" })).toBe("Sg");
		expect(labels.axis({ number: "Plur" })).toBe("Pl");
		expect(labels.axis({ person: "3", number: "Sing" })).toBe("3.Sg");
		expect(labels.axis({ gender: "Masc", number: "Sing" })).toBe("m");
		expect(labels.bundle({ case: "Dat", number: "Plur" })).toBe("Dat.Pl");
		expect(
			labels.bundle({
				verbForm: "Fin",
				mood: "Ind",
				tense: "Pres",
				person: "3",
				number: "Sing",
			}),
		).toBe("Präs.3.Sg");
		expect(
			labels.bundle({
				verbForm: "Fin",
				mood: "Ind",
				tense: "Pres",
				perfect: "Yes",
				person: "3",
				number: "Sing",
			}),
		).toBe("Perf.3.Sg");
		expect(
			labels.bundle({
				verbForm: "Fin",
				mood: "Ind",
				tense: "Past",
				voice: "Pass",
				passive: "Process",
				person: "3",
				number: "Sing",
			}),
		).toBe("Vorgangspass.Prät.3.Sg");
		expect(
			labels.bundle({ verbForm: "Fin", mood: "Sub", tense: "Past" }),
		).toBe("Konj.II");
		expect(labels.bundle({ degree: "Cmp" })).toBe("Komp");
	});
});

/** A met Surface of a German Lemma. */
function surface(
	lemma: Dumling.Lemma<"de">,
	normalizedSurface: string,
	inflectionalFeatures: Readonly<Record<string, string | null>>,
): Dumling.Surface<"de"> {
	return {
		inflectionalFeatures,
		language: "de",
		lemma,
		normalizedSurface,
		spelling: { kind: "Canonical" },
		surfaceFeatures: null,
		unitKind: "Surface",
	} as unknown as Dumling.Surface<"de">;
}

const finite = {
	verbForm: "Fin",
	mood: "Ind",
	tense: "Pres",
	person: "3",
	number: "Sing",
};

describe("met Surfaces", () => {
	it("read a joined particle apart, keyed as the derived form", () => {
		const abfahren = verb("abfahren", { hasSepPrefix: "ab" });
		const met = pack.formOfSurface(surface(abfahren, "abfährt", finite));
		expect(met).toEqual({ kind: "Verb", finite: "fährt", particle: "ab" });
		expect(pack.codec.key(met)).toBe(
			pack.codec.key({
				kind: "Verb",
				pronoun: "er",
				finite: "fährt",
				particle: "ab",
			}),
		);
		// A Surface leaves the lexical reflexive out, and so does every cell
		// (ADR 0052).
		const vorbereiten = verb("vorbereiten", { hasSepPrefix: "vor" });
		const bereitet = pack.formOfSurface(
			surface(vorbereiten, "vorbereitet", finite),
		);
		expect(bereitet).toEqual({
			kind: "Verb",
			finite: "bereitet",
			particle: "vor",
		});
		const derived = {
			kind: "Verb",
			pronoun: "er",
			finite: "bereitet",
			particle: "vor",
		} as const;
		expect(pack.codec.key(bereitet)).toBe(pack.codec.key(derived));
		expect(pack.display(derived)).toEqual([
			{ text: "er ", role: "Context" },
			{ text: "bereitet", role: "Form" },
			{ text: " … ", role: "Gap" },
			{ text: "vor", role: "Form" },
		]);
	});

	it("read a periphrasis as its finite auxiliary and the rest, shown as hat gefahren", () => {
		const perfect = { ...finite, perfect: "Yes" };
		const fahren = verb("fahren");
		const met = pack.formOfSurface(
			surface(fahren, "gefahren hat", perfect),
		);
		expect(met).toEqual({
			kind: "Verb",
			finite: "hat",
			nonFinite: "gefahren",
		});
		expect(
			pack
				.display(met)
				.map(({ text }) => text)
				.join(""),
		).toBe("hat gefahren");
	});

	it("read the finite word last, an Ersatzinfinitiv's first, and an imperative's first", () => {
		const reparieren = verb("reparieren");
		expect(
			pack.formOfSurface(
				surface(reparieren, "repariert worden war", {
					...finite,
					tense: "Past",
					perfect: "Yes",
					voice: "Pass",
					passive: "Process",
				}),
			),
		).toEqual({
			kind: "Verb",
			finite: "war",
			nonFinite: "repariert worden",
		});
		expect(
			pack.formOfSurface(
				surface(reparieren, "hat reparieren lassen", {
					...finite,
					perfect: "Yes",
					voice: "Cau",
				}),
			),
		).toEqual({
			kind: "Verb",
			finite: "hat",
			nonFinite: "reparieren lassen",
		});
		const liefern = verb("liefern");
		expect(
			pack.formOfSurface(
				surface(liefern, "geliefert bekommt", {
					...finite,
					voice: "Pass",
					passive: "Recipient",
				}),
			),
		).toEqual({ kind: "Verb", finite: "bekommt", nonFinite: "geliefert" });
		const hereinkommen = verb("hereinkommen", { hasSepPrefix: "herein" });
		expect(
			pack.formOfSurface(
				surface(hereinkommen, "komm herein", {
					verbForm: "Fin",
					mood: "Imp",
					person: "2",
					number: "Sing",
				}),
			),
		).toEqual({ kind: "Verb", finite: "komm", particle: "herein" });
		// A spaced particle stands before the verb, as the Canonical Form has it.
		const uebrigBleiben = verb("übrig bleiben", { hasSepPrefix: "übrig" });
		expect(
			pack.formOfSurface(
				surface(uebrigBleiben, "übrig blieb", {
					...finite,
					tense: "Past",
				}),
			),
		).toEqual({ kind: "Verb", finite: "blieb", particle: "übrig" });
	});

	it("read a noun's spelling as one word with its cell's article, folded for its key", () => {
		const met = pack.formOfSurface(
			surface(noun("Tag", "Masc"), "Tage", {
				case: "Nom",
				number: "Plur",
			}),
		);
		expect(met).toEqual({ kind: "Word", article: "die", word: "Tage" });
		expect(pack.codec.key(met)).toBe(
			pack.codec.key({ kind: "Word", article: "die", word: "TAGE" }),
		);
		expect(
			pack.display({ kind: "Word", article: "die", word: "Tage" }),
		).toEqual([
			{ text: "die ", role: "Context" },
			{ text: "Tage", role: "Form" },
		]);
	});
});
