import { type NoteStudyFixture, noteToken } from "../note-study-fixture";

export const phrasemeFixtures = [
	{
		presentationKey: "Der-Weg-ist-das-Ziel",
		family: "Phraseme",
		kind: "Aphorism",
		emoji: "🧭",
		title: [noteToken("Der Weg ist das Ziel", "reference", "Aphorismus")],
		titleText: "Der Weg ist das Ziel",
		summary: "Leitsatz über den Wert des Weges zum Ziel.",
		contexts: [
			[
				"Als der Aufstieg anstrengender wurde, sagte die Wanderführerin: „",
				noteToken("Der Weg ist das Ziel", "reference", "Aphorismus"),
				".“",
			],
			[
				"Das Projekt brachte nicht den erhofften Preis, aber wir hatten viel gelernt — ",
				noteToken(
					"der Weg ist das Ziel",
					"reference",
					"Aphorismus in den Satz eingebettet",
				),
				".",
			],
		],
		definition:
			"Ein fester, nicht produktiv gebildeter Leitsatz: Nicht nur das Ergebnis, sondern auch der Weg dorthin ist wertvoll.",
		relations: [
			{
				relation: "nearSynonym",
				label: "Naher Sinn",
				mark: "≈",
				content: [
					noteToken(
						"Der Weg ist wichtiger als das Ziel",
						"shadow",
						"Unit Shadow, sinngleicher Leitsatz",
					),
				],
			},
			{
				relation: "nearAntonym",
				label: "Gegensätzlicher Leitsatz",
				mark: "≉",
				content: [
					noteToken(
						"Der Zweck heiligt die Mittel",
						"reference",
						"Aphorismus",
					),
				],
			},
		],
		structure: [
			[
				noteToken("Der", "reference", "bestimmter Artikel"),
				" ",
				noteToken("Weg", "masculine", "maskulines Nomen"),
				" ",
				noteToken("ist", "reference", "Kopulaverb"),
				" ",
				noteToken("das", "reference", "bestimmter Artikel"),
				" ",
				noteToken("Ziel", "neuter", "neutrales Nomen"),
			],
		],
		translations: ["The journey is the destination.", "Путь — это цель."],
		tags: [
			noteToken("#Phraseme", "reference", "Familie"),
			noteToken("#Aphorismus", "reference", "Art"),
			noteToken("#Festform", "reference", "Gebrauch"),
		],
	},
	{
		presentationKey: "Eine-Entscheidung-treffen",
		family: "Phraseme",
		kind: "Collocation",
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
						"sich entscheiden",
						"reference",
						"reflexives Verb",
					),
					", ",
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
			noteToken("#Phraseme", "reference", "Familie"),
			noteToken("#Kollokation", "reference", "Art"),
		],
	},
	{
		presentationKey: "Wie-dem-auch-sei",
		family: "Phraseme",
		kind: "DiscourseFormula",
		emoji: "↪️",
		title: [noteToken("Wie dem auch sei", "reference", "Diskursformel")],
		titleText: "Wie dem auch sei",
		summary:
			"Formel zum Beenden eines Einwands und Fortführen des Gesprächs.",
		contexts: [
			[
				noteToken(
					"Wie dem auch sei",
					"reference",
					"Diskursformel am Satzanfang",
				),
				", wir müssen den Bericht heute noch abschicken.",
			],
			[
				"Vielleicht war die Absage ein Missverständnis. ",
				noteToken(
					"Wie dem auch sei",
					"reference",
					"Diskursformel als Übergang",
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
					noteToken("wie auch immer", "reference", "Diskursformel"),
				],
			},
			{
				relation: "nearSynonym",
				label: "Nahes Synonym",
				mark: "≈",
				content: [
					noteToken("jedenfalls", "reference", "Satzadverb"),
					", ",
					noteToken(
						"sei's drum",
						"shadow",
						"Unit Shadow, umgangssprachliche Diskursformel",
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
			noteToken("#Phraseme", "reference", "Familie"),
			noteToken("#Diskursformel", "reference", "Art"),
			noteToken("#Übergang", "reference", "Gesprächsfunktion"),
		],
	},
	{
		presentationKey: "Tomaten-auf-den-Augen-haben",
		family: "Phraseme",
		kind: "Idiom",
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
					", ",
					noteToken("etwas glatt übersehen", "reference", "Wendung"),
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
			noteToken("#Phraseme", "reference", "Familie"),
			noteToken("#Idiom", "reference", "Art"),
			noteToken("#Umgangssprache", "reference", "Register"),
		],
	},
	{
		presentationKey: "Morgenstund-hat-Gold-im-Mund",
		family: "Phraseme",
		kind: "Proverb",
		emoji: "🌅",
		title: [
			noteToken(
				"Morgenstund hat Gold im Mund",
				"reference",
				"Sprichwort",
			),
		],
		titleText: "Morgenstund hat Gold im Mund",
		summary: "Sprichwort über die Vorteile eines frühen Anfangs.",
		contexts: [
			[
				"Als wir noch vor Sonnenaufgang losfuhren, sagte meine Großmutter: „",
				noteToken(
					"Morgenstund hat Gold im Mund",
					"reference",
					"Sprichwort",
				),
				".“",
			],
			[
				"Die Bäckerin beginnt um vier Uhr mit der Arbeit; für sie gilt wirklich: ",
				noteToken(
					"Morgenstund hat Gold im Mund",
					"reference",
					"Sprichwort als Kommentar",
				),
				".",
			],
		],
		definition:
			"Ein festes, nicht produktiv gebildetes Sprichwort: Wer früh beginnt, hat oft einen Vorteil oder schafft besonders viel.",
		relations: [
			{
				relation: "nearSynonym",
				label: "Verwandtes Sprichwort",
				mark: "≈",
				content: [
					noteToken(
						"Der frühe Vogel fängt den Wurm",
						"reference",
						"Sprichwort",
					),
				],
			},
			{
				relation: "nearAntonym",
				label: "Gegensätzliche Perspektive",
				mark: "≉",
				content: [
					noteToken(
						"Gut Ding will Weile haben",
						"reference",
						"Sprichwort",
					),
				],
			},
		],
		structure: [
			[
				noteToken(
					"Morgenstund",
					"feminine",
					"dichterische Kurzform von Morgenstunde",
				),
				" ",
				noteToken("hat", "reference", "Verb"),
				" ",
				noteToken("Gold", "neuter", "Akkusativobjekt"),
				" ",
				noteToken("im", "reference", "Präposition mit Artikel"),
				" ",
				noteToken("Mund", "masculine", "maskulines Nomen"),
			],
		],
		translations: [
			"The morning hour has gold in its mouth.",
			"Утренний час — с золотом во рту.",
		],
		translatedExplanations: [
			"The early bird catches the worm.",
			"Кто рано встаёт, тому Бог подаёт.",
		],
		tags: [
			noteToken("#Phraseme", "reference", "Familie"),
			noteToken("#Sprichwort", "reference", "Art"),
			noteToken("#Festform", "reference", "Gebrauch"),
		],
	},
] as const satisfies readonly NoteStudyFixture[];
