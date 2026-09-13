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

const interrogativeSpecs = [
	["wer", "<TARGET>Wer</TARGET> kommt heute?", "Wer", "Nom"],
	["wen", "<TARGET>Wen</TARGET> rufst du an?", "Wen", "Acc"],
	["wem", "<TARGET>Wem</TARGET> hilfst du morgen?", "Wem", "Dat"],
	["wessen", "<TARGET>Wessen</TARGET> bedarf es noch?", "Wessen", "Gen"],
] as const;

const jemandSpecs = [
	[
		"jemand",
		"<TARGET>Jemand</TARGET> wartet vor der Tür.",
		"Jemand",
		"jemand",
		"Nom",
	],
	[
		"jemanden",
		"Ich sehe <TARGET>jemanden</TARGET> vor der Tür.",
		"jemanden",
		"jemanden",
		"Acc",
	],
	[
		"jemandem",
		"Ich helfe <TARGET>jemandem</TARGET> aus der Nachbarschaft.",
		"jemandem",
		"jemandem",
		"Dat",
	],
	[
		"jemandes",
		"Es bedarf <TARGET>jemandes</TARGET> mit Erfahrung.",
		"jemandes",
		"jemandes",
		"Gen",
	],
] as const;

const niemandSpecs = [
	[
		"niemand",
		"<TARGET>Niemand</TARGET> wartet vor der Tür.",
		"Niemand",
		"niemand",
		"Nom",
	],
	[
		"niemanden",
		"Ich sehe <TARGET>niemanden</TARGET> vor der Tür.",
		"niemanden",
		"niemanden",
		"Acc",
	],
	[
		"niemandem",
		"Ich helfe <TARGET>niemandem</TARGET> aus der Nachbarschaft.",
		"niemandem",
		"niemandem",
		"Dat",
	],
	[
		"niemandes",
		"Es bedarf <TARGET>niemandes</TARGET> mit Erfahrung.",
		"niemandes",
		"niemandes",
		"Gen",
	],
] as const;

const keinerSpecs = [
	[
		"nom-sing-masc",
		"Von den Männern kam <TARGET>keiner</TARGET>.",
		"keiner",
		"Nom",
		"Masc",
		"Sing",
	],
	[
		"nom-sing-fem",
		"Von den Frauen kam <TARGET>keine</TARGET>.",
		"keine",
		"Nom",
		"Fem",
		"Sing",
	],
	[
		"nom-sing-neut",
		"Von den Geräten funktioniert <TARGET>keines</TARGET>.",
		"keines",
		"Nom",
		"Neut",
		"Sing",
	],
	[
		"acc-sing-masc",
		"Von den Männern sah ich <TARGET>keinen</TARGET>.",
		"keinen",
		"Acc",
		"Masc",
		"Sing",
	],
	[
		"acc-sing-fem",
		"Von den Frauen kenne ich <TARGET>keine</TARGET>.",
		"keine",
		"Acc",
		"Fem",
		"Sing",
	],
	[
		"acc-sing-neut",
		"Von den Geräten reparierte ich <TARGET>keines</TARGET>.",
		"keines",
		"Acc",
		"Neut",
		"Sing",
	],
	[
		"dat-sing-masc",
		"Von den Männern half ich <TARGET>keinem</TARGET>.",
		"keinem",
		"Dat",
		"Masc",
		"Sing",
	],
	[
		"dat-sing-fem",
		"Von den Frauen widersprach ich <TARGET>keiner</TARGET>.",
		"keiner",
		"Dat",
		"Fem",
		"Sing",
	],
	[
		"dat-sing-neut",
		"Von den Geräten vertraue ich <TARGET>keinem</TARGET>.",
		"keinem",
		"Dat",
		"Neut",
		"Sing",
	],
	[
		"gen-sing-masc",
		"Es bedarf <TARGET>keines</TARGET> der vorgeschlagenen Verträge.",
		"keines",
		"Gen",
		"Masc",
		"Sing",
	],
	[
		"gen-sing-fem",
		"Es bedarf <TARGET>keiner</TARGET> der vorgeschlagenen Lösungen.",
		"keiner",
		"Gen",
		"Fem",
		"Sing",
	],
	[
		"gen-sing-neut",
		"Es bedarf <TARGET>keines</TARGET> der vorgeschlagenen Geräte.",
		"keines",
		"Gen",
		"Neut",
		"Sing",
	],
	[
		"nom-plur",
		"Von den Gästen kamen <TARGET>keine</TARGET>.",
		"keine",
		"Nom",
		null,
		"Plur",
	],
	[
		"acc-plur",
		"Von den Gästegruppen sah ich <TARGET>keine</TARGET>.",
		"keine",
		"Acc",
		null,
		"Plur",
	],
	[
		"dat-plur",
		"Von den Gästen half ich <TARGET>keinen</TARGET>.",
		"keinen",
		"Dat",
		null,
		"Plur",
	],
	[
		"gen-plur",
		"Die Stimmen <TARGET>keiner</TARGET> der Bewerber wurden gezählt.",
		"keiner",
		"Gen",
		null,
		"Plur",
	],
] as const;

