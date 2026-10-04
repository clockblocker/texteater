import type * as Dumling from "dumling/types";
import type { AuthoredMember } from "../../../../member.js";

/** A modal particle's Lemma: PART with partType Mod (#734). */
export function modalParticleLemma(canonicalForm: string) {
	return {
		language: "de",
		family: "Lexeme",
		kind: "PART",
		canonicalForm,
		coreFeatures: {
			partType: "Mod",
			polarity: null,
		},
		unitKind: "Lemma",
	} satisfies Dumling.Lemma<"de">;
}

/** One modal sense of a particle: its own Reading. */
interface ModalSense {
	readonly emoji: string;
	readonly definition: string;
	readonly en: readonly string[];
	readonly ru: readonly string[];
	readonly synonym?: readonly string[];
	readonly nearSynonym?: readonly string[];
}

/** A modal particle, its Duden Partikel headword and its modal senses. */
interface ModalParticle {
	readonly text: string;
	readonly ipa: string;
	readonly duden: string;
	readonly senses: readonly ModalSense[];
}

/**
 * The modal senses of each particle's Duden Partikel headword, one Reading
 * each; two senses share a Reading where their Emoji Descriptions would not
 * differ (ADR 0031). Focus, degree, temporal, answer and conjunction senses
 * of the same spellings are other words, not members (#734). mal is
 * authored in mal.ts.
 */
