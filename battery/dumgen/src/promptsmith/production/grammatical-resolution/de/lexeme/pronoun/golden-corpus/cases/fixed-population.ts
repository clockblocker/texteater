import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { core, inflectionCase, type PronounCoreFeatures } from "./builders";

type PersonalSpec = Readonly<{
	id: string;
	context: string;
	form: string;
	case: "Acc" | "Dat" | "Gen" | "Nom";
	coreFeatures: PronounCoreFeatures;
	gender?: "Fem" | "Masc" | "Neut" | null;
	number?: "Plur" | "Sing" | null;
	historical?: true;
}>;

const personal = (
	person: "1" | "2" | "3",
	referenceNumber: "Plur" | "Sing" | null,
	referenceGender: "Fem" | "Masc" | "Neut" | null = null,
	polite: "Form" | "Infm" | null = null,
) => core("Prs", { person, polite, referenceGender, referenceNumber });

const personalSpecs: readonly PersonalSpec[] = [
	{
		id: "mir",
		context: "Bitte gib <TARGET>mir</TARGET> den Schlüssel.",
		form: "mir",
		case: "Dat",
		coreFeatures: personal("1", "Sing"),
		number: "Sing",
	},
	{
		id: "du",
		context: "Heute kochst <TARGET>du</TARGET> das Abendessen.",
		form: "du",
		case: "Nom",
		coreFeatures: personal("2", "Sing", null, "Infm"),
		number: "Sing",
	},
	{
		id: "dich",
		context: "Ich rufe <TARGET>dich</TARGET> morgen an.",
		form: "dich",
		case: "Acc",
		coreFeatures: personal("2", "Sing", null, "Infm"),
		number: "Sing",
	},
	{
		id: "deiner",
		context: "Wir gedachten <TARGET>deiner</TARGET> in Dankbarkeit.",
		form: "deiner",
		case: "Gen",
		coreFeatures: personal("2", "Sing", null, "Infm"),
		number: "Sing",
		historical: true,
	},
	{
		id: "er",
		context: "Am Montag beginnt <TARGET>er</TARGET> die neue Stelle.",
		form: "er",
		case: "Nom",
		coreFeatures: personal("3", "Sing", "Masc"),
		gender: "Masc",
		number: "Sing",
	},
	{
		id: "ihn",
		context: "Die Kollegin begrüßt <TARGET>ihn</TARGET> am Eingang.",
		form: "ihn",
		case: "Acc",
		coreFeatures: personal("3", "Sing", "Masc"),
		gender: "Masc",
		number: "Sing",
	},
	{
		id: "seiner-masc",
		context: "Die Gemeinde gedachte <TARGET>seiner</TARGET> feierlich.",
		form: "seiner",
		case: "Gen",
		coreFeatures: personal("3", "Sing", "Masc"),
		gender: "Masc",
		number: "Sing",
		historical: true,
	},
	{
		id: "ihr-fem",
		context: "Der Arzt hilft <TARGET>ihr</TARGET> sofort.",
		form: "ihr",
		case: "Dat",
		coreFeatures: personal("3", "Sing", "Fem"),
		gender: "Fem",
		number: "Sing",
	},
	{
		id: "ihrer-fem",
		context: "Die Nachbarn gedachten <TARGET>ihrer</TARGET> lange.",
		form: "ihrer",
		case: "Gen",
		coreFeatures: personal("3", "Sing", "Fem"),
		gender: "Fem",
		number: "Sing",
		historical: true,
	},
	{
		id: "ihm-neut",
		context: "Das Tier zittert; wir geben <TARGET>ihm</TARGET> Wasser.",
		form: "ihm",
		case: "Dat",
		coreFeatures: personal("3", "Sing", "Neut"),
		gender: "Neut",
		number: "Sing",
	},
	{
		id: "seiner-neut",
		context: "Des alten Gesetzes wurde <TARGET>seiner</TARGET> gedacht.",
		form: "seiner",
		case: "Gen",
		coreFeatures: personal("3", "Sing", "Neut"),
		gender: "Neut",
		number: "Sing",
		historical: true,
	},
	{
		id: "uns",
		context: "Die Gastgeber laden <TARGET>uns</TARGET> ein.",
		form: "uns",
		case: "Acc",
		coreFeatures: personal("1", "Plur"),
		number: "Plur",
	},
	{
		id: "unser-gen",
		context: "Man erinnerte sich <TARGET>unser</TARGET> gern.",
		form: "unser",
		case: "Gen",
		coreFeatures: personal("1", "Plur"),
		number: "Plur",
		historical: true,
	},
	{
		id: "ihr-second-plur",
		context: "Morgen beginnt <TARGET>ihr</TARGET> früher.",
		form: "ihr",
		case: "Nom",
		coreFeatures: personal("2", "Plur", null, "Infm"),
		number: "Plur",
	},
	{
		id: "ihnen-plur",
		context: "Die Kinder frieren; wir geben <TARGET>ihnen</TARGET> Decken.",
		form: "ihnen",
		case: "Dat",
		coreFeatures: personal("3", "Plur"),
		number: "Plur",
	},
	{
		id: "ihrer-plur",
		context: "Die Stadt gedachte <TARGET>ihrer</TARGET> gemeinsam.",
		form: "ihrer",
		case: "Gen",
		coreFeatures: personal("3", "Plur"),
		number: "Plur",
		historical: true,
	},
	{
		id: "sie-formal-sing",
		context: "Kommen <TARGET>Sie</TARGET> bitte herein, Frau Müller.",
		form: "Sie",
		case: "Nom",
		coreFeatures: personal("2", "Sing", null, "Form"),
		number: "Plur",
	},
	{
		id: "ihnen-formal-sing",
		context: "Ich helfe <TARGET>Ihnen</TARGET> gern, Herr Özdemir.",
		form: "Ihnen",
		case: "Dat",
		coreFeatures: personal("2", "Sing", null, "Form"),
		number: "Plur",
	},
	{
		id: "ihrer-formal-sing",
		context: "Frau Doktor, wir gedachten <TARGET>Ihrer</TARGET> dankbar.",
		form: "Ihrer",
		case: "Gen",
		coreFeatures: personal("2", "Sing", null, "Form"),
		number: "Plur",
		historical: true,
	},
	{
		id: "sie-formal-plur",
		context: "Kommen <TARGET>Sie</TARGET> bitte herein, meine Damen.",
		form: "Sie",
		case: "Nom",
		coreFeatures: personal("2", "Plur", null, "Form"),
		number: "Plur",
	},
	{
		id: "ihnen-formal-plur",
		context: "Ich helfe <TARGET>Ihnen</TARGET> gern, liebe Gäste.",
		form: "Ihnen",
		case: "Dat",
		coreFeatures: personal("2", "Plur", null, "Form"),
		number: "Plur",
	},
	{
		id: "ihrer-formal-plur",
		context: "Meine Damen, wir gedachten <TARGET>Ihrer</TARGET> dankbar.",
		form: "Ihrer",
		case: "Gen",
		coreFeatures: personal("2", "Plur", null, "Form"),
		number: "Plur",
		historical: true,
	},
];