const mancherSpecs = [
	[
		"nom-sing-masc",
		"Von den Männern irrt sich <TARGET>mancher</TARGET>.",
		"mancher",
		"Nom",
		"Masc",
		"Sing",
	],
	[
		"nom-sing-fem",
		"Von den Frauen irrt sich <TARGET>manche</TARGET>.",
		"manche",
		"Nom",
		"Fem",
		"Sing",
	],
	[
		"nom-sing-neut",
		"Von den Details bleibt <TARGET>manches</TARGET> unklar.",
		"manches",
		"Nom",
		"Neut",
		"Sing",
	],
	[
		"acc-sing-masc",
		"Von den Männern kenne ich <TARGET>manchen</TARGET>.",
		"manchen",
		"Acc",
		"Masc",
		"Sing",
	],
	[
		"acc-sing-fem",
		"Von den Frauen kenne ich <TARGET>manche</TARGET>.",
		"manche",
		"Acc",
		"Fem",
		"Sing",
	],
	[
		"acc-sing-neut",
		"Von den Details verstehe ich <TARGET>manches</TARGET>.",
		"manches",
		"Acc",
		"Neut",
		"Sing",
	],
	[
		"dat-sing-masc",
		"Von den Kandidaten vertraue ich <TARGET>manchem</TARGET>.",
		"manchem",
		"Dat",
		"Masc",
		"Sing",
	],
	[
		"dat-sing-fem",
		"Von den Empfehlungen folge ich <TARGET>mancher</TARGET>.",
		"mancher",
		"Dat",
		"Fem",
		"Sing",
	],
	[
		"dat-sing-neut",
		"Von den Kindern hilft das <TARGET>manchem</TARGET>.",
		"manchem",
		"Dat",
		"Neut",
		"Sing",
	],
	[
		"gen-sing-masc",
		"Die Meinung <TARGET>manches</TARGET> der Teilnehmer blieb ungehört.",
		"manches",
		"Gen",
		"Masc",
		"Sing",
	],
	[
		"gen-sing-fem",
		"Die Stimme <TARGET>mancher</TARGET> der Frauen fehlte.",
		"mancher",
		"Gen",
		"Fem",
		"Sing",
	],
	[
		"gen-sing-neut",
		"Die Wirkung <TARGET>manches</TARGET> der Mittel ist unklar.",
		"manches",
		"Gen",
		"Neut",
		"Sing",
	],
	[
		"nom-plur",
		"Von den Gästen kommen <TARGET>manche</TARGET> später.",
		"manche",
		"Nom",
		null,
		"Plur",
	],
	[
		"acc-plur",
		"Von den Gästen kenne ich <TARGET>manche</TARGET>.",
		"manche",
		"Acc",
		null,
		"Plur",
	],
	[
		"dat-plur",
		"Von den Gästen helfe ich <TARGET>manchen</TARGET>.",
		"manchen",
		"Dat",
		null,
		"Plur",
	],
	[
		"gen-plur",
		"Die Stimmen <TARGET>mancher</TARGET> fehlen.",
		"mancher",
		"Gen",
		null,
		"Plur",
	],
] as const;

const jedermannSpecs = [
	[
		"nom",
		"<TARGET>Jedermann</TARGET> ist willkommen.",
		"Jedermann",
		"jedermann",
		"Nom",
	],
	[
		"acc",
		"Das betrifft <TARGET>jedermann</TARGET>.",
		"jedermann",
		"jedermann",
		"Acc",
	],
	[
		"dat",
		"Das steht <TARGET>jedermann</TARGET> frei.",
		"jedermann",
		"jedermann",
		"Dat",
	],
	[
		"gen",
		"Das ist <TARGET>jedermanns</TARGET> Sache.",
		"jedermanns",
		"jedermanns",
		"Gen",
	],
] as const;

