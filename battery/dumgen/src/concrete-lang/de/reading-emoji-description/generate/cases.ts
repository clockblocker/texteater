import { comparisonInputSchema } from "../../../../generated/schemas.js";

type Example = {
	id: string;
	kind: "ADJ" | "NOUN" | "VERB";
	lemma: string;
	context: string;
	meaning: string;
	accepted: readonly [string, ...string[]];
	rejected?: readonly string[];
	demo?: boolean;
	gender?: "Fem" | "Masc" | "Neut";
};

// Demonstrations and held-out occurrences share one source. Accepted sequences
// are reviewed examples, not an exhaustive definition of semantic correctness.
export const examples: readonly Example[] = [
	{
		id: "demo-thrilling",
		kind: "ADJ",
		lemma: "aufregend",
		context: "Die neue Erfahrung war <TARGET>aufregend</TARGET>.",
		meaning:
			"Exciting or thrilling. Express aroused interest, not relief, fatigue, waiting, or the object that happens to be exciting.",
		accepted: ["🤩"],
		demo: true,
	},
	{
		id: "demo-effortless",
		kind: "ADJ",
		lemma: "mühelos",
		context: "Sie erledigt die Arbeit <TARGET>mühelos</TARGET>.",
		meaning:
			"Without difficulty or effort. This is ease of doing something, not low physical weight; a feather would suggest the wrong sense.",
		accepted: ["😌👌"],
		demo: true,
	},
	{
		id: "demo-reserve",
		kind: "VERB",
		lemma: "zurücklegen",
		context:
			"Er möchte jeden Monat etwas Geld <TARGET>zurücklegen</TARGET>.",
		meaning:
			"Set money aside in reserve. Depict keeping or accumulating funds rather than spending, falling value, or a low price.",
		accepted: ["💰📥"],
		demo: true,
	},
	{
		id: "demo-cold",
		kind: "ADJ",
		lemma: "kalt",
		context: "Das Wasser ist <TARGET>kalt</TARGET>.",
		meaning: "Low temperature",
		accepted: ["🥶", "🧊"],
		demo: true,
	},
	{
		id: "demo-patient",
		kind: "ADJ",
		lemma: "geduldig",
		context: "Die Lehrerin bleibt <TARGET>geduldig</TARGET>.",
		meaning: "Calmly tolerating delay or difficulty",
		accepted: ["😌⏳"],
		demo: true,
	},
	{
		id: "demo-repair",
		kind: "VERB",
		lemma: "reparieren",
		context: "Wir <TARGET>reparieren</TARGET> das Fahrrad.",
		meaning: "Make something broken work again",
		accepted: ["🔧✅", "🔧"],
		demo: true,
	},
	{
		id: "demo-expensive",
		kind: "ADJ",
		lemma: "teuer",
		context: "Die Wohnung ist <TARGET>teuer</TARGET>.",
		meaning: "Costing a lot of money",
		accepted: ["💰⬆️", "💸"],
		demo: true,
	},
	{
		id: "demo-share",
		kind: "VERB",
		lemma: "teilen",
		context: "Wir <TARGET>teilen</TARGET> das Brot miteinander.",
		meaning: "Divide something among people",
		accepted: ["🤲↔️"],
		demo: true,
	},
	{
		id: "demo-confused",
		kind: "ADJ",
		lemma: "verwirrt",
		context: "Nach der Erklärung war ich <TARGET>verwirrt</TARGET>.",
		meaning: "Unable to understand clearly",
		accepted: ["😕❓", "😕"],
		demo: true,
	},
	{
		id: "demo-freedom",
		kind: "NOUN",
		lemma: "Freiheit",
		gender: "Fem",
		context: "Sie genießt ihre <TARGET>Freiheit</TARGET>.",
		meaning: "Being free from constraint",
		accepted: ["🕊️"],
		demo: true,
	},
	{
		id: "demo-open",
		kind: "VERB",
		lemma: "aufmachen",
		context: "Kannst du das Fenster <TARGET>aufmachen</TARGET>?",
		meaning:
			"Open something. The window is incidental; reuse the open-state mnemonic for other objects.",
		accepted: ["🔓"],
		demo: true,
	},
	{
		id: "demo-sad",
		kind: "ADJ",
		lemma: "traurig",
		context: "Nach dem Abschied war er <TARGET>traurig</TARGET>.",
		meaning:
			"Feeling sadness, not the event that caused it. A face communicates the property directly.",
		accepted: ["😢"],
		demo: true,
	},
	{
		id: "demo-danger",
		kind: "ADJ",
		lemma: "gefährlich",
		context: "Diese Kreuzung ist <TARGET>gefährlich</TARGET>.",
		meaning:
			"Likely to cause harm. Mark danger rather than a road or car; the adjective applies beyond traffic.",
		accepted: ["⚠️"],
		demo: true,
	},
	{
		id: "demo-cheap",
		kind: "ADJ",
		lemma: "billig",
		context: "Das Ticket war <TARGET>billig</TARGET>.",
		meaning:
			"Low in price in this context, not poor quality. Money plus downward direction preserves the property.",
		accepted: ["💰⬇️"],
		demo: true,
	},
	{
		id: "demo-toothbrush",
		kind: "NOUN",
		lemma: "Zahnbürste",
		gender: "Fem",
		context: "Ich brauche eine neue <TARGET>Zahnbürste</TARGET>.",
		meaning:
			"Toothbrush. Use the familiar whole-object emoji rather than mechanically composing tooth and brush.",
		accepted: ["🪥"],
		demo: true,
	},
	{
		id: "demo-raincoat",
		kind: "NOUN",
		lemma: "Regenmantel",
		gender: "Masc",
		context: "Nimm deinen <TARGET>Regenmantel</TARGET> mit.",
		meaning:
			"A coat protecting against rain. Both transparent compound components help when no single conventional emoji suffices.",
		accepted: ["🌧️🧥"],
		demo: true,
	},
	{
		id: "demo-idiom",
		kind: "VERB",
		lemma: "den Faden verlieren",
		context:
			"Während der Rede habe ich <TARGET>den Faden verloren</TARGET>.",
		meaning:
			"Lose the thread of one's thoughts, not literal sewing thread. The mnemonic depicts losing mental continuity.",
		accepted: ["🧠❓"],
		demo: true,
	},
	{
		id: "demo-envious",
		kind: "ADJ",
		lemma: "neidisch",
		context: "Sie ist auf seinen Erfolg <TARGET>neidisch</TARGET>.",
		meaning:
			"Envious of someone else's advantage. Use an emotional association; avoid depicting the particular success or person.",
		accepted: ["😒💚"],
		demo: true,
	},
	{
		id: "demo-gift",
		kind: "NOUN",
		lemma: "Geschenk",
		gender: "Neut",
		context: "Das Buch ist ein <TARGET>Geschenk</TARGET>.",
		meaning:
			"Something given as a present. The conventional wrapped present is useful even when this present happens to be a book.",
		accepted: ["🎁"],
		demo: true,
	},
	{
		id: "demo-return",
		kind: "VERB",
		lemma: "zurückgeben",
		context: "Ich möchte dir den Schlüssel <TARGET>zurückgeben</TARGET>.",
		meaning:
			"Give something back. Hand and backward arrow preserve the stable action, without encoding the incidental key.",
		accepted: ["🤲↩️"],
		demo: true,
	},
	{
		id: "demo-remain",
		kind: "VERB",
		lemma: "bleiben",
		context: "Sie <TARGET>bleibt</TARGET> trotz der Kritik ruhig.",
		meaning:
			"Remain in a state. bleiben contributes only the staying; the calm belongs to ruhig, so no calm face.",
		accepted: ["📍", "⏸️", "🟰⏳", "⏳🟰", "📍⏳"],
		demo: true,
	},
	{
		id: "demo-closed",
		kind: "ADJ",
		lemma: "geschlossen",
		context: "Das Museum ist montags <TARGET>geschlossen</TARGET>.",
		meaning:
			"Closed, not open. The lock already says it; a negation sign would add nothing.",
		accepted: ["🔒", "🔐"],
		rejected: ["🔒🚫", "🚫🔒", "🔒❌", "🏛️🔒"],
		demo: true,
	},
	{
		id: "demo-seem",
		kind: "VERB",
		lemma: "scheinen",
		context: "Der Kuchen <TARGET>scheint</TARGET> lecker zu sein.",
		meaning:
			"Seem, look, give an impression. Depict only the impression; lecker belongs to its own lemma, so no yummy face.",
		accepted: ["👀💭", "👀"],
		demo: true,
	},
	{
		id: "demo-consider",
		kind: "VERB",
		lemma: "finden",
		context: "Ich <TARGET>finde</TARGET> das Buch spannend.",
		meaning:
			"Consider; hold an opinion. Not the searching sense, and spannend belongs to its own lemma.",
		accepted: ["🧠💭", "🤔💭", "💭"],
		demo: true,
	},
	{
		id: "strenuous-hike",
		kind: "ADJ",
		lemma: "anstrengend",
		context:
			"Der Aufstieg und Abstieg waren gestern <TARGET>anstrengend</TARGET>.",
		meaning: "Requiring effort; tiring or demanding",
		accepted: ["😓", "🥵", "💪😓", "😮‍💨", "😩", "😓💪", "🥵💪"],
		rejected: ["💪", "🏋️", "🏔️"],
	},
	{
		id: "strenuous-admin",
		kind: "ADJ",
		lemma: "anstrengend",
		context:
			"Die Diskussion über die Formulare war <TARGET>anstrengend</TARGET>.",
		meaning: "Requiring effort; tiring or demanding",
		accepted: ["😓", "🥵", "💪😓", "😮‍💨", "😩", "😓💪"],
		rejected: ["💪", "📄", "🥱"],
	},
	{
		id: "strong-person",
		kind: "ADJ",
		lemma: "stark",
		context: "Sie ist <TARGET>stark</TARGET> und hebt die Kiste allein.",
		meaning: "Having great strength",
		accepted: ["💪"],
		rejected: ["😓", "📦"],
	},
	{
		id: "tired-after-work",
		kind: "ADJ",
		lemma: "müde",
		context: "Nach der Arbeit bin ich <TARGET>müde</TARGET>.",
		meaning: "Needing rest or sleep",
		accepted: ["😴", "🥱", "😪"],
		rejected: ["💪", "💼"],
	},
	{
		id: "boring-talk",
		kind: "ADJ",
		lemma: "langweilig",
		context: "Der Vortrag war <TARGET>langweilig</TARGET>.",
		meaning: "Causing boredom",
		accepted: ["🥱", "😴", "😑"],
		rejected: ["🎤"],
	},
	{
		id: "exciting-story",
		kind: "ADJ",
		lemma: "spannend",
		context:
			"Die Geschichte bleibt bis zum Ende <TARGET>spannend</TARGET>.",
		meaning: "Holding interest through excitement or suspense",
		accepted: ["🤩", "😮", "😲"],
		rejected: ["🥱", "😮‍💨", "😮‍💨⏳", "😮‍💨❓", "😮‍💨📖", "🤩📖", "😬📖"],
	},
	{
		id: "difficult-problem",
		kind: "ADJ",
		lemma: "schwierig",
		context: "Diese Aufgabe ist <TARGET>schwierig</TARGET>.",
		meaning: "Hard to do or understand",
		accepted: ["🧩", "🤔", "🧩🤔", "😓🧩", "😣"],
		rejected: ["🪶"],
	},
	{
		id: "easy-problem",
		kind: "ADJ",
		lemma: "leicht",
		context: "Diese Aufgabe ist <TARGET>leicht</TARGET> zu lösen.",
		meaning: "Easy to do",
		accepted: ["👌", "✅", "😌", "🙂👍", "🙂✅", "😌👌"],
		rejected: ["🪶", "🟢"],
	},
	{
		id: "light-bag",
		kind: "ADJ",
		lemma: "leicht",
		context: "Die leere Tasche ist <TARGET>leicht</TARGET>.",
		meaning: "Having little weight",
		accepted: ["🪶", "🪶⚖️"],
		rejected: ["💡"],
	},
	{
		id: "sour-taste",
		kind: "ADJ",
		lemma: "sauer",
		context: "Der Joghurt schmeckt <TARGET>sauer</TARGET>.",
		meaning: "Sour or acidic taste",
		accepted: ["🍋", "😖🍋", "🍋😖"],
		rejected: ["😠", "🥛"],
	},
	{
		id: "sour-mood",
		kind: "ADJ",
		lemma: "sauer",
		context: "Wegen der Lüge war sie richtig <TARGET>sauer</TARGET>.",
		meaning: "Angry or annoyed",
		accepted: ["😠", "😡", "😤"],
		rejected: ["🍋"],
	},
	{
		id: "sharp-knife",
		kind: "ADJ",
		lemma: "scharf",
		context: "Dieses Messer ist sehr <TARGET>scharf</TARGET>.",
		meaning: "Having a keen cutting edge",
		accepted: ["🔪", "🗡️", "🔪✨"],
		rejected: ["🌶️"],
	},
	{
		id: "spicy-soup",
		kind: "ADJ",
		lemma: "scharf",
		context: "Die Suppe ist mir zu <TARGET>scharf</TARGET>.",
		meaning: "Spicy hot taste",
		accepted: ["🌶️", "🔥🌶️", "🌶️🔥", "🌶️🥵"],
		rejected: ["🔪"],
	},
	{
		id: "reliable-person",
		kind: "ADJ",
		lemma: "zuverlässig",
		context:
			"Auf Eva kann man zählen; sie ist <TARGET>zuverlässig</TARGET>.",
		meaning: "Dependable; can be relied upon",
		accepted: ["🤝✅", "✅", "🤝"],
		rejected: ["💪"],
	},
	{
		id: "unfair-rule",
		kind: "ADJ",
		lemma: "ungerecht",
		context: "Diese Regel ist <TARGET>ungerecht</TARGET>.",
		meaning: "Unjust or unfair",
		accepted: ["⚖️❌", "❌⚖️", "⚖️🚫"],
		rejected: ["⚖️✅"],
	},
	{
		id: "lock-door",
		kind: "NOUN",
		lemma: "Schloss",
		gender: "Neut",
		context: "Der Schlüssel steckt im <TARGET>Schloss</TARGET>.",
		meaning: "Lock securing a door or container",
		accepted: ["🔒", "🔐", "🔓"],
		rejected: ["🏰"],
	},
	{
		id: "castle-visit",
		kind: "NOUN",
		lemma: "Schloss",
		gender: "Neut",
		context: "Wir besichtigen das alte <TARGET>Schloss</TARGET>.",
		meaning: "Castle or palace",
		accepted: ["🏰", "🏯"],
		rejected: ["🔒"],
	},
	{
		id: "bank-credit",
		kind: "NOUN",
		lemma: "Bank",
		gender: "Fem",
		context: "Die <TARGET>Bank</TARGET> gewährt uns einen Kredit.",
		meaning: "Financial institution",
		accepted: ["🏦", "💰"],
		rejected: ["🪑"],
	},
	{
		id: "bank-rest",
		kind: "NOUN",
		lemma: "Bank",
		gender: "Fem",
		context: "Die Wanderer ruhen auf einer <TARGET>Bank</TARGET>.",
		meaning: "Bench for sitting",
		accepted: ["🪑", "🛋️"],
		rejected: ["🏦", "💰"],
	},
	{
		id: "rise-mountain",
		kind: "NOUN",
		lemma: "Aufstieg",
		gender: "Masc",
		context:
			"Der <TARGET>Aufstieg</TARGET> zum Gipfel dauert zwei Stunden.",
		meaning: "Upward movement or ascent",
		accepted: ["⬆️", "🧗", "🧗‍♂️", "🏔️⬆️", "⬆️⛰️", "🥾⬆️"],
		rejected: ["⬇️", "🥾⛰️"],
	},
	{
		id: "descent-mountain",
		kind: "NOUN",
		lemma: "Abstieg",
		gender: "Masc",
		context: "Beim <TARGET>Abstieg</TARGET> ins Tal regnete es.",
		meaning: "Downward movement or descent",
		accepted: ["⬇️", "🏔️⬇️", "⬇️⛰️", "⬇️🥾"],
		rejected: ["⬆️", "🌧️"],
	},
	{
		id: "remember-name",
		kind: "VERB",
		lemma: "vergessen",
		context: "Ich habe den Namen <TARGET>vergessen</TARGET>.",
		meaning: "Fail to remember",
		accepted: ["🧠❌", "🤔❓", "🤦", "😶‍🌫️"],
		rejected: ["📝✅"],
	},
	{
		id: "wait-bus",
		kind: "VERB",
		lemma: "warten",
		context: "Wir <TARGET>warten</TARGET> auf den Bus.",
		meaning: "Stay until something happens",
		accepted: ["⏳", "⌛", "⏱️", "⏳👀"],
		rejected: ["🚌", "⏳🚌"],
	},
	{
		id: "wait-answer",
		kind: "VERB",
		lemma: "warten",
		context: "Sie <TARGET>wartet</TARGET> auf eine Antwort.",
		meaning: "Stay until something happens",
		accepted: ["⏳", "⌛", "⏱️"],
		rejected: ["📧"],
	},
	{
		id: "protect-child",
		kind: "VERB",
		lemma: "schützen",
		context: "Der Helm soll das Kind <TARGET>schützen</TARGET>.",
		meaning: "Keep safe from harm",
		accepted: ["🛡️", "🛡️👤"],
		rejected: ["🚲"],
	},
	{
		id: "grow-plant",
		kind: "VERB",
		lemma: "wachsen",
		context: "Die Pflanzen <TARGET>wachsen</TARGET> schnell.",
		meaning: "Increase in size or develop",
		accepted: ["🌱", "🌱⬆️", "📈"],
		rejected: ["💧"],
	},
	{
		id: "grow-business",
		kind: "VERB",
		lemma: "wachsen",
		context: "Das Unternehmen <TARGET>wächst</TARGET> weiter.",
		meaning: "Increase in size or develop",
		accepted: ["📈", "🌱", "🌱⬆️"],
		rejected: ["🏢"],
	},
	{
		id: "save-money",
		kind: "VERB",
		lemma: "sparen",
		context: "Wir <TARGET>sparen</TARGET> für eine Reise.",
		meaning: "Set aside money or use resources economically",
		accepted: ["🐷💰", "💰", "💰📥", "💰🐖"],
		rejected: ["✈️", "💰⬇️", "🏦"],
	},
	// Neighbour bleed: a copula or light verb must not take its complement's
	// meaning. Rejected sequences depict the complement or its object.
	{
		id: "remain-closed",
		kind: "VERB",
		lemma: "bleiben",
		context: "Morgen <TARGET>bleiben</TARGET> sie geschlossen.",
		meaning: "Remain in a state",
		accepted: ["📍", "⏸️", "🟰⏳", "⏳🟰", "📍⏳"],
		rejected: [
			"🚪🔒",
			"🔒",
			"🔒🚪",
			"🚪",
			"🔐",
			"🚫",
			"🔒🚫",
			"🔒⏳",
			"🚫🏢",
			"🏢🔒",
			"⏳🔒",
		],
	},
	{
		id: "remain-cold",
		kind: "VERB",
		lemma: "bleiben",
		context:
			"Das Wasser im See <TARGET>bleibt</TARGET> den ganzen Sommer kalt.",
		meaning: "Remain in a state",
		accepted: ["📍", "⏸️", "🟰⏳", "⏳🟰", "📍⏳"],
		rejected: ["🥶", "🧊", "❄️", "🥶⏳", "🧊⏳", "🏞️", "❄️⏳", "🌊"],
	},
	{
		id: "become-longer",
		kind: "VERB",
		lemma: "werden",
		context: "Im Frühling <TARGET>werden</TARGET> die Tage länger.",
		meaning: "Become; change into a state",
		accepted: ["➡️", "🔄", "🐛➡️🦋", "🔜", "⏩"],
		rejected: ["📏", "☀️", "🌸", "📅", "🌞", "⏳", "📏⬆️", "⬆️", "↗️", "📈"],
	},
	{
		id: "seem-tired",
		kind: "VERB",
		lemma: "wirken",
		context: "Der Hund <TARGET>wirkt</TARGET> heute müde.",
		meaning: "Give an impression; seem",
		accepted: ["👀", "👀❓", "🤔👀", "👁️", "👀💭"],
		rejected: [
			"😴",
			"🥱",
			"😪",
			"🐶",
			"🐕",
			"🐶😴",
			"👀💤",
			"👀😴",
			"👀🥱",
			"💤",
		],
	},
	{
		id: "look-delicious",
		kind: "VERB",
		lemma: "aussehen",
		context:
			"Die Suppe <TARGET>sieht</TARGET> lecker <TARGET>aus</TARGET>.",
		meaning: "Have a visual appearance",
		accepted: ["👀", "👁️", "👀✨", "👀💭"],
		rejected: [
			"😋",
			"🤤",
			"🍲",
			"🍜",
			"😋🍲",
			"🍲👀",
			"👀😋",
			"👀🤤",
			"😋👀",
		],
	},
	{
		id: "make-tired",
		kind: "VERB",
		lemma: "machen",
		context: "Der Lärm <TARGET>macht</TARGET> mich müde.",
		meaning: "Cause someone or something to be in a state",
		accepted: ["➡️", "🛠️", "🔨", "👉➡️", "⚙️"],
		rejected: ["😴", "🥱", "💤", "🔊", "😴🔊", "🔊😴", "🥱🔊", "😩"],
	},
	{
		id: "find-boring",
		kind: "VERB",
		lemma: "finden",
		context: "Ich <TARGET>finde</TARGET> den Film langweilig.",
		meaning: "Consider; hold an opinion about something",
		accepted: ["🤔", "💭", "🤔💭", "🧠💭"],
		rejected: [
			"🥱",
			"😴",
			"😑",
			"🎬",
			"🎥",
			"🔍",
			"🎬🥱",
			"🔍🧠",
			"🔎🧠",
			"🔎",
			"🧠🔍",
		],
	},
	{
		id: "leave-open",
		kind: "VERB",
		lemma: "lassen",
		context: "<TARGET>Lass</TARGET> das Fenster bitte offen.",
		meaning: "Let something stay as it is; not interfere",
		accepted: [
			"🙌",
			"👐",
			"✋",
			"🆗",
			"🤷",
			"👐⏸️",
			"🫳⏸️",
			"🫳",
			"🫳🏽⏸️",
			"👐📍",
		],
		rejected: [
			"🪟",
			"🔓",
			"🚪",
			"🔓🪟",
			"🪟🔓",
			"👐🪟",
			"🤲🪟",
			"✋🪟",
			"🙌🪟",
			"🫳🚪",
			"👐🚪",
			"🖐️🚪",
			"🫳🪟",
			"🖐️🪟",
		],
	},
	// Padding: a complete single symbol must not gain a negation, emphasis, or
	// incidental object.
	{
		id: "closed-tomorrow",
		kind: "ADJ",
		lemma: "geschlossen",
		context: "Morgen bleiben sie <TARGET>geschlossen</TARGET>.",
		meaning: "Closed, not open",
		accepted: ["🔒", "🔐"],
		rejected: ["🔒🚫", "🚫🔒", "🔒❌", "❌🔒", "🚫", "❌", "🔓"],
	},
	{
		id: "forbidden-smoking",
		kind: "ADJ",
		lemma: "verboten",
		context: "Rauchen ist hier <TARGET>verboten</TARGET>.",
		meaning: "Not allowed",
		accepted: ["🚫", "⛔"],
		rejected: ["🚭", "🚫❌", "⛔🚫", "🚬🚫", "🚫🚬", "🚬"],
	},
	{
		id: "open-bakery",
		kind: "ADJ",
		lemma: "geöffnet",
		context: "Die Bäckerei ist sonntags <TARGET>geöffnet</TARGET>.",
		meaning: "Open for entry or business",
		accepted: ["🔓"],
		rejected: ["🔓✅", "✅🔓", "🔒", "🥐", "🥖", "🔓🥐", "🥐🔓"],
	},
	{
		id: "silent-forest",
		kind: "ADJ",
		lemma: "still",
		context: "Im Wald ist es ganz <TARGET>still</TARGET>.",
		meaning: "Without sound",
		accepted: ["🤫", "🔇"],
		rejected: ["🔇🚫", "🔊🚫", "🚫🔊", "🌲🤫", "🌳", "🌲", "🌲🔇"],
	},
	// Fresh validation occurrences: not used to develop the prompt or its examples.
	{
		id: "fresh-slow",
		kind: "ADJ",
		lemma: "langsam",
		context: "Der Computer arbeitet <TARGET>langsam</TARGET>.",
		meaning: "Moving or progressing at low speed",
		accepted: ["🐢", "🐌"],
		rejected: ["💻", "⚡"],
	},
	{
		id: "fresh-fast",
		kind: "ADJ",
		lemma: "schnell",
		context: "Sie beantwortet die Frage <TARGET>schnell</TARGET>.",
		meaning: "Moving or acting at high speed",
		accepted: ["⚡", "💨", "🏃"],
		rejected: ["🐢"],
	},
	{
		id: "fresh-quiet",
		kind: "ADJ",
		lemma: "leise",
		context: "Bitte sprich <TARGET>leise</TARGET>.",
		meaning: "Making little sound",
		accepted: ["🤫", "🔈", "🔉"],
		rejected: ["🔊"],
	},
	{
		id: "fresh-loud",
		kind: "ADJ",
		lemma: "laut",
		context: "Die Musik ist zu <TARGET>laut</TARGET>.",
		meaning: "Making a lot of sound",
		accepted: ["🔊", "📢"],
		rejected: ["🤫"],
	},
	{
		id: "fresh-brave",
		kind: "ADJ",
		lemma: "mutig",
		context: "Trotz ihrer Angst handelte sie <TARGET>mutig</TARGET>.",
		meaning: "Acting with courage despite fear",
		accepted: ["🦁"],
		rejected: ["😨", "💪", "🦁💪"],
	},
	{
		id: "fresh-careful",
		kind: "ADJ",
		lemma: "vorsichtig",
		context: "Sei beim Öffnen bitte <TARGET>vorsichtig</TARGET>.",
		meaning: "Acting carefully to avoid harm or mistakes",
		accepted: ["👀⚠️", "⚠️👀", "⚠️👐", "👐⚠️", "⚠️🐢", "🐢⚠️", "🧐"],
		rejected: ["🚪", "⚠️"],
	},
	{
		id: "fresh-fragile",
		kind: "ADJ",
		lemma: "zerbrechlich",
		context: "Das Glas ist <TARGET>zerbrechlich</TARGET>.",
		meaning: "Easily broken",
		accepted: ["🥚", "🥚⚠️", "🫧⚠️", "⚠️🫧"],
		rejected: ["💪", "💔", "⚠️💔"],
	},
	{
		id: "fresh-rescue",
		kind: "VERB",
		lemma: "retten",
		context: "Die Helfer konnten ihn <TARGET>retten</TARGET>.",
		meaning: "Save from danger",
		accepted: ["🛟", "🦸", "🛟🤝"],
		rejected: ["💰"],
	},
	{
		id: "fresh-compare",
		kind: "VERB",
		lemma: "vergleichen",
		context: "Wir <TARGET>vergleichen</TARGET> die beiden Angebote.",
		meaning: "Examine similarities and differences",
		accepted: ["⚖️", "🔍⚖️", "⚖️🔍"],
		rejected: ["🛒"],
	},
	{
		id: "fresh-forbid",
		kind: "VERB",
		lemma: "verbieten",
		context: "Die Schule will das Rauchen <TARGET>verbieten</TARGET>.",
		meaning: "Not allow something",
		accepted: ["🚫", "⛔"],
		rejected: ["🚬"],
	},
];

