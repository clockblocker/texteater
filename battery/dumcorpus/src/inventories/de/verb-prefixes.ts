/**
 * The German true separable particles (Verbpartikeln), closed: an of
 * anziehen, hinaus of hinauslaufen, dar of darstellen. A particle verb's
 * first constituent links to the particle's Prefix Morpheme (`ein-` in
 * einkaufen, ADR 0050), and a compound particle is one piece: hinaus- is
 * one Prefix, and its own Breakdown gives hin + aus.
 *
 * A first part is a particle when its free form is a preposition or an
 * adverb (ab, auf, durch, weg, zurück, hinaus, dabei, auseinander) or it has
 * no free form (dar). Duden, Die Grammatik (9th ed., 2016, Partikelverben)
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
 * r- shorthand as the her- or hin- particle it stands for.
 *
 * Left out until a verb needs them, as adverbs with a noun inside that DWDS
 * gives no affix entry: zugute, zunichte, zuteil, zustatten, vonstatten,
 * vorlieb, überhand. bevor (bevorstehen) is left out too, and so are the
 * einander adverbs DWDS writes apart from the verb (voneinander,
 * zueinander).
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
	"drin",
	"drüber",
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
	"gegen", // DWDS gegen- is for nouns only; gegensteuern, gegenhalten
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
	"hinter", // colloquial: hinterbringen 'bring to the back', bringt hinter
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
	"ran",
	"rauf",
	"raus",
	"rein",
	"rüber",
	"rückwärts", // no DWDS affix entry
	"runter",
	"über",
	"überein", // no DWDS affix entry; übereinstimmen
	"übereinander",
	"um",
	"umher",
	"umhin", // no DWDS affix entry; umhinkönnen
	"unter",
	"vor",
	"voran",
	"voraus",
	"vorbei",
	"vorher", // no DWDS affix entry; vorhersagen
	"vornüber",
	"vorüber",
	"vorwärts",
	"vorweg", // no DWDS affix entry
	"weg",
	"weiter", // DWDS weiter-, for verbs of motion
	"wider",
	"wieder",
	"zu",
	"zurecht",
	"zurück",
	"zusammen",
	"zuvor", // no DWDS affix entry
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
	"preis", // preisgeben, from French prise 'what is taken' (DWDS)
	"sicher",
	"stand",
	"statt", // stattfinden, from the noun Statt 'place' (DWDS)
	"teil",
	"übrig",
	"voll",
	"wahr",
]);

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