const totalSpecs = [
	[
		"alles-nom",
		"<TARGET>Alles</TARGET> funktioniert.",
		"Alles",
		"alles",
		"alles",
		"Nom",
		"Neut",
		"Sing",
	],
	[
		"alles-acc",
		"Ich habe <TARGET>alles</TARGET> geprüft.",
		"alles",
		"alles",
		"alles",
		"Acc",
		"Neut",
		"Sing",
	],
	[
		"allem-dat",
		"Mit <TARGET>allem</TARGET> bin ich einverstanden.",
		"allem",
		"allem",
		"alles",
		"Dat",
		"Neut",
		"Sing",
	],
	[
		"alle-nom",
		"<TARGET>Alle</TARGET> sind angekommen.",
		"Alle",
		"alle",
		"alle",
		"Nom",
		null,
		"Plur",
	],
	[
		"alle-acc",
		"Ich kenne <TARGET>alle</TARGET>.",
		"alle",
		"alle",
		"alle",
		"Acc",
		null,
		"Plur",
	],
	[
		"allen-dat",
		"Ich helfe <TARGET>allen</TARGET>.",
		"allen",
		"allen",
		"alle",
		"Dat",
		null,
		"Plur",
	],
	[
		"aller-gen",
		"Die Stimmen <TARGET>aller</TARGET> zählen.",
		"aller",
		"aller",
		"alle",
		"Gen",
		null,
		"Plur",
	],
] as const;

const mehrereSpecs = [
	["nom", "<TARGET>Mehrere</TARGET> kamen.", "Mehrere", "mehrere", "Nom"],
	["acc", "Ich kenne <TARGET>mehrere</TARGET>.", "mehrere", "mehrere", "Acc"],
	[
		"dat",
		"Ich helfe <TARGET>mehreren</TARGET>.",
		"mehreren",
		"mehreren",
		"Dat",
	],
	[
		"gen",
		"Die Aussagen <TARGET>mehrerer</TARGET> stimmen überein.",
		"mehrerer",
		"mehrerer",
		"Gen",
	],
] as const;

const jederSpecs = [
	[
		"nom-masc",
		"Unter den Männern hilft <TARGET>jeder</TARGET>.",
		"jeder",
		"Nom",
		"Masc",
	],
	[
		"nom-fem",
		"Unter den Frauen hilft <TARGET>jede</TARGET>.",
		"jede",
		"Nom",
		"Fem",
	],
	[
		"nom-neut",
		"Unter den Kindern hilft <TARGET>jedes</TARGET>.",
		"jedes",
		"Nom",
		"Neut",
	],
	[
		"acc-masc",
		"Von den Männern kenne ich <TARGET>jeden</TARGET>.",
		"jeden",
		"Acc",
		"Masc",
	],
	[
		"acc-fem",
		"Von den Frauen kenne ich <TARGET>jede</TARGET>.",
		"jede",
		"Acc",
		"Fem",
	],
	[
		"acc-neut",
		"Von den Kindern kenne ich <TARGET>jedes</TARGET>.",
		"jedes",
		"Acc",
		"Neut",
	],
	[
		"dat-masc",
		"Von den Männern helfe ich <TARGET>jedem</TARGET>.",
		"jedem",
		"Dat",
		"Masc",
	],
	[
		"dat-fem",
		"Von den Frauen helfe ich <TARGET>jeder</TARGET>.",
		"jeder",
		"Dat",
		"Fem",
	],
	[
		"dat-neut",
		"Von den Kindern helfe ich <TARGET>jedem</TARGET>.",
		"jedem",
		"Dat",
		"Neut",
	],
	[
		"gen-masc",
		"Die Bewerber stellten Projekte vor; der Beitrag <TARGET>jedes</TARGET> wurde geprüft.",
		"jedes",
		"Gen",
		"Masc",
	],
	[
		"gen-fem",
		"Die Bewerberinnen stellten Projekte vor; der Beitrag <TARGET>jeder</TARGET> wurde geprüft.",
		"jeder",
		"Gen",
		"Fem",
	],
	[
		"gen-neut",
		"Die Kinder stellten Projekte vor; der Beitrag <TARGET>jedes</TARGET> wurde geprüft.",
		"jedes",
		"Gen",
		"Neut",
	],
] as const;