const prefix = "reading-generation-";
export const additionalPromptCases = Object.fromEntries(
	examples.map((example) => [
		prefix + example.id,
		{
			input: { lemma: example.lemma, markedContext: example.context },
			idealOutput: example.accepted[0],
			explanation: example.meaning,
		},
	]),
);
export const additionalDemonstrationIds = examples
	.filter((example) => example.demo)
	.map((example) => prefix + example.id);
export const additionalEvaluationIds = examples
	.filter((example) => !example.demo)
	.map((example) => prefix + example.id);

export const additionalOperationCases = Object.fromEntries(
	examples.map((example) => {
		const id = prefix + example.id;
		const segments: {
			kind: "OpaqueText" | "ResolvableText";
			text: string;
		}[] = [];
		const memberSegmentIndices: number[] = [];
		for (const part of example.context.split(/(<TARGET>.*?<\/TARGET>)/gu)) {
			if (!part) continue;
			const target = part.startsWith("<TARGET>");
			if (target) memberSegmentIndices.push(segments.length);
			segments.push({
				kind: target ? "ResolvableText" : "OpaqueText",
				text: target ? part.slice(8, -9) : part,
			});
		}
		const coreFeatures =
			example.kind === "ADJ"
				? { abbr: null, foreign: null, numType: null, variant: null }
				: example.kind === "NOUN"
					? { gender: example.gender, hyph: null }
					: {
							hasSepPrefix: null,
							lexicallyReflexive: null,
							verbType: null,
						};
		return [
			id,
			{
				input: comparisonInputSchema.parse({
					encounter: {
						sentence: { id, language: "de", segments },
						target: {
							family: "Lexeme",
							kind: example.kind,
							memberSegmentIndices,
						},
					},
					lemma: {
						unitKind: "Lemma",
						language: "de",
						family: "Lexeme",
						kind: example.kind,
						canonicalForm: example.lemma,
						coreFeatures,
					},
					candidates: [],
				}),
				idealOutput: {
					decision: "New" as const,
					emojiDescription: example.accepted[0],
				},
			},
		];
	}),
);

