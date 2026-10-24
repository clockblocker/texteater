/**
 * The German true separable particles (Verbpartikeln), closed: an of
 * anziehen, hinaus of hinauslaufen, dar of darstellen. A particle verb's
 * first constituent links to the particle's Prefix Morpheme (`ein-` in
 * einkaufen, ADR 0050), and a compound particle is one piece: hinaus- is
 * one Prefix, and its own Breakdown gives hin + aus.
 *
 * A first part is a particle when its free form is a preposition or an
 * adverb (ab, auf, durch, weg, zurück, hinaus, dabei, auseinander) or it has
 * no free form (dar; preis of preisgeben, from French prise, not the noun
 * Preis: DWDS's Wortzerlegung of preisgeben leaves it unlinked). Duden, Die Grammatik (9th ed., 2016, Partikelverben)
 * and Fleischer/Barz, Wortbildung der deutschen Gegenwartssprache (4th ed.,
 * 2012, Partikelverben) call these the particles homonymous with
 * prepositions and adverbs. DWDS gives most of them an affix entry for
 * verbs (https://www.dwds.de/wb/ab-, …/los-, …/hinaus-, …/zurück-); the
 * ones it gives none are marked below. A first part that is a noun,
 * adjective or verb is no particle: see `germanSeparableLexemeParts`.
 *
 * The her- and hin- adverbs' r- shorthands (raus, rein) and the dar-
 * adverbs' dr- shorthands (dran, drauf) are listed as DWDS lists them
 * (…/raus-, …/drauf-); Rule de/r-adverb-is-her-or-hin-shorthand reads an
 * r- shorthand in running text as the her- or hin- particle it stands for.
 * Where a Canonical Form is itself spelled clipped (draufgehen 'die',
 * rausfliegen 'get fired'), the clipped form is a particle of its own and
 * links to its own Prefix Morpheme (`drauf-`, `raus-`), not as a Surface of
 * `darauf-` or `heraus-`: DWDS splits draufgehen as drauf- + gehen, and
 * calls raus- the umbrella over heraus- and hinaus-, a spelling of neither
 * (#1241).
 *
 * The adverbs DWDS gives no verbal affix entry (dabei, dazwischen, entzwei,
 * gegenüber, vorweg, zuvor, rückwärts, aufwärts, abwärts, vorwärts,
 * beiseite, inne, umhin, überein, vorher, zuwider) are true particles too,
 * as the user ruled on #1241 (2026-10-24): the Amtliches Regelwerk §34(1)
 * names most of them as Verbpartikeln, their free form is an adverb (round-1
 * Q6), and they are written attached to the verb.
 *
 * The rare particles are listed too (#1241, 2026-10-24), each checked
 * against Duden and DWDS: the adverbs with a noun inside that DWDS gives no
 * affix entry (zugute, zunichte, zuteil, zustatten, vonstatten, vorlieb,
 * überhand), bevor (bevorstehen), the einander adverbs (voneinander,
 * zueinander) and the clipped forms rum (rumkriegen), draus (drauskommen),
 * drum (drumlegen) and drunter (drunterhalten). Dumgen keeps them in
 * `unweighedParticles`, so its slots don't move.
 */
export const germanSeparableParticles: ReadonlySet<string> = new Set([
	"ab",
	"abhanden",
	"abwärts", // no DWDS affix entry; DWDS writes aufwärtsgehen, abwärtsgehen
	"an",
	"aneinander",
	"anheim",
	"auf",
	"aufeinander",
	"aufwärts", // no DWDS affix entry
	"aus",
	"auseinander",
	"bei",
	"beieinander",
	"beisammen",
	"beiseite", // no DWDS affix entry; bei + Seite, an adverb
	"bevor", // no DWDS affix entry; bevorstehen, while bevorzugen is inseparable
	"da",
	"dabei", // no DWDS affix entry
	"dagegen",
	"daher",
	"dahin",
	"dahinter",
	"daneben",
	"danieder",
	"dar",
	"darauf",
	"darnieder",
	"darüber",
	"darunter",
	"davon",
	"davor",
	"dazu",
	"dazwischen", // no DWDS affix entry
	"dran",
	"drauf",
	"draus", // the dr- shorthand of daraus; drauskommen (DWDS)
	"drin",
	"drum", // the dr- shorthand of darum; drumbinden, drumlegen (Duden)
	"drüber",
	"drunter", // the dr- shorthand of darunter; drunterhalten (DWDS)
	"durch",
	"durcheinander",
	"ein",
	"einher",
	"empor",
	"entgegen",
	"entlang",
	"entzwei", // no DWDS affix entry
	"fehl", // Duden's adverb; DWDS fehl-, for nouns and verbs
	"fort",
	"gegen", // DWDS splits gegensteuern as gegen- + steuern; gegenhalten
	"gegeneinander",
	"gegenüber", // no DWDS affix entry
	"heim",
	"her",
	"herab",
	"heran",
	"herauf",
	"heraus",
	"herbei",
	"herein",
	"hernieder", // no DWDS affix entry; DWDS has herniedergehen
	"herüber",
	"herum",
	"herunter",
	"hervor",
	"herzu",
	"hin",
	"hinab",
	"hinan",
	"hinauf",
	"hinaus",
	"hindurch",
	"hinein",
	"hintan",
	"hintenüber",
	"hinter", // DWDS hinter- I.3, separable, colloquial: bringt hinter
	"hinterdrein",
	"hintereinander",
	"hinterher",
	"hinüber",
	"hinunter",
	"hinweg",
	"hinzu",
	"ineinander",
	"inne", // no DWDS affix entry; innehalten, innehaben
	"los", // DWDS: los Adverb, los- verbal affix
	"mit",
	"nach",
	"nebeneinander",
	"nebenher",
	"nieder",
	"preis", // no free form; preisgeben, from French prise (DWDS)
	"ran",
	"rauf",
	"raus",
	"rein",
	"rüber",
	"rückwärts", // no DWDS affix entry
	"rum", // the r- shorthand of herum; DWDS splits rumkriegen rum- + kriegen
	"runter",
	"über",
	"überein", // no DWDS affix entry; übereinstimmen
	"überhand", // no DWDS affix entry; überhandnehmen
	"übereinander",
	"um",
	"umher",
	"umhin", // no DWDS affix entry; umhinkönnen
	"unter",
	"vor",
	"voneinander", // voneinanderreißen (DWDS Wortbildung)
	"voran",
	"voraus",
	"vorbei",
	"vorher", // no DWDS affix entry; vorhersagen
	"vorlieb", // no DWDS affix entry; vorliebnehmen
	"vornüber",
	"vorüber",
	"vorwärts", // no DWDS affix entry; vorwärtsgehen
	"vorweg", // no DWDS affix entry
	"vonstatten", // no DWDS affix entry; vonstattengehen
	"weg",
	"weiter", // DWDS weiter-, for verbs of motion
	"wider",
	"wieder",
	"zu",
	"zueinander", // zueinanderfinden (DWDS, Regelwerk §34 E1)
	"zugute", // no DWDS affix entry; zugutekommen
	"zurecht",
	"zurück",
	"zusammen",
	"zuvor", // no DWDS affix entry
	"zunichte", // no DWDS affix entry; zunichtemachen
	"zustatten", // no DWDS affix entry; zustattenkommen
	"zuteil", // no DWDS affix entry; zuteilwerden
	"zuwider", // no DWDS affix entry; zuwiderhandeln
	"zwischen",
]);

