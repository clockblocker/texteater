/**
 * The fixed sentences the playground renders, with their gold (issue 496).
 *
 * Gold members are written as `text[#n][@fused][:Role]`: the n-th occurrence
 * of `text` as a whole Segment, or the component `text` of the fused word
 * `fused`; the role is scored only when written. `identity` names the
 * closed-class head's headword group as `Kind:headword`.
 */
export type GoldSpec = {
	readonly kind: string;
	readonly members: readonly string[];
	readonly identity?: string;
};

export type FixtureSpec = {
	readonly id: string;
	readonly text: string;
	readonly note: string;
	readonly gold: readonly GoldSpec[];
};

const t = (
	kind: string,
	members: readonly string[],
	identity?: string,
): GoldSpec => ({ kind, members, ...(identity ? { identity } : {}) });

export const fixtureSentences: readonly FixtureSpec[] = [
	{
		id: "kakao",
		text: "Der heiße Kakao schmeckt gut.",
		note: "The owned article joins the noun across an adjective.",
		gold: [
			t("NOUN", ["Der:Article", "Kakao:Head"]),
			t("ADJ", ["heiße"]),
			t("VERB", ["schmeckt"]),
			t("ADJ", ["gut"]),
		],
	},
	{
		id: "kino",
		text: "Wir gehen heute ins Kino.",
		note: "A fused word: `ins` is `in` plus `s` standing for `das`, and the article piece joins the noun.",
		gold: [
			t("PRON", ["Wir"], "PRON:wir"),
			t("VERB", ["gehen"]),
			t("ADV", ["heute"]),
			t("ADP", ["in@ins"]),
			t("NOUN", ["s@ins:Article", "Kino:Head"]),
		],
	},
	{
		id: "aufstehen",
		text: "Meine Schwester steht jeden Morgen um sechs auf.",
		note: "A discontinuous separable verb; two determiners with authored identities.",
		gold: [
			t("DET", ["Meine"], "DET:mein"),
			t("NOUN", ["Schwester"]),
			t("VERB", ["steht:Head", "auf:SeparableParticle"]),
			t("DET", ["jeden"], "DET:jeder"),
			t("NOUN", ["Morgen"]),
			t("ADP", ["um"]),
			t("NUM", ["sechs"]),
		],
	},
	{
		id: "erinnert",
		text: "Er hat sich gestern an seinen Bruder erinnert.",
		note: "Auxiliary, required reflexive and governed preposition on one verb, spread over the sentence.",
		gold: [
			t("PRON", ["Er"], "PRON:er"),
			t("VERB", [
				"hat:Auxiliary",
				"sich:Reflexive",
				"an:GovernedPreposition",
				"erinnert:Head",
			]),
			t("ADV", ["gestern"]),
			t("DET", ["seinen"], "DET:sein"),
			t("NOUN", ["Bruder"]),
		],
	},
	{
		id: "ausweg",
		text: "Es gibt keinen Ausweg.",
		note: "Expletive `es` belongs to the verb; `kein` is a determiner, never an article.",
		gold: [
			t("VERB", ["Es:Expletive", "gibt:Head"]),
			t("DET", ["keinen"], "DET:kein"),
			t("NOUN", ["Ausweg"]),
		],
	},
	{
		id: "relativ",
		text: "Die Frau, die dort wartet, kennt niemanden.",
		note: "The same spelling as article and as relative pronoun; a negative pronoun with one authored identity.",
		gold: [
			t("NOUN", ["Die:Article", "Frau:Head"]),
			t("PRON", ["die"], "PRON:die"),
			t("ADV", ["dort"]),
			t("VERB", ["wartet"]),
			t("VERB", ["kennt"]),
			t("PRON", ["niemanden"], "PRON:niemanden"),
		],
	},
	{
		id: "passiv",
		text: "Das Paket wird morgen geliefert.",
		note: "The process passive: `wird` is an Auxiliary member whose AUX Reading derives from the shape.",
		gold: [
			t("NOUN", ["Das:Article", "Paket:Head"]),
			t("VERB", ["wird:Auxiliary", "geliefert:Head"]),
			t("ADV", ["morgen"]),
		],
	},
	{
		id: "faden",
		text: "Er hat den Faden verloren.",
		note: "An idiom: the whole expression lights up, auxiliary and article included.",
		gold: [
			t("PRON", ["Er"], "PRON:er"),
			t("Idiom", ["hat:Auxiliary", "den", "Faden", "verloren"]),
		],
	},
	{
		id: "usw",
		text: "Anna kauft Obst, Gemüse usw. auf dem Markt.",
		note: "An abbreviation is one Segment whose surface is its expansion.",
		gold: [
			t("PROPN", ["Anna"]),
			t("VERB", ["kauft"]),
			t("NOUN", ["Obst"]),
			t("NOUN", ["Gemüse"]),
			t("ADV", ["usw."]),
			t("ADP", ["auf"]),
			t("NOUN", ["dem:Article", "Markt:Head"]),
		],
	},
	{
		id: "museum",
		text: "Das Museum öffnet z.B. am Montag erst um zehn.",
		note: "A dotted abbreviation and the fusion `am`.",
		gold: [
			t("NOUN", ["Das:Article", "Museum:Head"]),
			t("VERB", ["öffnet"]),
			t("ADV", ["z.B."]),
			t("ADP", ["a@am"]),
			t("NOUN", ["m@am:Article", "Montag:Head"]),
			t("ADV", ["erst"]),
			t("ADP", ["um"]),
			t("NUM", ["zehn"]),
		],
	},
	{
		id: "genitiv",
		text: "Das Haus des Nachbarn ist alt.",
		note: "A genitive article; `des` is not an authored article spelling, so its identity comes from the noun.",
		gold: [
			t("NOUN", ["Das:Article", "Haus:Head"]),
			t("NOUN", ["des:Article", "Nachbarn:Head"]),
			t("VERB", ["ist"]),
			t("ADJ", ["alt"]),
		],
	},
	{
		id: "typo",
		text: "Ihc habe leider keine Zeit.",
		note: "A typo on a pronoun: the route says PRON, the table has no candidate, so the identity is a Miss.",
		gold: [
			t("PRON", ["Ihc"]),
			t("VERB", ["habe"]),
			t("ADV", ["leider"]),
			t("DET", ["keine"], "DET:kein"),
			t("NOUN", ["Zeit"]),
		],
	},
	{
		id: "klitik",
		text: "Wie geht's dir heute?",
		note: "An apostrophe clitic: `s` stands for `es`, the expletive of `es geht`.",
		gold: [
			t("ADV", ["Wie"]),
			t("VERB", ["geht:Head", "s:Expletive"]),
			t("PRON", ["dir"], "PRON:dir"),
			t("ADV", ["heute"]),
		],
	},
	{
		id: "verfuegung",
		text: "Der Lehrer stellt den Schülern Material zur Verfügung.",
		note: "A Funktionsverbgefüge that should be one Collocation and today never fires; `zur` is fused.",
		gold: [
			t("NOUN", ["Der:Article", "Lehrer:Head"]),
			t("Collocation", ["stellt", "zu@zur", "r@zur", "Verfügung"]),
			t("NOUN", ["den:Article", "Schülern:Head"]),
			t("NOUN", ["Material"]),
		],
	},
	{
		id: "manche",
		text: "Manche kommen früh, viele gehen spät.",
		note: "Standalone quantifiers are pronouns; the DET twin is the trap.",
		gold: [
			t("PRON", ["Manche"], "PRON:manche"),
			t("VERB", ["kommen"]),
			t("ADJ", ["früh"]),
			t("PRON", ["viele"], "PRON:viele"),
			t("VERB", ["gehen"]),
			t("ADJ", ["spät"]),
		],
	},
	{
		id: "fremd",
		text: "Das Meeting war very good.",
		note: "Code-switched words: no multilingual support, so they are X or Unresolved.",
		gold: [
			t("NOUN", ["Das:Article", "Meeting:Head"]),
			t("VERB", ["war"]),
			t("X", ["very"]),
			t("X", ["good"]),
		],
	},
];
