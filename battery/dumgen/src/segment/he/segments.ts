/**
 * Hebrew's Segment stage: scan source runs losslessly and ask a bounded
 * contextual Choice only where a leading conjunction or article may split.
 */
import type { Questions } from "@typesafe-ai/sdk";
import * as Effect from "effect/Effect";
import * as Result from "effect/Result";
import type { SentenceSegmentation } from "../../language-module.js";
import {
	type Answers,
	type Ask,
	type AskFailure,
	askAny,
	choice,
	choiceOf,
} from "../ask.js";
import type { Segment } from "../segmented-sentence.js";
import { stitchedText } from "../stitched-text.js";

type Plan = {
	readonly key: string;
	readonly segments: readonly Segment[];
};

type Run = {
	readonly text: string;
	readonly plans: readonly Plan[];
};

type PreparedSegments = {
	readonly text: string;
	readonly runs: readonly Run[];
	readonly questions: Questions;
	readonly state: {
		readonly sentence: string;
		readonly written: Readonly<Record<string, string>>;
	};
};

const graphemes = new Intl.Segmenter("und", { granularity: "grapheme" });
const planFloor = 0.7;
// The instruction is repeated per ambiguous run; cap each TypeSafe request.
const maxHebrewQuestionsPerAsk = 22;

const resolvable = (text: string): Segment => ({
	kind: "ResolvableText",
	text,
});
const whole = (text: string): Plan => ({
	key: "AsWritten",
	segments: [resolvable(text)],
});
const baseLetter = (grapheme: string) => grapheme.normalize("NFD").charAt(0);

const sourcePrefixes = new Set(["ו", "ה", "ב", "ל", "כ", "מ", "ש"]);

function compoundPlan(clusters: readonly string[]): Plan | undefined {
	if (!clusters.some((cluster) => cluster === "־" || cluster === "-"))
		return undefined;
	const segments: Segment[] = [];
	let part = "";
	for (const cluster of clusters)
		if (cluster === "־" || cluster === "-") {
			if (part.length > 0) segments.push(resolvable(part));
			segments.push({ kind: "Punctuation", text: cluster });
			part = "";
		} else part += cluster;
	if (part.length > 0) segments.push(resolvable(part));
	return { key: "CompoundParts", segments };
}

function internalAsciiQuotePunctuationPlan(
	clusters: readonly string[],
): Plan | undefined {
	if (!clusters.includes('"')) return undefined;
	const segments: Segment[] = [];
	let part = "";
	for (const cluster of clusters)
		if (cluster === '"') {
			if (part.length > 0) segments.push(resolvable(part));
			segments.push({ kind: "Punctuation", text: cluster });
			part = "";
		} else part += cluster;
	if (part.length > 0) segments.push(resolvable(part));
	return { key: "InternalAsciiQuotePunctuation", segments };
}

function temporalPlan(
	clusters: readonly string[],
	first: string,
	key: string,
): Plan | undefined {
	if (
		clusters.length <= 2 ||
		baseLetter(clusters[0] ?? "") !== first ||
		baseLetter(clusters[1] ?? "") !== "ש"
	)
		return undefined;
	return {
		key,
		segments: [
			resolvable(clusters.slice(0, 2).join("")),
			resolvable(clusters.slice(2).join("")),
		],
	};
}

function plansFor(text: string): readonly Plan[] {
	const clusters = Array.from(
		graphemes.segment(text),
		({ segment }) => segment,
	);
	if (clusters.at(-1) === "׳")
		return [
			whole(text),
			{
				key: "TerminalGereshPunctuation",
				segments: [
					resolvable(clusters.slice(0, -1).join("")),
					{ kind: "Punctuation", text: "׳" },
				],
			},
		];
	const compound = compoundPlan(clusters);
	const internalAsciiQuote = internalAsciiQuotePunctuationPlan(clusters);
	if (internalAsciiQuote !== undefined)
		return [internalAsciiQuote, whole(text)];
	// Why is a single lexical form, never the preposition מ plus *דוע.
	if (clusters.map(baseLetter).join("") === "מדוע") return [whole(text)];
	const temporalKshe = temporalPlan(clusters, "כ", "TemporalKshe");
	const temporalMishe = temporalPlan(clusters, "מ", "TemporalMishe");
	let prefixCount = 0;
	if (
		clusters.length > 1 &&
		sourcePrefixes.has(baseLetter(clusters[0] ?? ""))
	) {
		prefixCount = 1;
		const first = baseLetter(clusters[0] ?? "");
		const second = baseLetter(clusters[1] ?? "");
		// Offer stacked proclitics only in plausible order. The rest of a
		// lexical stem may itself begin with a prefix letter (הממשלה, בבית).
		if (
			clusters.length > 2 &&
			((first === "ו" && sourcePrefixes.has(second)) ||
				(first === "ש" && ["ה", "ב", "ל", "כ", "מ"].includes(second)) ||
				(first === "כ" && second === "ש") ||
				(first === "מ" && ["ה", "ש"].includes(second)))
		)
			prefixCount = 2;
	}
	return [
		...Array.from({ length: prefixCount }, (_, index) => {
			const count = index + 1;
			return {
				key: `Prefixes${count}`,
				segments: [
					...clusters.slice(0, count).map(resolvable),
					resolvable(clusters.slice(count).join("")),
				],
			};
		}),
		...(temporalKshe === undefined ? [] : [temporalKshe]),
		...(temporalMishe === undefined ? [] : [temporalMishe]),
		...(compound === undefined ? [] : [compound]),
		whole(text),
	];
}