/**
 * The separable first parts that are words of their own, a noun (teil of
 * teilnehmen, stand of standhalten), an adjective (fest of festhalten, groß
 * of großziehen) or a verb (kennen of kennenlernen). A particle verb's first
 * constituent links to that Lexeme, not to a Prefix Morpheme (ADR 0050).
 * Unlike the particles, the list is open: it holds the ones Dumgen has
 * needed so far and every hasSepPrefix the gold names (flach and groß
 * joined from it, #1057). spazieren is none: verb and verb are written
 * apart, so spazieren gehen is two VERBs (#1144).
 */
export const germanSeparableLexemeParts: ReadonlySet<string> = new Set([
	"bekannt",
	"bereit",
	"bloß",
	"fern",
	"fertig",
	"fest",
	"flach",
	"frei",
	"groß",
	"gut",
	"hoch",
	"irre",
	"kaputt",
	"kennen",
	"klar",
	"kund",
	"leer",
	"leid",
	"nahe",
	"offen",
	"sicher",
	"stand",
	"statt",
	"teil",
	"übrig",
	"voll",
	"wahr",
]);

/** The Lexeme a separable first part links to: its Kind and Canonical Form. */
type GermanLexemePartTarget = {
	readonly kind: string;
	readonly canonicalForm: string;
};

/**
 * The Lexeme each Lexeme first part links to, where it is ruled (ADR 0050,
 * #1241): the ADR's examples, and the parts whose Lexeme is not plain. statt
 * and stand are nouns (Amtliches Regelwerk §34(3); DWDS traces stattfinden
 * to the noun Statt 'place', not the preposition, and splits standhalten as
 * Stand + halten); kund and irre are the adjectives (DWDS lists kundtun and
 * irreführen among their formations); leid is ADJ leid, as Duden and DWDS
 * class it and the 2006 reform's lowercasing shows (#1241, 2026-10-24). A
 * part not listed may link to any Lexeme.
 */
export const germanLexemePartTargets: Readonly<
	Record<string, GermanLexemePartTarget>
> = {
	fest: { kind: "ADJ", canonicalForm: "fest" },
	irre: { kind: "ADJ", canonicalForm: "irre" },
	kennen: { kind: "VERB", canonicalForm: "kennen" },
	kund: { kind: "ADJ", canonicalForm: "kund" },
	leid: { kind: "ADJ", canonicalForm: "leid" },
	stand: { kind: "NOUN", canonicalForm: "Stand" },
	statt: { kind: "NOUN", canonicalForm: "Statt" },
	teil: { kind: "NOUN", canonicalForm: "Teil" },
};

/**
 * The separable prefixes, the first parts of German particle verbs: the
 * true particles and the Lexeme first parts. Rule
 * de/verb-owns-its-scattered-members makes one a member of its verb's
 * target wherever it stands, Rule de/bracket-particle-or-circumposition
 * reads one in the verbal bracket as the verb's particle, Rule
 * de/verb-core-features lets a VERB's hasSepPrefix name one, and Rule
 * de/fused-word-pieces splits one from an infixed zu (abzuspannen is ab, zu
 * and spannen). Some also form inseparable verbs (durch, hinter, über, um,
 * unter, voll, wider: übersetzen 'translate'); they are here, not among the
 * inseparable prefixes below.
 */
export const germanSeparablePrefixes: ReadonlySet<string> = new Set([
	...germanSeparableParticles,
	...germanSeparableLexemeParts,
]);

/**
 * The prefixes that only ever form inseparable verbs (bekommen, empfehlen,
 * verstehen): never a VERB's hasSepPrefix (Rule de/verb-core-features), and
 * never split from the verb. The prefixes that form both kinds are
 * separable prefixes above. No word is on both lists.
 */
export const germanInseparablePrefixes: ReadonlySet<string> = new Set([
	"be",
	"emp",
	"ent",
	"er",
	"ge",
	"miss",
	"ver",
	"zer",
]);