const jedwederSpecs = [
	[
		"nom-masc",
		"Unter den Männern hilft <TARGET>jedweder</TARGET>.",
		"jedweder",
		"Nom",
		"Masc",
	],
	[
		"nom-fem",
		"Unter den Frauen hilft <TARGET>jedwede</TARGET>.",
		"jedwede",
		"Nom",
		"Fem",
	],
	[
		"nom-neut",
		"Unter den Kindern hilft <TARGET>jedwedes</TARGET>.",
		"jedwedes",
		"Nom",
		"Neut",
	],
	[
		"acc-masc",
		"Von den Männern kenne ich <TARGET>jedweden</TARGET>.",
		"jedweden",
		"Acc",
		"Masc",
	],
	[
		"acc-fem",
		"Von den Frauen kenne ich <TARGET>jedwede</TARGET>.",
		"jedwede",
		"Acc",
		"Fem",
	],
	[
		"acc-neut",
		"Von den Kindern kenne ich <TARGET>jedwedes</TARGET>.",
		"jedwedes",
		"Acc",
		"Neut",
	],
	[
		"dat-masc",
		"Von den Männern helfe ich <TARGET>jedwedem</TARGET>.",
		"jedwedem",
		"Dat",
		"Masc",
	],
	[
		"dat-fem",
		"Von den Frauen helfe ich <TARGET>jedweder</TARGET>.",
		"jedweder",
		"Dat",
		"Fem",
	],
	[
		"dat-neut",
		"Von den Kindern helfe ich <TARGET>jedwedem</TARGET>.",
		"jedwedem",
		"Dat",
		"Neut",
	],
	[
		"gen-masc",
		"Die Bewerber stellten Projekte vor; der Beitrag <TARGET>jedwedes</TARGET> wurde geprüft.",
		"jedwedes",
		"Gen",
		"Masc",
	],
	[
		"gen-fem",
		"Die Bewerberinnen stellten Projekte vor; der Beitrag <TARGET>jedweder</TARGET> wurde geprüft.",
		"jedweder",
		"Gen",
		"Fem",
	],
	[
		"gen-neut",
		"Die Kinder stellten Projekte vor; der Beitrag <TARGET>jedwedes</TARGET> wurde geprüft.",
		"jedwedes",
		"Gen",
		"Neut",
	],
] as const;

const jeglicherSpecs = [
	[
		"nom-sing-masc",
		"Unter den Männern hilft <TARGET>jeglicher</TARGET>.",
		"jeglicher",
		"Nom",
		"Masc",
		"Sing",
	],
	[
		"nom-sing-fem",
		"Unter den Frauen hilft <TARGET>jegliche</TARGET>.",
		"jegliche",
		"Nom",
		"Fem",
		"Sing",
	],
	[
		"nom-sing-neut",
		"Unter den Kindern hilft <TARGET>jegliches</TARGET>.",
		"jegliches",
		"Nom",
		"Neut",
		"Sing",
	],
	[
		"acc-sing-masc",
		"Von den Männern kenne ich <TARGET>jeglichen</TARGET>.",
		"jeglichen",
		"Acc",
		"Masc",
		"Sing",
	],
	[
		"acc-sing-fem",
		"Von den Frauen kenne ich <TARGET>jegliche</TARGET>.",
		"jegliche",
		"Acc",
		"Fem",
		"Sing",
	],
	[
		"acc-sing-neut",
		"Von den Kindern kenne ich <TARGET>jegliches</TARGET>.",
		"jegliches",
		"Acc",
		"Neut",
		"Sing",
	],
	[
		"dat-sing-masc",
		"Von den Männern helfe ich <TARGET>jeglichem</TARGET>.",
		"jeglichem",
		"Dat",
		"Masc",
		"Sing",
	],
	[
		"dat-sing-fem",
		"Von den Frauen helfe ich <TARGET>jeglicher</TARGET>.",
		"jeglicher",
		"Dat",
		"Fem",
		"Sing",
	],
	[
		"dat-sing-neut",
		"Von den Kindern helfe ich <TARGET>jeglichem</TARGET>.",
		"jeglichem",
		"Dat",
		"Neut",
		"Sing",
	],
	[
		"gen-sing-masc",
		"Die Bewerber stellten Projekte vor; der Beitrag <TARGET>jegliches</TARGET> wurde geprüft.",
		"jegliches",
		"Gen",
		"Masc",
		"Sing",
	],
	[
		"gen-sing-fem",
		"Die Bewerberinnen stellten Projekte vor; der Beitrag <TARGET>jeglicher</TARGET> wurde geprüft.",
		"jeglicher",
		"Gen",
		"Fem",
		"Sing",
	],
	[
		"gen-sing-neut",
		"Die Kinder stellten Projekte vor; der Beitrag <TARGET>jegliches</TARGET> wurde geprüft.",
		"jegliches",
		"Gen",
		"Neut",
		"Sing",
	],
	[
		"nom-plur",
		"Die Vorschläge lagen vor; <TARGET>jegliche</TARGET> wurden geprüft.",
		"jegliche",
		"Nom",
		null,
		"Plur",
	],
	[
		"acc-plur",
		"Die Vorschläge lagen vor; wir prüften <TARGET>jegliche</TARGET>.",
		"jegliche",
		"Acc",
		null,
		"Plur",
	],
	[
		"dat-plur",
		"Die Vorschläge lagen vor; wir widersprachen <TARGET>jeglichen</TARGET>.",
		"jeglichen",
		"Dat",
		null,
		"Plur",
	],
	[
		"gen-plur",
		"Die Vorschläge lagen vor; der Wortlaut <TARGET>jeglicher</TARGET> wurde geprüft.",
		"jeglicher",
		"Gen",
		null,
		"Plur",
	],
] as const;

