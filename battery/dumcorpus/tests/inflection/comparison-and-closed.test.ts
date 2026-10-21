import { describe, expect, it } from "bun:test";
import type * as Dumling from "dumling/types";
import { parseLemmaParadigm } from "dumrel";

import { germanAuthoredParadigm } from "../../src/inflection.js";
import { closedVerbForms } from "../../src/inventories/de/closed-verb-paradigms.js";
import {
	closedAuxiliaryTables,
	closedVerbTables,
} from "../../src/inventories/de/closed-verb-tables.js";
import { authoredMembers } from "../../src/inventories/registry.js";
import { lexeme, lines, pack, panels, verb } from "./support.js";

const compared = (positive: string, kind: "ADJ" | "ADV" = "ADJ") =>
	lines(lexeme(kind, positive, { comparable: "Yes" }));

describe("comparison", () => {
	for (const [positive, comparative, superlative] of [
		["schnell", "schneller", "am schnellsten"],
		["langsam", "langsamer", "am langsamsten"],
		["dunkel", "dunkler", "am dunkelsten"],
		["teuer", "teurer", "am teuersten"],
		["leise", "leiser", "am leisesten"],
		["müde", "müder", "am müdesten"],
		["leicht", "leichter", "am leichtesten"],
		["frei", "freier", "am freiesten"],
		["interessant", "interessanter", "am interessantesten"],
		["typisch", "typischer", "am typischsten"],
		["spät", "später", "am spätesten"],
		["begeistert", "begeisterter", "am begeistertsten"],
		["gebildet", "gebildeter", "am gebildetsten"],
		["interessiert", "interessierter", "am interessiertesten"],
	] as const)
		it(`derives ${positive}, ${comparative}, ${superlative}`, () => {
			expect(compared(positive)).toBe(
				`Positiv: ${positive}\nKomparativ: ${comparative}\nSuperlativ: ${superlative}`,
			);
		});

	it("takes suppletive forms from the Authored Inventory", () => {
		expect(compared("gut")).toBe(
			"Positiv: gut\nKomparativ: besser\nSuperlativ: am besten",
		);
		expect(compared("gern", "ADV")).toBe(
			"Positiv: gern\nKomparativ: lieber\nSuperlativ: am liebsten",
		);
		expect(compared("gerne", "ADV")).toBe(
			"Positiv: gerne\nKomparativ: lieber\nSuperlativ: am liebsten",
		);
	});

	it("derives nothing regular for an ADV", () => {
		expect(compared("sehr", "ADV")).toBe("Positiv: sehr");
		expect(compared("lange", "ADV")).toBe("Positiv: lange");
	});

	it("leaves a monosyllable that may umlaut Unknown, for a met form to fill", () => {
		for (const positive of ["alt", "klar", "lange", "nahe", "gesund"])
			expect(compared(positive)).toBe(`Positiv: ${positive}`);
	});

	it("leaves out a compound whose last part may umlaut", () => {
		for (const positive of [
			"altklug",
			"kerngesund",
			"lebensnah",
			"leistungsstark",
		])
			expect(compared(positive)).toBe(`Positiv: ${positive}`);
	});

	it("leaves out the comparative of a Latin -er that drops its e", () => {
		expect(compared("integer")).toBe(
			"Positiv: integer\nSuperlativ: am integersten",
		);
		expect(compared("sauber")).toBe(
			"Positiv: sauber\nKomparativ: sauberer\nSuperlativ: am saubersten",
		);
	});

	it("leaves out the superlative after an unstressed -igt or -icht", () => {
		expect(compared("berechtigt")).toBe(
			"Positiv: berechtigt\nKomparativ: berechtigter",
		);
		expect(compared("töricht")).toBe(
			"Positiv: töricht\nKomparativ: törichter",
		);
	});

	it("has a schema only where Core marks the Lemma comparable", () => {
		expect(
			pack.schemaFor(lexeme("ADJ", "tot", { comparable: null })),
		).toBeUndefined();
		expect(
			pack.schemaFor(lexeme("ADJ", "tot", { comparable: "Yes" }))?.id,
		).toBe("de/Lexeme/ADJ");
	});
});

function authoredLemma(
	predicate: (lemma: Dumling.Lemma<"de">) => boolean,
): Dumling.Lemma<"de"> {
	const member = authoredMembers.find(({ lemma }) => predicate(lemma));
	if (member === undefined) throw new Error("No such authored member");
	return member.lemma as Dumling.Lemma<"de">;
}

