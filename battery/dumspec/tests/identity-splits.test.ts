import { describe, expect, test } from "bun:test";
import { staleAdrStatus } from "../src/check-citations.js";
import { rules } from "../src/index.js";
import { uncitedRecordsByStatus } from "../src/worklist/evidence-gaps.js";
import {
	germanOpenSplits,
	germanSplitRulings,
} from "../src/worklist/identity-split-rulings.js";
import {
	type IdentitySplit,
	identitySplits,
	lemmaIdentity,
	type OpenSplit,
	type SplitRuling,
	sortSplit,
	splitsFamilyOrKind,
} from "../src/worklist/identity-splits.js";
import type { LemmaInFile, RecordFile } from "../src/worklist/record-files.js";
import { readRepositoryAdrStatuses } from "./adr-statuses.js";

const lemma = (
	canonicalForm: string,
	kind: string,
	coreFeatures: Record<string, unknown> = {},
): LemmaInFile => ({ family: "Lexeme", kind, canonicalForm, coreFeatures });
const file = (
	id: string,
	lemmas: LemmaInFile[],
	extra: Partial<RecordFile> = {},
): RecordFile => ({ id, rules: [], lemmas, ...extra });

describe("identity normalization", () => {
	test("counts a missing Core Feature and a null one as the same", () => {
		expect(
			lemmaIdentity(lemma("Tisch", "NOUN", { gender: "Masc" })),
		).toEqual(
			lemmaIdentity(
				lemma("Tisch", "NOUN", { gender: "Masc", abbr: null }),
			),
		);
	});

	test("ignores key order", () => {
		const splits = identitySplits([
			file("de/a", [
				lemma("es", "PRON", { case: "Nom", gender: "Neut" }),
			]),
			file("de/b", [
				lemma("es", "PRON", { gender: "Neut", case: "Nom" }),
			]),
			file("de/c", [
				lemma("es", "PRON", {
					case: "Nom",
					gender: "Neut",
				}),
			]),
		]);
		expect(splits).toEqual([]);
	});

	test("lists each form with more than one identity and the records using each", () => {
		const splits = identitySplits([
			file("de/a", [lemma("Band", "NOUN", { gender: "Fem" })], {
				reviewDepth: "Reading",
				rules: ["de/core-features-are-identity"],
			}),
			file("de/b", [
				lemma("Band", "NOUN", { gender: "Neut" }),
				lemma("Band", "NOUN", { gender: "Neut" }),
			]),
			file("de/c", [lemma("Tisch", "NOUN", { gender: "Masc" })]),
		]);
		expect(splits).toEqual([
			{
				form: "Band",
				identities: [
					{
						identity: {
							family: "Lexeme",
							kind: "NOUN",
							coreFeatures: { gender: "Fem" },
						},
						uses: [
							{
								record: "de/a",
								reviewDepth: "Reading",
								rules: ["de/core-features-are-identity"],
							},
						],
					},
					{
						identity: {
							family: "Lexeme",
							kind: "NOUN",
							coreFeatures: { gender: "Neut" },
						},
						uses: [{ record: "de/b", rules: [] }],
					},
				],
			},
		]);
		expect(splits.map(splitsFamilyOrKind)).toEqual([false]);
	});
});

