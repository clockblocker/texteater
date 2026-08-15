import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { resolvedAphorism } from "./builders";

export const resolvedCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-aphorism-alt-werden": {
			...resolvedAphorism({
				attested: "„Alt werden, heißt sehend werden.“",
			}),
			contaminationKeys: [
				"de-aphorism-lemma:alt-werden-heisst-sehend-werden",
			],
			explanation:
				"Every lexical member is selected; quotation marks, comma, and full stop are punctuation rather than Phraseme members.",
		},
		"grammar-de-aphorism-typo-hoert": {
			...resolvedAphorism({
				attested: "Wo die Eitelkeit anfängt, höhrt der Verstand auf.",
				normalized: "Wo die Eitelkeit anfängt hört der Verstand auf",
				canonical: "Wo die Eitelkeit anfängt hört der Verstand auf",
				typoMemberIndices: [4],
			}),
			contaminationKeys: [
				"de-aphorism-lemma:wo-die-eitelkeit-anfaengt-hoert-der-verstand-auf",
			],
			explanation:
				"The one misspelled member is repaired in the normalized Surface and marked Typo; punctuation remains outside membership.",
		},
		"grammar-de-aphorism-historical-muss": {
			...resolvedAphorism({
				attested: "Wer nichts weiß, muß alles glauben.",
				canonical: "Wer nichts weiß muss alles glauben",
				spelling: "Variant",
			}),
			contaminationKeys: [
				"de-aphorism-lemma:wer-nichts-weiss-muss-alles-glauben",
			],
			explanation:
				"The attested 1893 muß is a licensed historical spelling, not a typo; the Canonical Form uses current muss.",
		},
		"grammar-de-aphorism-nachahmer": {
			...resolvedAphorism({
				attested: "Die meisten Nachahmer lockt das Unnachahmliche.",
				prefix: "Ebner-Eschenbach schrieb: „",
				suffix: "“",
			}),
			contaminationKeys: ["de-aphorism-lemma:die-meisten-nachahmer"],
		},
		"grammar-de-aphorism-nachsicht": {
			...resolvedAphorism({
				attested:
					"Die meiste Nachsicht übt der, der die wenigste braucht.",
			}),
			contaminationKeys: ["de-aphorism-lemma:die-meiste-nachsicht"],
		},
		"grammar-de-aphorism-kindheit": {
			...resolvedAphorism({
				attested:
					"Wer sich seiner eigenen Kindheit nicht mehr deutlich erinnert, ist ein schlechter Erzieher.",
			}),
			contaminationKeys: ["de-aphorism-lemma:wer-sich-seiner-kindheit"],
		},
		"grammar-de-aphorism-alter": {
			...resolvedAphorism({
				attested: "Das Alter verklärt oder versteinert.",
				markedContext:
					"Im Lektorat stand erst „Das Alter verklärt oder versteinert“; später wiederholte sie: „<TARGET>Das</TARGET> <TARGET>Alter</TARGET> <TARGET>verklärt</TARGET> <TARGET>oder</TARGET> <TARGET>versteinert</TARGET>.“",
			}),
			contaminationKeys: ["de-aphorism-lemma:das-alter-verklaert"],
		},
		"grammar-de-aphorism-jugend": {
			...resolvedAphorism({
				attested: "In der Jugend lernt, im Alter versteht man.",
			}),
			contaminationKeys: ["de-aphorism-lemma:in-der-jugend-lernt"],
		},
		"grammar-de-aphorism-tadel": {
			...resolvedAphorism({
				attested:
					"Unbegründeter Tadel ist manchmal eine feine Form der Schmeichelei.",
			}),
			contaminationKeys: ["de-aphorism-lemma:unbegruendeter-tadel"],
		},
		"grammar-de-aphorism-liebe-rechte": {
			...resolvedAphorism({
				attested:
					"Die Liebe hat nicht nur Rechte, sie hat auch immer recht.",
				prefix: "Neben dem Werbeslogan „Liebe lohnt sich“ stand der Aphorismus: „",
				suffix: "“",
			}),
			contaminationKeys: ["de-aphorism-lemma:die-liebe-hat-rechte"],
		},
		"grammar-de-aphorism-gegenwart": {
			...resolvedAphorism({
				attested:
					"Nur was für die Gegenwart zu gut ist, ist gut genug für die Zukunft.",
				prefix: "Nachdem sie die Redewendung „den Nagel auf den Kopf treffen“ erklärt hatte, zitierte sie: „",
				suffix: "“",
			}),
			contaminationKeys: ["de-aphorism-lemma:nur-was-fuer-die-gegenwart"],
		},
		"grammar-de-aphorism-streiten": {
			...resolvedAphorism({
				attested:
					"Nicht jene, die streiten, sind zu fürchten, sondern jene, die ausweichen.",
				prefix: "Nach dem Grammatikbeispiel „eine Entscheidung treffen“ folgte: „",
				suffix: "“",
			}),
			contaminationKeys: ["de-aphorism-lemma:nicht-jene-die-streiten"],
		},
		"grammar-de-aphorism-unbezahlbar": {
			...resolvedAphorism({
				attested: "Man kann viele Dinge kaufen, die unbezahlbar sind.",
				prefix: "Die Protokollnotiz „Die Sitzung endet um fünf“ war nur episodisch; danach zitierte sie: „",
				suffix: "“",
			}),
			contaminationKeys: [
				"de-aphorism-lemma:man-kann-viele-dinge-kaufen",
			],
		},
		"grammar-de-aphorism-grundsaetze": {
			...resolvedAphorism({
				attested:
					"Wenn zwei brave Menschen über Grundsätze streiten, haben immer beide recht.",
				prefix: "Anders als das Sprichwort „Morgenstund hat Gold im Mund“ ist dies ein zugeschriebener Aphorismus: „",
				suffix: "“",
			}),
			contaminationKeys: ["de-aphorism-lemma:wenn-zwei-brave-menschen"],
		},
		"grammar-de-aphorism-casing-menschen": {
			...resolvedAphorism({
				attested:
					"die Menschen, denen wir eine Stütze sind, die geben uns den Halt im Leben.",
				normalized:
					"Die Menschen denen wir eine Stütze sind die geben uns den Halt im Leben",
				canonical:
					"Die Menschen denen wir eine Stütze sind die geben uns den Halt im Leben",
				typoMemberIndices: [0],
			}),
			contaminationKeys: [
				"de-aphorism-lemma:die-menschen-denen-wir-eine-stuetze-sind",
			],
			explanation:
				"Lowercase at the beginning of the complete maxim is inappropriate casing, so that member is Typo and normalized to Die.",
		},
		"grammar-de-aphorism-aphorismus-ring": {
			...resolvedAphorism({
				attested:
					"Ein Aphorismus ist der letzte Ring einer langen Gedankenkette.",
			}),
			contaminationKeys: [
				"de-aphorism-lemma:ein-aphorismus-ist-der-letzte-ring",
			],
		},
		"grammar-de-aphorism-selbstverstaendlich": {
			...resolvedAphorism({
				attested:
					"Sag etwas, das sich von selbst versteht, zum ersten Mal, und du bist unsterblich.",
			}),
			contaminationKeys: [
				"de-aphorism-lemma:sag-etwas-das-sich-von-selbst-versteht",
			],
		},
		"grammar-de-aphorism-sichtbare-schoenheit": {
			...resolvedAphorism({
				attested:
					"Was uns an der sichtbaren Schönheit entzückt, ist ewig nur die unsichtbare.",
			}),
			contaminationKeys: [
				"de-aphorism-lemma:was-uns-an-der-sichtbaren-schoenheit",
			],
		},
		"grammar-de-aphorism-verstehen-partial": {
			...resolvedAphorism({
				attested: "Die verstehen sehr wenig",
				canonical:
					"Die verstehen sehr wenig die nur das verstehen was sich erklären lässt",
				realizationCoverage: "Partial",
				prefix: "Im Seminar zitierte sie verkürzt: „",
				suffix: " …“.",
			}),
			explanation:
				"Quote stops at ellipsis. Missing tail not overt. Full source known.",
			contaminationKeys: ["de-aphorism-lemma:die-verstehen-sehr-wenig"],
		},
		"grammar-de-aphorism-vertrauen-discontinuous": {
			...resolvedAphorism({
				attested: "Vertrauen ist Mut und Treue ist Kraft",
				markedContext:
					"„<TARGET>Vertrauen</TARGET>“, schrieb sie, „<TARGET>ist</TARGET> <TARGET>Mut</TARGET>, <TARGET>und</TARGET> <TARGET>Treue</TARGET> <TARGET>ist</TARGET> <TARGET>Kraft</TARGET>.“",
			}),
			explanation:
				"Split quotation. Attribution free. Target words keep source order.",
			contaminationKeys: ["de-aphorism-lemma:vertrauen-ist-mut"],
		},
		"grammar-de-aphorism-geduld-streitsucht": {
			...resolvedAphorism({
				attested:
					"Geduld mit der Streitsucht der Einfältigen! Es ist nicht leicht zu begreifen, dass man nicht begreift.",
			}),
			contaminationKeys: ["de-aphorism-lemma:geduld-mit-der-streitsucht"],
		},
		"grammar-de-aphorism-weise-gut": {
			...resolvedAphorism({
				attested: "Wie weise muss man sein, um immer gut zu sein!",
			}),
			contaminationKeys: ["de-aphorism-lemma:wie-weise-muss-man-sein"],
		},
		"grammar-de-aphorism-warten": {
			...resolvedAphorism({
				attested:
					"Warten lernen wir gewöhnlich erst, wenn wir nichts mehr zu erwarten haben.",
			}),
			contaminationKeys: ["de-aphorism-lemma:warten-lernen-wir"],
		},
		"grammar-de-aphorism-leidenschaft": {
			...resolvedAphorism({
				attested:
					"Die Leidenschaft ist immer ein Leiden, auch die befriedigte.",
			}),
			contaminationKeys: ["de-aphorism-lemma:die-leidenschaft-ist-immer"],
		},
		"grammar-de-aphorism-gebrannte-kinder": {
			...resolvedAphorism({
				attested:
					"Gebrannte Kinder fürchten das Feuer oder vernarren sich darein.",
			}),
			contaminationKeys: ["de-aphorism-lemma:gebrannte-kinder-fuerchten"],
		},
		"grammar-de-aphorism-mitleid-neglige": {
			...resolvedAphorism({ attested: "Mitleid ist Liebe im Négligé." }),
			contaminationKeys: ["de-aphorism-lemma:mitleid-ist-liebe"],
		},
		"grammar-de-aphorism-arme-reiche": {
			...resolvedAphorism({
				attested:
					"Der Arme rechnet dem Reichen die Großmut niemals als Tugend an.",
			}),
			contaminationKeys: [
				"de-aphorism-lemma:der-arme-rechnet-dem-reichen",
			],
		},
		"grammar-de-aphorism-widerspruch-partial": {
			...resolvedAphorism({
				attested:
					"Die Leute denen man nie widerspricht sind entweder die",
				canonical:
					"Die Leute denen man nie widerspricht sind entweder die welche man am meisten liebt oder die welche man am geringsten achtet",
				realizationCoverage: "Partial",
				prefix: "Die Ausgabe kürzt mit Auslassungszeichen: „",
				suffix: " …“.",
			}),
			explanation:
				"Quote stops at ellipsis. Missing tail not overt. Full source known.",
			contaminationKeys: [
				"de-aphorism-lemma:die-leute-denen-man-nie-widerspricht",
			],
		},
		"grammar-de-aphorism-huete-dich": {
			...resolvedAphorism({
				attested:
					"Hüte dich vor der Tugend, die zu besitzen ein Mensch von sich selber rühmt.",
			}),
			contaminationKeys: ["de-aphorism-lemma:huete-dich-vor-der-tugend"],
		},
		"grammar-de-aphorism-alten-lesen": {
			...resolvedAphorism({
				attested:
					"Wenn man nur die Alten liest, ist man sicher, immer neu zu bleiben.",
			}),
			contaminationKeys: [
				"de-aphorism-lemma:wenn-man-nur-die-alten-liest",
			],
		},
		"grammar-de-aphorism-kunst-tempel-partial": {
			...resolvedAphorism({
				attested: "Wenn der Kunst kein Tempel mehr offen steht",
				canonical:
					"Wenn der Kunst kein Tempel mehr offen steht dann flüchtet sie in die Werkstatt",
				realizationCoverage: "Partial",
				prefix: "Auf der Karte war nur der Anfang gedruckt: „",
				suffix: " …“.",
			}),
			explanation:
				"Quote stops at ellipsis. Missing tail not overt. Full source known.",
			contaminationKeys: ["de-aphorism-lemma:wenn-der-kunst-kein-tempel"],
		},
		"grammar-de-aphorism-guete-grenzenlos": {
			...resolvedAphorism({
				attested:
					"Die Güte, die nicht grenzenlos ist, verdient den Namen nicht.",
			}),
			contaminationKeys: [
				"de-aphorism-lemma:die-guete-die-nicht-grenzenlos-ist",
			],
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