const particles: readonly ModalParticle[] = [
	{
		text: "aber",
		ipa: "ˈaːbɐ",
		duden: "https://www.duden.de/rechtschreibung/aber_Partikel",
		senses: [
			{
				emoji: "😲",
				definition:
					"Gibt einem Ausruf Nachdruck und zeigt die gefühlsmäßige Anteilnahme des Sprechers, oft sein Erstaunen: Du spielst aber gut! Die sind aber dick! Das ist aber schön!",
				en: ["really", "(in exclamations) but"],
				ru: ["же", "ну и"],
			},
		],
	},
	{
		text: "auch",
		ipa: "aʊ̯x",
		duden: "https://www.duden.de/rechtschreibung/auch_Partikel_verstaerkend",
		senses: [
			{
				emoji: "😤",
				definition:
					"Drückt gefühlsmäßige Anteilnahme, Ärger oder Verwunderung aus: Du bist aber auch stur! Warum kommst du auch so spät? Der ist auch überall dabei.",
				en: ["really", "(annoyed) have to"],
				ru: ["и", "же"],
			},
			{
				emoji: "✅",
				definition:
					"Bekräftigt oder begründet eine vorangegangene Aussage: Sie sah krank aus, und sie war es auch. Ich gehe jetzt, es ist auch schon spät.",
				en: ["indeed", "after all"],
				ru: ["и", "ведь"],
			},
			{
				emoji: "🤔",
				definition:
					"Drückt im Fragesatz einen Zweifel oder eine Unsicherheit aus: Hast du dir das auch überlegt? Darf er das auch tun?",
				en: ["really", "(in questions) definitely"],
				ru: ["точно", "действительно"],
			},
		],
	},
	{
		text: "bloß",
		ipa: "bloːs",
		duden: "https://www.duden.de/rechtschreibung/blosz_Partikel",
		senses: [
			{
				emoji: "⚠",
				definition:
					"Verleiht einer Aufforderung oder Warnung besonderen Nachdruck: Lass mich bloß in Ruhe damit! Komm bloß nicht zu spät!",
				en: ["just", "(warning) better"],
				ru: ["только", "смотри"],
			},
			{
				emoji: "😟",
				definition:
					"Drückt in Fragen, auf die man keine Antwort erwartet, aus, dass einen die Frage beschäftigt und nicht loslässt: Warum tut er das bloß? Was soll ich bloß machen?",
				en: ["on earth", "ever"],
				ru: ["же", "только"],
			},
			{
				emoji: "🙏",
				definition:
					"Verleiht einem Wunsch besonderen Nachdruck: Wäre ich bloß zu Hause geblieben! Wenn ich bloß erst dort wäre!",
				en: ["if only"],
				ru: ["только бы", "если бы только"],
			},
		],
	},
	{
		text: "denn",
		ipa: "dɛn",
		duden: "https://www.duden.de/rechtschreibung/denn_verstaerkende_Partikel",
		senses: [
			{
				emoji: "❓",
				definition:
					"Drückt in Fragesätzen Anteilnahme, lebhaftes Interesse, Ungeduld oder Zweifel aus: Was ist denn mit ihm? Wer war denn das? Hast du denn so viel Geld?",
				en: ["then", "(in questions) so"],
				ru: ["же", "а"],
			},
			{
				emoji: "🙄",
				definition:
					"Steht in rhetorischen Fragen, auf die man keine Antwort erwartet: Bist du denn taub? Kannst du denn nicht hören?",
				en: ["(rhetorical) or what", "really"],
				ru: ["что ли", "разве"],
			},
		],
	},
	{
		text: "doch",
		ipa: "dɔx",
		duden: "https://www.duden.de/rechtschreibung/doch_Partikel",
		senses: [
			{
				emoji: "👉",
				definition:
					"Gibt einer Aufforderung oder einem Wunsch Nachdruck und macht sie dringlicher oder freundlicher: Pass doch auf! Komm doch mal her! Geh doch endlich!",
				en: ["do (with an imperative)", "just"],
				ru: ["же", "-ка"],
			},
			{
				emoji: "💡",
				definition:
					"Erinnert in einer Aussage an etwas, das der Hörer weiß oder wissen müsste: Das hast du doch gewusst. Wir waren doch gestern dort.",
				en: ["after all", "you know"],
				ru: ["ведь", "же"],
			},
			{
				emoji: "😠",
				definition:
					"Drückt in Ausrufesätzen Entrüstung, Unmut oder Verwunderung aus: Das ist doch zu blöd! Du musst doch immer meckern! Was man doch alles so hört!",
				en: ["really", "(indignant) honestly"],
				ru: ["же", "ведь"],
			},
			{
				emoji: "🤞",
				definition:
					"Drückt in Fragesätzen die Hoffnung des Sprechers auf Zustimmung aus: Ihr kommt doch heute Abend? Du betrügst mich doch nicht?",
				en: ["surely", "(tag) won't you"],
				ru: ["ведь", "же"],
			},
			{
				emoji: "🤔",
				definition:
					"Drückt in Fragesätzen aus, dass man nach etwas Bekanntem fragt, das einem gerade nicht einfällt: Wie heißt er doch gleich? Wie war das doch?",
				en: ["again"],
				ru: ["бишь", "там"],
			},
		],
	},
	{
		text: "eben",
		ipa: "ˈeːbn̩",
		duden: "https://www.duden.de/rechtschreibung/eben_genau",
		senses: [
			{
				emoji: "🤷",
				definition:
					"Verstärkt eine resignierte Feststellung oder fasst Vorangegangenes bestätigend zusammen: Er ist eben zu nichts zu gebrauchen. Das ist eben so. Du hättest ihn eben nicht ärgern sollen.",
				en: ["just", "simply"],
				ru: ["просто", "уж"],
			},
		],
	},
	{
		text: "eigentlich",
		ipa: "ˈaɪ̯ɡn̩tlɪç",
		duden: "https://www.duden.de/rechtschreibung/eigentlich_ueberhaupt_uebrigens",
		senses: [
			{
				emoji: "🧐",
				definition:
					"Verstärkt oder relativiert besonders in Fragesätzen eine Anteilnahme oder einen Vorwurf: Wie heißt du eigentlich? Was denkst du dir eigentlich? Bist du eigentlich noch bei Trost?",
				en: ["actually", "anyway"],
				ru: ["вообще", "собственно"],
			},
			{
				emoji: "💭",
				definition:
					"Gibt einer Frage etwas Beiläufiges, als sei sie ein spontaner Einfall: Kennen Sie eigentlich diese Malerin? Kannst du eigentlich Klavier spielen?",
				en: ["by the way"],
				ru: ["кстати", "а"],
			},
		],
	},
	{
		text: "einfach",
		ipa: "ˈaɪ̯nfax",
		duden: "https://www.duden.de/rechtschreibung/einfach_vollkommen_wirklich",
		senses: [
			{
				emoji: "🤷",
				definition:
					"Drückt aus, dass zum Gesagten nichts weiter zu sagen oder in Frage zu stellen ist: Es ist einfach so. Ich kann es mir einfach nicht vorstellen. Dazu fehlt mir einfach die Zeit.",
				en: ["simply", "just"],
				ru: ["просто"],
			},
			{
				emoji: "👍",
				definition:
					"Drückt in Aufforderungen aus, dass es naheliegt, ihnen zu folgen: Komm doch einfach mit! Frag ihn doch einfach mal! Warum fragst du ihn nicht einfach?",
				en: ["just"],
				ru: ["просто", "возьми и"],
			},
			{
				emoji: "😳",
				definition:
					"Drückt Unverständnis für ein Verhalten aus: Sie lief einfach weg. Er hat einfach nicht bezahlt.",
				en: ["just", "simply"],
				ru: ["просто взял и", "взяла и"],
			},
			{
				emoji: "🤩",
				definition:
					"Gibt einem Ausruf eine stärkere gefühlsmäßige Färbung (umgangssprachlich): Das ist einfach toll! Das ist einfach unmöglich!",
				en: ["simply", "just"],
				ru: ["просто"],
			},
		],
	},
	{
		text: "einmal",
		ipa: "ˈaɪ̯nmaːl",
		duden: "https://www.duden.de/rechtschreibung/einmal_schon_nun_sogar",
		senses: [
			{
				emoji: "🫴",
				definition:
					"Verstärkt oder mildert Aussagen, Fragen und Aufforderungen: Es ist nun einmal geschehen. Darf ich auch einmal probieren? Komm doch einmal her! Sieh einmal!",
				en: ["just"],
				ru: ["-ка", "же"],
			},
		],
	},
	{
		text: "etwa",
		ipa: "ˈɛtva",
		duden: "https://www.duden.de/rechtschreibung/etwa_eventuell",
		senses: [
			{
				emoji: "😨",
				definition:
					"Drückt in Entscheidungsfragen aus, dass man auf eine verneinende Antwort hofft und über eine bejahende bestürzt wäre: Ist er etwa krank? Hat sie es etwa nicht gewusst?",
				en: ["by any chance", "don't tell me"],
				ru: ["неужели", "случайно не"],
			},
			{
				emoji: "😒",
				definition:
					"Gibt einer Entscheidungsfrage einen vorwurfsvollen Unterton und erwartet unbedingt eine verneinende Antwort: Ist das etwa in Ordnung? Ist es etwa nicht seine Schuld?",
				en: ["really", "(reproachful) perhaps"],
				ru: ["разве", "что, … ли"],
			},
			{
				emoji: "🎲",
				definition:
					"Drückt in Bedingungssätzen aus, dass man kaum mit dem genannten Fall rechnet: Wenn er etwa doch noch kommt, dann sag es ihm bitte.",
				en: ["by any chance", "should"],
				ru: ["вдруг", "случайно"],
			},
			{
				emoji: "🙅",
				definition:
					"Drückt in verneinten Aussagen aus, dass es sich keineswegs so verhält, wie es scheinen könnte: Er hat es aber nicht etwa mit Absicht getan. Ich habe es nicht etwa vergessen.",
				en: ["(not) as you might think", "by no means"],
				ru: ["вовсе не", "отнюдь не"],
			},
		],
	},
	{
		text: "halt",
		ipa: "halt",
		duden: "https://www.duden.de/rechtschreibung/halt_nun_eben_nun_einmal",
		senses: [
			{
				emoji: "🤷",
				definition:
					"Drückt aus, dass es sich um eine offensichtliche, unabänderliche oder banale Tatsache handelt: Das ist halt so. Es macht halt Spaß.",
				en: ["just", "simply"],
				ru: ["просто", "уж"],
				nearSynonym: ["eben"],
			},
			{
				emoji: "🤝",
				definition:
					"Drückt im Gespräch mit mehreren aus, dass einige das Thema kennen, andere eher nicht: Damals war halt richtig was los.",
				en: ["you know"],
				ru: ["ведь", "же"],
			},
			{
				emoji: "🤷👉",
				definition:
					"Drückt in Aufforderungen aus, dass der andere ihnen folgen sollte, weil es keine bessere Möglichkeit gibt: Dann gib es ihr halt zurück! Wenn du es unbedingt möchtest, dann kauf es dir halt.",
				en: ["just", "then"],
				ru: ["уж", "тогда просто"],
			},
			{
				emoji: "❗",
				definition:
					"Verstärkt eine Aussage oder Behauptung: Ich meine halt, da müssten wir unbedingt helfen. Du musst dich halt wehren.",
				en: ["just"],
				ru: ["же", "просто"],
			},
		],
	},
	{
		text: "ja",
		ipa: "jaː",
		duden: "https://www.duden.de/rechtschreibung/ja",
		senses: [
			{
				emoji: "🤝",
				definition:
					"Weist in einer Aussage auf etwas Bekanntes hin, fasst zusammen, begründet oder stellt Neues als gemeinsam Gewusstes dar: Du kennst ihn ja. Das habe ich ja gewusst. Ich komme ja schon. Wir wohnen ja in Berlin.",
				en: ["as you know", "after all"],
				ru: ["ведь", "же"],
			},
			{
				emoji: "😮",
				definition:
					"Drückt im Aussage- oder Ausrufesatz Erstaunen oder Ironie aus: Es schneit ja! Da seid ihr ja endlich! Das kann ja heiter werden.",
				en: ["why", "really"],
				ru: ["да ведь", "же"],
			},
			{
				emoji: "⚖",
				definition:
					"Schränkt ein, meist mit folgendem aber: Ich möchte ja, aber ich kann nicht. Der Wagen ist ja schön, aber viel zu teuer. Sie mag ja recht haben.",
				en: ["admittedly", "sure"],
				ru: ["правда", "конечно"],
			},
			{
				emoji: "⚠",
				definition:
					"Drückt betont in Aufforderungen eine dringende Mahnung aus: Lass das ja sein! Erzähl das ja nicht weiter! Zieh dich ja warm an!",
				en: ["be sure to", "(not) on any account"],
				ru: ["смотри", "ни в коем случае (не)"],
			},
		],
	},
	{
		text: "nur",
		ipa: "nuːɐ̯",
		duden: "https://www.duden.de/rechtschreibung/nur_denn_doch",
		senses: [
			{
				emoji: "😟",
				definition:
					"Gibt einer Frage Nachdruck und drückt Anteilnahme, Beunruhigung oder Verwunderung aus: Warum hat er das nur gemacht? Was hat er nur?",
				en: ["on earth", "ever"],
				ru: ["же", "только"],
			},
			{
				emoji: "👍",
				definition:
					"Drückt in Aussage- und Aufforderungssätzen eine Beruhigung oder Ermunterung aus: Nimm dir nur, was du brauchst! Iss nur!",
				en: ["go ahead and", "just"],
				ru: ["смело", "давай"],
			},
			{
				emoji: "🙏",
				definition:
					"Verstärkt einen Ausruf oder Wunsch: Wenn er nur käme! Hätte ich nur nichts gesagt!",
				en: ["if only"],
				ru: ["лишь бы", "только бы"],
			},
		],
	},
	{
		text: "ruhig",
		ipa: "ˈʁuːɪç",
		duden: "https://www.duden.de/rechtschreibung/ruhig_getrost_meinetwegen",
		senses: [
			{
				emoji: "🤷",
				definition:
					"Drückt Gleichgültigkeit oder Gelassenheit des Sprechers aus; meinetwegen: Soll er ruhig schreien.",
				en: ["for all I care", "let (him)"],
				ru: ["пусть себе", "да пусть"],
			},
			{
				emoji: "👌",
				definition:
					"Drückt freundliches Einverständnis oder ein Zugeständnis aus; wenn du möchtest: Sehen Sie sich ruhig um, Sie brauchen nichts zu kaufen. Komm ruhig herein!",
				en: ["feel free to", "go ahead and"],
				ru: ["спокойно", "смело"],
			},
			{
				emoji: "😌",
				definition:
					"Drückt eine Ermunterung aus; unbesorgt, getrost: Das könnt ihr mir ruhig glauben. Dir kann ich es ja ruhig sagen.",
				en: ["safely", "rest assured"],
				ru: ["смело", "вполне"],
			},
		],
	},
	{
		text: "schon",
		ipa: "ʃoːn",
		duden: "https://www.duden.de/rechtschreibung/schon_gewiss_blosz_noch",
		senses: [
			{
				emoji: "❗",
				definition:
					"Verstärkt gefühlsmäßig eine Aussage oder Feststellung: Es ist schon ein Elend! Das will schon was heißen.",
				en: ["really", "certainly"],
				ru: ["уж", "действительно"],
			},
			{
				emoji: "😤",
				definition:
					"Drückt in Aufforderungen Ungeduld aus (umgangssprachlich): Nun mach doch schon! Hör schon auf mit diesem Blödsinn!",
				en: ["come on", "(hurry) up"],
				ru: ["же", "давай уже"],
			},
			{
				emoji: "➡",
				definition:
					"Drückt aus, dass man, wenn eine Absicht schon verwirklicht wird, eine bestimmte Folge erwartet: Wenn wir schon eine neue Waschmaschine kaufen müssen, dann aber eine gute.",
				en: ["(if …) anyway", "already"],
				ru: ["раз уж", "уж"],
			},
			{
				emoji: "😌",
				definition:
					"Unterstreicht zuversichtlich gegen bestehende Zweifel die Wahrscheinlichkeit einer Aussage: Es wird schon gut gehen. Das wirst du schon schaffen. Das wird schon klappen.",
				en: ["surely", "(it'll be) all right"],
				ru: ["обязательно", "уж как-нибудь"],
			},
			{
				emoji: "🙄",
				definition:
					"Macht eine Frage als rhetorische Frage kenntlich, oft mit geringschätzigem Unterton: Was sind schon zwei Jahre? Wen interessiert das schon?",
				en: ["(rhetorical) after all", "really"],
				ru: ["уж", "то"],
			},
		],
	},
	{
		text: "vielleicht",
		ipa: "fiˈlaɪ̯çt",
		duden: "https://www.duden.de/rechtschreibung/vielleicht_etwa_tatsaechlich",
		senses: [
			{
				emoji: "🤯",
				definition:
					"Gibt einem Ausruf gefühlsmäßigen Nachdruck und zeigt, in welch hohem Maß etwas zutrifft; wirklich, in der Tat: Ich war vielleicht aufgeregt! Das war vielleicht ein Spaß!",
				en: ["(oh) boy", "really"],
				ru: ["ну и", "вот это"],
			},
			{
				emoji: "😒",
				definition:
					"Drückt in einer Entscheidungsfrage aus, dass der Fragende eine verneinende Antwort voraussetzt oder erwartet: Ist das vielleicht eine Lösung? Ist das vielleicht unsere Schuld?",
				en: ["really", "(reproachful) perhaps"],
				ru: ["разве", "что, … ли"],
			},
		],
	},
	{
		text: "wohl",
		ipa: "voːl",
		duden: "https://www.duden.de/rechtschreibung/wohl_vermutlich_doch",
		senses: [
			{
				emoji: "🤔",
				definition:
					"Drückt in Aussage- und rhetorischen Fragesätzen eine Annahme oder Vermutung des Sprechers aus; vermutlich: Das wird wohl so sein. Die Zeit wird wohl kaum reichen. Du hast wohl keine Zeit?",
				en: ["probably", "I suppose"],
				ru: ["наверное", "пожалуй"],
			},
			{
				emoji: "❗",
				definition:
					"Bekräftigt oder verstärkt eine Aussage oder Aufforderung: Man wird doch wohl fragen dürfen. Willst du wohl hören! Das kann man wohl sagen.",
				en: ["surely", "(will you) now"],
				ru: ["же", "уж"],
			},
		],
	},
];

