import { type NoteStudyFixture, noteToken } from "../note-study-fixture";

export const morphemeFixtures = [
	{
		slug: "Ge-t",
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
		forms: [
			{
				label: "Infinitiv",
				content: [noteToken("lernen")],
			},
			{
				label: "Partizip II",
				content: [noteToken("gelernt")],
			},
		],
		tags: [noteToken("#Morphem"), noteToken("#PartizipII")],
	},
	{
		slug: "Clitic-s",
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
		forms: [
			{
				label: "Vollform",
				content: [noteToken("es")],
			},
			{
				label: "Klitisch",
				content: [noteToken("’s")],
			},
		],
		tags: [noteToken("#Morphem"), noteToken("#Klitikon")],
	},
	{
		slug: "Reduplikation",
		family: "Morpheme",
		kind: "Duplifix",
		emoji: "🪞",
		title: [noteToken("RED")],
		titleText: "RED",
		summary: "Schema für die Wiederholung sprachlichen Materials",
		contexts: [
			[
				"Der Zug fuhr ",
				noteToken("sehr"),
				", ",
				noteToken("sehr"),
				" langsam durch den Nebel.",
			],
			[
				"Wir verlieren uns nicht im ",
				noteToken("Klein-Klein"),
				", sondern treffen heute eine Entscheidung.",
			],
		],
		definition:
			"RED bezeichnet das Kopieren eines ganzen Ausdrucks oder eines Teils davon. Das Deutsche hat kein gewöhnliches produktives Duplifix; der Eintrag ist eine Schema-Probe mit expressiven und lexikalisierten Wiederholungen.",
		formation: [
			[noteToken("X"), " → ", noteToken("X–X"), " (Schema)"],
			[
				noteToken("klein"),
				" → ",
				noteToken("klein-klein"),
				" (anschauliche Probe)",
			],
		],
		translations: ["RED; reduplication schema", "RED; схема редупликации"],
		forms: [
			{
				label: "Schema",
				content: [noteToken("X–X")],
			},
			{
				label: "Belegtyp",
				content: [noteToken("Klein-Klein"), " (lexikalisiert)"],
			},
		],
		tags: [
			noteToken("#Morphem"),
			noteToken("#Schema"),
			noteToken("#Nichtproduktiv"),
		],
	},
	{
		slug: "Infix-n",
		family: "Morpheme",
		kind: "Infix",
		emoji: "🧩",
		title: [noteToken("-n-")],
		titleText: "-n-",
		summary: "Künstliche Probe für ein Element im Wortinneren",
		contexts: [
			[
				"Die Form ",
				noteToken("*Ha-n-us"),
				" zeigt nur, an welcher Stelle ein Infix stehen würde; sie ist kein deutsches Wort.",
			],
			[
				"Mit ",
				noteToken("-n-"),
				" bildet man im Deutschen nicht produktiv neue Wörter.",
			],
		],
		definition:
			"-n- steht hier als künstliches Infix im Inneren eines Stamms. Produktive Infixation ist kein gewöhnliches Muster des Deutschen; dieser Eintrag prüft nur die Routenform.",
		formation: [
			[noteToken("AB"), " → ", noteToken("A-n-B"), " (Schema)"],
			[
				noteToken("Haus"),
				" → ",
				noteToken("*Ha-n-us"),
				" (künstliche Probe)",
			],
		],
		translations: [
			"-n-; artificial infix schema probe",
			"-n-; искусственная схема инфикса",
		],
		forms: [
			{
				label: "Schema",
				content: [noteToken("A-n-B")],
			},
			{
				label: "Status",
				content: ["im Deutschen nicht produktiv"],
			},
		],
		tags: [
			noteToken("#Morphem"),
			noteToken("#Schema"),
			noteToken("#Nichtproduktiv"),
		],
	},
	{
		slug: "Fugen-s",
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
		forms: [
			{
				label: "Nach Geburt",
				content: [noteToken("Geburts-")],
			},
			{
				label: "Nach Arbeit",
				content: [noteToken("Arbeits-")],
			},
		],
		tags: [noteToken("#Morphem"), noteToken("#Komposition")],
	},
	{
		slug: "Un",
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
		forms: [
			{
				label: "Adjektiv",
				content: [noteToken("ungeduldig")],
			},
			{
				label: "Nomen",
				content: [noteToken("Unruhe")],
			},
		],
		tags: [noteToken("#Morphem"), noteToken("#Präfix")],
	},
	{
		slug: "Fahr",
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
		forms: [
			{
				label: "Präsensstamm",
				content: [noteToken("fahr-")],
			},
			{
				label: "3. Person Präsens",
				content: [noteToken("fährt")],
			},
			{
				label: "Präteritum",
				content: [noteToken("fuhr")],
			},
			{
				label: "Partizip II",
				content: [noteToken("gefahren")],
			},
		],
		tags: [noteToken("#Morphem"), noteToken("#Wurzel")],
	},
	{
		slug: "Ung",
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
		translations: [
			"-ing, -tion; suffix forming mostly feminine nouns",
			"-ние, -ция; суффикс, образующий преимущественно существительные женского рода",
		],
		forms: [
			{
				label: "Ableitung",
				content: [
					noteToken("dämmern"),
					" → ",
					noteToken("Dämmerung", "feminine"),
				],
			},
			{
				label: "Plural",
				content: ["die ", noteToken("Dämmerungen", "plural")],
			},
		],
		tags: [
			noteToken("#Morphem"),
			noteToken("#Suffix"),
			noteToken("#Feminin", "feminine"),
		],
	},
	{
		slug: "Werk",
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
		forms: [
			{
				label: "Regelsammlung",
				content: [noteToken("das Regelwerk", "neuter")],
			},
			{
				label: "Kartensammlung",
				content: [noteToken("das Kartenwerk", "neuter")],
			},
		],
		tags: [
			noteToken("#Morphem"),
			noteToken("#Suffixoid"),
			noteToken("#Neutrum", "neuter"),
		],
	},
	{
		slug: "Tonakzent",
		family: "Morpheme",
		kind: "ToneMarking",
		emoji: "🎵",
		title: [noteToken("◌́")],
		titleText: "◌́",
		summary: "Schemazeichen für markierte Betonung oder Tonhöhe",
		contexts: [
			[
				"In der linguistischen Notation kann ",
				noteToken("úmfahren"),
				" von ",
				noteToken("umfáhren"),
				" durch die markierte Betonungsstelle unterschieden werden.",
			],
			[
				"Im normalen deutschen Text schreibt man beide Formen ",
				noteToken("umfahren"),
				"; der Akzent gehört nur zur Analyse, nicht zur Rechtschreibung.",
			],
		],
		definition:
			"◌́ ist hier ein Schemazeichen für eine markierte Ton- oder Betonungsstelle. Tonmarkierung ist kein gewöhnliches produktives Morphem des Deutschen; der Akut dient nur als Routen- und Notationsprobe.",
		formation: [
			[noteToken("X"), " → ", noteToken("X́"), " (Schema)"],
			[
				noteToken("umfahren"),
				" → ",
				noteToken("úmfahren"),
				" / ",
				noteToken("umfáhren"),
				" (Betonungsprobe)",
			],
		],
		translations: [
			"tone or stress mark; notation schema probe",
			"знак тона или ударения; схема для проверки обозначения",
		],
		forms: [
			{
				label: "Trennbar",
				content: [
					noteToken("úmfahren"),
					" „",
					noteToken("umstoßen"),
					"“",
				],
			},
			{
				label: "Untrennbar",
				content: [
					noteToken("umfáhren"),
					" „",
					noteToken("außen herumfahren"),
					"“",
				],
			},
		],
		tags: [
			noteToken("#Morphem"),
			noteToken("#Schema"),
			noteToken("#Nichtproduktiv"),
		],
	},
	{
		slug: "Transfix",
		family: "Morpheme",
		kind: "Transfix",
		emoji: "🧬",
		title: [noteToken("C₁aC₂")],
		titleText: "C₁aC₂",
		summary: "Schema für ein Muster im Konsonantengerüst",
		contexts: [
			[
				"Aus dem Gerüst ",
				noteToken("C₁–C₂"),
				" würde die Schema-Probe ",
				noteToken("C₁aC₂"),
				" bilden; sie ist kein deutsches Wort.",
			],
			[
				"Deutsche Wörter werden gewöhnlich nicht mit einem ",
				noteToken("Transfix"),
				" aus Konsonantengerüst und Vokalmuster gebildet.",
			],
		],
		definition:
			"C₁aC₂ ist ein Schema, bei dem ein Vokalmuster in ein Konsonantengerüst greift. Transfixe sind kein gewöhnliches produktives Muster des Deutschen; dieser Eintrag prüft nur die Routenform.",
		formation: [
			[
				noteToken("C₁–C₂"),
				" + ",
				noteToken("a"),
				" → ",
				noteToken("C₁aC₂"),
				" (Schema)",
			],
		],
		translations: [
			"C₁aC₂; transfix schema probe",
			"C₁aC₂; схема для проверки трансфикса",
		],
		forms: [
			{
				label: "Gerüst",
				content: [noteToken("C₁–C₂")],
			},
			{
				label: "Probe",
				content: [noteToken("C₁aC₂")],
			},
		],
		tags: [
			noteToken("#Morphem"),
			noteToken("#Schema"),
			noteToken("#Nichtproduktiv"),
		],
	},
] as const satisfies readonly NoteStudyFixture[];
