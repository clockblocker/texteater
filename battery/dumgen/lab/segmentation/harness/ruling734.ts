/**
 * A reading of the Draft gold that conforms to the #734 ruling, for scoring
 * closed-class identity: the targets #748 lists for re-routing (as of
 * efa5acce), keyed by record and word. Only the route changes; the gold
 * records themselves are untouched until #748 lands.
 */
import type { SegmentInUnitsOutput } from "../../evaluation/spec-corpus/segment-in-units.js";
import type { LabCase } from "./corpus.js";

const reroutes: readonly (readonly [
	record: string,
	word: string,
	kind: string,
])[] = [
	["de/lea-hat-sogar-den-schwierigen-zusatztest-bestanden", "sogar", "ADV"],
	["de/es-brennt-die-hand-es-brennt-das-haar", "sogar", "ADV"],
	["de/selbst-der-erfahrenste-techniker-uebersah-den-riss", "selbst", "ADV"],
	[
		"de/die-aenderung-betrifft-lediglich-den-letzten-absatz",
		"lediglich",
		"ADV",
	],
	[
		"de/fuer-die-reparatur-braucht-sie-nur-einen-schraubendreher",
		"nur",
		"ADV",
	],
	["de/er-arbeitet-heute-bloss-vormittags-von-zu-hause", "bloß", "ADV"],
	["de/die-messwerte-waren-gar-nicht-so-ungewoehnlich", "gar", "ADV"],
	["de/das-ergebnis-ist-sehr-viel-besser-als-erwartet", "sehr", "ADV"],
	["de/sie-ist-eben-gegangen-weil-der-bus-schon-kam", "eben", "ADV"],
	["de/auf-die-kontrollfrage-antwortete-sie-klar-mit-ja", "ja", "INTJ"],
	[
		"de/auf-die-frage-ob-sie-nicht-teilnehmen-koenne-antwortete-sie",
		"doch",
		"INTJ",
	],
	[
		"de/auf-die-negative-frage-antwortete-pavel-entschieden-mit-doch",
		"doch",
		"INTJ",
	],
	[
		"de/er-schadet-ja-offenbar-niemandem-aber-die-vorstellung-dass",
		"offenbar",
		"ADV",
	],
	[
		"de/findest-du-dass-sie-wirklich-eine-gefaehrliche-person-ist",
		"wirklich",
		"ADV",
	],
	[
		"de/findest-du-dass-sie-wirklich-eine-gefaehrliche-person-ist",
		"eigentlich",
		"ADV",
	],
	[
		"de/gluecklicherweise-sagen-sie-das-so-hin-ohne-recht-dran-zu",
		"recht",
		"ADV",
	],
];

/** The case with every one-piece gold unit #748 re-routes given its new route. */
export function conformTo734(labCase: LabCase): LabCase {
	const words = reroutes.filter(([record]) => record === labCase.record);
	if (words.length === 0) return labCase;
	const units: SegmentInUnitsOutput["units"] = labCase.idealOutput.units.map(
		(unit) => {
			const [segment] = unit.segments;
			if (
				unit.segments.length !== 1 ||
				segment === undefined ||
				unit.route === "Unresolved"
			)
				return unit;
			const text = labCase.input.segments[segment]?.text.toLowerCase();
			const match = words.find(([, word]) => word === text);
			return match
				? {
						...unit,
						route: {
							...unit.route,
							family: "Lexeme",
							kind: match[2],
						},
					}
				: unit;
		},
	);
	return { ...labCase, idealOutput: { units } };
}

/** How many one-piece gold units the reading changes in a set of cases. */
export function rerouted(cases: readonly LabCase[]): number {
	return cases.reduce(
		(total, labCase) =>
			total +
			conformTo734(labCase).idealOutput.units.filter(
				(unit, index) =>
					JSON.stringify(unit) !==
					JSON.stringify(labCase.idealOutput.units[index]),
			).length,
		0,
	);
}