const derParadigmRows = [
	{
		label: "masc",
		gender: "Masc",
		number: "Sing",
		forms: ["der", "den", "dem", "dessen"],
	},
	{
		label: "fem",
		gender: "Fem",
		number: "Sing",
		forms: ["die", "die", "der", "deren"],
	},
	{
		label: "neut",
		gender: "Neut",
		number: "Sing",
		forms: ["das", "das", "dem", "dessen"],
	},
	{
		label: "plur",
		gender: null,
		number: "Plur",
		forms: ["die", "die", "denen", "deren"],
	},
] as const;

const derParadigmCases = ["Nom", "Acc", "Dat", "Gen"] as const;

const demonstrativeContexts = {
	masc: [
		"<TARGET>Der</TARGET> gefällt mir.",
		"<TARGET>Den</TARGET> nehme ich.",
		"Der Mann dort: Mit <TARGET>dem</TARGET> arbeite ich.",
		"Der Plan dort: <TARGET>Dessen</TARGET> bedarf es.",
	],
	fem: [
		"<TARGET>Die</TARGET> gefällt mir.",
		"Von den Frauen nehme ich <TARGET>die</TARGET>.",
		"Die Frau dort: Mit <TARGET>der</TARGET> arbeite ich.",
		"Die Lösung dort: <TARGET>Deren</TARGET> bedarf es.",
	],
	neut: [
		"<TARGET>Das</TARGET> gefällt mir.",
		"<TARGET>Das</TARGET> nehme ich.",
		"Das Gerät dort: Mit <TARGET>dem</TARGET> arbeite ich.",
		"Das Werkzeug dort: <TARGET>Dessen</TARGET> bedarf es.",
	],
	plur: [
		"<TARGET>Die</TARGET> gefallen mir.",
		"Von den Geräten nehme ich <TARGET>die</TARGET>.",
		"Mit <TARGET>denen</TARGET> arbeite ich.",
		"Die Lösungen dort: <TARGET>Deren</TARGET> bedarf es.",
	],
} as const;

