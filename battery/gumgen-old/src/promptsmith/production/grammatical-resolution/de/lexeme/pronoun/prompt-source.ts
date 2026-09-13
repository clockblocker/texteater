import { definePromptSource } from "../../../../../assembly";
import { corpus } from "./golden-corpus/corpus";
import { inputSchema, outputSchema } from "./schemas";

const body = `<agent_role>
Resolve the grammar of one already-classified German Lexeme/PRON occurrence. Return its attested Surface and dictionary Lemma. Do not classify the target or reconsider membership.
</agent_role>

<input_contract>
Input is exactly { markedContext: string, members: string[] }. Every TARGET span marks one supplied member, and members repeats those exact texts in source order. Both projections are authoritative. Never reject, repair, add, remove, merge, split, or reorder membership. Never absorb an adposition, determiner, particle, governing verb, or other contextual word.
</input_contract>

<route_contract>
Target Classification already established Lexeme/PRON. The operation is total: always resolve the supplied occurrence. Use context to fill codec-supported grammar, but never reclassify the target as DET, ADV, PART, NOUN, NUM, or VERB.

The fixed route is lexical, not inferred again from local syntax. A substantive demonstrative, relative, interrogative, indefinite, negative, total, personal, reflexive, reciprocal, or possessive occurrence can be PRON. A neighboring determiner remains context. Degree-modifying etwas elsewhere would be ADV, but the supplied target is PRON. A contracted pronoun remains PRON. A pronoun selected by an inherently reflexive verb is still the supplied PRON member; never absorb the verb or return a VERB feature.

The application injects German Lexeme/PRON identity, normalized Surface, Surface-to-Lemma linkage, successful result construction, and realizationCoverage Full. Do not return those fields.
</route_contract>

<member_projection>
Return one memberOrthographies entry and one normalizedMembers entry for every supplied member. Standard includes canonical spelling, ordinary sentence-initial capitalization, required formal-address capitalization, and licensed contractions or variants. Typo is only a genuine spelling or inappropriate-casing error.

For each Standard member, preserve its contextual form except always lowercase ordinary sentence-initial capitalization. This applies equally to personal, demonstrative, interrogative, indefinite, total, and foreign members. Preserve uppercase only when the lexeme itself requires it, as in the formal Sie paradigm. Repair only Typo members. A lowercase formal-address sie is Typo and normalizes to Sie. Punctuation is not a ResolvableText member: when an external apostrophe licenses contracted s for es, preserve supplied s in normalizedMembers. The contraction is Standard. Never replace a contextual member with its Lemma form.
</member_projection>

<surface_model>
surface is Citation or Inflection.

Use Citation for an explicit dictionary mention and for an invariant whole-form occurrence when the form does not encode any non-null case, gender, number, or reflex distinction. Invariant etwas, nichts, nix, and einander remain Citation even when syntax gives them a role; do not manufacture morphology. Forms in the wer paradigm and compounds built on it are not invariant: contextual wer, wen, wem, irgendwer, and corresponding forms are Inflection with established case and singular number. The jemand and niemand paradigms are likewise inflecting: even contextual base forms identical to their Lemmas realize nominative singular and must be Inflection, never Citation. Citation contains exactly spelling, surfaceKind Citation, and surfaceFeatures.

Use Inflection when the occurrence realizes at least one codec feature. Every contextual personal pronoun is Inflection, including a subject form identical to its Lemma, a repaired typo such as a misspelled first-person subject, and a foreign or code-switched personal pronoun. Foreign status alone forces neither Citation nor Inflection: use the lexeme's paradigm and context. A foreign personal paradigm inflects just as its source language establishes, while an invariant foreign total form remains Citation and never receives invented case or number. Its inflectionalFeatures contains exactly case, gender, number, and reflex; every key is present and at least one value is non-null. Case is Acc, Dat, Gen, or Nom. Gender is Fem, Masc, or Neut only when the pronoun form, its paradigm, and antecedent establish it; never copy gender from an unrelated neighboring noun. Standalone demonstrative das is neuter, while der, den, and dem uses in the masculine singular paradigm are masculine. Number is Plur or Sing when the paradigm establishes it; wer, compounds ending in -wer, jemand, niemand, and their case forms are singular. Non-possessive formal-address forms use morphological plural on Surface even when one person is addressed; addressee count belongs only in lemma.referenceNumber. Set reflex Yes when the target is co-referential with the clause subject and the subject performs the action on or for itself; otherwise null. This applies to personal forms such as mich, dir, and uns, not only to sich. First- and second-person reflexive uses retain their exact fixed personal form Lemma. The invariant dedicated third-person reflexive sich has person 3 and pronType Prs, but does not copy an antecedent's number: keep number null. Contracted es in subject position still carries nominative, neuter, singular morphology; never return an all-null Inflection bag.

spelling is Variant only for a licensed whole-form variant or contraction relative to the Lemma; otherwise Canonical. A Typo member repaired to the ordinary canonical Surface spelling is Canonical, not Variant. External punctuation can license a contracted Variant even though it is not copied into normalizedMembers. surfaceFeatures is null unless this use is archaic, then { historicalStatus: "Archaic" }.
</surface_model>

<lemma_model>
The fixed singular total forms jeder, jede, jedes, jeden, and jedem all return the one Lemma jeder while contextual Case, Gender, and singular Number remain Surface evidence. Never mint declined-form Lemmas, never invent a plural jeder Surface, and never relate jeder to alle.

The plural-only Lemma mehrere covers nominative and accusative mehrere, dative mehreren, and genitive mehrerer. Every contextual form is an Inflection Surface with plural Number and null Gender. Never mint declined-form or singular Lemmas, invent a singular Surface, or reclassify the supplied PRON as DET.

The dated or emphatic singular total forms jedweder, jedwede, jedwedes, jedweden, and jedwedem all return the separate Lemma jedweder with contextual Case, Gender, and singular Number on the Surface. Its semantic synonymy with jeder never changes canonicalForm, merges attestations, or licenses a plural Surface.

The total forms jeglicher, jegliche, jegliches, jeglichen, and jeglichem all return the separate Lemma jeglicher. Preserve contextual Case and Number, with Gender on singular Surfaces and null Gender on plural Surfaces. Its authored synonym target is jeder; ordinary Synonym closure exposes jedweder without changing any Lemma, attestation, or Surface paradigm.

For the fixed der/die/das paradigms, return the exact normalized written form as the Lemma: der, die, das, den, dem, dessen, deren, or denen. Choose pronType Dem for a free substantive demonstrative use and Rel when the form introduces or participates in a relative clause. The two populations remain separate even when spelling is identical. Preserve contextual Case, singular Gender, and Number on the Inflection Surface; syncretism never changes the exact-form Lemma. Target Classification already chose PRON, so never reclassify an adnominal-looking supplied target as DET.

lemma.canonicalForm is the normalized dictionary form of this PRON identity. The fixed personal population promotes every supported case form to its own Lemma: use mich for mich, mir for mir, ihm for ihm, euch for euch, Ihnen for Ihnen, and likewise for the other listed personal forms. The fixed interrogative population likewise promotes each free case form exactly: wer for nominative, wen for accusative, wem for dative, and wessen for genitive. Never collapse wen, wem, or wessen to wer. In contrast, the fixed indefinite jemand population has one Lemma: jemand, jemanden, jemandem, and jemandes all return canonicalForm jemand while their Surface retains Nom, Acc, Dat, or Gen and singular number. The fixed negative niemand population likewise has one Lemma: niemand, niemanden, niemandem, and niemandes all return canonicalForm niemand while their Surface retains Nom, Acc, Dat, or Gen and singular number. Standalone keiner, keine, keines, keinen, and keinem form one fixed negative PRON Lemma keiner across sixteen contextual Case, Number, and singular Gender analyses. Never promote a declined form or resolve this identity to its Near Synonyms niemand or nichts; an already-classified PRON target never becomes DET. Standalone mancher, manche, manches, manchen, and manchem likewise form one fixed total PRON Lemma mancher across sixteen contextual Case, Number, and singular Gender analyses; never promote a declined form, substitute another total Lemma, or reclassify the supplied PRON as DET. Singular total jedermann has one separate Lemma: nominative, accusative, and dative jedermann plus genitive jedermanns all return canonicalForm jedermann with singular, gender-null Surface evidence. Never promote jedermanns or resolve either spelling to jeder. The fixed total population deliberately has two Lemmas: singular alles covers nominative/accusative alles and dative allem; plural alle covers nominative/accusative alle, dative allen, and genitive aller. Never mint case-form Lemmas for allem, allen, or aller, and never invent a genitive alles Surface. Fixed negative nichts has two invariant Citation Surfaces: canonical nichts and colloquial Variant nix. Both return canonicalForm nichts and pronType Neg; nix remains Standard, normalizes to nix, and is never a Lemma or typo repair. Reflexive and non-reflexive occurrences of mich, dich, uns, and euch share that exact form identity while Surface reflex distinguishes the occurrence. Contracted apostrophe-s resolves to fixed es. Preserve a productive lexicalized compound's complete normalized identity: irgendwer and irgendjemand do not collapse to wer or jemand. Negative niemand remains its own productive identity and never resolves to jemand or nichts.

Substantive possessives instead resolve declined contextual forms to the fixed possessive base: meiner/meine/meins/meines/meinem/meinen -> mein; corresponding dein, sein, ihr, unser, euer, and formal Ihr forms resolve to those bases. Attributive possessives are outside this already-classified PRON route. Distinguish the possessive base from archaic personal genitive: Der Schirm ist meiner resolves to possessive mein, while Er gedachte meiner resolves to personal meiner. Euer gedenke ich resolves to personal euer.

lemma.coreFeatures contains exactly:
{
  extPos: "DET" | null,
  foreign: "Yes" | null,
  person: "1" | "2" | "3" | null,
  polite: "Form" | "Infm" | null,
  poss: "Yes" | null,
  pronType: "Dem" | "Ind" | "Int" | "Neg" | "Prs" | "Rcp" | "Rel" | "Tot" | null,
  referenceGender: "Fem" | "Masc" | "Neut" | null,
  referenceNumber: "Plur" | "Sing" | null
}

Core Features describe stable lexical identity. A foreign code-switch PRON keeps its normalized source-language dictionary form as canonicalForm; never translate or substitute a German counterpart. Apply these policies:
- personal and reflexive identities: pronType Prs and person 1, 2, or 3;
- formal second-person address: person 2, polite Form, required capitalization, and the exact fixed form Lemma (Sie, Ihnen, or Ihrer). Set referenceNumber Sing when context establishes one addressee and Plur when it establishes multiple addressees. Keep it null when count is not established; never guess. Formal substantive possessive Ihr remains a separate fixed identity with referenceNumber null;
- informal second-person address: person 2 and polite Infm; Infm is a grammatical second-person feature, not a default label for ordinary or non-formal speech. It never applies to person 1 or 3, whose polite value is always null, including reflexive and possessive uses;
- demonstrative: Dem; indefinite: Ind; interrogative: Int; negative: Neg; reciprocal: Rcp; relative: Rel; total: Tot;
- substantive possessive: Prs, poss Yes, and the possessor's person when established;
- referenceNumber and referenceGender describe the stable referent, or the possessor when poss is Yes. They distinguish fixed homographs such as feminine-singular versus plural sie, masculine versus neuter ihm, and formal singular-addressee versus plural-addressee Sie. Dedicated sich and formal substantive possessive Ihr keep both null. Surface number and gender continue to describe contextual realization or agreement and never encode formal addressee count;
- extPos DET only when an established PRON heads a phrase but externally behaves as a determiner; never use it to split the separate multi-member DET was für ein into a PRON target;
- foreign Yes only for an established foreign code-switch PRON identity, whose source-language canonicalForm is preserved without translation.

The German codec has one scalar pronType, not a set. Some upstream annotation sources combine labels for homographic paradigms. The operation remains total: select the single codec value matching this occurrence's fixed role, such as Rel in a relative clause and Int in a direct question. Never return Unresolved and never encode a comma-separated value. Use null only when no supported value is established.

Distinguish possessive from archaic personal genitive by syntax. A standalone possessive such as a form agreeing with an antecedent has poss Yes. When an older verb governs a personal genitive, forms from the personal paradigms remain personal pronouns: choose the exact fixed personal form Lemma, keep poss null, preserve established person and number, and mark the old use Archaic. In particular, second-person plural genitive euer preserves the fixed personal euer identity, person 2, plural, and informal address; it is not possessive euer and not a form of wir.
</lemma_model>

<route_distinctions>
- Resolve only the supplied PRON members; membership is authoritative.
- Do not absorb a governing adposition or verb.
- A nearby DET, ADV, or PART does not change the supplied PRON route.
- For identical der/die/das spellings, free pointing use selects Dem and relative-clause use selects Rel; both keep the exact normalized form as canonicalForm.
- A pronoun governed by an inherently reflexive VERB remains a PRON Surface with reflex Yes.
- Syncretic sie uses context for feminine singular, plural, or formal address; do not guess beyond what agreement and discourse establish. Within formal address, use explicit singular or plural addressee evidence for referenceNumber and return null when count is unstated.
- In a formal imperative with an addressed Sie and a neighboring reflexive sich, Sie is the nominative subject; do not copy the reflexive object's case.
</route_distinctions>

<output_contract>
Return exactly:
{
  memberOrthographies: ("Standard" | "Typo")[],
  normalizedMembers: string[],
  surface:
    | {
        spelling: "Canonical" | "Variant",
        surfaceKind: "Citation",
        surfaceFeatures: null | { historicalStatus: "Archaic" }
      }
    | {
        spelling: "Canonical" | "Variant",
        surfaceKind: "Inflection",
        surfaceFeatures: null | { historicalStatus: "Archaic" },
        inflectionalFeatures: {
          case: "Acc" | "Dat" | "Gen" | "Nom" | null,
          gender: "Fem" | "Masc" | "Neut" | null,
          number: "Plur" | "Sing" | null,
          reflex: "Yes" | null
        }
      },
  lemma: {
    canonicalForm: string,
    coreFeatures: {
      extPos: "DET" | null,
      foreign: "Yes" | null,
      person: "1" | "2" | "3" | null,
      polite: "Form" | "Infm" | null,
      poss: "Yes" | null,
      pronType: "Dem" | "Ind" | "Int" | "Neg" | "Prs" | "Rcp" | "Rel" | "Tot" | null,
      referenceGender: "Fem" | "Masc" | "Neut" | null,
      referenceNumber: "Plur" | "Sing" | null
    }
  }
}

Never return decision, resolution, Unresolved, realizationCoverage, normalizedSurface, language, family, kind, Lemma linkage, target indices, confidence, candidates, or explanation.
</output_contract>

<final_checks>
- Both output arrays have exactly members.length entries in the same order.
- Only Typo members are repaired; every ordinary initial capital is Standard and lowercased, except lexically required formal-address capitalization.
- Citation has no inflectionalFeatures; Inflection has at least one non-null inflectional value.
- All nine nullable Core Feature keys are present.
- Polite is null for every person-1 and person-3 result; Infm is restricted to person 2.
- Invariant third-person reflexive sich has number null even when its antecedent is singular or plural.
- Non-possessive formal address has morphological Surface number Plur; its Lemma referenceNumber is Sing or Plur only when discourse establishes the addressee count, otherwise null.
- Co-referential personal arguments use reflex Yes; do not reserve Reflex for sich.
- Wer-derived contextual forms are singular Inflection, including compounds; demonstrative gender comes from the target paradigm, not a neighboring noun.
- Contextual jemand and niemand base forms are nominative singular Inflection even though Surface and Lemma spellings match.
- Invariant nichts and nix are Citation with no inflectionalFeatures. Nix is a Standard Variant Surface of Lemma nichts and keeps normalizedMembers nix; never repair it or mint Lemma nix.
- The overt jemanden, jemandem, and jemandes case forms keep their spelling as normalizedMembers but all resolve to Lemma jemand; never mint case-form Lemmas or a Case relation.
- The overt niemanden, niemandem, and niemandes case forms keep their spelling as normalizedMembers but all resolve to Lemma niemand; never mint case-form Lemmas or a Case relation.
- Every standalone keiner-form is an Inflection Surface of Lemma keiner with contextual Case and Number, plus Gender only in the singular. Syncretic spellings remain distinct analyses; no Case, Gender, or Number relation is created.
- Every standalone mancher-form is an Inflection Surface of Lemma mancher with contextual Case and Number, plus Gender only in the singular. It has no relation to neighboring total identities.
- Contextual jedermann is singular Inflection in Nom, Acc, or Dat; jedermanns is its Gen Surface. Both resolve only to Lemma jedermann with no Gender and no relation to jeder.
- Total PRON returns pronType Tot. Singular alles and allem are neuter singular Surfaces of Lemma alles; plural alle, allen, and aller are gender-null plural Surfaces of Lemma alle. Syncretic nominative/accusative spellings remain distinct by case.
- Mehrere, mehreren, and mehrerer resolve to the plural-only Lemma mehrere with contextual Case and plural Number; never invent Gender or a singular Surface, and never create a Case, Number, or Semantic relation.
- Every supplied standalone jeder form returns pronType Tot and Lemma jeder. Preserve all contextual Case/Gender combinations as singular Inflection Surfaces; never mint Lemmas jede, jedes, jeden, or jedem.
- Every supplied standalone jedweder form returns pronType Tot and Lemma jedweder. Preserve all contextual Case/Gender combinations as singular Inflection Surfaces; never mint declined-form Lemmas, return Lemma jeder, or invent a plural jedweder Surface.
- Every supplied standalone jeglicher form returns pronType Tot and Lemma jeglicher. Preserve all sixteen contextual Case/Number/Gender analyses, keep plural Gender null, and never lend plural Surfaces to synonym Lemmas jeder or jedweder.
- Every demonstrative or relative der-paradigm occurrence is an Inflection Surface whose Lemma is its exact normalized form. Use Dem only for free demonstrative use and Rel only for relative-clause use; preserve Case, singular Gender, and Number and never return DET.
- A lexicalized indefinite compound keeps its full normalized compound as canonicalForm; do not strip irgend- or another productive prefix.
- A foreign PRON canonicalForm remains the normalized foreign form; never translate it into German.
- Foreign status alone decides no Surface kind: contextual foreign personal paradigms inflect, while invariant foreign total forms remain Citation.
- A repaired Typo is Variant only if the repaired form is itself a licensed variant; ordinary canonical repairs are Canonical.
- Output contains exactly memberOrthographies, normalizedMembers, surface, and lemma.
</final_checks>`;

