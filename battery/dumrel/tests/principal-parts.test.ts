import { expect, test } from "bun:test";
import {
	applyKnowledgeChange,
	parseReadingKnowledge,
	selectKnowledge,
} from "dumrel";
import { houseReading, wartenReading } from "./fixtures.js";

const verbReading = (
	canonicalForm: string,
	hasSepPrefix: string | null = null,
) => ({
	...wartenReading,
	lemma: {
		...wartenReading.lemma,
		canonicalForm,
		coreFeatures: { hasSepPrefix, lexicallyReflexive: null },
	},
});
const fahren = verbReading("fahren");
const abfahren = verbReading("abfahren", "ab");
const parse = (source: unknown, knowledge: unknown) =>
	parseReadingKnowledge({
		source: source as typeof wartenReading,
		knowledge: knowledge as never,
	});
const present = (first: string[], second: string[], third: string[]) => ({
	first,
	second,
	third,
});

test("a German VERB Reading stores its principal parts as a dictionary cites them (#1217, ADR 0038)", () => {
	expect(
		parse(fahren, {
			presentSingular: present([" fahre"], ["fährst"], ["fährt"]),
			pastParticiple: ["gefahren"],
			subjunctivePast: ["führe"],
		}),
	).toEqual({
		success: true,
		value: {
			presentSingular: present(["fahre"], ["fährst"], ["fährt"]),
			pastParticiple: ["gefahren"],
			subjunctivePast: ["führe"],
		},
	});
	for (const [source, knowledge] of [
		[
			abfahren,
			{
				presentSingular: present(
					["fahre ab"],
					["fährst ab"],
					["fährt ab"],
				),
				pastParticiple: ["abgefahren"],
				subjunctivePast: ["führe ab"],
			},
		],
		[verbReading("trompeten"), { pastParticiple: ["trompetet"] }],
		[
			verbReading("können"),
			{ presentSingular: present(["kann"], ["kannst"], ["kann"]) },
		],
		[
			verbReading("lesen"),
			{ presentSingular: present(["lese"], ["liest"], ["liest"]) },
		],
		[verbReading("bringen"), { subjunctivePast: ["brächte"] }],
		[verbReading("senden"), { pastParticiple: ["gesandt", "gesendet"] }],
	] as const)
		expect([knowledge, parse(source, knowledge).success]).toEqual([
			knowledge,
			true,
		]);
});

test("Dumrel refuses forms a dictionary never cites", () => {
	for (const [source, knowledge] of [
		[fahren, { pastParticiple: [] }],
		[fahren, { pastParticiple: ["gefahren", "Gefahren"] }],
		[fahren, { pastParticiple: ["ist gefahren"] }],
		[fahren, { pastParticiple: ["fahrend"] }],
		[verbReading("sich erinnern"), { pastParticiple: ["sich erinnert"] }],
		[abfahren, { pastParticiple: ["gefahren"] }],
		[abfahren, { pastParticiple: ["ab"] }],
		[fahren, { subjunctivePast: ["fuhr"] }],
		[fahren, { subjunctivePast: ["würde fahren"] }],
		[abfahren, { subjunctivePast: ["abführe"] }],
		[fahren, { presentSingular: present(["fahre"], ["fährs"], ["fährt"]) }],
		[fahren, { presentSingular: present([], ["fährst"], ["fährt"]) }],
		[
			fahren,
			{
				presentSingular: present(
					["fahre"],
					["fährst"],
					["fährt", "fährt"],
				),
			},
		],
		[
			abfahren,
			{
				presentSingular: present(
					["fahre ab"],
					["fährst ab"],
					["abfährt"],
				),
			},
		],
		[fahren, { presentSingular: { first: ["fahre"], third: ["fährt"] } }],
		[houseReading, { pastParticiple: ["gefahren"] }],
		[houseReading, { presentSingular: present(["a"], ["at"], ["a"]) }],
		[
			{ ...fahren, lemma: { ...fahren.lemma, language: "en" } },
			{ subjunctivePast: ["führe"] },
		],
	] as const)
		expect([knowledge, parse(source, knowledge).success]).toEqual([
			knowledge,
			false,
		]);
});

test("Contribute adds the forms a Reading lacks, person by person; Correct and Retract replace and remove an aspect", () => {
	const apply = (knowledge: unknown, change: unknown) =>
		applyKnowledgeChange({
			source: verbReading("backen"),
			knowledge: knowledge as never,
			change,
		});
	expect(
		apply(
			{ presentSingular: present(["backe"], ["bäckst"], ["bäckt"]) },
			{
				kind: "Contribute",
				aspect: "presentSingular",
				value: present(["backe"], ["backst"], ["backt", "bäckt"]),
			},
		),
	).toEqual({
		success: true,
		value: {
			presentSingular: present(
				["backe"],
				["bäckst", "backst"],
				["bäckt", "backt"],
			),
		},
	});
	expect(
		apply(
			{ pastParticiple: ["gebacken"] },
			{
				kind: "Contribute",
				aspect: "pastParticiple",
				value: ["gebackt"],
			},
		),
	).toEqual({
		success: true,
		value: { pastParticiple: ["gebacken", "gebackt"] },
	});
	expect(
		apply(
			{ pastParticiple: ["gebacken"] },
			{
				kind: "Contribute",
				aspect: "pastParticiple",
				value: ["Gebacken"],
			},
		),
	).toEqual({ success: true, value: { pastParticiple: ["gebacken"] } });
	expect(
		apply(
			{ subjunctivePast: ["büke"] },
			{ kind: "Correct", aspect: "subjunctivePast", value: ["backte"] },
		),
	).toEqual({ success: true, value: { subjunctivePast: ["backte"] } });
	expect(
		apply(
			{
				presentSingular: present(["backe"], ["bäckst"], ["bäckt"]),
				pastParticiple: ["gebacken"],
			},
			{ kind: "Retract", aspect: "presentSingular" },
		),
	).toEqual({ success: true, value: { pastParticiple: ["gebacken"] } });
	expect(
		apply(
			{},
			{ kind: "Contribute", aspect: "subjunctivePast", value: ["backt"] },
		).success,
	).toBe(false);
});

test("German Lexeme verbs request their principal parts and no other route does", () => {
	const request = (family: string, kind: string) => {
		const selected = selectKnowledge({
			route: { language: "de", family, kind } as never,
		});
		return (
			selected.success && {
				presentSingular: selected.value.presentSingular,
				pastParticiple: selected.value.pastParticiple,
				subjunctivePast: selected.value.subjunctivePast,
			}
		);
	};
	expect(request("Lexeme", "VERB")).toEqual({
		presentSingular: null,
		pastParticiple: null,
		subjunctivePast: null,
	});
	for (const [family, kind] of [
		["Lexeme", "NOUN"],
		["Lexeme", "AUX"],
		["Locution", "VERB"],
	] as const)
		expect(request(family, kind)).toEqual({
			presentSingular: undefined,
			pastParticiple: undefined,
			subjunctivePast: undefined,
		});
});