function modalMember(
	particle: ModalParticle,
	sense: ModalSense,
): AuthoredMember {
	const lemma = modalParticleLemma(particle.text);
	const related = (forms: readonly string[] | undefined) =>
		forms?.length ? forms.map(modalParticleLemma) : undefined;
	const synonym = related(sense.synonym);
	const nearSynonym = related(sense.nearSynonym);
	return {
		lemma,
		reading: { unitKind: "Reading", emojiDescription: sense.emoji, lemma },
		knowledge: {
			transcription: particle.ipa,
			definition: sense.definition,
			translations: { en: [...sense.en], ru: [...sense.ru] },
			...(synonym || nearSynonym
				? {
						semanticRelations: {
							...(synonym ? { synonym } : {}),
							...(nearSynonym ? { nearSynonym } : {}),
						},
					}
				: {}),
		},
		coverage: {
			transcription: "Authored",
			definition: "Authored",
			translations: { en: "Authored", ru: "Authored" },
			semanticRelationTargetKind: "lemma",
			semanticRelations: {
				synonym: synonym ? "Authored" : "ReviewedEmpty",
				nearSynonym: nearSynonym ? "Authored" : "ReviewedEmpty",
				antonym: "ReviewedEmpty",
				nearAntonym: "ReviewedEmpty",
			},
		},
	};
}

/**
 * The authored German modal particles other than mal, one member per
 * Reading: PART with partType Mod (#734, Rule de/modal-particle-is-part).
 */
export const modalParticles: readonly AuthoredMember[] = particles.flatMap(
	(particle) => particle.senses.map((sense) => modalMember(particle, sense)),
);