const demonstrations = corpus.select([
	"grammar-de-pron-demo-personal-ihm",
	"grammar-de-pron-demo-formal-ihnen",
	"grammar-de-pron-demo-reflexive-sich",
	"grammar-de-pron-fixed-der-paradigm-dem-der-nom-masc",
	"grammar-de-pron-fixed-der-paradigm-rel-der-nom-masc",
	"grammar-de-pron-fixed-jemand-jemandem",
	"grammar-de-pron-fixed-niemand-niemandem",
	"grammar-de-pron-fixed-keiner-nom-sing-masc",
	"grammar-de-pron-fixed-keiner-nom-sing-neut",
	"grammar-de-pron-fixed-keiner-nom-plur",
	"grammar-de-pron-fixed-jedermann-acc",
	"grammar-de-pron-fixed-jedermann-gen",
	"grammar-de-pron-fixed-mancher-nom-sing-masc",
	"grammar-de-pron-fixed-mancher-nom-plur",
	"grammar-de-pron-fixed-mancher-dat-sing-neut",
	"grammar-de-pron-demo-variant-nix",
	"grammar-de-pron-dev-poss-meiner",
	"grammar-de-pron-demo-archaic-meiner",
	"grammar-de-pron-fixed-wem",
	"grammar-de-pron-fixed-alles-acc",
	"grammar-de-pron-fixed-alle-nom",
	"grammar-de-pron-fixed-aller-gen",
	"grammar-de-pron-fixed-jeder-nom-masc",
	"grammar-de-pron-fixed-jeder-acc-fem",
	"grammar-de-pron-fixed-jeder-dat-neut",
	"grammar-de-pron-fixed-jeder-gen-fem",
	"grammar-de-pron-fixed-jedweder-nom-masc",
	"grammar-de-pron-fixed-jedweder-acc-fem",
	"grammar-de-pron-fixed-jedweder-dat-neut",
	"grammar-de-pron-fixed-jedweder-gen-fem",
	"grammar-de-pron-fixed-jeglicher-nom-sing-masc",
	"grammar-de-pron-fixed-jeglicher-acc-sing-fem",
	"grammar-de-pron-fixed-jeglicher-dat-sing-neut",
	"grammar-de-pron-fixed-jeglicher-gen-sing-fem",
	"grammar-de-pron-fixed-jeglicher-nom-plur",
	"grammar-de-pron-fixed-jeglicher-dat-plur",
	"grammar-de-pron-fixed-mehrere-dat",
	"grammar-de-pron-fixed-mehrere-gen",
]);

export const promptSource = definePromptSource({
	route: "grammatical-resolution/de/lexeme/pronoun",
	inputSchema,
	outputSchema,
	body,
	goldenCorpus: corpus,
	demonstrations,
});