describe("sorting a split", () => {
	const split = (form: string, ...lemmas: LemmaInFile[]): IdentitySplit => {
		const [found] = identitySplits(
			lemmas.map((one, index) => file(`de/${index}`, [one])),
		);
		if (!found) throw Error(`${form} has one identity`);
		return found;
	};
	const cells: SplitRuling = {
		split: "Pillar cells",
		adrs: ["ADR-0044"],
		rules: [],
		both: { kind: ["PRON"], pronType: ["Prs"] },
		varies: [
			{ key: "case" },
			{ key: "person" },
			{ key: "polite", onlyWith: "person" },
		],
	};
	const auxiliary: SplitRuling = {
		split: "AUX in grammar only",
		adrs: ["ADR-0026"],
		rules: [],
		both: { kind: ["VERB", "AUX"] },
		varies: [{ key: "kind", values: ["VERB", "AUX"] }],
	};
	const genders: SplitRuling = {
		split: "Gender homographs",
		adrs: [],
		rules: ["de/core-features-are-identity"],
		forms: ["Band"],
		varies: [{ key: "gender" }],
	};
	const open: OpenSplit = {
		forms: ["ihm"],
		issue: 743,
		question: "Referent cells",
	};
	const sort = (target: IdentitySplit) =>
		sortSplit(target, [cells, auxiliary, genders], [open]);

	test("is Decided when rulings applying to both identities let every difference vary", () => {
		expect(
			sort(
				split(
					"sich",
					lemma("sich", "PRON", { pronType: "Prs", case: "Acc" }),
					lemma("sich", "PRON", { pronType: "Prs", case: "Dat" }),
				),
			),
		).toEqual({ sort: "Decided", rulings: [cells] });
		expect(
			sort(split("haben", lemma("haben", "VERB"), lemma("haben", "AUX"))),
		).toEqual({ sort: "Decided", rulings: [auxiliary] });
	});

	test("is Unexplained when a difference is outside the rulings", () => {
		expect(
			sort(
				split(
					"sein",
					lemma("sein", "VERB"),
					lemma("sein", "DET", { poss: "Yes" }),
				),
			),
		).toEqual({ sort: "Unexplained" });
		expect(
			sort(
				split(
					"Kiefer",
					lemma("Kiefer", "NOUN", { gender: "Masc" }),
					lemma("Kiefer", "NOUN", { gender: "Fem" }),
				),
			),
		).toEqual({ sort: "Unexplained" });
	});

	test("lets a key vary with another only when that one differs too", () => {
		const infm = { pronType: "Prs", case: "Acc", person: "2" };
		expect(
			sort(
				split(
					"dich",
					lemma("dich", "PRON", { ...infm, polite: "Infm" }),
					lemma("dich", "PRON", infm),
				),
			),
		).toEqual({ sort: "Unexplained" });
		expect(
			sort(
				split(
					"ihr",
					lemma("ihr", "PRON", {
						pronType: "Prs",
						person: "2",
						polite: "Infm",
					}),
					lemma("ihr", "PRON", { pronType: "Prs", person: "3" }),
				),
			),
		).toEqual({ sort: "Decided", rulings: [cells] });
	});

	test("is Open when an open grilling names the form, even if a ruling fits", () => {
		expect(
			sort(
				split(
					"ihm",
					lemma("ihm", "PRON", { pronType: "Prs", case: "Dat" }),
					lemma("ihm", "PRON", { pronType: "Prs", case: "Acc" }),
				),
			),
		).toEqual({ sort: "Open", open });
	});
});

describe("the German split rulings", () => {
	const adrStatuses = readRepositoryAdrStatuses();
	const ruleIds = new Set(rules.map((rule) => rule.id));

	test("each cite a current ADR or an existing Rule", () => {
		for (const ruling of germanSplitRulings) {
			expect(ruling.adrs.length + ruling.rules.length).toBeGreaterThan(0);
			for (const adr of ruling.adrs) {
				const status = adrStatuses.get(adr);
				expect(status, `${ruling.split}: ${adr}`).toBeDefined();
				expect(staleAdrStatus.test(status ?? "")).toBe(false);
			}
			for (const rule of ruling.rules)
				expect(ruleIds.has(rule), `${ruling.split}: ${rule}`).toBe(
					true,
				);
		}
	});

	test("name no form an open grilling holds", () => {
		const open = new Set(germanOpenSplits.flatMap((entry) => entry.forms));
		expect(
			germanSplitRulings.flatMap((ruling) =>
				(ruling.forms ?? []).filter((form) => open.has(form)),
			),
		).toEqual([]);
	});
});

describe("the evidence gaps", () => {
	test("count the records citing no Rule by status", () => {
		expect(
			uncitedRecordsByStatus([
				file("de/a", []),
				file("de/b", [], { rules: ["de/no-target"] }),
				file("de/c", [], { reviewDepth: "Segmentation" }),
				file("de/d", []),
			]),
		).toEqual([
			["Draft", 2],
			["Segmentation", 1],
		]);
	});
});
