import type * as Dumling from "dumling/types";
import type { Questions } from "promptsmith/typesafe";
import { modelSchemas } from "../../../generated/model-schemas.js";
import type { DumgenOptions, Encounter } from "../../../types.js";
import { DumgenFailure } from "../../../universal/failure.js";
import { judgmentCaller } from "../../../universal/judgment.js";
import {
  effectiveConfiguration,
  executeGeneration,
} from "../../../universal/model.js";
import { choice } from "../../../universal/questions.js";
import { recordEvent } from "../../../universal/trace.js";
import { markedContext, parse } from "../../../universal/validation.js";
import { authoredMembers } from "../authored-closed-sets/inventory.js";
import { resolveAuthoredGrammarIdentity } from "./authored-identity.js";
import { featureQuestion, inflectionQuestion } from "./feature-questions.js";
import { grammarFeatureFields } from "./feature-schema.js";
import {
  nounArticleCandidates,
  nounArticleQuestions,
  nounArticleState,
  resolveNounArticle,
} from "./noun-article.js";
import type { GrammarOutput } from "./project.js";
import { routeGuidance } from "./route-guidance.js";
import {
  canonicalFormGuidance,
  normalizedMemberGuidance,
  textSystemPrompt,
} from "./text-guidance.js";
import { verbalCompositionGuidance } from "./verbal-guidance.js";

const unmarked = "Unmarked";
const normalizations = {
  Keep: "Copy the attested member exactly, preserving licensed variants and required capitals",
  LowerInitial:
    "Only its first letter has ordinary sentence-initial capitalization; lowercase that first letter",
  UpperInitial:
    "Uppercase the initial letter to repair casing or restore required noun/name capitalization",
  Generate:
    "Required spelling correction or constrained suspended-noun completion needs new text",
  Unresolved: "No defensible positional normalization",
};
function transformed(text: string, mode: string): string {
  if (mode === "LowerInitial")
    return text.slice(0, 1).toLocaleLowerCase("de") + text.slice(1);
  if (mode === "UpperInitial")
    return text.slice(0, 1).toLocaleUpperCase("de") + text.slice(1);
  return text;
}

const lexicalStringLimit = 254;
/**
 * Candidate strings for open lexical features (separable prefix, governed
 * preposition) derived from raw members only, so they can be asked in the same
 * round trip as the feature questions. Casing follows ordinary normalization;
 * the judged canonical form may still add candidates in the follow-up.
 */
function speculativeLexicalStringCandidates(
  catalog: ReturnType<typeof grammarFeatureFields>,
  members: readonly string[],
): Record<string, string[]> {
  const candidates: Record<string, string[]> = {};
  const words = [
    ...new Set(
      members.flatMap((text) => [
        text,
        text.slice(0, 1).toLocaleLowerCase("de") + text.slice(1),
      ]),
    ),
  ];
  for (const [path, field] of catalog) {
    if (!field.open || !path.startsWith("lemma.coreFeatures.")) continue;
    const key = path.slice("lemma.coreFeatures.".length);
    const values = [
      ...new Set(
        key === "hasSepPrefix"
          ? words.flatMap((word) =>
              Array.from({ length: word.length }, (_, index) =>
                word.slice(0, index + 1),
              ),
            )
          : words,
      ),
    ];
    if (values.length && values.length <= lexicalStringLimit)
      candidates[key] = values;
  }
  return candidates;
}
function lexicalStringQuestion(key: string, candidates: readonly string[]) {
  return choice(
    `If the lexical feature judgment establishes ${key} as Present, which exact text in \`lexicalStringCandidates.${key}\` is it? Prefixes are separable prefixes; governed prepositions must be lexically selected and cannot be a detached prefix or adjunct.`,
    {
      ...Object.fromEntries(
        candidates.map((text, index) => [`text_${index}`, text]),
      ),
      Unresolved:
        "None is defensible, or the feature is Absent; do not revise the feature judgment",
    },
  );
}

