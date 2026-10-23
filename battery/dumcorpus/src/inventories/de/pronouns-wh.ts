import { description, stemAdder } from "./pronoun-authoring.js";
import {
	form,
	pronounMember,
	pronounStemOf,
	strongPronoun,
} from "./pronoun-paradigm.js";
import {
	type AuthoredSpelling,
	canonical,
	type ReviewedMember,
	type SurfaceCell,
} from "./stem-lemma.js";

const reviewed: ReviewedMember[] = [];
const add = stemAdder(reviewed);
// Relative welcher has no masculine/neuter genitive; interrogative welcher does.
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/RelInter/Pron-welcher3.xml?lang=de
for (const pronType of ["Int", "Rel"] as const) {
	const t = strongPronoun("welch", "ˈvɛlç");
	add(
		pronType === "Rel"
			? {
					...t,
					Masc: [t.Masc[0], t.Masc[1], t.Masc[2], null],
					Neut: [t.Neut[0], t.Neut[1], t.Neut[2], null],
				}
			: t,
		description(
			pronType,
			pronType === "Int" ? "❓" : "🧩",
			pronType === "Int"
				? "Fragt nach der Auswahl einer Person oder Sache aus einer bekannten Menge."
				: "Leitet einen Relativsatz ein und verweist auf dessen Bezugswort.",
			[pronType === "Int" ? "which one; which ones" : "who; which"],
			[pronType === "Int" ? "который; какие" : "который"],
		),
	);
}

// wer and was put the der-pronoun endings on w- (der, den, dem, dessen; das),
// so each is a stem whose Surfaces mark case (system ADR 0032). Their gender
// is inherent, as a noun's is: the speaker picks wer for a person and was for
// a thing, and the word then controls agreement (Wer hat seinen Schirm
// vergessen?). So gender is Core, Masc for wer and Neut for was, and wer and
// was are two Lemmas. Neither marks number, and was has no dative. Genitive
// wessen spells both; the referent decides which.
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/RelInter/Pron-wer-was.xml?lang=de
{
	const cell = (grammaticalCase: SurfaceCell["case"]): SurfaceCell => ({
		case: grammaticalCase,
		number: null,
		gender: null,
	});
	// Each cell has one spelling, Canonical.
	const spelled = (
		text: string,
		grammaticalCase: SurfaceCell["case"],
	): AuthoredSpelling => ({
		spelled: text,
		cell: cell(grammaticalCase),
		spelling: canonical,
	});
	const stems = [
		{
			canonicalForm: form("wer", "veːɐ̯"),
			gender: "Masc",
			spellings: [
				spelled("wer", "Nom"),
				spelled("wen", "Acc"),
				spelled("wem", "Dat"),
				spelled("wessen", "Gen"),
			],
			Int: {
				emoji: "❓👤",
				definition: "Fragt nach einer Person.",
				en: ["who"],
				ru: ["кто"],
			},
			Rel: {
				emoji: "🧩👤",
				definition:
					"Leitet einen Relativsatz ein, meist ohne eigenes Bezugswort, und bezeichnet die gemeinte Person: Wer mitkommen will, meldet sich.",
				en: ["whoever; the one who"],
				ru: ["кто; тот, кто"],
			},
		},
		{
			canonicalForm: form("was", "vas"),
			gender: "Neut",
			spellings: [
				spelled("was", "Nom"),
				spelled("was", "Acc"),
				spelled("wessen", "Gen"),
			],
			Int: {
				emoji: "❓📦",
				definition:
					"Fragt nach einer Sache, einem Sachverhalt oder einer Handlung.",
				en: ["what"],
				ru: ["что"],
			},
			Rel: {
				emoji: "🧩📦",
				definition:
					"Leitet einen Relativsatz ein, ohne eigenes Bezugswort oder nach das, etwas, alles, nichts oder einem ganzen Satz, und bezeichnet die gemeinte Sache: Was er sagt, stimmt.",
				en: ["whatever; what"],
				ru: ["что; то, что"],
			},
		},
	] as const;
	for (const pronType of ["Int", "Rel"] as const) {
		for (const stem of stems) {
			const meaning = stem[pronType];
			reviewed.push(
				pronounStemOf(
					stem.canonicalForm,
					{
						core: { pronType, gender: stem.gender },
						emoji: meaning.emoji,
						definition: meaning.definition,
						en: meaning.en,
						ru: meaning.ru,
					},
					stem.spellings,
				),
			);
		}
		const emoji = pronType === "Int" ? "❓" : "🧩";
		// Attributive wessen is the genitive of wer: it asks for or names a
		// possessor person. It has one form, so it is an invariant Lemma, cited
		// apart from the stem wer.
		reviewed.push(
			pronounMember(form("wessen", "ˈvɛsən"), {
				core: { pronType },
				emoji,
				definition:
					"Bezeichnet fragend oder relativisch die Person, der das folgende Nomen zugeordnet ist.",
				en: ["whose"],
				ru: ["чей"],
			}),
		);
	}
}

/** The interrogative and relative w-pronouns welcher, wer, was and wessen. */
export const whPronouns: readonly ReviewedMember[] = reviewed;