const possessiveSpecs = [
	[
		"dein",
		"Der freie Platz ist <TARGET>deiner</TARGET>.",
		"deiner",
		"dein",
		personal("2", "Sing", null, "Infm"),
	],
	[
		"sein-masc",
		"Der schwarze Koffer ist <TARGET>seiner</TARGET>.",
		"seiner",
		"sein",
		personal("3", "Sing", "Masc"),
	],
	[
		"sein-neut",
		"Das rote Spielzeug ist <TARGET>seines</TARGET>.",
		"seines",
		"sein",
		personal("3", "Sing", "Neut"),
	],
	[
		"ihr-fem-poss",
		"Der grüne Mantel ist <TARGET>ihrer</TARGET>.",
		"ihrer",
		"ihr",
		personal("3", "Sing", "Fem"),
	],
	[
		"ihr-plur-poss",
		"Die reservierten Plätze sind <TARGET>ihre</TARGET>.",
		"ihre",
		"ihr",
		personal("3", "Plur"),
	],
	[
		"unser-poss",
		"Der große Tisch ist <TARGET>unserer</TARGET>.",
		"unserer",
		"unser",
		personal("1", "Plur"),
	],
	[
		"euer-poss",
		"Der letzte Vorschlag ist <TARGET>eurer</TARGET>.",
		"eurer",
		"euer",
		personal("2", "Plur", null, "Infm"),
	],
	[
		"ihr-formal-poss",
		"Frau Weber, der Ordner ist <TARGET>Ihrer</TARGET>.",
		"Ihrer",
		"Ihr",
		personal("2", null, null, "Form"),
	],
] as const;

const cases = Object.fromEntries([
	...personalSpecs.map((spec) => [
		`grammar-de-pron-fixed-${spec.id}`,
		inflectionCase(
			spec.context,
			spec.form,
			spec.form,
			{
				case: spec.case,
				gender: spec.gender ?? null,
				number: spec.number ?? null,
				reflex: null,
			},
			{
				coreFeatures: spec.coreFeatures,
				...(spec.historical
					? { historicalStatus: "Archaic" as const }
					: {}),
			},
		),
	]),
	...possessiveSpecs.map(([id, context, form, canonicalForm, reference]) => [
		`grammar-de-pron-fixed-${id}`,
		inflectionCase(
			context,
			form,
			canonicalForm,
			{ case: "Nom", gender: "Masc", number: "Sing", reflex: null },
			{ coreFeatures: { ...reference, poss: "Yes" } },
		),
	]),
]) as GoldenCaseRegistry<typeof inputSchema, typeof outputSchema>;

export const fixedPopulationCases = defineGoldenCaseCollection(
	import.meta.url,
	{
		cases,
	},
);