describe("closed-class paradigms from the Authored Inventory", () => {
	it("gives a declining determiner stem its case table", () => {
		const dieser = authoredLemma(
			(lemma) => lemma.kind === "DET" && lemma.canonicalForm === "dieser",
		);
		expect(lines(dieser, {}, { columns: true })).toBe(
			`N: dieser (m), dieses (n), diese (f), diese (pl)
A: diesen (m), dieses (n), diese (f), diese (pl)
G: dieses (m), dieses (n), dieser (f), dieser (pl)
D: diesem (m), diesem (n), dieser (f), diesen (pl)`,
		);
	});

	it("gives a modal verb its authored table", () => {
		expect(panels(verb("sollen"))).toEqual({
			"Konjunktiv I":
				"ich solle, du sollest, er solle, wir sollen, ihr sollet, sie sollen",
			"Konjunktiv II":
				"ich sollte, du solltest, er sollte, wir sollten, ihr solltet, sie sollten",
			"Partizip II": "gesollt",
			Präsens:
				"ich soll, du sollst, er soll, wir sollen, ihr sollt, sie sollen",
			Präteritum:
				"ich sollte, du solltest, er sollte, wir sollten, ihr solltet, sie sollten",
		});
	});

	it("gives an auxiliary its plain forms, without shorthands or archaic ones", () => {
		const sein = authoredLemma(
			(lemma) => lemma.kind === "AUX" && lemma.canonicalForm === "sein",
		);
		expect(panels(sein).Präsens).toBe(
			"ich bin, du bist, er ist, wir sind, ihr seid, sie sind",
		);
		const all = Object.values(panels(sein)).join(", ");
		for (const form of ["hab", "hätt", "ward"])
			expect(all.split(/,? /u)).not.toContain(form);
		const werden = authoredLemma(
			(lemma) => lemma.kind === "AUX" && lemma.canonicalForm === "werden",
		);
		expect(panels(werden)["Partizip II"]).toBe("worden");
		expect(panels(verb("werden"))["Partizip II"]).toBe("geworden");
	});

	it("drops a modal's pre-reform ß spellings", () => {
		const all = Object.values(panels(verb("müssen"))).join(", ");
		expect(all).toContain("muss");
		expect(all).not.toContain("muß");
	});

	it("gives an AUX that shares several verbs' forms, and a pillar cell, no table", () => {
		for (const [kind, form] of [
			["AUX", "bekommen"],
			["DET", "der"],
		] as const)
			expect(
				pack.schemaFor(
					authoredLemma(
						(lemma) =>
							lemma.kind === kind && lemma.canonicalForm === form,
					),
				),
			).toBeUndefined();
	});

	it("authors only forms the inventory lists, and every plain one it lists", () => {
		for (const [lemma, table] of Object.entries({
			...closedVerbTables,
			...closedAuxiliaryTables,
		})) {
			const listed = closedVerbForms[lemma] ?? [];
			const authored = new Set(
				[
					...table.present,
					...table.preterite,
					...table.subjunctive2,
					...table.subjunctive1,
				].flat(),
			);
			for (const form of [
				...table.participle,
				...(table.imperative?.singular ?? []),
				...(table.imperative?.plural ?? []),
			])
				authored.add(form);
			for (const form of authored)
				expect([lemma, listed.includes(form)]).toEqual([lemma, true]);
			const plain = listed.filter(
				(form) =>
					![
						"hab",
						"hätt",
						"ward",
						"wardst",
						"worden",
						"geworden",
						lemma,
					].includes(form) && !form.includes("ß"),
			);
			for (const form of plain)
				expect([lemma, authored.has(form)]).toEqual([lemma, true]);
		}
	});

	it("gives a closed VERB an Authored Lemma Paradigm every Reading takes", () => {
		const sollen = verb("sollen");
		const paradigm = germanAuthoredParadigm(sollen);
		expect(parseLemmaParadigm({ lemma: sollen, paradigm }).success).toBe(
			true,
		);
		expect(paradigm?.dimensions.preterite).toEqual({
			variants: [
				{ id: "sollte", value: "sollte", provenance: "Authored" },
			],
			licences: {},
		});
		expect(paradigm?.dimensions.present2?.variants[0]?.value).toBe(
			"sollst",
		);
		for (const lemma of Object.keys(closedVerbTables)) {
			const closed = verb(lemma);
			expect(
				parseLemmaParadigm({
					lemma: closed,
					paradigm: germanAuthoredParadigm(closed),
				}).success,
			).toBe(true);
		}
		expect(germanAuthoredParadigm(verb("fahren"))).toBeUndefined();
	});
});