// Reviewed sequences are order-insensitive: 🐷💰 and 💰🐷 carry one meaning.
const graphemes = new Intl.Segmenter("und", { granularity: "grapheme" });
function sameGraphemes(left: string, right: string) {
	const sorted = (value: string) =>
		[...graphemes.segment(value)]
			.map((segment) => segment.segment)
			.sort()
			.join("");
	return sorted(left) === sorted(right);
}

export function evaluateGeneratedEmoji(
	caseId: string,
	output: { decision: string; emojiDescription: string },
	ideal: { decision: string; emojiDescription: string },
) {
	const example = examples.find((value) => prefix + value.id === caseId);
	const description = output.emojiDescription;
	const accepted = example?.accepted ?? [ideal.emojiDescription];
	const rejected = example?.rejected ?? [];
	const wrongDecision = output.decision !== ideal.decision;
	const matches = (reviewed: readonly string[]) =>
		reviewed.some((value) => sameGraphemes(value, description));
	const recognized = matches(accepted);
	const knownFailure = wrongDecision || matches(rejected);
	return {
		contractPass: knownFailure ? false : recognized ? true : null,
		needsReview: !knownFailure && !recognized,
		exactMatch:
			output.decision === ideal.decision &&
			description === ideal.emojiDescription,
		meaning: example?.meaning ?? null,
		acceptedExamples: accepted,
		rejectedExamples: rejected,
	};
}
