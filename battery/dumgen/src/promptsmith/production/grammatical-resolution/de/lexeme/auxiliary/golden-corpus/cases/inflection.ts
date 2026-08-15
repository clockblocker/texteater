import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import {
	citationCase,
	finiteCase,
	imperativeCase,
	infinitiveCase,
	participleCase,
} from "./builders";

export const inflectionCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-aux-demo-future-wird": finiteCase(
			"Mara <TARGET>wird</TARGET> morgen abreisen.",
			"wird",
			"werden",
			null,
			{
				mood: "Ind",
				number: "Sing",
				person: "3",
				tense: "Pres",
				voice: null,
			},
			{
				explanation:
					"Future AUX. Finite present third singular. Not passive. VerbType null.",
			},
		),
		"grammar-de-aux-demo-modal-kann": finiteCase(
			"Das Kind <TARGET>kann</TARGET> schon schwimmen.",
			"kann",
			"können",
			"Mod",
			{
				mood: "Ind",
				number: "Sing",
				person: "3",
				tense: "Pres",
				voice: null,
			},
			{
				explanation:
					"Meaning-bearing modal AUX. Bare infinitive outside target. VerbType Mod.",
			},
		),
		"grammar-de-aux-demo-copula-ist": finiteCase(
			"Der Innenhof <TARGET>ist</TARGET> heute still.",
			"ist",
			"sein",
			null,
			{
				mood: "Ind",
				number: "Sing",
				person: "3",
				tense: "Pres",
				voice: null,
			},
			{
				explanation:
					"Copular sein is AUX on fixed route. Predicate stays context. VerbType null.",
			},
		),
		"grammar-de-aux-demo-citation-duerfen": citationCase(
			"Im Wörterbuch steht das Modalauxiliar <TARGET>dürfen</TARGET>.",
			"dürfen",
			"dürfen",
			"Mod",
			{
				explanation:
					"Explicit dictionary headword. Citation Surface. Modal identity remains Mod.",
			},
		),
		"grammar-de-aux-demo-imperative-sei": imperativeCase(
			"<TARGET>Sei</TARGET> bitte vorsichtig!",
			"Sei",
			"sein",
			"Sing",
			"2",
			{
				normalizedMember: "sei",
				explanation:
					"Copular imperative. Initial capital is Standard and normalizes lowercase.",
			},
		),

		"grammar-de-aux-dev-perfect-hat-gegessen": finiteCase(
			"Nora <TARGET>hat</TARGET> bereits gegessen.",
			"hat",
			"haben",
			null,
			{
				mood: "Ind",
				number: "Sing",
				person: "3",
				tense: "Pres",
				voice: null,
			},
		),
		"grammar-de-aux-dev-perfect-waren-gegangen": finiteCase(
			"Die Gäste <TARGET>waren</TARGET> schon gegangen.",
			"waren",
			"sein",
			null,
			{
				mood: "Ind",
				number: "Plur",
				person: "3",
				tense: "Past",
				voice: null,
			},
		),
		"grammar-de-aux-dev-passive-wird-repariert": finiteCase(
			"Die Brücke <TARGET>wird</TARGET> im Sommer repariert.",
			"wird",
			"werden",
			null,
			{
				mood: "Ind",
				number: "Sing",
				person: "3",
				tense: "Pres",
				voice: "Pass",
			},
			{
				explanation:
					"Passive-forming werden. Mark AUX Surface voice Pass.",
			},
		),
		"grammar-de-aux-dev-passive-wurde-gesperrt": finiteCase(
			"Die Straße <TARGET>wurde</TARGET> gestern gesperrt.",
			"wurde",
			"werden",
			null,
			{
				mood: "Ind",
				number: "Sing",
				person: "3",
				tense: "Past",
				voice: "Pass",
			},
		),
		"grammar-de-aux-dev-copula-bin-muede": finiteCase(
			"Nach der Reise <TARGET>bin</TARGET> ich müde.",
			"bin",
			"sein",
			null,
			{
				mood: "Ind",
				number: "Sing",
				person: "1",
				tense: "Pres",
				voice: null,
			},
		),
		"grammar-de-aux-dev-subjunctive-sei-gegangen": finiteCase(
			"Der Zeuge sagt, die Frau <TARGET>sei</TARGET> früh gegangen.",
			"sei",
			"sein",
			null,
			{
				mood: "Sub",
				number: "Sing",
				person: "3",
				tense: "Pres",
				voice: null,
			},
			{ explanation: "Konjunktiv I. Tense Pres in AUX codec." },
		),
		"grammar-de-aux-dev-subjunctive-waeren-geblieben": finiteCase(
			"Ohne den Anruf <TARGET>wären</TARGET> sie länger geblieben.",
			"wären",
			"sein",
			null,
			{
				mood: "Sub",
				number: "Plur",
				person: "3",
				tense: "Past",
				voice: null,
			},
			{ explanation: "Konjunktiv II. Tense Past in AUX codec." },
		),
		"grammar-de-aux-dev-modal-darf-bleiben": finiteCase(
			"Der Hund <TARGET>darf</TARGET> heute drinnen bleiben.",
			"darf",
			"dürfen",
			"Mod",
			{
				mood: "Ind",
				number: "Sing",
				person: "3",
				tense: "Pres",
				voice: null,
			},
		),
		"grammar-de-aux-dev-modal-wolltest-gehen": finiteCase(
			"Du <TARGET>wolltest</TARGET> doch früher gehen.",
			"wolltest",
			"wollen",
			"Mod",
			{
				mood: "Ind",
				number: "Sing",
				person: "2",
				tense: "Past",
				voice: null,
			},
		),
		"grammar-de-aux-dev-modal-moechte-bleiben": finiteCase(
			"Lea <TARGET>möchte</TARGET> noch etwas bleiben.",
			"möchte",
			"mögen",
			"Mod",
			{
				mood: "Sub",
				number: "Sing",
				person: "3",
				tense: "Past",
				voice: null,
			},
			{ explanation: "Modal möchte. Lemma mögen. Konjunktiv II shape." },
		),
		"grammar-de-aux-dev-modal-sollen-syncretic": finiteCase(
			"In der beschädigten Notiz steht: „Wir <TARGET>sollen</TARGET> …“",
			"sollen",
			"sollen",
			"Mod",
			{
				mood: null,
				number: "Plur",
				person: "1",
				tense: "Pres",
				voice: null,
			},
			{
				explanation:
					"Form syncretic for indicative and subjunctive. Context damaged. Mood null.",
			},
		),
		"grammar-de-aux-dev-infinitive-sein": infinitiveCase(
			"Mira wird längst angekommen <TARGET>sein</TARGET>.",
			"sein",
			"sein",
			null,
			null,
		),
		"grammar-de-aux-dev-infinitive-passive-werden": infinitiveCase(
			"Der Saal muss heute gereinigt <TARGET>werden</TARGET>.",
			"werden",
			"werden",
			null,
			"Pass",
			{ explanation: "Passive auxiliary infinitive. Voice Pass." },
		),
		"grammar-de-aux-dev-participle-gewesen": participleCase(
			"Der Raum ist lange leer <TARGET>gewesen</TARGET>.",
			"gewesen",
			"sein",
			null,
		),
		"grammar-de-aux-dev-participle-worden": participleCase(
			"Der Antrag ist gestern genehmigt <TARGET>worden</TARGET>.",
			"worden",
			"werden",
			"Pass",
			{ explanation: "Passive auxiliary participle. Voice Pass." },
		),

		"grammar-de-aux-accept-perfect-ist-gegangen": finiteCase(
			"Der Kurier <TARGET>ist</TARGET> pünktlich gegangen.",
			"ist",
			"sein",
			null,
			{
				mood: "Ind",
				number: "Sing",
				person: "3",
				tense: "Pres",
				voice: null,
			},
		),
		"grammar-de-aux-accept-future-werden-abreisen": finiteCase(
			"Wir <TARGET>werden</TARGET> am Freitag abreisen.",
			"werden",
			"werden",
			null,
			{
				mood: "Ind",
				number: "Plur",
				person: "1",
				tense: "Pres",
				voice: null,
			},
		),
		"grammar-de-aux-accept-passive-wurden-gerufen": finiteCase(
			"Die Helfer <TARGET>wurden</TARGET> sofort gerufen.",
			"wurden",
			"werden",
			null,
			{
				mood: "Ind",
				number: "Plur",
				person: "3",
				tense: "Past",
				voice: "Pass",
			},
		),
		"grammar-de-aux-accept-copula-war-ruhig": finiteCase(
			"Der See <TARGET>war</TARGET> am Morgen ruhig.",
			"war",
			"sein",
			null,
			{
				mood: "Ind",
				number: "Sing",
				person: "3",
				tense: "Past",
				voice: null,
			},
		),
		"grammar-de-aux-accept-subjunctive-haette": finiteCase(
			"Mit mehr Zeit <TARGET>hätte</TARGET> er das Ziel erreicht.",
			"hätte",
			"haben",
			null,
			{
				mood: "Sub",
				number: "Sing",
				person: "3",
				tense: "Past",
				voice: null,
			},
		),
		"grammar-de-aux-accept-modal-muessen": finiteCase(
			"Wir <TARGET>müssen</TARGET> jetzt eintreten.",
			"müssen",
			"müssen",
			"Mod",
			{
				mood: "Ind",
				number: "Plur",
				person: "1",
				tense: "Pres",
				voice: null,
			},
		),
		"grammar-de-aux-accept-modal-mag": finiteCase(
			"Tobias <TARGET>mag</TARGET> später mitkommen.",
			"mag",
			"mögen",
			"Mod",
			{
				mood: "Ind",
				number: "Sing",
				person: "3",
				tense: "Pres",
				voice: null,
			},
		),
		"grammar-de-aux-accept-modal-wollt": finiteCase(
			"Ihr <TARGET>wollt</TARGET> morgen weiterfahren.",
			"wollt",
			"wollen",
			"Mod",
			{
				mood: "Ind",
				number: "Plur",
				person: "2",
				tense: "Pres",
				voice: null,
			},
		),
		"grammar-de-aux-accept-citation-sein": citationCase(
			"Der Wörterbucheintrag nennt <TARGET>sein</TARGET> als Kopula.",
			"sein",
			"sein",
			null,
		),
		"grammar-de-aux-accept-infinitive-haben": infinitiveCase(
			"Sie könnte den Zug verpasst <TARGET>haben</TARGET>.",
			"haben",
			"haben",
			null,
			null,
		),
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