const sharedPolicy = {
  target:
    "The classified route and ordered membership are fixed. Analyze only this whole target in full sentence context. Do not repair membership or reclassify. Return Unresolved when a valid analysis is not defensible.",
  identity:
    "Core Features belong to the dictionary identity, not the current inflection. Occurrence features belong to Surface. Spelling Canonical does not mean Grundform: finite and declined forms may be Canonical.",
  canonicalForm:
    "Canonical Form is the exact dictionary headword, not necessarily the Surface. The concrete `canonicalFormCandidate` is the attested members joined with single spaces; accept it only when that exact text already is the headword, otherwise select an exact headword from `canonicalFormAlternatives` when available. These include stored dictionary headwords and, for nouns, individual source members without the article. Candidates are suggestions, not proof: preserve contextual identity and Core Features; select missing text only when no candidate is the exact headword. Inflection does not prevent identical spelling. Selection requires exact headword text and casing; the headword may omit compositional articles even though Attestation membership stays fixed.",
  orthography:
    "Standard orthography includes licensed variants and ordinary sentence-initial capitalization. Typo means a real spelling/casing error. Never modernize licensed variants in normalized members. Keep source members positionally aligned; no added or deleted member. Surface spelling is Variant only for a licensed spelling/abbreviation of the same Lemma, never simply an inflection or typo repair. Historical status concerns archaic grammatical use, not merely old spelling or surrounding context.",
  inflection:
    "Citation has null inflection only for a dictionary/citation use or genuinely unmarked invariant use under the route's policy. Structural null is not uncertainty.",
};

const nounPolicy = {
  suspension:
    "For noun suspension, completion is allowed only for one selected trailing-hyphen member in binary und/oder coordination with a full right compound sharing the literal suffix; retain Full coverage. Ordinary uninflected noun forms and dictionary citations remain distinct.",
  articles:
    "German NOUN article features describe an owned, licensed shared, or Fusion-supplied article: Definite, Indefinite, or null for bare nouns/non-article determiners. A separate governing Fusion supplies its DET component: im Wald has Surface dem Wald with only Wald attested as a member and im retained as article evidence. Noun Lemma is always the bare dictionary headword. Contextual nouns have a marked case/number/article bag even when article is null. Partial nouns are allowed for licensed shared articles in compatible coordination or articles supplied by a governing Fusion; membership stays fixed.",
};

const verbalIdentityPolicy =
  "For VERB, hasSepPrefix is only a separable lexical prefix, hasGovPrep only a lexically selected preposition (never an adjunct or a detached prefix), lexicallyReflexive only a required reflexive; verbType Mod is a lexical modal identity. Select string values only from code-supplied candidates. AUX identity is a complete reviewed Lemma; compound membership does not require a singleton identity.";

const partialCoveragePolicy =
  "Partial coverage is otherwise allowed only for Idiom, DiscourseFormula, Proverb and Aphorism when fixed lexical material is genuinely unrealized and the full identity remains recoverable. Discontinuous or multi-member targets are not Partial merely due to excluded contextual material.";