const relativeContexts = {
	masc: [
		"Das ist der Mann, <TARGET>der</TARGET> den Drucker repariert.",
		"Das ist der Mann, <TARGET>den</TARGET> wir begrüßen.",
		"Das ist der Mann, mit <TARGET>dem</TARGET> wir arbeiten.",
		"Das ist der Mann, <TARGET>dessen</TARGET> Plan wir prüfen.",
	],
	fem: [
		"Das ist die Frau, <TARGET>die</TARGET> heute auftritt.",
		"Das ist die Frau, <TARGET>die</TARGET> wir begrüßen.",
		"Das ist die Frau, mit <TARGET>der</TARGET> wir arbeiten.",
		"Das ist die Frau, <TARGET>deren</TARGET> Plan wir prüfen.",
	],
	neut: [
		"Das ist das Gerät, <TARGET>das</TARGET> im Labor steht.",
		"Das ist das Gerät, <TARGET>das</TARGET> wir prüfen.",
		"Das ist das Gerät, mit <TARGET>dem</TARGET> wir arbeiten.",
		"Das ist das Gerät, <TARGET>dessen</TARGET> Nummer wir notieren.",
	],
	plur: [
		"Das sind die Geräte, <TARGET>die</TARGET> im Labor stehen.",
		"Das sind die Geräte, <TARGET>die</TARGET> wir prüfen.",
		"Das sind die Geräte, mit <TARGET>denen</TARGET> wir arbeiten.",
		"Das sind die Geräte, <TARGET>deren</TARGET> Nummern wir notieren.",
	],
} as const;

