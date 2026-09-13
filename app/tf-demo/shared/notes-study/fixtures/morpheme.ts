import { type NoteStudyFixture, noteToken } from "../note-study-fixture";

export const morphemeFixtures = [
	{
		presentationKey: "Ge-t",
		family: "Morpheme",
		kind: "Circumfix",
		emoji: "🧲",
		title: [noteToken("ge-…-t")],
		titleText: "ge-…-t",
		summary: "Partiziprahmen für viele schwache Verben",
		contexts: [
			[
				"Nach dem Kurs haben wir noch eine Stunde ",
				noteToken("gelernt"),
				".",
			],
			[
				"Nach dem Essen haben wir noch eine Runde ",
				noteToken("gespielt"),
				".",
			],
		],
		definition:
			"Das diskontinuierliche Morphem ge-…-t bildet bei vielen schwachen Verben das Partizip II: lernen → gelernt.",
		formation: [
			[
				noteToken("lern", "reference", "Verbstamm"),
				" → ",
				noteToken("ge"),
				"|",
				noteToken("lern", "reference", "Verbstamm"),
				"|",
				noteToken("t"),
			],
			[
				noteToken("spiel", "reference", "Verbstamm"),
				" → ",
				noteToken("ge"),
				"|",
				noteToken("spiel", "reference", "Verbstamm"),
				"|",
				noteToken("t"),
			],
		],
		translations: [
			"past-participle circumfix for many weak verbs",
			"циркумфикс причастия II многих слабых глаголов",
		],
		tags: [noteToken("#Morphem"), noteToken("#PartizipII")],
	},
	{
		presentationKey: "Clitic-s",
		family: "Morpheme",
		kind: "Clitic",
		emoji: "🔗",
		title: [noteToken("’s")],
		titleText: "’s",
		summary: "Unbetonte Kurzform von es",
		contexts: [
			[
				"Wie geht",
				noteToken("’s", "reference", "Kurzform von „es“"),
				" dir nach der Prüfung?",
			],
			[
				"Ich hab",
				noteToken("’s", "reference", "Kurzform von „es“"),
				" gleich verstanden.",
			],
		],
		definition:
			"’s ist die unbetonte, angehängte Kurzform von es; der Apostroph zeigt die Auslassung des e.",
		formation: [
			[
				noteToken("geht"),
				" + ",
				noteToken("es"),
				" → ",
				noteToken("geht’s"),
			],
			[
				noteToken("hab"),
				" + ",
				noteToken("es"),
				" → ",
				noteToken("hab’s"),
			],
		],
		translations: [
			"’s; unstressed clitic form of it",
			"’s; безударная клитическая форма es",
		],
		tags: [noteToken("#Morphem"), noteToken("#Klitikon")],
	},
	{
		presentationKey: "Fugen-s",
		family: "Morpheme",
		kind: "Interfix",
		emoji: "🌉",
		title: [noteToken("-s-")],
		titleText: "-s-",
		summary: "Verbindungselement in deutschen Komposita",
		contexts: [
			["Die ", noteToken("Geburtsurkunde"), " liegt noch im Standesamt."],
			[
				"Im ",
				noteToken("Arbeitszimmer"),
				" ist es am Nachmittag angenehm ruhig.",
			],
		],
		definition:
			"Das Fugen-s verbindet die Bestandteile vieler Komposita und trägt dabei meist keine eigene Bedeutung.",
		formation: [
			[
				noteToken("Geburt"),
				" + ",
				noteToken("-s-"),
				" + ",
				noteToken("Urkunde"),
				" → ",
				noteToken("Geburtsurkunde"),
			],
			[
				noteToken("Arbeit"),
				" + ",
				noteToken("-s-"),
				" + ",
				noteToken("Zimmer"),
				" → ",
				noteToken("Arbeitszimmer"),
			],
		],
		translations: [
			"linking -s- in compounds",
			"соединительный -s- в сложных словах",
		],
		tags: [noteToken("#Morphem"), noteToken("#Komposition")],
	},
	{
		presentationKey: "Un",
		family: "Morpheme",
		kind: "Prefix",
		emoji: "🚫",
		title: [noteToken("un-")],
		titleText: "un-",
		summary: "Vorsilbe für Verneinung oder Gegensatz",
		contexts: [
			[
				"Der Kunde wurde langsam ",
				noteToken("ungeduldig"),
				" und fragte noch einmal nach.",
			],
			[
				"Nach der überraschenden Nachricht herrschte große ",
				noteToken("Unruhe"),
				" im Saal.",
			],
		],
		definition:
			"Das Präfix un- verneint viele Adjektive oder bezeichnet bei Nomen das Fehlen beziehungsweise den Gegensatz von etwas.",
		formation: [
			[
				noteToken("un-"),
				" + ",
				noteToken("geduldig"),
				" → ",
				noteToken("ungeduldig"),
			],
			[
				noteToken("un-"),
				" + ",
				noteToken("Ruhe"),
				" → ",
				noteToken("Unruhe"),
			],
		],
		translations: [
			"un-; not, opposite or absence of",
			"не-, без-; отрицание, противоположность или отсутствие",
		],
		tags: [noteToken("#Morphem"), noteToken("#Präfix")],
	},
	{
		presentationKey: "Fahr",
		family: "Morpheme",
		kind: "Root",
		emoji: "🚲",
		title: [noteToken("fahr")],
		titleText: "fahr",
		summary: "Wortkern rund um Fortbewegung mit einem Fahrzeug",
		contexts: [
			[
				"Im Sommer ",
				noteToken("fahren"),
				" wir oft mit dem Rad zur Arbeit.",
			],
			[
				"Die ",
				noteToken("Fahrerin"),
				" wartete, bis alle eingestiegen waren.",
			],
		],
		definition:
			"Die Wurzel fahr trägt die Grundbedeutung der Fortbewegung in fahren und verwandten Wörtern.",
		formation: [
			[
				noteToken("fahr", "reference", "Wurzel"),
				" + ",
				noteToken("-en"),
				" → ",
				noteToken("fahren"),
			],
			[
				noteToken("Fahr", "reference", "Wurzel"),
				" + ",
				noteToken("-er"),
				" → ",
				noteToken("Fahrer"),
			],
		],
		translations: [
			"drive, travel or ride (root)",
			"ехать, ездить (корень)",
		],
		tags: [noteToken("#Morphem"), noteToken("#Wurzel")],
	},
	{
		presentationKey: "Ung",
		family: "Morpheme",
		kind: "Suffix",
		emoji: "🌒",
		title: [noteToken("-ung", "feminine", "bildet feminine Nomen")],
		titleText: "-ung",
		summary: "Nachsilbe für feminine Nomen aus Verben",
		contexts: [
			[
				"Die ",
				noteToken("Dämmerung", "feminine"),
				" legte sich langsam über den See, und am gegenüberliegenden Ufer gingen die ersten Lichter an.",
			],
			[
				"Wir machten uns noch vor der ",
				noteToken("Dämmerung", "feminine"),
				" auf den Rückweg, damit wir den schmalen Pfad erkennen konnten.",
			],
		],
		contextTone: "feminine",
		definition:
			"Das Suffix -ung bildet meist feminine Nomen aus Verben und bezeichnet oft einen Vorgang oder dessen Ergebnis: dämmern → Dämmerung.",
		formation: [
			[
				noteToken("Dämmer", "reference", "Verbstamm"),
				"|",
				noteToken("ung", "feminine", "Suffix"),
			],
			[
				noteToken("dämmern"),
				" + ",
				noteToken("-ung", "feminine", "Suffix"),
				" → ",
				noteToken("Dämmerung", "feminine"),
			],
		],
		translations: ["-ing, -tion;", "-ние, -ция;"],
		tags: [
			noteToken("#Morphem"),
			noteToken("#Suffix"),
			noteToken("#Feminin", "feminine"),
		],
	},
	{
		presentationKey: "Werk",
		family: "Morpheme",
		kind: "Suffixoid",
		emoji: "🛠️",
		title: [noteToken("-werk", "neuter", "bestimmt das Genus Neutrum")],
		titleText: "-werk",
		summary: "Wortähnliches Zweitglied für ein geordnetes Ganzes",
		contexts: [
			[
				"Das neue ",
				noteToken("Regelwerk", "neuter"),
				" gilt ab dem kommenden Monat.",
			],
			[
				"Das historische ",
				noteToken("Kartenwerk", "neuter"),
				" zeigt auch längst verschwundene Wege.",
			],
		],
		contextTone: "neuter",
		definition:
			"Als Suffixoid bildet -werk Nomen im Neutrum für ein geordnetes Ganzes oder eine Sammlung, etwa Regelwerk und Kartenwerk.",
		formation: [
			[
				noteToken("Regel"),
				" + ",
				noteToken("-werk", "neuter"),
				" → ",
				noteToken("Regelwerk", "neuter"),
			],
			[
				noteToken("Karten"),
				" + ",
				noteToken("-werk", "neuter"),
				" → ",
				noteToken("Kartenwerk", "neuter"),
			],
		],
		translations: [
			"-work; word-forming element for an organized whole",
			"-werk; словообразовательный элемент со значением упорядоченного целого",
		],
		tags: [
			noteToken("#Morphem"),
			noteToken("#Suffixoid"),
			noteToken("#Neutrum", "neuter"),
		],
	},
] as const satisfies readonly NoteStudyFixture[];
