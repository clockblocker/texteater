import { definePromptSource } from "../../../../../assembly";
import { corpus } from "./golden-corpus/corpus";
import { inputSchema, outputSchema } from "./schemas";

const body = `<task>
Resolve the grammar of the already-classified German Lexeme/DET occurrence.
The input is exactly {markedContext: string, members: string[]}. The TARGET
contents and members are the complete lexical membership in source order.
Always return one total flat resolution; route classification and membership
repair happened upstream.
</task>

<membership>
Copy one memberOrthographies entry and one normalizedMembers entry per member.
Standard includes canonical spelling, ordinary sentence-initial capitalization,
and required formal possessive Ihr capitalization. Typo means a spelling or
inappropriate-casing error. normalizedMembers preserves contextual inflection,
lowercases only ordinary sentence-initial capitalization, repairs actual typos,
and preserves formal Ihr/Ihrem capitalization. Never include an unmarked noun,
adjective, numeral, article fusion, or other dependent.
</membership>

<surface>
Use Inflection for an ordinary contextual occurrence whenever at least one
supported feature is known. Use Citation for an explicit mention or for an
invariant contextual determiner that the exact codec cannot express with a
non-empty inflection feature bag. Thus invariant welch in "welch ein ...",
derlei/keinerlei, and source-language invariant articles use Citation rather
than borrowed case or agreement. Inflection features describe this occurrence:
case, degree, agreement gender and number, plus separately layered possessor
gender and number. Agreement comes from the modified noun phrase, never the
possessor. Resolve case from syntax and governance, not the ending alone;
unter in the fixed state expression "unter keinen Umständen" governs dative.
Preserve the modified noun's lexical gender in singular and plural: Stühle is
Masc, Bücher/Geräte is Neut, and feminine nominal heads are Fem. If the head or
surrounding declinations point to one gender, return it. If multiple genders
fit, choose one of them. Always return one gender value, never a set.
surfaceFeatures is null except for an attested archaic form, which uses
{"historicalStatus":"Archaic"}. An actual typo remains Surface spelling
Canonical after normalization; record its error only as memberOrthographies
Typo. Never call a repaired typo Variant. Variant is reserved for a licensed
alternative such as ne or nen.
</surface>

<lemma>
canonicalForm is the complete normalized citation form of the same DET.
For an inflected pronominal determiner, preserve its full paradigm citation
form rather than stripping the ending to a bare stem. In particular, all forms
welche/welchen/welchem/welches have canonicalForm welcher, and all forms
manche/manchen/manchem/manches have canonicalForm mancher. Never return welch
or manch as the Lemma for these inflected paradigms.
When the sentence explicitly quotes a historical spelling and labels it
archaic, the quoted characters are authoritative: preserve them literally in
normalizedMembers and preserve the lexeme's actual citation spelling. Do not
modernize, shorten, or mark that quoted spelling Typo merely because it is
rare or unfamiliar.
All core fields are mandatory and nullable. Use these lexical policies:
- definite article der: pronType Art, definite Def.
- indefinite article ein: pronType Art, definite Ind, numType Card.
- demonstrative: Dem; emphatic: Emp; exclamative: Exc; indefinite quantifier:
  Ind; interrogative: Int; relative determiner: Rel; negative kein/keinerlei:
  Neg; total alle/jeder: Tot; both/beide is additionally numType Card.
- possessives: pronType Prs, poss Yes, and person 1/2/3 for the possessor.
  mein/dein/sein have number[psor] Sing; unser/euer have number[psor] Plur.
  gender[psor] is not the possessed noun's gender. It is required when an
  explicit antecedent establishes the possessor: Paul is Masc, Mara is Fem,
  and das Kind is Neut. Otherwise sein is
  morphologically syncretic Masc/Neut. Formal Ihr has person 2, polite Form,
  and uppercase canonicalForm Ihr; ordinary dein has polite null. Formal Ihr
  has number[psor] null unless the context establishes one versus several
  addressees.
- overt source-language determiners in code-switched material use foreign Yes
  and preserve source-language identity; English the is Art, Def, Foreign Yes.
- comparative quantifier mehr has canonicalForm mehr, Degree Cmp, ExtPos DET,
  and PronType Ind. Comparative quantifier weniger has canonicalForm wenig,
  Degree Cmp, ExtPos ADV, and PronType Ind. Superlative meisten has
  canonicalForm meist, Degree Sup, and PronType Ind. Its accompanying plural
  noun still fixes gender. Emphatic selben has canonicalForm selber and
  PronType Emp.
- interrogative ordinal wievielte uses numType Ord. Ordinal identity does not
  imply Degree Pos; use Degree only for overt comparison.

The upstream route is authoritative. A standalone dieser/jener remains DET,
not PRON; a quantifying DET remains DET, not ADJ or NUM; and a nearby fusion
such as im stays unmarked context. Do not reject or reclassify the target.
Inside a larger phraseme, keep exactly the function-word membership supplied
for this DET rather than absorbing or resolving the surrounding expression.
</lemma>

<output>
Return only memberOrthographies, normalizedMembers, surface, and lemma. Never
return decision, resolution, realizationCoverage, language, family, kind,
normalizedSurface, a linked Lemma inside Surface, route data, confidence,
candidates, or explanations. The app supplies route/language/linkage,
normalizedSurface, the success wrapper, and realizationCoverage Full.
</output>

<self-check>
The output is total and flat; counts match members; normalizedMembers contains
contextual forms rather than lemmas; Typo accompanies every repair; Inflection
has at least one non-null feature; every nullable codec field is present.
</self-check>`;

const demonstrations = corpus.select([
	"grammar-de-det-demo-definite-article-der",
	"grammar-de-det-demo-possessive-meinem",
	"grammar-de-det-demo-feminine-article-die",
	"grammar-de-det-demo-uninflected-derlei",
	"grammar-de-det-demo-variant-ne",
	"grammar-de-det-demo-standalone-jener",
	"grammar-de-det-demo-paradigm-welche",
	"grammar-de-det-demo-paradigm-manchem",
	"grammar-de-det-demo-quoted-archaic-etwelche",
]);

export const promptSource = definePromptSource({
	route: "grammatical-resolution/de/lexeme/determiner",
	inputSchema,
	outputSchema,
	body,
	goldenCorpus: corpus,
	demonstrations,
});