const derParadigmSpecs = (["Dem", "Rel"] as const).flatMap((pronType) =>
	derParadigmRows.flatMap((row) =>
		derParadigmCases.map((grammaticalCase, caseIndex) => {
			const canonicalForm = row.forms[caseIndex];
			const context = (
				pronType === "Dem" ? demonstrativeContexts : relativeContexts
			)[row.label][caseIndex];
			const member = context?.match(/<TARGET>(.*?)<\/TARGET>/u)?.[1];
			if (!canonicalForm || !context || !member) {
				throw new Error("Incomplete fixed der-paradigm Golden Case.");
			}
			return {
				id: `${pronType.toLowerCase()}-${canonicalForm}-${grammaticalCase.toLowerCase()}-${row.label}`,
				pronType,
				context,
				member,
				canonicalForm,
				grammaticalCase,
				gender: row.gender,
				number: row.number,
			};
		}),
	),
);

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
	...interrogativeSpecs.map(([id, context, member, grammaticalCase]) => [
		`grammar-de-pron-fixed-${id}`,
		inflectionCase(
			context,
			member,
			id,
			{
				case: grammaticalCase,
				gender: null,
				number: "Sing",
				reflex: null,
			},
			{
				coreFeatures: core("Int"),
				normalizedMember: id,
				explanation:
					"The free interrogative keeps its exact normalized case form as the learner-facing Lemma.",
			},
		),
	]),
	...jemandSpecs.map(
		([id, context, member, normalizedMember, grammaticalCase]) => [
			`grammar-de-pron-fixed-jemand-${id}`,
			inflectionCase(
				context,
				member,
				"jemand",
				{
					case: grammaticalCase,
					gender: null,
					number: "Sing",
					reflex: null,
				},
				{
					coreFeatures: core("Ind"),
					normalizedMember,
					explanation:
						"The contextual case form is an Inflection Surface of the one fixed indefinite Lemma jemand.",
				},
			),
		],
	),
	...niemandSpecs.map(
		([id, context, member, normalizedMember, grammaticalCase]) => [
			`grammar-de-pron-fixed-niemand-${id}`,
			inflectionCase(
				context,
				member,
				"niemand",
				{
					case: grammaticalCase,
					gender: null,
					number: "Sing",
					reflex: null,
				},
				{
					coreFeatures: core("Neg"),
					normalizedMember,
					explanation:
						"The contextual case form is an Inflection Surface of the one fixed negative Lemma niemand.",
				},
			),
		],
	),
	...keinerSpecs.map(
		([id, context, member, grammaticalCase, gender, number]) => [
			`grammar-de-pron-fixed-keiner-${id}`,
			inflectionCase(
				context,
				member,
				"keiner",
				{ case: grammaticalCase, gender, number, reflex: null },
				{
					coreFeatures: core("Neg"),
					normalizedMember: member,
					explanation:
						"The standalone declined form is an Inflection Surface of the one fixed negative Lemma keiner; contextual case, number, and singular gender remain Surface evidence.",
				},
			),
		],
	),
	...mancherSpecs.map(
		([id, context, member, grammaticalCase, gender, number]) => [
			`grammar-de-pron-fixed-mancher-${id}`,
			inflectionCase(
				context,
				member,
				"mancher",
				{ case: grammaticalCase, gender, number, reflex: null },
				{
					coreFeatures: core("Tot"),
					normalizedMember: member,
					explanation:
						"The standalone form is an Inflection Surface of the one fixed total Lemma mancher; contextual case, number, and singular gender remain Surface evidence.",
				},
			),
		],
	),
	...jedermannSpecs.map(
		([id, context, member, normalizedMember, grammaticalCase]) => [
			`grammar-de-pron-fixed-jedermann-${id}`,
			inflectionCase(
				context,
				member,
				"jedermann",
				{
					case: grammaticalCase,
					gender: null,
					number: "Sing",
					reflex: null,
				},
				{
					coreFeatures: core("Tot"),
					normalizedMember,
					explanation:
						"The singular case occurrence is an Inflection Surface of the separate fixed Lemma jedermann, never a Lemma jedermanns or jeder.",
				},
			),
		],
	),
	...totalSpecs.map(
		([
			id,
			context,
			member,
			normalizedMember,
			canonicalForm,
			grammaticalCase,
			gender,
			number,
		]) => [
			`grammar-de-pron-fixed-${id}`,
			inflectionCase(
				context,
				member,
				canonicalForm,
				{
					case: grammaticalCase,
					gender,
					number,
					reflex: null,
				},
				{
					coreFeatures: core("Tot"),
					normalizedMember,
					explanation:
						"The promoted total-pronoun population keeps singular alles and plural alle as separate Lemmas while case remains Surface evidence.",
				},
			),
		],
	),
	...mehrereSpecs.map(
		([id, context, member, normalizedMember, grammaticalCase]) => [
			`grammar-de-pron-fixed-mehrere-${id}`,
			inflectionCase(
				context,
				member,
				"mehrere",
				{
					case: grammaticalCase,
					gender: null,
					number: "Plur",
					reflex: null,
				},
				{
					coreFeatures: core("Tot"),
					normalizedMember,
					explanation:
						"The plural-only paradigm keeps all four contextual Case forms under Lemma mehrere with plural Number and no Gender.",
				},
			),
		],
	),
	...jederSpecs.map(([id, context, member, grammaticalCase, gender]) => [
		`grammar-de-pron-fixed-jeder-${id}`,
		inflectionCase(
			context,
			member,
			"jeder",
			{
				case: grammaticalCase,
				gender,
				number: "Sing",
				reflex: null,
			},
			{
				coreFeatures: core("Tot"),
				explanation:
					"The contextual singular Case and Gender remain Surface evidence for the one fixed total-pronoun Lemma jeder.",
			},
		),
	]),
	...jedwederSpecs.map(([id, context, member, grammaticalCase, gender]) => [
		`grammar-de-pron-fixed-jedweder-${id}`,
		inflectionCase(
			context,
			member,
			"jedweder",
			{ case: grammaticalCase, gender, number: "Sing", reflex: null },
			{
				coreFeatures: core("Tot"),
				explanation:
					"The dated or emphatic form remains a singular Surface of Lemma jedweder; synonymy with jeder never changes its lexical identity.",
			},
		),
	]),
	...jeglicherSpecs.map(
		([id, context, member, grammaticalCase, gender, number]) => [
			`grammar-de-pron-fixed-jeglicher-${id}`,
			inflectionCase(
				context,
				member,
				"jeglicher",
				{ case: grammaticalCase, gender, number, reflex: null },
				{
					coreFeatures: core("Tot"),
					explanation:
						"Singular and plural contextual features remain distinct Surfaces of Lemma jeglicher; synonymy never changes identity or lends plural forms to jeder or jedweder.",
				},
			),
		],
	),
	...derParadigmSpecs.map((spec) => [
		`grammar-de-pron-fixed-der-paradigm-${spec.id}`,
		inflectionCase(
			spec.context,
			spec.member,
			spec.canonicalForm,
			{
				case: spec.grammaticalCase,
				gender: spec.gender,
				number: spec.number,
				reflex: null,
			},
			{
				coreFeatures: core(spec.pronType),
				normalizedMember: spec.canonicalForm,
				explanation:
					"The exact written form is the fixed Lemma; context selects demonstrative versus relative pronType while Case, gender, and number remain Surface evidence.",
			},
		),
	]),
]) as GoldenCaseRegistry<typeof inputSchema, typeof outputSchema>;

export const fixedPopulationCases = defineGoldenCaseCollection(
	import.meta.url,
	{
		cases,
	},
);
