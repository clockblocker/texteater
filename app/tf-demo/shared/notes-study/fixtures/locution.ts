import { type NoteStudyFixture, noteToken } from "../note-study-fixture";

export const locutionFixtures = [
	{
		presentationKey: "Eine-Entscheidung-treffen",
		family: "Locution",
		kind: "VERB",
		emoji: "✅",
		title: [
			noteToken("eine Entscheidung treffen", "reference", "Kollokation"),
		],
		titleText: "eine Entscheidung treffen",
		summary: "Übliche Verbindung für das Festlegen einer Wahl.",
		contexts: [
			[
				"Nach drei Stunden Beratung ",
				noteToken(
					"traf der Stadtrat eine Entscheidung",
					"reference",
					"flektierte Kollokation",
				),
				" über den neuen Standort.",
			],
			[
				"Ich muss bis Freitag ",
				noteToken(
					"eine Entscheidung treffen",
					"reference",
					"Kollokation im Infinitiv",
				),
				", sonst verfällt das Angebot.",
			],
		],
		definition:
			"Eine feste Wortverbindung mit der Bedeutung „sich nach Abwägung für eine Möglichkeit entscheiden“; das Verb wird regulär flektiert.",
		relations: [
			{
				relation: "synonym",
				label: "Synonym",
				mark: "=",
				content: [
					noteToken(
						"eine Entscheidung fällen",
						"reference",
						"Kollokation",
					),
				],
			},
			{
				relation: "nearSynonym",
				label: "Nahes Synonym",
				mark: "≈",
				content: [
					noteToken(
						"zu einem Entschluss kommen",
						"shadow",
						"Unit Shadow, verwandte Wendung",
					),
				],
			},
			{
				relation: "nearAntonym",
				label: "Nahes Antonym",
				mark: "≉",
				content: [
					noteToken(
						"eine Entscheidung aufschieben",
						"reference",
						"Kollokation",
					),
				],
			},
		],
		structure: [
			[
				noteToken("eine", "feminine", "unbestimmter Artikel"),
				" ",
				noteToken("Entscheidung", "feminine", "Akkusativobjekt"),
				" ",
				noteToken("treffen", "reference", "regulär flektierbares Verb"),
			],
		],
		translations: ["to make a decision", "принять решение"],
		tags: [
			noteToken("#Locution", "reference", "Familie"),
			noteToken("#Verb", "reference", "Art"),
			noteToken("#Kollokation", "reference", "Locution-Typ"),
		],
	},
	{
		presentationKey: "Wie-dem-auch-sei",
		family: "Locution",
		kind: "ADV",
		emoji: "↪️",
		title: [
			noteToken(
				"wie dem auch sei",
				"reference",
				"feste adverbiale Wendung",
			),
		],
		titleText: "wie dem auch sei",
		summary:
			"Formel zum Beenden eines Einwands und Fortführen des Gesprächs.",
		contexts: [
			[
				noteToken(
					"Wie dem auch sei",
					"reference",
					"feste Wendung am Satzanfang",
				),
				", wir müssen den Bericht heute noch abschicken.",
			],
			[
				"Vielleicht war die Absage ein Missverständnis. ",
				noteToken(
					"Wie dem auch sei",
					"reference",
					"feste Wendung als Übergang",
				),
				", morgen rufe ich dort noch einmal an.",
			],
		],
		definition:
			"Eine feste, nicht produktiv veränderte Gesprächsformel: Das Vorherige bleibt offen oder ist nun nebensächlich, und man kehrt zum Hauptpunkt zurück.",
		relations: [
			{
				relation: "synonym",
				label: "Synonym",
				mark: "=",
				content: [
					noteToken("wie auch immer", "reference", "feste Wendung"),
				],
			},
			{
				relation: "nearSynonym",
				label: "Nahes Synonym",
				mark: "≈",
				content: [
					noteToken(
						"sei's drum",
						"shadow",
						"Unit Shadow, umgangssprachliche feste Wendung",
					),
				],
			},
		],
		structure: [
			[
				noteToken("wie", "reference", "einleitendes Adverb"),
				" ",
				noteToken("dem", "reference", "Pronomen im Dativ"),
				" ",
				noteToken("auch", "reference", "Partikel"),
				" ",
				noteToken("sei", "reference", "Konjunktiv I von sein"),
			],
		],
		translations: [
			"Be that as it may; anyway.",
			"Как бы то ни было; в любом случае.",
		],
		tags: [
			noteToken("#Locution", "reference", "Familie"),
			noteToken("#Adverb", "reference", "Art"),
			noteToken("#Übergang", "reference", "Gesprächsfunktion"),
		],
	},
	{
		presentationKey: "Tomaten-auf-den-Augen-haben",
		family: "Locution",
		kind: "VERB",
		emoji: "🍅",
		title: [noteToken("Tomaten auf den Augen haben", "reference", "Idiom")],
		titleText: "Tomaten auf den Augen haben",
		summary:
			"Etwas deutlich Sichtbares oder Offensichtliches nicht bemerken.",
		contexts: [
			[
				"Der Schlüssel liegt direkt vor dir — hast du ",
				noteToken(
					"Tomaten auf den Augen",
					"reference",
					"Idiom in einer Frage",
				),
				"?",
			],
			[
				"Der Tippfehler stand mitten in der Überschrift, aber ich ",
				noteToken(
					"hatte Tomaten auf den Augen",
					"reference",
					"Idiom im Präteritum",
				),
				" und las dreimal darüber hinweg.",
			],
		],
		definition:
			"Ein umgangssprachliches Idiom: Jemand sieht oder erkennt etwas Offensichtliches nicht; nur das Verb wird regulär flektiert.",
		relations: [
			{
				relation: "nearSynonym",
				label: "Nahes Synonym",
				mark: "≈",
				content: [
					noteToken(
						"den Wald vor lauter Bäumen nicht sehen",
						"reference",
						"Idiom",
					),
				],
			},
			{
				relation: "nearAntonym",
				label: "Nahes Antonym",
				mark: "≉",
				content: [
					noteToken("den Durchblick haben", "reference", "Idiom"),
				],
			},
		],
		structure: [
			[
				noteToken("Tomaten", "plural", "festes Nomen im Plural"),
				" ",
				noteToken("auf", "reference", "Präposition"),
				" ",
				noteToken("den", "reference", "bestimmter Artikel"),
				" ",
				noteToken("Augen", "plural", "Nomen im Plural"),
				" ",
				noteToken("haben", "reference", "regulär flektierbares Verb"),
			],
		],
		translations: [
			"to have tomatoes on one’s eyes",
			"иметь помидоры на глазах",
		],
		translatedExplanations: [
			"to be blind to the obvious",
			"не видеть очевидного; словно глаза не видят",
		],
		tags: [
			noteToken("#Locution", "reference", "Familie"),
			noteToken("#Verb", "reference", "Art"),
			noteToken("#Idiom", "reference", "Locution-Typ"),
			noteToken("#Umgangssprache", "reference", "Register"),
		],
	},
] as const satisfies readonly NoteStudyFixture[];
