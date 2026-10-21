import type * as Dumling from "dumling/types";

/** German grammar terms for the pack's panels. */
const PANELS: Readonly<Record<string, string>> = {
	declension: "Deklination",
	present: "Präsens",
	preterite: "Präteritum",
	subjunctive2: "Konjunktiv II",
	participle: "Partizip II",
	subjunctive1: "Konjunktiv I",
	imperative: "Imperativ",
	comparison: "Steigerung",
};

/** A row's or column's heading: one value, as a German table abbreviates it. */
const HEADINGS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
	case: { Nom: "N", Acc: "A", Gen: "G", Dat: "D" },
	number: { Sing: "Sg", Plur: "Pl" },
	gender: { Masc: "m", Neut: "n", Fem: "f" },
	degree: { Pos: "Positiv", Cmp: "Komparativ", Sup: "Superlativ" },
	participleForm: { Past: "Partizip II", Present: "Partizip I" },
};

/** One value as a list line abbreviates it: `Dat`, `Pl`, `Komp`. */
const ABBREVIATIONS: Readonly<
	Record<string, Readonly<Record<string, string>>>
> = {
	case: { Nom: "Nom", Acc: "Akk", Gen: "Gen", Dat: "Dat" },
	number: { Sing: "Sg", Plur: "Pl" },
	gender: { Masc: "m", Neut: "n", Fem: "f" },
	degree: { Pos: "Pos", Cmp: "Komp", Sup: "Sup" },
};

const termOf = (
	table: Readonly<Record<string, Readonly<Record<string, string>>>>,
	name: string,
	value: string,
) => table[name]?.[value] ?? value;

/**
 * A row's or column's heading: German `{ case: "Nom" }` is `N`. A gender
 * column names its gender alone (`m`), its singular understood; a person
 * row is `1.Sg`.
 */
function axisLabel(bundle: Dumling.FeatureBundle): string {
	if (bundle.gender !== undefined)
		return termOf(HEADINGS, "gender", bundle.gender);
	if (bundle.person !== undefined)
		return [
			bundle.person,
			bundle.number && termOf(HEADINGS, "number", bundle.number),
		]
			.filter(Boolean)
			.join(".");
	return Object.entries(bundle)
		.map(([name, value]) => termOf(HEADINGS, name, value))
		.join(" ");
}

/** The tense, mood or non-finite form a verbal bundle spells: `Präs`, `Konj.II`, `Perf`, `Part.II`. */
function verbalLabel(bundle: Dumling.FeatureBundle): string | undefined {
	const { verbForm, perfect } = bundle;
	if (verbForm === "Inf") return perfect === "Yes" ? "Inf.Perf" : "Inf";
	if (verbForm === "Part")
		return bundle.participleForm === "Present"
			? "Part.I"
			: bundle.participleForm === "Past"
				? "Part.II"
				: "Part";
	if (bundle.mood === "Imp") return "Imp";
	if (bundle.mood === "Sub") return subjunctiveLabel(bundle);
	return indicativeLabel(bundle) ?? (verbForm === "Fin" ? "Fin" : undefined);
}

function subjunctiveLabel(bundle: Dumling.FeatureBundle): string {
	const { tense } = bundle;
	return [
		tense === "Pres" ? "Konj.I" : tense === "Past" ? "Konj.II" : "Konj",
		bundle.perfect === "Yes" ? "Perf" : undefined,
		bundle.future === "Yes" ? "Fut" : undefined,
	]
		.filter(Boolean)
		.join(".");
}

function indicativeLabel(bundle: Dumling.FeatureBundle): string | undefined {
	const perfect = bundle.perfect === "Yes";
	if (bundle.future === "Yes") return perfect ? "Fut.II" : "Fut.I";
	if (perfect) return bundle.tense === "Past" ? "Plusq" : "Perf";
	if (bundle.tense === "Pres") return "Präs";
	return bundle.tense === "Past" ? "Prät" : undefined;
}

const VOICES: Readonly<Record<string, string>> = {
	Process: "Vorgangspass",
	Recipient: "Rezipientenpass",
};

/**
 * A whole bundle on a list line, its parts joined by `.`: `Dat.Pl`,
 * `Präs.3.Sg`, `Vorgangspass.Prät.3.Sg`, `Komp`. An unknown value reads as
 * itself.
 */
function bundleLabel(bundle: Dumling.FeatureBundle): string {
	const voice =
		bundle.voice === "Cau"
			? "Kaus"
			: bundle.passive !== undefined
				? (VOICES[bundle.passive] ?? bundle.passive)
				: bundle.voice;
	const parts = [
		bundle.expletive === undefined ? undefined : "es",
		voice,
		verbalLabel(bundle),
		bundle.person,
		...["case", "number", "gender", "degree"].map((name) => {
			const value = bundle[name];
			return value === undefined
				? undefined
				: termOf(ABBREVIATIONS, name, value);
		}),
	];
	return parts.filter((part) => part !== undefined && part !== "").join(".");
}

/** The German pack's labels (system ADR 0049): `N`, `Präsens`, `Dat.Pl`. */
export const germanLabels = {
	panel: (panelId: string) => PANELS[panelId] ?? panelId,
	axis: axisLabel,
	bundle: bundleLabel,
};