function scan(text: string): readonly Run[] {
	const runs: Run[] = [];
	let offset = 0;
	while (offset < text.length) {
		const rest = text.slice(offset);
		const whitespace = rest.match(/^\s+/u)?.[0];
		const numeric = rest.match(
			/^(?:[\u05D0-\u05EA\p{M}]+[־-])?\d+(?:[.,]\d+)*/u,
		)?.[0];
		const hebrew = rest.match(
			/^[\u05D0-\u05EA\p{M}]+(?:(?:[־-]|[׳״'"‘’])[\u05D0-\u05EA\p{M}]+)*׳?/u,
		)?.[0];
		const grapheme = graphemes.segment(rest)[Symbol.iterator]().next()
			.value?.segment;
		const source = whitespace ?? numeric ?? hebrew ?? grapheme;
		if (source === undefined)
			throw Error("Cannot scan a non-empty Hebrew Sentence");
		const segments = whitespace
			? [{ kind: "Whitespace" as const, text: source }]
			: numeric
				? [resolvable(source)]
				: hebrew
					? undefined
					: [
							{
								kind: /^\p{P}/u.test(source)
									? "Punctuation"
									: "OpaqueText",
								text: source,
							} as Segment,
						];
		runs.push({
			text: source,
			plans: segments
				? [{ key: "AsWritten", segments }]
				: plansFor(source),
		});
		offset += source.length;
	}
	return runs;
}

function prepare(sentence: string): PreparedSegments {
	const text = stitchedText(sentence);
	const runs = scan(text);
	const questions: Record<string, ReturnType<typeof choice>> = {};
	const written: Record<string, string> = {};
	for (const [index, run] of runs.entries()) {
		if (run.plans.length === 1) continue;
		written[`w${index}`] = run.text;
		questions[`source_${index}`] = choice(
			`For \`written.w${index}\` in immutable \`sentence\`, choose independently clickable Segments in context, not spaces. Split grammatical source pieces in context: ו conjunction, ה definite article, ב/ל/כ/מ prepositions, and ש relative marker. An ASCII quote inside Hebrew letters can be an abbreviation, loanword/consonant modifier, or quotation punctuation: choose the offered whole or punctuation plan in context; preserve characters. A terminal geresh (׳) can be an abbreviation or closing punctuation: choose its offered plan in context; preserve characters. הוא אמר ׳מס׳. = ׳ + מס + ׳ + .; מס׳ 2: keep מס׳ whole as an abbreviation. The temporal connector כש ('when') may remain one Segment before its host. Temporal מש ('once/since/when') is likewise one connector before its clause: in 'דהיינו מִשֶּׁתֶּחְשַׁךְ לֵיל יוֹם הַכִּפּוּרִים', choose מִשֶּׁ + תֶּחְשַׁךְ, not מִ + שֶּׁתֶּחְשַׁךְ or מִ + שֶּׁ + תֶּחְשַׁךְ; preserve every vowel and dagesh, and keep the verb's inflectional ת with its verb. In 'משנראה כי המנדט מתקרב לסיומו', משנראה = מש + נראה. Contrast comparative 'יותר משעשו למען עצמם': משעשו = מ + ש + עשו ('more than they did'), not temporal מש + עשו. These are contextual alternatives, not a rule for every initial מש: משה as a person's name and lexical משחק, משקפת, משבר remain whole; in 'יצא משער העיר', משער = מ + שער, not מש + ער. Examples: הממשלה = ה + ממשלה, האדם = ה + אדם, הממוקמת = ה + ממוקמת, הפרוש = ה + פרוש, מהזווית = מ + ה + זווית, מהממשלה = מ + ה + ממשלה, והממשלה = ו + ה + ממשלה, וּבִמְקוֹרָה = וּ + בִ + מְקוֹרָה (the מ belongs to stem מקור with suffix ה). A true article remains clickable before a noun, nominal participle, or adjective: המתוחות = ה + מתוחות (the definite adjective 'outstretched' in 'לידיים המתוחות של אבנר'). Relative ש may precede a verb, article, or inflected preposition: שהותקף = ש + הותקף (the ה belongs to the verb stem); שהוועדה = ש + ה + ועדה; שבהם = ש + ב + הם; והתינוק = ו + ה + תינוק. Lexical שהרי and בין ('among/between') stay whole, not ש + ה + רי or ב + ין. An infinitival ל is part of a verb, not a preposition: לברר (infinitive of בירר) is one Segment, not ל + ברר; ולברר = ו + לברר. In 'הוועדה לא מצאה לזמן את ד"ר קמיר', לזמן is the infinitive 'to summon' and remains one Segment. But in 'ולהסיר לזמן קצר אחת מהן', לזמן means 'for a short time' and must split ל + זמן; ולהסיר = ו + להסיר, while לקחת remains one whole infinitive Segment. להיפרד is likewise one verb-form Segment. In the soccer control, להטיס remains one infinitive Segment, while לשער = ל + שער and לידיים = ל + ידיים are prepositions. Contrast the independent preposition: לרגע = ל + רגע. Another stacked form is מהעלבון = מ + ה + עלבון. Never invent a stem from an initial prefix letter: התמודדות is a whole noun, not ה + *תמודדות; וההתמודדות may split ו + ה + התמודדות, but והתמודדות = ו + התמודדות, never ו + ה + *תמודדות. השפעתו ('its impact') has a pronominal suffix, not ה + *שפעתו ('his flu'). A preposition and its pronominal suffix are separate source Segments: לי = ל + י; לִי = לִ + י; בהם = ב + הם; בו = ב + ו; להם = ל + הם; בי = ב + י; לו = ל + ו; לכם = ל + כם; לך = ל + ך; לָה = לָ + ה; לָכֶם = לָ + כֶם; מהן = מ + הן. Preserve the written suffix and niqqud; never expand a source piece into a pronoun Lemma. The ה in לָ + ה is a pronoun piece, not an article. Possessive noun suffixes remain with their noun in this policy. Context matters: הישנות ('recurrence') remains whole, while השאת = ה + שאת; כפי ('as') remains whole, and לעשות remains one infinitive Segment. בדרך כלל = ב + דרך + כלל, ולהעברת = ו + ל + העברת, and במלואו = ב + מלואו. In the judicial context 'בו הביעה את התנגדותה למינויו של המשיב', הוועדה = ה + ועדה, הדברים = ה + דברים, and המשיב = ה + משיב are true articles; but הביעה (a verb) and התנגדותה (a noun with possessive suffix) remain whole, so the span is ב + ו + הביעה + את + התנגדותה. Contrast the same judicial sentence ending: הדבר = ה + דבר, but התנהלותה = התנהלותה (the noun 'her conduct' with a possessive suffix), not ה + תנהלותה. Pointed lexical forms stay whole: שֶל ('of') is not שֶ + ל, and כְּמוֹ ('like/as') is not כְּ + מוֹ. Do not split lexical forms merely because they start with a prefix letter: what מה, establishment הקמת, decision החלטת, above מעל, and after לאחר each remain one Segment. In contextual prose, החלו, השלימו, הוזלו, המון, ורידים, and מדובר remain whole lexical Segments; contrast החולים = ה + חולים, והפחידו = ו + הפחידו, הגישה = ה + גישה, ושגשוגה = ו + שגשוגה, and מטעמים = מ + טעמים. In the fable 'שועל ... הבחין בקרב', הבחין stays whole (verb 'noticed'), not ה + בחין. Lexical stems stay whole in בלוטת, הודעה, החלטה, הצעת, הליכים, הפרעה, הערות and בגלל; a following definite noun does not turn their initial letter into an article. Contrast הבלוטה = ה + בלוטה and ההחלטה = ה + החלטה. Likewise בתי, מגישי, למרות, מעבר, הון, הפסדים are whole lexical stems, not ב/מ/ל/ה + invented remainders; but והביטה = ו + הביטה and והשביתו = ו + השביתו. All infinitives (e.g. להשבית, לדון, לבצעה) keep their ל. In device instructions: והיכנסו = ו + היכנסו, והתפריטים = ו + ה + תפריטים, ולגרסת = ו + ל + גרסת. In 'על התועלת שבביצוע הבדיקה': שבביצוע = ש + ב + ביצוע. C contrasts: מכיוון שהם stays whole (not מ + כיוון), הנך stays whole (not ה + נך), מקרבה ראשונה = מ + קרבה + ראשונה, כשמחדירים = כש + מחדירים, כשמדובר = כש + מדובר, לחומת = ל + חומת, and רחוב הנביאים = רחוב + ה + נביאים. A/B controls: הֲתַסְכִּימִי = הֲ + תַסְכִּימִי; והקרבה = ו + ה + קרבה (in ההנקה והקרבה); רחם האם = רחם + ה + אם; למעמד = ל + מעמד; הללו stays whole; וללא = ו + ללא; להתעלפות ('to fainting') = ל + התעלפות; ועדת הכספים keeps ועדת whole (initial ו belongs to its stem), but הכספים = ה + כספים; in בית השחי, השחי = ה + שחי; in 'לאפשר לבתי הדין', לבתי = ל + בתי (בתי itself is whole); in 'מה שרשום בקוד של הבוט', בקוד = ב + קוד; in 'וזאת ... ולפיכך מומלץ', ולפיכך = ו + לפיכך; causal משום איסור stays whole (not מ + שום); in 'לשעה שלפני הזריחה', שלפני = ש + לפני (before; לפני remains one preposition, not ל + פני). In מהתעלפות, only מ is the preposition: מהתעלפות = מ + התעלפות; compare מהחולים = מ + ה + חולים. מהתחלת = מ + התחלת, while מתוזמן stays whole; ובהיותו = ו + בהיותו; והאריה = ו + ה + אריה; שהוא = ש + הוא; in 'שהיא מצוה ראשונה שנצטוו ישראל', שהיא = ש + היא (relative marker plus independent pronoun), while שנצטוו = ש + נצטוו; in 'שתדע שהבנתי את הדרך', שהבנתי = ש + הבנתי (the ה begins the verb); in 'יש ימים שהבת של המלך', שהבת = ש + ה + בת (relative ש and definite article ה); in 'שיש בי הרבה אמונה', בי = ב + י ('in me'); שהדבר = ש + ה + דבר; and להם = ל + הם ('to them'); לו = ל + ו ('to him'). In the statute context, ברגשותיהם = ב + רגשותיהם. הוגנת ('fair') and ללא ('without') remain whole lexical Segments, not ה + וגנת or ל + לא. D and prior control contrasts: להכיר stays whole ('to recognize'), לצמצם stays whole ('to reduce'), לעמוד stays whole ('to stand'), לשבת stays whole ('to sit'), and ולשפר = ו + לשפר ('and to improve'), never ו + ל + שפר. In the support instruction 'שאלה לגבי מכשיר ה-Galaxy שלך', לגבי stays whole ('regarding'), not ל + גבי; לכם = ל + כם ('to you plural'), לך = ל + ך ('to you singular'), and כאן stays whole ('here'), not כ + אן. In song lyrics 'הולכת מכות', מכות stays whole ('fights'), not מ + כות; 'מתי הפסקת לאהוב', הפסקת stays whole (verb 'you stopped'), not ה + פסקת. In 'קו הפרדה לבן', לבן stays whole (the adjective 'white'), but in 'לבן דודו' the preposition may be ל + בן. In 'פתח את הגדרות', הגדרות = ה + גדרות (the settings); in 'מערכת הפרה־סימפתטית', הפרה־סימפתטית = ה + פרה־סימפתטית (the adjective), not an indivisible initial ה. In 'הבירור והטיפול', והטיפול = ו + ה + טיפול; in 'קו הפרדה לבן', הפרדה stays whole (the noun 'separation', not the article ה plus 'mule'). Lexical כלפי stays whole ('toward'), not כ + לפי; in 'מה הבאתי עליי', הבאתי stays whole (verb 'I brought'), not ה + באתי. In 'קטגוריית הנושא שברצונך לראות', שברצונך = ש + ב + רצונך (relative marker plus preposition plus possessive noun), not ש + ברצונך or שברצונך whole. Lexical לעומת ('compared with') stays whole, never ל + עומת. Contrast מהימים = מ + ה + ימים ('from the days'). In the same 'ברצונך' the ב is a productive preposition: ברצונך = ב + רצונך ('in your wish'), and a possessive noun suffix stays with רצונך. In 'עשיתי טיפול בכיתי מבול', בכיתי stays whole (verb 'I cried'), not ב + כיתי. In legal 'הליכי העמדה לדין', העמדה stays whole (noun 'bringing/placing', not ה + עמדה), and בלבד stays whole ('only'), not ב + לבד. In 'כדי להציל את החברה' and 'לקיים דיון', the infinitives להציל and לקיים stay whole: the infinitival ל belongs to the verb, never ל + הציל or ל + קיים. In medical 'אנשים מתעלפים', מתעלפים stays whole (verb 'faint'), not מ + תעלפים; literary 'היו מכוסים', מכוסים stays whole (passive adjective 'covered'), not מ + כוסים. In 'ובעזרת כף' the stacked prefixes are ובעזרת = ו + ב + עזרת; in the licensing noun phrase 'והפקת הרישיון', והפקת = ו + הפקת (ה is stem-initial in הפקת, not an article). Guard complete modern clauses: in 'אם מוזן "-"' the passive verb מוזן stays whole, not מ + וזן; in 'התנאי שבדק אם יש' relative שבדק = ש + בדק (the ב belongs to the verb בדק). In 'והרגל שלי שבאה', והרגל = ו + ה + רגל (the leg); in 'שֶגַם קוֹלֵךְ' complementizer שֶגַם = שֶ + גַם, even with niqqud. In 'לאחר הלידה', הלידה = ה + לידה, but lexical adverb בעיקר stays whole in 'בעיקר אצל'. In the quoted phrase 'להכניס הכל לסיר׳' the closing mark is punctuation: לסיר׳ = לסיר + ׳, not one clickable run; the candidate menu may not additionally separate ל from סיר. Further complete-sentence contrasts: 'על פי ההגדרה הקבועה בסעיף 2 לחוק' has לחוק = ל + חוק, while 'יסוד סביר להניח' keeps infinitival להניח whole, never ל + הניח. 'הרגל שלי כבר התכווננה' has הרגל = ה + רגל; 'את התפקוד' has התפקוד = ה + תפקוד. In the team name 'הפועל ת"א רשמה', הפועל = ה + פועל. In 'רק לסטודנטים להנדסה', להנדסה = ל + הנדסה (the discipline, not a verb); in the recipe 'ובהמשך ישיר לכך', ובהמשך = ו + בהמשך (conjunction before a lexicalized adverbial form); 'אספתי ... והכנסתי' has והכנסתי = ו + הכנסתי. In the statute list 'לרבות מענק', לרבות stays whole as 'including', never ל + רבות. In 'אין לחוש לאיסור זורה', לחוש is the infinitive 'to fear' and stays whole, never ל + חוש; contrast לאיסור = ל + איסור. In 'רועי אלקוקין העלה את האדומים', העלה is the finite verb 'raised/scored' and stays whole, never ה + עלה; contrast האדומים = ה + אדומים. In the pointed quotation 'הַחֹדֶשׁ הַזֶּה לָכֶם', לָכֶם = לָ + כֶם ('to you plural'); the true articles are הַ + חֹדֶשׁ and הַ + זֶּה. In 'אפשר לחשוד באי מי', לחשוד is an infinitive and stays whole, never ל + חשוד; contrast 'במהלך שנת 2008' = ב + מהלך + שנת + 2008. In 'התוצאה תהיה תמיד התמוטטות ונפילה', התמוטטות is a whole noun 'collapse', never ה + תמוטטות; contrast 'ההתאוששות מהתעלפות' = ה + התאוששות + מ + התעלפות. In 'נזק שיגרם מעצם ביצוע הבדיקה', מעצם ביצוע הבדיקה = מ + עצם + ביצוע + ה + בדיקה: מ is a productive 'from/by' preposition before the noun עצם, not a stem letter. In the legal phrase 'לפי הוראות המשפט', לפי הוראות המשפט = לפי + הוראות + ה + משפט: lexical preposition לפי ('according to') stays whole, not ל + פי; contrast ל + מעמד in 'זכאים למעמד'. In the housing-price phrase '(חדשות ויד שנייה)', ויד = ו + יד ('and second hand'); it is not the English loanword 'video' in this context. In the geographical range 'מחולון ועד רהט', מחולון = מ + חולון (from the city Holon), while מכוונות in 'דריסות מכוונות' stays whole (adjective, not מ + כוונות). In the pointed quotation 'אלא מ"הַחֹדֶשׁ הַזֶּה לָכֶם"', the quoted definite noun הַחֹדֶשׁ = הַ + חֹדֶשׁ (the month), even after a quotation mark; מ before the quotation mark is a separate preposition and הַזֶּה = הַ + זֶּה, whereas לָכֶם = לָ + כֶם. In 'הסיכון לנזק שיגרם מעצם ביצוע הבדיקה', לנזק = ל + נזק, and מעצם = מ + עצם; contrast 'הצעה לתת פטור' where לתת is a whole infinitive 'to give', never ל + תת. In 'ראיתי שיש הבדל בין השאילתה', הבדל ('a difference') is an entire noun with stem-initial ה, not ה + בדל; contrast השאילתה = ה + שאילתה. In 'נצפתה הישנות של השאת באותו שד', הישנות is the entire medical noun 'recurrence', not ה + ישנות ('the old ones'); in the very same sentence השאת = ה + שאת ('the tumor'), because שאת is the noun after the article. In the Rashi quotation '"בְּרֵאשִׁית" – אמר רבי יצחק ... מ"הַחֹדֶשׁ הַזֶּה לָכֶם"', pointed בְּרֵאשִׁית = בְּ + רֵאשִׁית ('in the beginning'), while the quote after מ contains הַחֹדֶשׁ = הַ + חֹדֶשׁ ('the month'); preserve quote punctuation as independent Segments, and do not mistake these preposition/article letters for root letters. In 'גורמת להרחבתם ולהפחתת לחץ הדם', ולהפחתת = ו + ל + הפחתת (and to reduction), not whole nor merely ו + להפחתת. In 'מתי הפסקת לאהוב אותי', לאהוב stays whole ('to love'), never ל + אהוב; contrast לרגע = ל + רגע. In 'ומבין 11 המפעילים', ו is an explicit conjunction: separate ו from the following host; uncertainty inside מבין does not justify keeping ומבין whole. Contrast ועדת הכספים: ועדת stays whole (stem-initial ו). AsWritten means no separable syntactic-word prefix in this context, not no grammatical morphology: infinitival ל stays attached to its verb. In 'כדי לשבור את תאוותו' and 'כדי לשבור תאוותו', לשבור stays whole; in 'אסור להתענות בשבת', להתענות stays whole; in 'רשאי ליתן רשות', ליתן stays whole; in 'כדי לצנן את האויר' and 'מותר להוסיף לו מים', לצנן and להוסיף stay whole; in 'החוב עשוי להימחק', להימחק stays whole; in 'לבדוק אם מוגפים תריסי החלונות', לבדוק stays whole; in 'אין לי מה להפסיד', להפסיד stays whole, but לי = ל + י. These are verb forms, never ל plus a remainder; contrast להם = ל + הם, לרגע = ל + רגע, and לזמן קצר = ל + זמן + קצר. A lexical host does not absorb an outer conjunction ו or relative/complementizer ש: in 'לתערובת הקמח ומערבבים', ומערבבים = ו + מערבבים; in 'בבני 50 ומעלה', ומעלה = ו + מעלה; in 'מומלץ שלא לבצעה', שלא = ש + לא; in 'כפי שמחויב לעשות', שמחויב = ש + מחויב; in 'מצנן אוויר חשמלי, שמלבד הרוח', שמלבד = ש + מלבד; in 'ומה טעם פתח בבראשית', ומה = ו + מה (מה stays whole). In 'ברציפות שבה נרשמת' and 'בהצבעת מפעילים שבה 11', שבה = ש + ב + ה; in 'אין יום שבו לא מתרחשים', שבו = ש + ב + ו: the final ה/ו is a written pronoun piece, not an article/conjunction. In 'ומבין 11 המפעילים', the outer ו must split even if the internal analysis of מבין is uncertain; that uncertainty is not a reason to choose AsWritten for ומבין. Keeping infinitival ל with its verb does not absorb a preposition before a non-verb or outside that infinitive. In 'יש לגשת לאחת מתחנות הצילום', לאחת = ל + אחת ('to one of'), not an infinitive; לגשת stays whole. In 'גורמת להאטת קצב הלב', להאטת = ל + האטת: האטת is a construct noun ('slowing of'), unlike the whole infinitive להאט. In 'גורמת להרחבתם ולהפחתת לחץ הדם', להרחבתם = ל + הרחבתם: הרחבתם is a noun with its suffix retained, unlike the whole infinitive להרחיב; ולהפחתת = ו + ל + הפחתת. In 'נמנע מלדווח על האירוע', מלדווח = מ + לדווח: the outer preposition מ separates, while infinitival ל stays inside לדווח, never מ + ל + דווח. Decide each outer source prefix from its contextual function without absorbing it merely because its host is lexical or inflected; retain letters that belong to the host itself. In 'אופים כשעה ו-20 דקות', כשעה = כ + שעה ('about an hour'): שעה remains the whole noun, not ש + עה, and כ is approximation, not temporal כש ('when'). In 'בחרו בהגדרות ואז בחרו בכל ההגדרות', ואז = ו + אז ('and then'); the adverb אז does not absorb the conjunction. In 'והאריה ובהיותו ערמומי וחכם', separate the outer conjunction ו in ובהיותו; uncertainty about boundaries inside בהיותו does not make the entire ובהיותו AsWritten. This outer-boundary example does not prescribe the host's internal segmentation. In 'רצוי שההנקה הראשונית תיעשה', שההנקה = ש + ה + הנקה: relative/complementizer ש and the true article ה separate, while the next ה belongs to the noun הנקה ('breastfeeding') and remains in that stem. In 'לזמן את ד"ר קמיר לשימוע ולברר', לשימוע = ל + שימוע ('to a hearing'), a preposition before a noun; contrast לשמוע ('to hear'), a whole infinitive. לזמן and לברר remain whole verb forms after any outer conjunction. In 'בתקופת הצנע והציעה פתרון קל ויעיל', והציעה = ו + הציעה ('and offered'): ו separates but ה is part of the finite verb הציעה, not an article before ציעה. In 'כדי ללמוד כיצד לגשת בקלות למשאב הנהדר הזה', למשאב = ל + משאב ('to the resource'), a preposition before the noun משאב; ללמוד and לגשת remain whole infinitives in the very same sentence. In 'לקשור את חסימתו ... לעניין התלונה', לעניין = ל + עניין: the linking target is the noun עניין ('matter of the complaint'), with no unwritten ה inserted. Contrast the synthetic example 'כדי לעניין צרכנים', where לעניין ('to interest consumers') is a whole infinitive; decide by context, not spelling alone. In the fable 'והאריה ובהיותו ערמומי וחכם', the outer ו in ובהיותו coordinates a new clause ('and, being cunning and wise'): it is a conjunction before the host בהיותו, not part of that host's lexical or inflected form. Establish that outer syntactic boundary independently of any further analysis inside בהיותו; this example does not prescribe its internal boundaries. In 'עצב הווגוס מעצבב', הווגוס = ה + ווגוס: ה is a true definite article before the loan noun ווגוס ('vagus'). Retain both written ו letters in ווגוס; neither is an extra conjunction to strip. Contrast stem-initial ה in the whole noun הבדל ('difference'). In the geographical range 'מחולון ועד רהט, נתניה ועד הגליל', each ועד = ו + עד: conjunction ו precedes the preposition עד ('as far as'), in both range phrases. Contrast 'ועד ראשי הרשויות' and 'ועדת הכספים': committee nouns ועד and ועדת stay whole. The spelling ועד alone does not decide between a committee noun and conjunction plus preposition; its syntactic role in this sentence does. In 'למי שבן משפחתו', שבן = ש + בן: relative ש precedes the construct noun בן ('family member'); בן does not absorb ש. Do not strip the noun בן into ב + ן. In 'אף אחד מהם', מהם = מ + הם ('of them'): separate the preposition מ and retain the written plural pronoun הם intact, never מ + ה + ם; ה is not an article here. Contrast מהימים = מ + ה + ימים, with a true article. Choose only a grammatically valid plan in context. In 'ושניהם בחרו באלימות', ושניהם = ו + שניהם: conjunction ו coordinates the clause; retain שניהם intact, not ש + ניהם. In 'הסיבות האפשריות להתעלפות', להתעלפות = ל + התעלפות: ל precedes the event noun התעלפות, not an infinitive; retain the noun intact. In 'בנושאי משק וכלכלה', וכלכלה = ו + כלכלה: conjunction ו coordinates the nouns; retain כלכלה intact, not כ + לכלה. In 'יותר משלוש שנים', משלוש = מ + שלוש: comparative מ precedes the numeral שלוש; retain the numeral intact, not ש + לוש. In 'מסייעות לכיווץ רחם האם', לכיווץ = ל + כיווץ: ל precedes the event noun כיווץ, not an infinitive; retain the noun intact, not כ + יווץ. In 'לצורך בחינת כשירות', בחינת stays whole: it is the construct noun of בחינה, not preposition ב + חינת. In 'סיבוכים הנובעים מעצם הבירור', הנובעים = ה + נובעים: grammatical ה introduces the modifying participle; keep a separate source Segment ה and retain נובעים intact. In 'לא הוצג כלום', הוצג stays whole: it is a finite passive Hufal verb; ה belongs to the verb stem, not an article, so do not split ה + וצג. In 'עם שאת צינורית מסתננת' and '(שאת < 2 ס"מ)', both occurrences of שאת are the medical noun 'neoplasm' and stay whole, not ש + את. In 'לגשת בקלות למשאב', בקלות = ב + קלות ('with ease'): preposition plus noun. In 'קבוצת הטיה', הטיה is the whole noun 'bias'; its initial ה belongs to the stem, not an article, so do not split ה + טיה.`,
			Object.fromEntries(
				run.plans.map((plan) => [
					plan.key,
					plan.key === "AsWritten"
						? `${run.text} — no separable syntactic-word prefix in context; lexical or inflected form stays whole, including infinitival ל with its verb`
						: `${plan.segments.map(({ text }) => text).join(" + ")} — ${
								(
									{
										TemporalMishe:
											"temporal מש meaning once or since is one clickable connector",
										TemporalKshe:
											"temporal כש meaning when is one clickable connector",
										TerminalGereshPunctuation:
											"terminal geresh as punctuation",
										InternalAsciiQuotePunctuation:
											"ASCII quote as punctuation",
										CompoundParts:
											"contextual compound parts",
									} as Readonly<Record<string, string>>
								)[plan.key] ??
								"independently clickable grammatical prefix(es) and remainder"
							}`,
				]),
			),
		);
	}
	return { text, runs, questions, state: { sentence: text, written } };
}

function assemble(
	prepared: PreparedSegments,
	answers: Answers,
): SentenceSegmentation {
	const segments: Segment[] = [];
	const unresolved: number[] = [];
	for (const [index, run] of prepared.runs.entries()) {
		const question = `source_${index}`;
		const answer =
			question in prepared.questions
				? choiceOf(answers, question)
				: undefined;
		const chosen =
			answer && (answer.probabilities[answer.choice] ?? 0) >= planFloor
				? run.plans.find(({ key }) => key === answer.choice)
				: undefined;
		const plan = chosen ?? (answer ? undefined : run.plans[0]);
		if (plan === undefined) {
			unresolved.push(segments.length);
			segments.push(resolvable(run.text));
		} else segments.push(...plan.segments);
	}
	return { text: prepared.text, segments, unresolved };
}

export const segmentHebrewSentence = Effect.fnUntraced(function* (
	sentence: string,
	ask: Ask,
): Effect.fn.Return<SentenceSegmentation, AskFailure> {
	const prepared = prepare(sentence);
	const entries = Object.entries(prepared.questions);
	const askBatch = (
		subset: typeof entries,
	): Effect.Effect<Answers, AskFailure> =>
		Effect.gen(function* () {
			const response = yield* Effect.result(
				askAny(ask, {
					stage: "segments",
					state: prepared.state,
					questions: Object.fromEntries(subset),
				}),
			);
			if (Result.isSuccess(response)) return response.success;
			const failure = response.failure;
			const cause =
				failure._tag === "ProviderFailure" ? failure.cause : undefined;
			if (
				subset.length < 2 ||
				!(cause instanceof Error) ||
				!("status" in cause && cause.status === 400) ||
				!cause.message.includes('"error_type":"max_tokens_exceeded"')
			)
				return yield* Effect.fail(failure);
			const middle = Math.floor(subset.length / 2);
			const left = yield* askBatch(subset.slice(0, middle));
			const right = yield* askBatch(subset.slice(middle));
			return { ...left, ...right };
		});
	const answers: Record<string, Answers[string]> = {};
	for (
		let start = 0;
		start < entries.length;
		start += maxHebrewQuestionsPerAsk
	)
		Object.assign(
			answers,
			yield* askBatch(
				entries.slice(start, start + maxHebrewQuestionsPerAsk),
			),
		);
	return assemble(prepared, answers);
});

export function writtenHebrewSegments(sentence: string): SentenceSegmentation {
	const prepared = prepare(sentence);
	return assemble(
		prepared,
		Object.fromEntries(
			Object.keys(prepared.questions).map((id) => [
				id,
				{
					type: "choice",
					choice: "Unresolved",
					confidence: 0,
					probabilities: {},
				},
			]),
		),
	);
}
