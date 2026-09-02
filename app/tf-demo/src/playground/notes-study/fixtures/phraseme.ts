import { type NoteStudyFixture, noteToken } from "../note-study-fixture";

export const phrasemeFixtures = [
	{
		slug: "Der-Weg-ist-das-Ziel",
		family: "Phraseme",
		kind: "Aphorism",
		emoji: "🧭",
		title: [
			noteToken("Der Weg", "masculine", "maskuline Nominalgruppe"),
			" ",
			noteToken("ist", "reference", "Kopulaverb"),
			" ",
			noteToken("das Ziel", "neuter", "neutrale Nominalgruppe"),
		],
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
			{
				relation: "hypernym",
				label: "Oberbegriff",
				mark: "↑",
				content: [
					noteToken("Lebensweisheit", "feminine", "feminines Nomen"),
				],
			},
		],
		formation: [
			[
				"Illustrative Strukturprobe (nicht produktiv): ",
				noteToken("Der Weg", "masculine", "maskuline Nominalgruppe"),
				" + ",
				noteToken("ist", "reference", "Kopulaverb"),
				" + ",
				noteToken("das Ziel", "neuter", "neutrale Nominalgruppe"),
			],
		],
		translations: [
			"English: The journey is the destination.",
			"Русский: Путь — это цель.",
		],
		forms: [
			{
				label: "Festform",
				content: [
					noteToken(
						"Der Weg ist das Ziel",
						"reference",
						"unveränderlicher Aphorismus",
					),
				],
			},
		],
		tags: [
			noteToken("#Phraseme", "reference", "Familie"),
			noteToken("#Aphorismus", "reference", "Art"),
			noteToken("#Festform", "reference", "Gebrauch"),
		],
	},
	{
		slug: "Eine-Entscheidung-treffen",
		family: "Phraseme",
		kind: "Collocation",
		emoji: "✅",
		title: [
			noteToken(
				"eine Entscheidung",
				"feminine",
				"Akkusativobjekt mit femininem Nomen",
			),
			" ",
			noteToken("treffen", "reference", "Verb"),
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
		formation: [
			[
				noteToken(
					"eine Entscheidung",
					"feminine",
					"fest gewähltes Akkusativobjekt",
				),
				" + ",
				noteToken("treffen", "reference", "regulär flektierbares Verb"),
			],
			[
				"Die Grammatik ist produktiv, die Wortwahl jedoch gebunden: gewöhnlich nicht ",
				noteToken(
					"eine Entscheidung machen",
					"reference",
					"unübliche Kombination",
				),
				".",
			],
		],
		translations: [
			"English: to make a decision",
			"Русский: принять решение",
		],
		forms: [
			{
				label: "Infinitiv",
				content: [
					noteToken(
						"eine Entscheidung treffen",
						"reference",
						"Infinitiv",
					),
				],
			},
			{
				label: "Präsens",
				content: [
					"ich ",
					noteToken(
						"treffe eine Entscheidung",
						"reference",
						"1. Person Singular Präsens",
					),
				],
			},
			{
				label: "Präteritum",
				content: [
					"ich ",
					noteToken(
						"traf eine Entscheidung",
						"reference",
						"1. Person Singular Präteritum",
					),
				],
			},
			{
				label: "Perfekt",
				content: [
					"ich ",
					noteToken(
						"habe eine Entscheidung getroffen",
						"reference",
						"1. Person Singular Perfekt",
					),
				],
			},
		],
		tags: [
			noteToken("#Phraseme", "reference", "Familie"),
			noteToken("#Kollokation", "reference", "Art"),
			noteToken("#Verbalflexion", "reference", "Formen"),
		],
	},
	{
		slug: "Wie-dem-auch-sei",
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
			{
				relation: "hypernym",
				label: "Oberbegriff",
				mark: "↑",
				content: [
					noteToken("Gesprächsformel", "feminine", "feminines Nomen"),
				],
			},
		],
		formation: [
			[
				"Illustrative Strukturprobe (nicht produktiv): ",
				noteToken("wie", "reference", "einleitendes Adverb"),
				" + ",
				noteToken("dem", "reference", "Pronomen im Dativ"),
				" + ",
				noteToken("auch", "reference", "Partikel"),
				" + ",
				noteToken("sei", "reference", "Konjunktiv I von sein"),
			],
		],
		translations: [
			"English: Be that as it may; anyway.",
			"Русский: Как бы то ни было; в любом случае.",
		],
		forms: [
			{
				label: "Festform",
				content: [
					noteToken(
						"Wie dem auch sei",
						"reference",
						"unveränderliche Diskursformel",
					),
				],
			},
		],
		tags: [
			noteToken("#Phraseme", "reference", "Familie"),
			noteToken("#Diskursformel", "reference", "Art"),
			noteToken("#Übergang", "reference", "Gesprächsfunktion"),
		],
	},
	{
		slug: "Tomaten-auf-den-Augen-haben",
		family: "Phraseme",
		kind: "Idiom",
		emoji: "🍅",
		title: [
			noteToken("Tomaten", "plural", "Nomen im Plural"),
			" ",
			noteToken("auf den", "reference", "feste Präposition mit Artikel"),
			" ",
			noteToken("Augen", "plural", "Nomen im Plural"),
			" ",
			noteToken("haben", "reference", "flektierbares Verb"),
		],
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
			{
				relation: "hypernym",
				label: "Oberbegriff",
				mark: "↑",
				content: [
					noteToken(
						"etwas übersehen",
						"reference",
						"Verb mit Akkusativobjekt",
					),
				],
			},
		],
		formation: [
			[
				"Fester idiomatischer Kern: ",
				noteToken("Tomaten", "plural", "festes Nomen im Plural"),
				" + ",
				noteToken(
					"auf den Augen",
					"plural",
					"feste Präpositionalgruppe mit pluralischem Nomen",
				),
				" + ",
				noteToken("haben", "reference", "regulär flektierbares Verb"),
			],
		],
		translations: [
			"English: to be blind to the obvious",
			"Русский: не видеть очевидного; словно глаза не видят",
		],
		forms: [
			{
				label: "Infinitiv",
				content: [
					noteToken(
						"Tomaten auf den Augen haben",
						"reference",
						"Infinitiv",
					),
				],
			},
			{
				label: "Präsens",
				content: [
					"ich ",
					noteToken(
						"habe Tomaten auf den Augen",
						"reference",
						"1. Person Singular Präsens",
					),
				],
			},
			{
				label: "Präteritum",
				content: [
					"ich ",
					noteToken(
						"hatte Tomaten auf den Augen",
						"reference",
						"1. Person Singular Präteritum",
					),
				],
			},
			{
				label: "Perfekt",
				content: [
					"ich ",
					noteToken(
						"habe Tomaten auf den Augen gehabt",
						"reference",
						"1. Person Singular Perfekt",
					),
				],
			},
		],
		tags: [
			noteToken("#Phraseme", "reference", "Familie"),
			noteToken("#Idiom", "reference", "Art"),
			noteToken("#Umgangssprache", "reference", "Register"),
		],
	},
	{
		slug: "Morgenstund-hat-Gold-im-Mund",
		family: "Phraseme",
		kind: "Proverb",
		emoji: "🌅",
		title: [
			noteToken(
				"Morgenstund",
				"feminine",
				"feminines Nomen, dichterische Kurzform",
			),
			" ",
			noteToken("hat", "reference", "Verb"),
			" ",
			noteToken("Gold", "neuter", "neutrales Nomen"),
			" ",
			noteToken(
				"im Mund",
				"masculine",
				"Präpositionalgruppe mit maskulinem Nomen",
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
			{
				relation: "hypernym",
				label: "Oberbegriff",
				mark: "↑",
				content: [
					noteToken("Lebensweisheit", "feminine", "feminines Nomen"),
				],
			},
		],
		formation: [
			[
				"Illustrative Strukturprobe (nicht produktiv): ",
				noteToken(
					"Morgenstund",
					"feminine",
					"dichterische Kurzform von Morgenstunde",
				),
				" + ",
				noteToken("hat", "reference", "Verb"),
				" + ",
				noteToken("Gold", "neuter", "Akkusativobjekt"),
				" + ",
				noteToken("im Mund", "masculine", "lokale Ergänzung"),
			],
		],
		translations: [
			"English: The early bird catches the worm.",
			"Русский: Кто рано встаёт, тому Бог подаёт.",
		],
		forms: [
			{
				label: "Festform",
				content: [
					noteToken(
						"Morgenstund hat Gold im Mund",
						"reference",
						"unveränderliches Sprichwort",
					),
				],
			},
		],
		tags: [
			noteToken("#Phraseme", "reference", "Familie"),
			noteToken("#Sprichwort", "reference", "Art"),
			noteToken("#Festform", "reference", "Gebrauch"),
		],
	},
] as const satisfies readonly NoteStudyFixture[];
