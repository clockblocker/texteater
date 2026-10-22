/**
 * The forms of one finite panel by person, ich, du, er, wir, ihr, sie, each
 * with its standard spellings, the more usual first.
 */
export type ClosedPersonForms = readonly (readonly string[])[];

/**
 * The authored table of a verb whose whole paradigm is closed (system ADR
 * 0021): its standard forms by cell, without shorthands (hab, hätt),
 * archaic forms (ward) or pre-reform spellings (muß). A panel left out is
 * one the inventory doesn't author: a modal's Imperativ.
 */
export type ClosedVerbTable = {
	readonly present: ClosedPersonForms;
	readonly preterite: ClosedPersonForms;
	readonly subjunctive2: ClosedPersonForms;
	readonly subjunctive1: ClosedPersonForms;
	readonly participle: readonly string[];
	readonly imperative?: {
		readonly singular: readonly string[];
		readonly plural: readonly string[];
	};
};

/** Six cells from six space-separated forms, alternatives joined by `|`. */
const persons = (forms: string): ClosedPersonForms =>
	forms.split(" ").map((cell) => cell.split("|"));

/** A Präteritum or Konjunktiv II from its first person singular. */
const past = (stem: string) =>
	persons(`${stem} ${stem}st ${stem} ${stem}n ${stem}t ${stem}n`);

/** A Konjunktiv I from its stem, which every verb but sein forms regularly. */
const subjunctive1 = (stem: string, infinitive: string) =>
	persons(
		`${stem}e ${stem}est ${stem}e ${infinitive} ${stem}et ${infinitive}`,
	);

/** A modal's table: its Präsens, its past stems and its participle. */
function modal(input: {
	readonly infinitive: string;
	readonly present: string;
	readonly preterite: string;
	readonly subjunctive2: string;
	readonly participle: string;
}): ClosedVerbTable {
	const { infinitive } = input;
	const stem = infinitive.slice(0, -2);
	return {
		present: persons(input.present),
		preterite: past(input.preterite),
		subjunctive2: past(input.subjunctive2),
		subjunctive1: subjunctive1(stem, infinitive),
		participle: [input.participle],
	};
}

const sein: ClosedVerbTable = {
	present: persons("bin bist ist sind seid sind"),
	preterite: persons("war warst war waren wart waren"),
	subjunctive2: persons("wäre wärst|wärest wäre wären wärt|wäret wären"),
	subjunctive1: persons("sei seist|seiest sei seien seiet seien"),
	participle: ["gewesen"],
	imperative: { singular: ["sei"], plural: ["seid"] },
};

const haben: ClosedVerbTable = {
	present: persons("habe hast hat haben habt haben"),
	preterite: past("hatte"),
	subjunctive2: past("hätte"),
	subjunctive1: subjunctive1("hab", "haben"),
	participle: ["gehabt"],
	imperative: { singular: ["hab", "habe"], plural: ["habt"] },
};

const werden: ClosedVerbTable = {
	present: persons("werde wirst wird werden werdet werden"),
	preterite: past("wurde"),
	subjunctive2: past("würde"),
	subjunctive1: subjunctive1("werd", "werden"),
	participle: ["geworden"],
	imperative: { singular: ["werde"], plural: ["werdet"] },
};

/**
 * The authored tables of the VERB Lemmas whose whole paradigm is closed,
 * keyed by Lemma: sein, haben, werden and the six modals (ADR 0026). They
 * hold the forms `closedVerbForms` lists, by cell.
 */
export const closedVerbTables: Readonly<Record<string, ClosedVerbTable>> = {
	sein,
	haben,
	werden,
	dürfen: modal({
		infinitive: "dürfen",
		present: "darf darfst darf dürfen dürft dürfen",
		preterite: "durfte",
		subjunctive2: "dürfte",
		participle: "gedurft",
	}),
	können: modal({
		infinitive: "können",
		present: "kann kannst kann können könnt können",
		preterite: "konnte",
		subjunctive2: "könnte",
		participle: "gekonnt",
	}),
	mögen: modal({
		infinitive: "mögen",
		present: "mag magst mag mögen mögt mögen",
		preterite: "mochte",
		subjunctive2: "möchte",
		participle: "gemocht",
	}),
	müssen: modal({
		infinitive: "müssen",
		present: "muss musst muss müssen müsst müssen",
		preterite: "musste",
		subjunctive2: "müsste",
		participle: "gemusst",
	}),
	sollen: modal({
		infinitive: "sollen",
		present: "soll sollst soll sollen sollt sollen",
		preterite: "sollte",
		subjunctive2: "sollte",
		participle: "gesollt",
	}),
	wollen: modal({
		infinitive: "wollen",
		present: "will willst will wollen wollt wollen",
		preterite: "wollte",
		subjunctive2: "wollte",
		participle: "gewollt",
	}),
};

function withoutImperative({
	imperative: _,
	...table
}: ClosedVerbTable): ClosedVerbTable {
	return table;
}

/**
 * The authored tables of the AUX Lemmas whose forms are closed: sein, haben
 * and werden as auxiliaries. They are the VERB tables without an Imperativ,
 * and the passive's werden has the participle worden (ist gefunden worden).
 * The causative and recipient-passive AUX Lemmas share several verbs' forms,
 * so they have none.
 */
export const closedAuxiliaryTables: Readonly<Record<string, ClosedVerbTable>> =
	{
		sein: withoutImperative(sein),
		haben: withoutImperative(haben),
		werden: { ...withoutImperative(werden), participle: ["worden"] },
	};
