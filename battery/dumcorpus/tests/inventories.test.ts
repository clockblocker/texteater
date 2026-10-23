import { describe, expect, test } from "bun:test";
import { parseUnit } from "dumling";
import type * as Dumling from "dumling/types";
import { parseReadingKnowledge } from "dumrel";
import { authoredReadingIssues } from "../src/check-authored-readings.js";
import { frameAdpositionCaseIssues } from "../src/de/check-adposition-cases.js";
import { closedVerbFormSpellings } from "../src/inventories/de/closed-verb-paradigms.js";
import {
	reflexiveDrillDown,
	reflexivityUnit,
} from "../src/inventories/de/drill-down.js";
import { spellsExpletiveEs } from "../src/inventories/de/expletive-spellings.js";
import { member as subjectExpletiveEs } from "../src/inventories/de/members/lexeme/pronoun/personal/es-subject-expletive.js";
import {
	authoredMembers,
	authoredRealizations,
	cliticEsSpellings,
	closedVerbForms,
	closedVerbParticiples,
	germanParticleMember,
	modalVerbs,
} from "../src/inventories.js";
import {
	incompleteKnowledge,
	name,
	realizationAttestation,
} from "./inventory-helpers.js";

describe("the German authored inventory", () => {
	test("holds every member", () => {
		expect(authoredMembers.length).toBeGreaterThan(300);
	});

	test("every Lemma and Reading parses strictly as Dumling stores it", () => {
		const failures = authoredMembers.flatMap((member) =>
			[member.lemma, member.reading].flatMap((unit) => {
				const parsed = parseUnit(unit);
				if (!parsed.success)
					return [`${name(member)}: ${parsed.error.message}`];
				return Bun.deepEquals(parsed.chain.value, unit, true)
					? []
					: [
							`${name(member)}: not stored as parseUnit normalizes it`,
						];
			}),
		);
		expect(failures).toEqual([]);
	});

	test("every Reading's Knowledge parses with Dumrel", () => {
		const failures = authoredMembers.flatMap((member) => {
			const parsed = parseReadingKnowledge({
				source: member.reading,
				knowledge: member.knowledge,
			});
			return parsed.success
				? []
				: [`${name(member)}: ${parsed.error.message}`];
		});
		expect(failures).toEqual([]);
	});

	test("every Valency Frame takes cases the ADP Case Table allows", () => {
		const failures = authoredMembers.flatMap((member) =>
			frameAdpositionCaseIssues(member.knowledge.valency ?? []).map(
				(found) =>
					`${name(member)}: valency.${found.path}: ${found.message}`,
			),
		);
		expect(failures).toEqual([]);
	});

	test("every member stores all Knowledge its route selects", () => {
		const failures = authoredMembers.flatMap((member) =>
			incompleteKnowledge(member).map((gap) => `${name(member)}: ${gap}`),
		);
		expect(failures).toEqual([]);
	});

	test("no two members hold the same Reading", () => {
		const seen = new Set<string>();
		const duplicates = authoredMembers.flatMap((member) => {
			const key = JSON.stringify(member.reading);
			if (seen.has(key)) return [name(member)];
			seen.add(key);
			return [];
		});
		expect(duplicates).toEqual([]);
	});

	test("every realization spells a DET, PRON or AUX member", () => {
		for (const { member, spelled } of authoredRealizations) {
			expect(authoredMembers).toContain(member);
			expect(spelled).toBe(spelled.trim());
			expect(spelled).not.toBe("");
			expect(["DET", "PRON", "AUX"]).toContain(member.lemma.kind);
		}
	});

	test("every realization with a spelling builds a Surface and member Dumling accepts (ADR 0041, ADR 0035)", () => {
		const spelled = authoredRealizations.filter(
			(realization) => realization.spelling !== undefined,
		);
		expect(spelled.length).toBeGreaterThan(1000);
		const failures = spelled.flatMap((realization) => {
			if (
				(realization.orthography === undefined) !==
				(realization.standsFor === undefined)
			)
				return [
					`${realization.spelled}: orthography without standsFor`,
				];
			const parsed = parseUnit(realizationAttestation(realization));
			return parsed.success
				? []
				: [
						`${name(realization.member)} ${realization.spelled}: ${parsed.error.message}`,
					];
		});
		expect(failures).toEqual([]);
	});

	test("tags the spellings gold or a Rule fixes and leaves the rest unclassified", () => {
		// inCase names a cell's case, or null for a spelling with no cell.
		const tagsOf = (
			spelled: string,
			kind: string,
			inCase?: string | null,
		) => [
			...new Set(
				authoredRealizations
					.filter(
						(realization) =>
							realization.spelled === spelled &&
							realization.member.lemma.kind === kind &&
							(inCase === undefined ||
								(realization.inflection?.case ?? null) ===
									inCase),
					)
					.map(
						({
							member,
							spelling,
							historicalStatus,
							orthography,
							standsFor,
						}) =>
							[
								member.lemma.canonicalForm,
								spelling?.kind === "Variant"
									? spelling.variantTags.join(" ")
									: (spelling?.kind ?? "none"),
								...(historicalStatus ? [historicalStatus] : []),
								...(orthography
									? [orthography, standsFor]
									: []),
							].join(" "),
					),
			),
		];
		// Gold spells nix and standalone derer as Licensed Variants.
		expect(tagsOf("nix", "PRON")).toEqual(["nichts Licensed"]);
		expect(tagsOf("derer", "PRON")).toEqual([
			"deren Licensed",
			"derer Canonical",
		]);
		// Shortened articles and clitic s are member orthographies
		// (de/member-orthography); the Surface is the full word.
		for (const [short, article] of [
			["n", "ein"],
			["ne", "eine"],
			["nen", "einen"],
			["nem", "einem"],
			["ner", "einer"],
		] as const)
			expect(tagsOf(short, "DET")).toEqual([
				`${article} Canonical Shorthand ${article}`,
			]);
		expect(tagsOf("s", "PRON")).toEqual(["es Canonical Fused es"]);
		// ward is Canonical and Archaic (de/variant-and-historical-status);
		// gold has hätt as the Shorthand of hätte.
		expect(tagsOf("ward", "AUX")).toEqual(["werden Canonical Archaic"]);
		expect(tagsOf("wardst", "AUX")).toEqual(["werden Canonical Archaic"]);
		expect(tagsOf("hätt", "AUX")).toEqual([
			"haben Canonical Shorthand hätte",
		]);
		expect(tagsOf("hat", "AUX")).toEqual(["haben Canonical"]);
		// A closed modal form spelled with ß before the 1996 reform is a
		// Historical Variant, as gold has muß.
		const historical = (closedVerbForms.müssen ?? []).filter(
			(form) =>
				closedVerbFormSpellings[form]?.spelling?.kind === "Variant",
		);
		expect(historical).toContain("muß");
		expect(historical.every((form) => form.includes("ß"))).toBe(true);
		expect(closedVerbFormSpellings.muß?.spelling).toEqual({
			kind: "Variant",
			variantTags: ["Historical"],
		});
		expect(closedVerbFormSpellings.ward?.historicalStatus).toBe("Archaic");
		// AUX hab is the 1sg, the Shorthand of habe; VERB haben's hab is
		// also the imperative, plainly Canonical (user ruling, 2026-10-02).
		expect(tagsOf("hab", "AUX")).toEqual([
			"haben Canonical Shorthand habe",
		]);
		expect(closedVerbFormSpellings.hab).toBeUndefined();
		// A table's other accepted forms of a cell are Licensed Variants
		// beside the cell's Canonical form (user ruling, 2026-10-02).
		for (const [spelled, kind, inCase, lemma] of [
			["eins", "PRON", undefined, "eines"],
			["keins", "PRON", "Nom", "keiner"],
			["irgendeins", "PRON", "Acc", "irgendeiner"],
			["was für eins", "PRON", "Nom", "was für einer"],
			["meins", "PRON", "Nom", "meiner"],
			["dies", "PRON", "Acc", "dieser"],
			["unsre", "DET", "Nom", "unser"],
			["euern", "DET", "Dat", "euer"],
			["unsrer", "PRON", "Gen", "unserer"],
			["jeden", "DET", "Gen", "jeder"],
			["jedweden", "DET", "Gen", "jedweder"],
			["jeglichen", "DET", "Gen", "jeglicher"],
			["einiges", "DET", "Gen", "einige"],
			["jemand", "PRON", "Acc", "jemand"],
			["niemand", "PRON", "Dat", "niemand"],
			["jemands", "PRON", "Gen", "jemand"],
		] as const)
			expect(tagsOf(spelled, kind, inCase)).toEqual([
				`${lemma} Licensed`,
			]);
		// selben in im selben is a Fused-piece remainder of demselben (ADR
		// 0035), no spelling.
		expect(tagsOf("selben", "DET")).toEqual([]);
		expect(tagsOf("selbe", "DET")).toEqual([]);
		// The possessive PRON has no weak forms: after an article the weak
		// possessive is ADJ, so der meine gives ADJ meine
		// (de/possessive-after-article; decided by agents under the user's
		// delegation, 2026-10-02). The -ig forms always follow an article, so
		// der meinige gives ADJ meinige and no PRON is spelled with -ig.
		expect(tagsOf("meinen", "PRON", "Gen")).toEqual([]);
		expect(tagsOf("unsren", "PRON", "Nom")).toEqual([]);
		expect(
			authoredRealizations.filter(
				({ member, spelled }) =>
					member.lemma.kind === "PRON" &&
					/^(mein|dein|sein|ihr|unse?r|eue?r)ige/i.test(spelled),
			),
		).toEqual([]);
		expect(tagsOf("meine", "PRON", "Nom")).toEqual(["meiner Canonical"]);
		expect(
			authoredRealizations.filter(
				({ member, spelled, inflection }) =>
					member.lemma.kind === "PRON" &&
					member.lemma.canonicalForm === "meiner" &&
					spelled === "meine" &&
					inflection?.gender === "Masc",
			),
		).toEqual([]);
		// Bare PRON viel and wenig are Canonical with no cell, as DET viel's
		// uninflected spelling is; vieles, vielem and weniges keep their cells
		// (decided by agents under the user's delegation, 2026-10-02).
		for (const stem of ["viel", "wenig"]) {
			expect(tagsOf(stem, "PRON", null)).toEqual([`${stem} Canonical`]);
			expect(tagsOf(stem, "PRON", "Acc")).toEqual([]);
		}
		expect(tagsOf("vieles", "PRON", "Nom")).toEqual(["viel Canonical"]);
		expect(tagsOf("vielem", "PRON", "Dat")).toEqual(["viel Canonical"]);
		expect(tagsOf("weniges", "PRON", "Acc")).toEqual(["wenig Canonical"]);
		// mehr and weniger are the comparatives of DET viel and wenig.
		expect(tagsOf("weniger", "DET", null)).toEqual(["wenig Canonical"]);
		expect(tagsOf("mehr", "DET", null)).toEqual(["viel Canonical"]);
		// PRON beiden is the Dat cell's own form only: weak beiden follows
		// an article, where beide is ADJ (de/pron-or-det-by-use).
		expect(tagsOf("beiden", "PRON", "Dat")).toEqual(["beide Canonical"]);
		expect(tagsOf("beiden", "PRON", "Nom")).toEqual([]);
	});

	test("the authored-Reading check fails a Reading an authored Lemma lacks (ADR 0021)", () => {
		const ja = germanParticleMember({
			canonicalForm: "ja",
			coreFeatures: { partType: "Mod", polarity: null },
		});
		if (!ja) throw Error("ja is authored");
		const reading = (canonicalForm: string, emojiDescription: string) =>
			({
				...ja.reading,
				lemma: { ...ja.lemma, canonicalForm },
				emojiDescription,
			}) as Dumling.Reading;
		expect(authoredReadingIssues(reading("ja", "🤝"))).toEqual([]);
		expect(
			authoredReadingIssues(reading("ja", "🎉")).map(({ path }) => path),
		).toEqual(["reading.emojiDescription"]);
		// A Lemma no member is has no authored Readings to name.
		expect(authoredReadingIssues(reading("sogar", "🎉"))).toEqual([]);
	});

	test("reaches the units a Note drills down to without generation", () => {
		const realized = (spelled: string, kind: string) =>
			authoredRealizations
				.filter(
					(realization) =>
						realization.spelled === spelled &&
						realization.member.lemma.kind === kind,
				)
				.map(({ member }) => member.lemma);
		// hat in hat gekocht: the auxiliary's spelling names the AUX Lemma.
		expect(realized("hat", "AUX")).toContainEqual(
			expect.objectContaining({ canonicalForm: "haben" }),
		);
		// sich is one reflexive PRON cell per case.
		expect(
			realized("sich", "PRON").map(({ coreFeatures }) =>
				"case" in coreFeatures ? coreFeatures.case : null,
			),
		).toEqual(["Acc", "Dat"]);
		// der in der Frau is the article cell Dat.Fem.Sg.
		expect(realized("der", "DET")).toContainEqual(
			expect.objectContaining({
				coreFeatures: expect.objectContaining({
					pronType: "Art",
					case: "Dat",
					gender: "Fem",
					number: "Sing",
				}),
			}),
		);
		expect(authoredMembers).toContain(subjectExpletiveEs);
		expect(closedVerbForms.müssen).toContain("muß");
		expect(modalVerbs).toEqual([
			"dürfen",
			"können",
			"mögen",
			"müssen",
			"sollen",
			"wollen",
		]);
	});

	test("lists each participle of sein, haben and werden among its closed verb forms", () => {
		expect(closedVerbParticiples).toEqual({
			sein: ["gewesen"],
			haben: ["gehabt"],
			werden: ["geworden", "worden"],
		});
		for (const [lemma, participles] of Object.entries(
			closedVerbParticiples,
		))
			for (const participle of participles)
				expect(closedVerbForms[lemma]).toContain(participle);
	});

	test("spells a clitic es plain, typographic or with no apostrophe", () => {
		expect([...cliticEsSpellings]).toEqual(["'s", "’s", "s"]);
		for (const attested of cliticEsSpellings)
			expect(
				spellsExpletiveEs({ attested, orthography: "Shorthand" }),
			).toBe(true);
	});

	test("authors the reflexivity unit a reflexive drills down to (system ADR 0041)", () => {
		const { lemma, reading, knowledge } = reflexivityUnit;
		expect(authoredMembers).toContain(reflexivityUnit);
		expect(parseUnit(lemma).success).toBe(true);
		expect(parseUnit(reading).success).toBe(true);
		expect(
			parseReadingKnowledge({ source: reading, knowledge }).success,
		).toBe(true);
		// PRON sich with no case, person or number: neither the Acc nor the Dat cell.
		expect(lemma).toMatchObject({ kind: "PRON", canonicalForm: "sich" });
		expect(lemma.coreFeatures).toMatchObject({
			pronType: "Prs",
			case: null,
			person: null,
			number: null,
		});
		// No spelling realizes it; a free sich stays a case cell.
		expect(
			authoredRealizations.some(
				({ member }) => member === reflexivityUnit,
			),
		).toBe(false);
	});

	test("drills down from a reflexive to the reflexivity unit, never a case cell", () => {
		const verb = (
			canonicalForm: string,
			lexicallyReflexive: "Acc" | "Dat" | null,
		) =>
			({
				unitKind: "Lemma",
				language: "de",
				family: "Lexeme",
				kind: "VERB",
				canonicalForm,
				coreFeatures: {
					hasSepPrefix: null,
					lexicallyReflexive,
				},
			}) as const;
		// er schämt sich takes the Acc, er bildet sich etwas ein the Dat.
		for (const reflexive of [
			verb("sich schämen", "Acc"),
			verb("sich einbilden", "Dat"),
		]) {
			expect(parseUnit(reflexive).success).toBe(true);
			expect(reflexiveDrillDown(reflexive)).toBe(reflexivityUnit);
		}
		expect(reflexiveDrillDown(verb("warten", null))).toBeUndefined();
	});
});
