import { type NoteStudyFixture, noteToken } from "../note-study-fixture";

export const sayingFixtures = [
	{
		presentationKey: "Der-Weg-ist-das-Ziel",
		family: "Saying",
		kind: "Saying",
		emoji: "🧭",
		title: [noteToken("Der Weg ist das Ziel", "reference", "Spruch")],
		titleText: "Der Weg ist das Ziel",
		summary: "Leitsatz über den Wert des Weges zum Ziel.",
		contexts: [
			[
				"Als der Aufstieg anstrengender wurde, sagte die Wanderführerin: „",
				noteToken("Der Weg ist das Ziel", "reference", "Spruch"),
				".“",
			],
			[
				"Das Projekt brachte nicht den erhofften Preis, aber wir hatten viel gelernt — ",
				noteToken(
					"der Weg ist das Ziel",
					"reference",
					"Spruch in den Satz eingebettet",
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
						"Unit Shadow, sinngleicher Spruch",
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
						"Spruch",
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
			noteToken("#Saying", "reference", "Familie"),
			noteToken("#Festform", "reference", "Gebrauch"),
		],
	},
	{
		presentationKey: "Morgenstund-hat-Gold-im-Mund",
		family: "Saying",
		kind: "Saying",
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
			noteToken("#Saying", "reference", "Familie"),
			noteToken("#Sprichwort", "reference", "Saying-Typ"),
			noteToken("#Festform", "reference", "Gebrauch"),
		],
	},
] as const satisfies readonly NoteStudyFixture[];
