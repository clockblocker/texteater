import { describe, expect, test } from "bun:test";
import { isSyncreticUnit, parseUnit } from "dumling";
import { loadSpecRecords } from "../src/index.js";
import {
	type AuthoredMember,
	authoredMembers,
	authoredRealizations,
} from "../src/inventories.js";
import { field, name, pronounSurface } from "./inventory-helpers.js";

describe("the German authored inventory", () => {
	test("authors per cell only the pillars (system ADR 0032)", () => {
		// A per-cell Lemma fixes its case in Core. Only a paradigm whose forms
		// cannot be derived from another is a pillar: the personal pronouns,
		// the der and ein articles with pronominal einer, and the der-series.
		const einTable = new Set(["einer", "eine", "eines", "einem", "einen"]);
		const derSeries = new Set([
			"der",
			"die",
			"das",
			"den",
			"dem",
			"denen",
			"dessen",
			"deren",
		]);
		const isPillar = ({ lemma }: AuthoredMember) => {
			const { pronType } = lemma.coreFeatures as { pronType?: string };
			if (lemma.kind === "DET") return pronType === "Art";
			if (pronType === "Prs") return true;
			if (pronType === "Ind") return einTable.has(lemma.canonicalForm);
			return (
				(pronType === "Dem" || pronType === "Rel") &&
				derSeries.has(lemma.canonicalForm)
			);
		};
		const strays = authoredMembers.filter(
			(member) =>
				(member.lemma.kind === "PRON" || member.lemma.kind === "DET") &&
				(field(member.lemma.coreFeatures, "case") ?? null) !== null &&
				!isPillar(member),
		);
		expect(strays.map(name)).toEqual([]);
	});

	test("no two per-cell Lemmas of one Kind share all Core Features (system ADR 0032)", () => {
		// A per-cell Lemma marks case, number or gender in Core. Navigation
		// such as "the plural of dessen" lands on exactly one Lemma only while
		// no two of one pillar share every Core Feature. Never accept a
		// collision here without an ADR that names it. The der and ein article
		// tables are two pillars with the same cells, which their spellings
		// tell apart, so each is checked on its own (ADR 0032). A Syncretism
		// is no cell: its syncretic list keeps its identity apart even where
		// its Core equals a cell's (ADR 0046).
		const coordinates = ["case", "number", "gender"];
		const pillar = ({
			kind,
			canonicalForm,
			coreFeatures,
		}: AuthoredMember["lemma"]) =>
			kind === "DET" &&
			(coreFeatures as { pronType?: string }).pronType === "Art"
				? canonicalForm.startsWith("ein")
					? "ein"
					: "der"
				: kind;
		const groups = new Map<string, Set<string>>();
		for (const { lemma } of authoredMembers) {
			if (
				(lemma.kind !== "PRON" && lemma.kind !== "DET") ||
				isSyncreticUnit(lemma)
			)
				continue;
			const core = Object.entries(lemma.coreFeatures).filter(
				([, value]) => value !== null,
			);
			if (!core.some(([key]) => coordinates.includes(key))) continue;
			const key = `${pillar(lemma)} ${core
				.map(([feature, value]) => `${feature}=${String(value)}`)
				.sort()
				.join(" ")}`;
			groups.set(
				key,
				(groups.get(key) ?? new Set()).add(lemma.canonicalForm),
			);
		}
		const collisions = [...groups]
			.filter(([, forms]) => forms.size > 1)
			.map(([key, forms]) => `${[...forms].sort().join(" = ")}: ${key}`);
		expect(collisions).toEqual([]);
	});

	test("ihm, seiner, dem, dessen, einem and eines are a Masc and a Neut cell each, and no other pillar cell is split by gender alone (system ADR 0044)", () => {
		// The referent chooses between cells that differ only in gender, and
		// a referent no text settles attests their Syncretism (ADR 0046).
		// Every PRON with case in Core is a pillar cell: personal, der-series
		// or einer. A Syncretism is no cell.
		const byRest = new Map<
			string,
			{ label: string; genders: Set<string> }
		>();
		for (const { lemma } of authoredMembers) {
			if (lemma.kind !== "PRON" || isSyncreticUnit(lemma)) continue;
			const { gender, ...rest } = lemma.coreFeatures as Readonly<
				Record<string, unknown>
			>;
			if ((rest.case ?? null) === null) continue;
			const key = `${lemma.canonicalForm} ${JSON.stringify(rest)}`;
			const entry = byRest.get(key) ?? {
				label: `${lemma.canonicalForm} ${String(rest.case)} ${String(rest.pronType)}`,
				genders: new Set(),
			};
			entry.genders.add(String(gender));
			byRest.set(key, entry);
		}
		expect(
			[...byRest.values()]
				.filter(({ genders }) => genders.size > 1)
				.map(
					({ label, genders }) =>
						`${label}: ${[...genders].toSorted().join(", ")}`,
				)
				.toSorted(),
		).toEqual([
			"dem Dat Dem: Masc, Neut",
			"dem Dat Rel: Masc, Neut",
			"dessen Gen Dem: Masc, Neut",
			"dessen Gen Rel: Masc, Neut",
			"einem Dat Ind: Masc, Neut",
			"eines Gen Ind: Masc, Neut",
			"ihm Dat Prs: Masc, Neut",
			"seiner Gen Prs: Masc, Neut",
		]);
	});

	test("derer is its own invariant Lemma pointing ahead and spells standalone deren elsewhere (system ADR 0044)", () => {
		// Demonstrative derer points ahead to a relative clause and has one
		// uninflected form. Wherever deren could stand alone instead, relative
		// or demonstrative pointing back, derer is a Licensed Variant of that
		// deren cell, and of the Syncretism of the two (ADR 0046). Attributive
		// and standalone deren are one Lemma, so the swap is judged per
		// occurrence: before a noun only deren stands.
		const spelledDerer = authoredRealizations
			.filter(({ spelled }) => spelled === "derer")
			.map(({ member, inflection }) => {
				const core = member.lemma.coreFeatures as Readonly<
					Record<string, unknown>
				>;
				const cell = ["case", "number", "gender"]
					.map((key) => String(core[key] ?? null))
					.join(" ");
				return `${member.lemma.canonicalForm} ${String(core.pronType)} ${cell}${inflection ? " inflected" : ""}`;
			})
			.sort();
		expect(spelledDerer).toEqual([
			"deren Dem Gen Plur null",
			"deren Dem Gen Sing Fem",
			"deren Dem Gen null null",
			"deren Rel Gen Plur null",
			"deren Rel Gen Sing Fem",
			"deren Rel Gen null null",
			"derer Dem null null null",
		]);
	});

	test("the records spell derer Canonical as its own Lemma and Licensed as deren (system ADR 0044)", () => {
		const attested = loadSpecRecords().flatMap(({ id, targets }) =>
			targets.flatMap(({ attestation: { surface } }) => {
				if (surface.normalizedSurface !== "derer") return [];
				const { canonicalForm, coreFeatures } = surface.lemma;
				const tags =
					surface.spelling.kind === "Variant"
						? ` ${surface.spelling.variantTags.join(" ")}`
						: "";
				return [
					`${id} ${canonicalForm} ${String(field(coreFeatures, "pronType"))} ${surface.spelling.kind}${tags}`,
				];
			}),
		);
		for (const line of attested)
			expect(line).toMatch(
				/ (derer Dem Canonical|deren (Dem|Rel) Variant Licensed)$/u,
			);
		// sich derer entledigen points back, so derer spells demonstrative deren.
		expect(attested).toContain(
			"de/die-alten-kartons-stehen-nur-herum-deshalb-wollen-wir-uns deren Dem Variant Licensed",
		);
		expect(attested).toContain(
			"de/die-opfer-derer-wir-heute-gedenken-sind-nicht-vergessen deren Rel Variant Licensed",
		);
		expect(attested).toContain(
			"de/wir-gedenken-derer-die-im-krieg-gestorben-sind derer Dem Canonical",
		);
	});

	test("a stem's spellings are Surfaces Dumling accepts", () => {
		const failures = authoredRealizations.flatMap(
			({ member, spelled, inflection }) => {
				if (member.lemma.kind !== "PRON" || !inflection) return [];
				const parsed = parseUnit(
					pronounSurface(member, spelled, inflection),
				);
				return parsed.success
					? []
					: [`${name(member)} ${spelled}: ${parsed.error.message}`];
			},
		);
		expect(failures).toEqual([]);
	});

	test("was für is an invariant Locution DET with no Locution Type (de/was-fuer)", () => {
		const locutions = authoredMembers.filter(
			({ lemma }) => lemma.family === "Locution",
		);
		expect(
			locutions.map(({ lemma, knowledge, coverage }) => ({
				route: `${lemma.kind} ${lemma.canonicalForm}`,
				core: lemma.coreFeatures,
				locutionType: knowledge.locutionType ?? null,
				coverage: coverage.locutionType,
			})),
		).toEqual([
			{
				route: "DET was für",
				core: {},
				locutionType: null,
				coverage: "ReviewedEmpty",
			},
		]);
		// Its one spelling realizes it without a cell, and Dumling accepts
		// that Surface.
		const realizations = authoredRealizations.filter(({ member }) =>
			locutions.includes(member),
		);
		expect(
			realizations.map(({ spelled, inflection }) => [
				spelled,
				inflection,
			]),
		).toEqual([["was für", undefined]]);
		const [member] = locutions;
		const parsed = parseUnit({
			unitKind: "Surface",
			language: "de",
			lemma: member?.lemma,
			normalizedSurface: "was für",
			spelling: { kind: "Canonical" },
			surfaceFeatures: null,
			inflectionalFeatures: null,
		});
		expect(parsed.success).toBe(true);
	});

	test("jemand, niemand, wer and was are stems (system ADR 0032)", () => {
		const lemmasSpelled = (spelled: string) =>
			authoredRealizations
				.filter(
					(realization) =>
						realization.spelled === spelled &&
						realization.member.lemma.kind === "PRON" &&
						// A stem's Surface marks its cell; invariant
						// attributive wessen marks none.
						realization.inflection != null,
				)
				.map(({ member, inflection }) => ({
					canonicalForm: member.lemma.canonicalForm,
					pronType: field(member.lemma.coreFeatures, "pronType"),
					inflection,
				}));
		// wem is the Dat Surface of wer, as diesem is of dieser, and the
		// Shorthand of irgendwem (de/bare-w-word-is-shorthand).
		expect(lemmasSpelled("wem")).toEqual([
			...["Int", "Rel"].map((pronType) => ({
				canonicalForm: "wer",
				pronType,
				inflection: {
					case: "Dat",
					number: null,
					gender: null,
				} as const,
			})),
			{
				canonicalForm: "irgendwer",
				pronType: "Ind",
				inflection: { case: "Dat", gender: null, number: null },
			},
		]);
		const interrogative = (canonicalForm: string) => {
			const found = authoredMembers.find(
				({ lemma }) =>
					lemma.canonicalForm === canonicalForm &&
					field(lemma.coreFeatures, "pronType") === "Int",
			);
			if (!found) throw Error(`No interrogative ${canonicalForm}`);
			return found;
		};
		// Gender is inherent, as a noun's is: Core, never on the Surface.
		const wer = interrogative("wer");
		expect(field(wer.lemma.coreFeatures, "gender")).toBe("Masc");
		expect(field(interrogative("was").lemma.coreFeatures, "gender")).toBe(
			"Neut",
		);
		expect(
			parseUnit(pronounSurface(wer, "wem", { case: "Dat" })).success,
		).toBe(true);
		expect(
			parseUnit(
				pronounSurface(wer, "wem", { case: "Dat", gender: "Masc" }),
			).success,
		).toBe(false);
		// Genitive wessen is spelled under both Lemmas; the referent decides.
		expect(
			lemmasSpelled("wessen")
				.filter(({ pronType }) => pronType === "Int")
				.map(({ canonicalForm }) => canonicalForm),
		).toEqual(["wer", "was"]);
		// irgendwer is built like wer: Masc in Core, case on the Surface, and
		// it claims irgendjemand as a synonym.
		expect(lemmasSpelled("irgendwem")).toEqual([
			{
				canonicalForm: "irgendwer",
				pronType: "Ind",
				inflection: { case: "Dat", number: null, gender: null },
			},
		]);
		const irgendwer = authoredMembers.find(
			({ lemma }) => lemma.canonicalForm === "irgendwer",
		);
		expect(field(irgendwer?.lemma.coreFeatures, "gender")).toBe("Masc");
		expect(irgendwer?.knowledge.semanticRelations).toEqual({
			synonym: [
				expect.objectContaining({ canonicalForm: "irgendjemand" }),
			],
		});
		for (const [spelled, cited] of [
			["was", "was"],
			["jemandem", "jemand"],
			["niemanden", "niemand"],
			["jedermanns", "jedermann"],
		] as const)
			expect(
				new Set(
					lemmasSpelled(spelled).map((lemma) => lemma.canonicalForm),
				),
			).toEqual(new Set([cited]));
	});
});