export async function resolveGrammarJudgments(
  options: DumgenOptions,
  encounter: Encounter,
  signal: AbortSignal,
  lemmaCandidates: readonly Dumling.Lemma[] = [],
): Promise<GrammarOutput> {
  const route = `${encounter.sentence.language}/${encounter.target.family}/${encounter.target.kind}`;
  if (
    encounter.target.family === "Morpheme" ||
    encounter.target.kind === "PUNCT"
  )
    throw new DumgenFailure(
      "NotImplemented",
      "resolveGrammar",
      "Production is not enabled for this grammar route",
      route,
    );
  const fail = (message: string): never => {
    throw new DumgenFailure("Unresolved", "resolveGrammar", message, route);
  };
  const input = markedContext(encounter);
  const canonicalFormCandidate = input.members.join(" ");
  const storedLemmas = lemmaCandidates.filter(
    (lemma) =>
      lemma.language === encounter.sentence.language &&
      lemma.family === encounter.target.family &&
      lemma.kind === encounter.target.kind,
  );
  const canonicalFormAlternatives = [
    ...new Set([
      ...storedLemmas.map((lemma) => lemma.canonicalForm),
      ...(encounter.target.kind === "NOUN" ? input.members : []),
    ]),
  ]
    .filter((text) => text !== canonicalFormCandidate)
    .slice(0, 64);
  const schema = modelSchemas[`grammar/${route}`];
  if (!schema)
    throw new DumgenFailure(
      "NotImplemented",
      "resolveGrammar",
      "No grammatical route",
      route,
    );
  const catalog = grammarFeatureFields(route);
  const verbal = ["VERB", "AUX", "Idiom", "Collocation"].includes(
    encounter.target.kind,
  );
  const auxiliary = encounter.target.kind === "AUX";
  const mapped =
    encounter.target.kind === "DET" || encounter.target.kind === "PRON";
  const identities = auxiliary
    ? authoredMembers.filter((member) => member.lemma.kind === "AUX")
    : [];
  const questions: Questions = {
    support: choice(
      "Under `policy`, can the fixed target in `markedContext` support a coherent analysis on `route`?",
      {
        Supported: "Yes, keep route and membership unchanged",
        Unresolved: "No defensible analysis on the supplied target",
      },
    ),
    spelling: choice(
      "Under `policy.orthography` and `policy.route`, is the Surface realized by `members` in `markedContext` a canonical spelling of its Lemma or a licensed variant? Inflection alone never means Variant.",
      { Canonical: null, Variant: null, Unresolved: null },
    ),
    historicalStatus: choice("Is the grammatical use of this target archaic?", {
      Current: "Current use, including licensed old spelling",
      Archaic: "The grammatical use itself is archaic",
      Unresolved: null,
    }),
  };
  if (catalog.has("surface.inflectionalFeatures"))
    questions.inflection = inflectionQuestion(encounter.target.kind);
  for (const [path, field] of catalog) {
    if (!(
      path.startsWith("lemma.coreFeatures.") ||
      path.startsWith("surface.inflectionalFeatures.")
    ))
      continue;
    if (auxiliary && path.startsWith("lemma.")) continue;
    if (
      encounter.target.kind === "NOUN" &&
      (path.endsWith(".article") || path.endsWith(".case"))
    )
      continue;
    if (verbal && path.endsWith(".voice")) continue; // Voice follows the judged passive construction.
    questions[path] = featureQuestion(encounter.target.kind, path, field);
  }
  for (const [index] of input.members.entries()) {
    questions[`orthography_${index}`] = choice(
      `Under \`policy.orthography\`, what is the orthography of \`members[${index}]\` in \`markedContext\`?`,
      {
        Standard: "Licensed spelling/capitalization, including variants",
        Typo: "Actual local spelling or casing error",
        Unresolved: null,
      },
    );
    questions[`normalization_${index}`] = choice(
      `Under \`policy\`, how should \`members[${index}]\` be positionally normalized in \`markedContext\`?`,
      normalizations,
    );
  }
  const partial = ["Idiom", "DiscourseFormula", "Proverb", "Aphorism"].includes(
    encounter.target.kind,
  );
  if (partial)
    questions.coverage = choice(
      "Is all fixed lexical material realized, or is some genuinely unrealized?",
      {
        Full: "All fixed material realized",
        Partial: "Recoverable fixed material genuinely unrealized",
        Unresolved: null,
      },
    );
  if (auxiliary)
    questions.identity = choice(
      "Which exact reviewed AUX Lemma is realized by the complete supplied target? Finite/compound features belong to its Surface. Select the reviewed canonical identity, including exact-form sein identities when applicable.",
      {
        ...Object.fromEntries(
          identities.map((member, index) => [
            `identity_${index}`,
            JSON.stringify(member.lemma),
          ]),
        ),
        NoMatch:
          "The required AUX identity is absent from the reviewed catalog",
        Unresolved: "Cannot choose a defensible identity",
      },
    );
  else if (encounter.target.kind !== "DET")
    questions.canonical = choice(
      "Under `policy.canonicalForm`, which supplied text exactly equals the dictionary Canonical Form of the fixed whole target in `markedContext`? Select the joined candidate, an alternative, or missing text. A noun headword excludes its compositional article; do not copy an inflected noun just because its spelling is Canonical.",
      {
        ...Object.fromEntries(
          canonicalFormAlternatives.map((text, index) => [
            `candidate_${index}`,
            text,
          ]),
        ),
        CandidateIsCanonical:
          "`canonicalFormCandidate` is already the exact dictionary headword",
        CandidateIsNotCanonical:
          "The dictionary headword is absent from both `canonicalFormCandidate` and every `canonicalFormAlternatives` value",
        Unresolved:
          "Cannot defensibly establish whether the concrete candidate is the dictionary headword",
      },
    );
  // Speculative questions whose candidates come from raw source text ride in
  // the same round trip; code consumes them only when they apply.
  const articleCandidates =
    encounter.target.kind === "NOUN" ? nounArticleCandidates(encounter) : null;
  if (articleCandidates)
    Object.assign(
      questions,
      nounArticleQuestions(encounter, articleCandidates),
    );
  const lexicalStringCandidates = auxiliary
    ? {}
    : speculativeLexicalStringCandidates(catalog, input.members);
  for (const [key, candidates] of Object.entries(lexicalStringCandidates))
    questions[`text.${key}`] = lexicalStringQuestion(key, candidates);
  const judge = judgmentCaller(options);
  const state = {
    ...input,
    route,
    canonicalFormCandidate,
    canonicalFormAlternatives,
    storedLemmas,
    ...(articleCandidates ? nounArticleState(encounter) : {}),
    ...(Object.keys(lexicalStringCandidates).length
      ? { lexicalStringCandidates }
      : {}),
    policy: {
      ...sharedPolicy,
      ...(verbal
        ? {
            verbalIdentity: verbalIdentityPolicy,
            canonicalExample:
              "In Wir gehen ins Haus, finite gehen has Canonical Form gehen.",
            verbalComposition: verbalCompositionGuidance,
          }
        : {}),
      ...(encounter.target.kind === "NOUN" ? { noun: nounPolicy } : {}),
      ...(partial ? { coverage: partialCoveragePolicy } : {}),
      route: routeGuidance[encounter.target.kind] ?? "",
    },
    reviewedIdentities: identities.map((member) => member.lemma),
  };
  const result = await judge(
    "resolveGrammar",
    `${route}/features`,
    state,
    questions,
    signal,
  );
  const consumed = new Set<string>();
  function selected(id: string): string {
    consumed.add(id);
    const answer = result.answers[id];
    if (!answer || answer.type !== "choice" || answer.choice === "Unresolved")
      return fail(`Unresolved applicable question ${id}`);
    return answer.choice;
  }
  /** A speculative answer: consumed when applicable, never a failure by itself. */
  function speculative(id: string): string | undefined {
    if (!(id in questions)) return undefined;
    consumed.add(id);
    const answer = result.answers[id];
    return answer?.type === "choice" ? answer.choice : undefined;
  }
  try {
    selected("support");
    const core: Record<string, unknown> = {};
    const openFeatures: string[] = [];
    for (const [path, field] of catalog)
      if (path.startsWith("lemma.coreFeatures.") && !auxiliary) {
        const key = path.slice("lemma.coreFeatures.".length),
          answer = selected(path);
        if (field.open) {
          core[key] = null;
          if (answer === "Present") openFeatures.push(key);
        } else core[key] = answer === unmarked ? null : answer;
      }
    const surface: Record<string, unknown> = {
      spelling: selected("spelling"),
      surfaceFeatures:
        selected("historicalStatus") === "Archaic"
          ? { historicalStatus: "Archaic" }
          : null,
    };
    if (questions.inflection) {
      surface.inflectionalFeatures = null;
      if (selected("inflection") === "Marked") {
        const bag: Record<string, unknown> = {};
        const form = verbal
          ? selected("surface.inflectionalFeatures.verbForm")
          : undefined;
        for (const [path] of catalog)
          if (path.startsWith("surface.inflectionalFeatures.")) {
            const key = path.slice("surface.inflectionalFeatures.".length);
            if (
              encounter.target.kind === "NOUN" &&
              (key === "article" || key === "case")
            ) {
              bag[key] = null;
              continue;
            }
            if (verbal && key === "voice") continue;
            if (verbal && key === "participleForm" && form !== "Part") continue;
            if (
              verbal &&
              ["tense", "mood", "person", "number"].includes(key) &&
              form !== "Fin"
            ) {
              bag[key] = null;
              continue;
            }
            if (
              verbal &&
              key === "tense" &&
              selected("surface.inflectionalFeatures.mood") === "Imp"
            ) {
              bag[key] = null;
              continue;
            }
            const answer = selected(path);
            bag[key] = answer === unmarked ? null : answer;
          }
        if (verbal) bag.voice = bag.passive === null ? null : "Pass";
        surface.inflectionalFeatures = bag;
      }
    }
    const memberOrthographies = input.members.map(
      (_, index) => selected(`orthography_${index}`) as "Standard" | "Typo",
    );
    const normalizationModes = input.members.map((_, index) =>
      selected(`normalization_${index}`),
    );
    const normalizedMembers = input.members.map((text, index) =>
      transformed(text, normalizationModes[index]!),
    );
    const needed: Record<string, string> = {};
    for (const [index, mode] of normalizationModes.entries())
      if (mode === "Generate")
        needed[`member_${index}`] =
          `Required normalized text for supplied member ${index}; preserve its inflection and position. Correct only the judged typo or licensed constrained noun suspension.`;
    let coverage = partial
      ? (selected("coverage") as "Full" | "Partial")
      : "Full";
    const mechanicalCanonical =
      coverage === "Full" &&
      surface.spelling === "Canonical" &&
      ["DiscourseFormula", "Proverb", "Aphorism", "Fusion"].includes(
        encounter.target.kind,
      );
    const copiedCanonical = () =>
      encounter.target.kind === "DiscourseFormula"
        ? normalizedMembers.join(" ").toLocaleLowerCase("de")
        : normalizedMembers.join(" ");
    let lemma: GrammarOutput["lemma"];
    if (auxiliary) {
      const identity = selected("identity");
      if (identity === "NoMatch")
        throw new DumgenFailure(
          "CatalogMiss",
          "resolveGrammar",
          "Required AUX identity is absent from the reviewed catalog",
          route,
        );
      const member = identities[Number(identity.slice("identity_".length))];
      if (!member) return fail("Missing selected AUX identity");
      lemma = {
        canonicalForm: member.lemma.canonicalForm,
        coreFeatures: member.lemma.coreFeatures,
      };
      recordEvent(signal, "AuthoredIdentity", { lemma: member.lemma });
    } else {
      const member = mapped
        ? await resolveAuthoredGrammarIdentity(
            options,
            {
              kind: encounter.target.kind as "DET" | "PRON",
              spelled: normalizedMembers.join(" "),
              core,
              inflection: surface.inflectionalFeatures,
              markedContext: input.markedContext,
            },
            signal,
          )
        : null;
      if (member) {
        lemma = {
          canonicalForm: member.lemma.canonicalForm,
          coreFeatures: member.lemma.coreFeatures,
        };
        recordEvent(signal, "AuthoredIdentity", {
          lemma: member.lemma,
        });
      } else if (mechanicalCanonical) {
        lemma = {
          canonicalForm: copiedCanonical(),
          coreFeatures: core,
        };
      } else {
        const canonical = selected("canonical");
        lemma = {
          canonicalForm:
            canonical === "CandidateIsCanonical"
              ? canonicalFormCandidate
              : canonical.startsWith("candidate_")
                ? canonicalFormAlternatives[
                    Number(canonical.slice("candidate_".length))
                  ]
                : undefined,
          coreFeatures: core,
        };
        if (canonical === "CandidateIsNotCanonical")
          needed.canonicalForm =
            "Exact dictionary Canonical Form of the fixed supplied identity. Supply only missing text, not grammatical labels.";
      }
    }

    try {
      parse(
        `grammar/${route}`,
        {
          lemma: {
            ...lemma,
            canonicalForm: lemma.canonicalForm ?? "pending",
          },
          surface,
          memberOrthographies,
          normalizedMembers,
          realizationCoverage: coverage,
          ...(verbal ? { expletiveEvidence: null } : {}),
          ...(encounter.target.kind === "NOUN"
            ? { articleEvidence: null }
            : {}),
        },
        "resolveGrammar",
        true,
      );
    } catch {
      recordEvent(signal, "IncoherentApplicableFeatures", {
        lemma,
        surface,
      });
      return fail(
        "Applicable grammatical answers do not compose into a legal analysis",
      );
    }
    if (Object.keys(needed).length) {
      const wantsCanonical = Boolean(needed.canonicalForm);
      const wantsMembers =
        Object.keys(needed).length > (wantsCanonical ? 1 : 0);
      const generated = await executeGeneration(
        options,
        {
          stage: wantsCanonical
            ? wantsMembers
              ? "generateCanonicalFormAndNormalizedMembers"
              : "generateCanonicalForm"
            : "generateNormalizedMembers",
          route: `${route}/text`,
          input: {
            ...input,
            route,
            needed,
            ...(wantsCanonical
              ? {
                  judgedCore: core,
                  canonicalFormPolicy:
                    canonicalFormGuidance[encounter.target.kind] ??
                    "Canonical Form is the exact dictionary headword.",
                }
              : {}),
            ...(wantsMembers
              ? {
                  judgedSurface: surface,
                  memberOrthographies,
                  memberPolicy: normalizedMemberGuidance,
                }
              : {}),
          },
          systemPrompt: textSystemPrompt,
          outputSchema: {
            type: "object",
            properties: Object.fromEntries(
              Object.keys(needed).map((key) => [
                key,
                { type: "string", minLength: 1 },
              ]),
            ),
            required: Object.keys(needed),
            additionalProperties: false,
          },
          configuration: effectiveConfiguration(options, route),
          signal,
        },
        (raw) => {
          if (!raw || typeof raw !== "object" || Array.isArray(raw))
            throw Error("Expected requested text fields");
          const values = raw as Record<string, unknown>;
          if (
            Object.keys(values).length !== Object.keys(needed).length ||
            Object.keys(needed).some(
              (key) =>
                typeof values[key] !== "string" ||
                !(values[key] as string).trim() ||
                (key.startsWith("member_") &&
                  /\s/u.test(values[key] as string)),
            )
          )
            throw Error("Generated text does not match the requested fields");
          return values as Record<string, string>;
        },
      );
      if (generated.canonicalForm)
        lemma.canonicalForm = generated.canonicalForm;
      for (const [index] of normalizedMembers.entries())
        if (generated[`member_${index}`])
          normalizedMembers[index] = generated[`member_${index}`]!;
    }
    if (mechanicalCanonical) lemma.canonicalForm = copiedCanonical();
    // Speculative lexical strings answered in the first round trip settle
    // the open feature; only unresolved ones need the follow-up.
    const pendingFeatures = openFeatures.filter((key) => {
      const answer = speculative(`text.${key}`);
      const text =
        answer?.startsWith("text_") &&
        lexicalStringCandidates[key]?.[Number(answer.slice("text_".length))];
      if (!text) return true;
      core[key] = text;
      return false;
    });
    if (pendingFeatures.length) {
      const words = [
        ...normalizedMembers,
        ...String(lemma.canonicalForm).split(/\s+|\.\.\./u),
      ].filter(Boolean);
      const followup: Questions = {};
      const candidates: Record<string, string[]> = {};
      for (const key of pendingFeatures) {
        candidates[key] = [
          ...new Set(
            key === "hasSepPrefix"
              ? words.flatMap((word) =>
                  Array.from({ length: word.length }, (_, index) =>
                    word.slice(0, index + 1),
                  ),
                )
              : words,
          ),
        ];
        if (candidates[key]!.length > 254)
          return fail("Too many complete lexical-string candidates");
        followup[key] = choice(
          `Choose the exact ${key} established by the lexical feature judgment. Prefixes are separable prefixes; governed prepositions must be lexically selected and cannot be a detached prefix or adjunct.`,
          {
            ...Object.fromEntries(
              candidates[key]!.map((text, index) => [`text_${index}`, text]),
            ),
            Unresolved:
              "None is defensible; do not revise the prior feature judgment",
          },
        );
      }
      const resolved = await judge(
        "resolveGrammar",
        `${route}/lexical-strings`,
        {
          ...state,
          lemma: JSON.stringify(lemma),
          normalizedMembers,
          candidates,
        },
        followup,
        signal,
      );
      for (const key of pendingFeatures) {
        const answer = resolved.answers[key];
        if (
          !answer ||
          answer.type !== "choice" ||
          answer.choice === "Unresolved"
        )
          return fail(`Unresolved ${key}`);
        core[key] =
          candidates[key]![Number(answer.choice.slice("text_".length))];
      }
    }
    const article = articleCandidates
      ? await resolveNounArticle(
          options,
          encounter,
          {
            lemma,
            surface,
            normalizedMembers,
            memberOrthographies,
          },
          {
            candidates: articleCandidates,
            attachment: speculative("attachment"),
            case: speculative("surface.inflectionalFeatures.case"),
          },
          signal,
        )
      : null;
    if (article) {
      coverage = article.coverage;
    }
    let expletiveEvidence = null;
    if (
      verbal &&
      (surface.inflectionalFeatures as Record<string, unknown> | null)
        ?.expletive === "Subject"
    ) {
      const positions = normalizedMembers.flatMap((text, index) =>
        text.toLocaleLowerCase("de") === "es" ? [index] : [],
      );
      const [position] = positions;
      if (positions.length !== 1 || position === undefined)
        return fail("Subject es needs one unambiguous owned occurrence");
      const attested = input.members[position];
      const orthography = memberOrthographies[position];
      if (attested === undefined || orthography === undefined)
        return fail("Unaligned subject es evidence");
      normalizedMembers[position] = "es";
      expletiveEvidence = {
        attested,
        orthography,
      };
    }
    const output = {
      ...(verbal ? { expletiveEvidence } : {}),
      ...(encounter.target.kind === "NOUN"
        ? { articleEvidence: article?.evidence ?? null }
        : {}),
      lemma,
      surface,
      memberOrthographies,
      normalizedMembers,
      realizationCoverage: coverage,
    };
    try {
      return parse<GrammarOutput>(
        `grammar/${route}`,
        output,
        "resolveGrammar",
        true,
      );
    } catch {
      recordEvent(signal, "IncoherentApplicableFeatures", output);
      return fail(
        "Applicable grammatical answers do not compose into a legal analysis",
      );
    }
  } finally {
    recordEvent(signal, "JudgmentApplicability", {
      consumed: [...consumed],
      ignored: Object.keys(questions).filter((id) => !consumed.has(id)),
    });
  }
}
