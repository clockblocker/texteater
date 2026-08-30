import type { Reading } from "dumling/types";
import { defaultKnowledgeRequestMask, type LexicalUnitShadow } from "dumrel";

import {
	germanKnowledgeAnalysisSchema,
	germanKnowledgeGenerationInputSchema,
} from "../../../../../../knowledge-generation/de/schemas";
import {
	type RequestableRelation,
	requestableRelationSchema,
} from "../../../../../../knowledge-generation/relations";
import type { GoldenCaseRegistry } from "../../../../../assembly";

type Target = LexicalUnitShadow<"de">;
type FailureMode =
	| "positive"
	| "negative"
	| "null"
	| "omission"
	| "wrong-kind"
	| "wrong-family"
	| "polysemy"
	| "register"
	| "multi-member"
	| "self-relation";
type Authority = "primary-source" | "contract-reviewer";

export type RelationCorpusAdjudication = Readonly<{
	rationale: string;
	failureModes: readonly FailureMode[];
	authority: Authority;
	evidenceRefs: readonly string[];
	acceptableTargetSets?: Readonly<
		Partial<
			Record<RequestableRelation, readonly (readonly Target[] | null)[]>
		>
	>;
	harmfulTargets: readonly Readonly<{
		relation: RequestableRelation;
		target: Target;
		reason: string;
	}>[];
	inverseJudgments: readonly Readonly<{
		relation: "hyponym" | "meronym";
		target: Target;
		rationale: string;
	}>[];
}>;

type Seed = Readonly<{
	context: string;
	reading: Reading<"de">;
	requestedRelations?: readonly RequestableRelation[];
	accepted?: Readonly<
		Partial<Record<RequestableRelation, readonly Target[]>>
	>;
	rationale: string;
	failureModes: readonly FailureMode[];
	contaminationKey: string;
	authority?: Authority;
	evidenceRefs?: readonly string[];
	acceptableTargetSets?: RelationCorpusAdjudication["acceptableTargetSets"];
	harmfulTargets?: RelationCorpusAdjudication["harmfulTargets"];
	inverseJudgments?: RelationCorpusAdjudication["inverseJudgments"];
}>;

type RetainedCase = Readonly<{
	goldenCase: GoldenCaseRegistry<
		typeof germanKnowledgeGenerationInputSchema,
		typeof germanKnowledgeAnalysisSchema
	>[string];
	adjudication: RelationCorpusAdjudication;
}>;

const sources = {
	contract:
		"battery/dumrel/docs/reference/german-semantic-relation-judgment-contract.md",
	primary: "battery/dumgen/docs/german-semantic-relation-primary-sources.md",
	acceptance:
		"battery/dumgen/docs/german-semantic-relation-acceptance-primary-sources.md",
} as const;

const adjectiveCore = {
	abbr: null,
	foreign: null,
	numType: null,
	variant: null,
} as const;
const verbCore = {
	hasGovPrep: null,
	hasSepPrefix: null,
	lexicallyReflexive: null,
	verbType: null,
} as const;
const adpositionCore = {
	abbr: null,
	adpType: null,
	extPos: null,
	foreign: null,
	governedCase: null,
	partType: null,
} as const;
const adverbCore = { foreign: null, numType: null, pronType: null } as const;
const conjunctionCore = { conjType: null } as const;
const determinerCore = {
	definite: null,
	extPos: null,
	foreign: null,
	numType: null,
	person: null,
	polite: null,
	poss: null,
	pronType: "Tot",
} as const;
const pronounCore = {
	extPos: null,
	foreign: null,
	person: null,
	polite: null,
	poss: null,
	pronType: "Neg",
} as const;

const demonstrations = defineCases({
	"relation-demo-pfote-anchor": {
		context: "Der Hund hob die <TARGET>Pfote</TARGET>.",
		reading: noun("Pfote", "🐾", "Fem"),
		accepted: {
			nearSynonym: [t("Tatze", "Lexeme", "NOUN")],
			hypernym: [t("Körperteil", "Lexeme", "NOUN")],
			holonym: [t("Tier", "Lexeme", "NOUN")],
		},
		rationale:
			"The approved anchor uses Tatze only as a larger-predator-restricted Near Synonym, separates category Körperteil from bearer whole Tier, and requires conservative nulls elsewhere.",
		failureModes: ["positive", "null", "wrong-kind"],
		contaminationKey: "relation-de-pfote-paw",
		authority: "primary-source",
		evidenceRefs: [sources.contract, sources.primary],
		harmfulTargets: [
			h(
				"hypernym",
				t("Hund", "Lexeme", "NOUN"),
				"The encountered dog is a contingent bearer, not a category.",
			),
			h(
				"holonym",
				t("Hund", "Lexeme", "NOUN"),
				"Context cannot narrow the generally valid bearer Tier to Hund.",
			),
		],
		inverseJudgments: [
			inv(
				"hyponym",
				t("Pfote", "Lexeme", "NOUN"),
				"Körperteil → Pfote is the accepted inverse taxonomy judgment.",
			),
			inv(
				"meronym",
				t("Pfote", "Lexeme", "NOUN"),
				"Tier → Pfote is the accepted inverse part judgment.",
			),
		],
	},
	"relation-demo-mieten-converse": {
		context: "Wir <TARGET>mieten</TARGET> die Wohnung von Frau Roth.",
		reading: verb("mieten", "🔑"),
		accepted: { nearAntonym: [t("vermieten", "Lexeme", "VERB")] },
		rationale:
			"Mieten and vermieten describe one transaction from exchanged participant viewpoints, so the project maps the supported converse analysis to Near Antonym rather than strict Antonym.",
		failureModes: ["positive", "negative", "wrong-kind"],
		contaminationKey: "relation-de-mieten-rent",
		authority: "contract-reviewer",
		evidenceRefs: [sources.contract, sources.primary],
		harmfulTargets: [
			h(
				"antonym",
				t("vermieten", "Lexeme", "VERB"),
				"A converse changes viewpoint; it does not reverse or exclude the event.",
			),
		],
	},
} satisfies Record<string, Seed>);

const basic = defineCases({
	"relation-basic-01-hubschrauber": {
		context: "Der <TARGET>Hubschrauber</TARGET> landete sicher.",
		reading: noun("Hubschrauber", "🚁", "Masc"),
		accepted: {
			synonym: [t("Helikopter", "Lexeme", "NOUN")],
			hypernym: [t("Luftfahrzeug", "Lexeme", "NOUN")],
		},
		rationale:
			"Primary lexicography cross-lists Helikopter and supports the shared aircraft Reading; exact-synonym status is an explicit reviewer adjudication, while Luftfahrzeug is the useful category.",
		failureModes: ["positive", "null"],
		contaminationKey: "relation-de-hubschrauber-aircraft",
		authority: "contract-reviewer",
		evidenceRefs: [sources.primary],
	},
	"relation-basic-02-sichtbar": {
		context: "Der Fleck ist deutlich <TARGET>sichtbar</TARGET>.",
		reading: adjective("sichtbar", "👁️"),
		accepted: { antonym: [t("unsichtbar", "Lexeme", "ADJ")] },
		rationale:
			"Sichtbar and unsichtbar form a conventional complementary opposition; shared morphology is not the evidence for the relation.",
		failureModes: ["positive"],
		contaminationKey: "relation-de-sichtbar-visibility",
		evidenceRefs: [sources.contract],
	},
	"relation-basic-03-pudel": {
		context: "Der <TARGET>Pudel</TARGET> wartet vor der Tür.",
		reading: noun("Pudel", "🐩", "Masc"),
		accepted: { hypernym: [t("Hund", "Lexeme", "NOUN")] },
		rationale:
			"Every poodle is a dog and Hund is the nearest useful category; Tier is too distant and Pfote is a part, not a category.",
		failureModes: ["positive", "wrong-kind"],
		contaminationKey: "relation-de-pudel-dog",
		authority: "primary-source",
		evidenceRefs: [sources.primary],
		harmfulTargets: [
			h(
				"hypernym",
				t("Tier", "Lexeme", "NOUN"),
				"Tier skips the useful intermediate Hund.",
			),
			h(
				"hypernym",
				t("Pfote", "Lexeme", "NOUN"),
				"Pfote is a part, not a broader category.",
			),
		],
	},
	"relation-basic-04-berlin-city": {
		context: "<TARGET>Berlin</TARGET> ist Deutschlands größte Stadt.",
		reading: properNoun("Berlin", "🏙️", "Neut"),
		accepted: { hypernym: [t("Stadt", "Lexeme", "NOUN")] },
		rationale:
			"The exact city Reading is conventionally an instance of Stadt. Berlin's Land Reading is kept separate rather than adding cross-Reading containment here.",
		failureModes: ["positive", "polysemy"],
		contaminationKey: "relation-de-berlin",
		authority: "primary-source",
		evidenceRefs: [sources.primary],
		inverseJudgments: [
			inv(
				"hyponym",
				t("Berlin", "Lexeme", "PROPN"),
				"Stadt → Berlin is the inverse of the accepted instance-to-category judgment.",
			),
		],
	},
	"relation-basic-05-sprinten": {
		context: "Auf den letzten Metern <TARGET>sprintete</TARGET> sie.",
		reading: verb("sprinten", "🏃💨"),
		accepted: { hypernym: [t("laufen", "Lexeme", "VERB")] },
		rationale:
			"Primary lexicography defines sprinten as short-distance highest-speed running, directly supporting the broader action laufen.",
		failureModes: ["positive"],
		contaminationKey: "relation-de-sprinten-run",
		authority: "primary-source",
		evidenceRefs: [sources.primary],
	},
} satisfies Record<string, Seed>);

const adversarial = defineCases({
	"relation-adv-01-bank-finance": {
		context: "Die <TARGET>Bank</TARGET> genehmigte den Kredit.",
		reading: noun("Bank", "🏦", "Fem"),
		accepted: {
			synonym: [t("Kreditinstitut", "Lexeme", "NOUN")],
		},
		rationale:
			"Only the financial Reading is fixed. Duden treats Kreditinstitut as synonymous here, so it is not also a Hypernym; seating vocabulary belongs to another Reading.",
		failureModes: ["polysemy", "negative", "self-relation"],
		contaminationKey: "relation-de-bank",
		authority: "contract-reviewer",
		evidenceRefs: [sources.primary],
		harmfulTargets: [
			h(
				"hypernym",
				t("Kreditinstitut", "Lexeme", "NOUN"),
				"Primary lexicography treats the pair as synonyms, making taxonomy contested.",
			),
			h(
				"nearSynonym",
				t("Sitzbank", "Lexeme", "NOUN"),
				"Sitzbank belongs to the furniture Reading.",
			),
			h(
				"synonym",
				t("Bank", "Lexeme", "NOUN"),
				"A source Lemma may never target itself.",
			),
		],
	},
	"relation-adv-02-bank-bench": {
		context: "Wir sitzen auf einer <TARGET>Bank</TARGET> im Park.",
		reading: noun("Bank", "🪑", "Fem"),
		accepted: {
			nearSynonym: [t("Sitzbank", "Lexeme", "NOUN")],
			hypernym: [t("Sitzmöbel", "Lexeme", "NOUN")],
		},
		rationale:
			"The furniture Reading admits the more explicit Sitzbank as a Near Synonym and Sitzmöbel as category; financial vocabulary would leak across Readings.",
		failureModes: ["polysemy", "negative"],
		contaminationKey: "relation-de-bank",
		evidenceRefs: [sources.primary],
		harmfulTargets: [
			h(
				"synonym",
				t("Kreditinstitut", "Lexeme", "NOUN"),
				"The target denotes the unrelated financial Reading.",
			),
		],
	},
	"relation-adv-03-schloss-building": {
		context: "Das <TARGET>Schloss</TARGET> steht auf einem Hügel.",
		reading: noun("Schloss", "🏰", "Neut"),
		accepted: { hypernym: [t("Gebäude", "Lexeme", "NOUN")] },
		rationale:
			"The building Reading is a Gebäude; keys and locking devices belong to the other documented Schloss Reading.",
		failureModes: ["polysemy", "negative"],
		contaminationKey: "relation-de-schloss",
		authority: "primary-source",
		evidenceRefs: [sources.primary],
		harmfulTargets: [
			h(
				"holonym",
				t("Schlüssel", "Lexeme", "NOUN"),
				"A key is an instrument for the lock Reading, not a whole of the building Reading.",
			),
		],
	},
	"relation-adv-04-schloss-lock": {
		context: "Der Schlüssel steckt im <TARGET>Schloss</TARGET>.",
		reading: noun("Schloss", "🔒", "Neut"),
		accepted: { hypernym: [t("Schließvorrichtung", "Lexeme", "NOUN")] },
		rationale:
			"The locking-device Reading is a Schließvorrichtung; palace and building targets are cross-Reading errors, and Schlüssel is an instrument rather than a component whole.",
		failureModes: ["polysemy", "wrong-kind"],
		contaminationKey: "relation-de-schloss",
		authority: "primary-source",
		evidenceRefs: [sources.primary],
		harmfulTargets: [
			h(
				"hypernym",
				t("Gebäude", "Lexeme", "NOUN"),
				"The category belongs to the palace Reading.",
			),
			h(
				"holonym",
				t("Schlüssel", "Lexeme", "NOUN"),
				"Instrument use is not part-whole containment.",
			),
		],
	},
	"relation-adv-05-klug-decision": {
		context: "Das war eine <TARGET>kluge</TARGET> Entscheidung.",
		reading: adjective("klug", "🧭"),
		accepted: { nearSynonym: [t("vernünftig", "Lexeme", "ADJ")] },
		rationale:
			"The context fixes the sensible/appropriate Reading, for which vernünftig is close; intelligent favors cognitive capacity and would switch to another klug Reading.",
		failureModes: ["polysemy", "negative"],
		contaminationKey: "relation-de-klug-sensible",
		authority: "primary-source",
		evidenceRefs: [sources.primary],
		harmfulTargets: [
			h(
				"synonym",
				t("intelligent", "Lexeme", "ADJ"),
				"The target selects cognitive capacity rather than sensible judgment.",
			),
		],
	},
	"relation-adv-06-stark-physical": {
		context: "Sie ist körperlich sehr <TARGET>stark</TARGET>.",
		reading: adjective("stark", "💪"),
		accepted: {
			nearSynonym: [t("kräftig", "Lexeme", "ADJ")],
			antonym: [t("schwach", "Lexeme", "ADJ")],
		},
		rationale:
			"The physical-strength Reading supports kräftig and the scalar opposite schwach; heftig belongs to the intensity Reading found in starker Regen.",
		failureModes: ["polysemy", "wrong-kind"],
		contaminationKey: "relation-de-stark-physical",
		harmfulTargets: [
			h(
				"nearSynonym",
				t("heftig", "Lexeme", "ADJ"),
				"A familiar collocation cannot import a target from another Reading.",
			),
		],
	},
	"relation-adv-07-ins-gras-beissen": {
		context: "Der Tyrann <TARGET>biss endlich ins Gras</TARGET>.",
		reading: phraseme("ins Gras beißen", "Idiom", "☠️"),
		accepted: { nearSynonym: [t("sterben", "Lexeme", "VERB")] },
		rationale:
			"Primary lexicography defines the whole idiom as sterben but marks it salopp; that sourced register difference blocks exact Synonymy.",
		failureModes: ["register", "multi-member", "negative"],
		contaminationKey: "relation-de-ins-gras-beissen",
		authority: "primary-source",
		evidenceRefs: [sources.primary],
		harmfulTargets: [
			h(
				"synonym",
				t("sterben", "Lexeme", "VERB"),
				"The neutral Lexeme erases the sourced salopp register.",
			),
		],
	},
	"relation-adv-08-foehre": {
		context: "Die <TARGET>Föhre</TARGET> ist immergrün.",
		reading: noun("Föhre", "🌲", "Fem"),
		accepted: {
			nearSynonym: [t("Kiefer", "Lexeme", "NOUN")],
			hypernym: [t("Nadelbaum", "Lexeme", "NOUN")],
		},
		rationale:
			"Duden defines regional Föhre through the pine Reading of Kiefer; the regional restriction makes it Near Synonym, while Nadelbaum is the broader category.",
		failureModes: ["register", "polysemy"],
		contaminationKey: "relation-de-foehre-pine",
		authority: "primary-source",
		evidenceRefs: [sources.primary],
		harmfulTargets: [
			h(
				"synonym",
				t("Kiefer", "Lexeme", "NOUN"),
				"Regional distribution blocks exact Synonymy.",
			),
		],
	},
	"relation-adv-09-kaufen-converse": {
		context: "Sie <TARGET>kauft</TARGET> das Fahrrad von ihm.",
		reading: verb("kaufen", "🛒"),
		accepted: {
			nearAntonym: [t("verkaufen", "Lexeme", "VERB")],
			hypernym: [t("erwerben", "Lexeme", "VERB")],
		},
		rationale:
			"Primary definitions support reversed transaction viewpoints; Near Antonym is the project mapping, and erwerben is the broader acquisition action.",
		failureModes: ["negative", "wrong-kind"],
		contaminationKey: "relation-de-kaufen-buy",
		authority: "contract-reviewer",
		evidenceRefs: [sources.primary, sources.contract],
		harmfulTargets: [
			h(
				"antonym",
				t("verkaufen", "Lexeme", "VERB"),
				"Both descriptions can be true of one transaction from different viewpoints.",
			),
		],
	},
	"relation-adv-10-oeffnen": {
		context: "Bitte <TARGET>öffne</TARGET> das Fenster.",
		reading: verb("öffnen", "🪟"),
		accepted: { antonym: [t("schließen", "Lexeme", "VERB")] },
		rationale:
			"Duden directly cross-lists öffnen and schließen as antonyms, and the pair is a conventional reversive opposition.",
		failureModes: ["positive"],
		contaminationKey: "relation-de-oeffnen-open",
		authority: "primary-source",
		evidenceRefs: [sources.primary],
	},
	"relation-adv-11-warm": {
		context: "Die Suppe ist noch <TARGET>warm</TARGET>.",
		reading: adjective("warm", "🌡️"),
		accepted: { antonym: [t("kalt", "Lexeme", "ADJ")] },
		rationale:
			"Warm and kalt are conventional opposing temperature poles; heiß is a higher value on the same side, not an opposite.",
		failureModes: ["negative"],
		contaminationKey: "relation-de-warm-temperature",
		harmfulTargets: [
			h(
				"antonym",
				t("heiß", "Lexeme", "ADJ"),
				"A different scale value is not the opposing pole.",
			),
		],
	},
	"relation-adv-12-hund-katze": {
		context: "Der <TARGET>Hund</TARGET> schläft neben der Katze.",
		reading: noun("Hund", "🐕", "Masc"),
		accepted: { hypernym: [t("Raubtier", "Lexeme", "NOUN")] },
		rationale:
			"Katze is only a contextual foil and co-hyponym, not a lexical opposite; the null is a contract judgment, not an inference from dictionary silence.",
		failureModes: ["negative", "wrong-kind"],
		contaminationKey: "relation-de-hund-animal",
		authority: "contract-reviewer",
		evidenceRefs: [sources.contract, sources.primary],
		harmfulTargets: [
			h(
				"nearAntonym",
				t("Katze", "Lexeme", "NOUN"),
				"Arbitrary co-hyponyms do not become established opposites.",
			),
		],
	},
	"relation-adv-13-auto-taxonomy": {
		context: "Das <TARGET>Auto</TARGET> steht vor dem Haus.",
		reading: noun("Auto", "🚗", "Neut"),
		accepted: { hypernym: [t("Kraftfahrzeug", "Lexeme", "NOUN")] },
		rationale:
			"Kraftfahrzeug is a category; Rad is a part and Garage a contingent location, so taxonomy and part-whole must not be confused.",
		failureModes: ["wrong-kind", "null"],
		contaminationKey: "relation-de-auto-car",
		harmfulTargets: [
			h(
				"hypernym",
				t("Rad", "Lexeme", "NOUN"),
				"A wheel is a Meronym, not a category.",
			),
			h(
				"holonym",
				t("Garage", "Lexeme", "NOUN"),
				"A garage is an optional location, not an inherent whole.",
			),
		],
		inverseJudgments: [
			inv(
				"meronym",
				t("Rad", "Lexeme", "NOUN"),
				"Auto → wheel-sense Rad is the inverse-only conventional part judgment.",
			),
		],
	},
	"relation-adv-14-rad-wheel": {
		context: "Ein <TARGET>Rad</TARGET> des Fahrrads ist verbogen.",
		reading: noun("Rad", "🛞", "Neut"),
		accepted: {
			hypernym: [t("Bauteil", "Lexeme", "NOUN")],
			holonym: [t("Fahrzeug", "Lexeme", "NOUN")],
		},
		rationale:
			"The wheel-part Reading is a Bauteil and an inherent part of a Fahrzeug; the encountered Fahrrad cannot narrow the general whole, and the bicycle Reading of Rad is excluded.",
		failureModes: ["polysemy", "wrong-kind"],
		contaminationKey: "relation-de-rad-wheel",
		authority: "primary-source",
		evidenceRefs: [sources.primary],
		harmfulTargets: [
			h(
				"synonym",
				t("Fahrrad", "Lexeme", "NOUN"),
				"That relation holds only for the separate colloquial bicycle Reading of Rad.",
			),
		],
	},
	"relation-adv-15-blutplasma": {
		context: "Das <TARGET>Blutplasma</TARGET> wurde untersucht.",
		reading: noun("Blutplasma", "🩸", "Neut"),
		accepted: {
			hypernym: [t("Flüssigkeit", "Lexeme", "NOUN")],
			holonym: [t("Blut", "Lexeme", "NOUN")],
		},
		rationale:
			"Duden defines Blutplasma as the liquid component of Blut, directly separating the category Flüssigkeit from the containing whole Blut.",
		failureModes: ["positive", "wrong-kind"],
		contaminationKey: "relation-de-blutplasma",
		authority: "primary-source",
		evidenceRefs: [sources.primary],
		inverseJudgments: [
			inv(
				"meronym",
				t("Blutplasma", "Lexeme", "NOUN"),
				"Blut → Blutplasma is the inverse constitutive-component judgment.",
			),
		],
	},
	"relation-adv-16-berlin-land": {
		context: "<TARGET>Berlin</TARGET> ist ein Land der Bundesrepublik.",
		reading: properNoun("Berlin", "🏛️", "Neut"),
		accepted: {
			hypernym: [t("Bundesland", "Lexeme", "NOUN")],
			holonym: [t("Deutschland", "Lexeme", "PROPN")],
		},
		rationale:
			"The exact Land Reading is a Bundesland and an administrative member of Deutschland; it is not silently merged with the city Reading.",
		failureModes: ["polysemy", "wrong-kind"],
		contaminationKey: "relation-de-berlin",
		authority: "primary-source",
		evidenceRefs: [sources.primary],
		inverseJudgments: [
			inv(
				"meronym",
				t("Berlin", "Lexeme", "PROPN"),
				"Deutschland → Berlin is the inverse administrative-member judgment.",
			),
		],
	},
	"relation-adv-17-kreuzberg": {
		context: "<TARGET>Kreuzberg</TARGET> liegt südlich der Spree.",
		reading: properNoun("Kreuzberg", "🏙️", "Masc"),
		accepted: {
			hypernym: [t("Ortsteil", "Lexeme", "NOUN")],
			holonym: [t("Berlin", "Lexeme", "PROPN")],
		},
		rationale:
			"Official Berlin sources identify Kreuzberg as an Ortsteil within Berlin, supporting both category and stable containment.",
		failureModes: ["positive"],
		contaminationKey: "relation-de-kreuzberg",
		authority: "primary-source",
		evidenceRefs: [sources.primary],
	},
	"relation-adv-18-johann-trivial": {
		context: "<TARGET>Johann</TARGET> wartet draußen.",
		reading: properNoun("Johann", "👤", "Masc"),
		rationale:
			"The project rejects the trivial category Person for ordinary personal names, and the encounter supplies no stable whole; these are contract nulls, not dictionary-silence claims.",
		failureModes: ["null", "negative"],
		contaminationKey: "relation-de-johann-person",
		authority: "contract-reviewer",
		evidenceRefs: [sources.contract, sources.primary],
		harmfulTargets: [
			h(
				"hypernym",
				t("Person", "Lexeme", "NOUN"),
				"The contract explicitly rejects trivial personal-name categories.",
			),
			h(
				"holonym",
				t("Firma", "Lexeme", "NOUN"),
				"Employment or presence is contingent.",
			),
		],
	},
	"relation-adv-19-mannschaft-inverse": {
		context: "Die <TARGET>Mannschaft</TARGET> jubelte.",
		reading: noun("Mannschaft", "👥", "Fem"),
		accepted: { hypernym: [t("Gruppe", "Lexeme", "NOUN")] },
		rationale:
			"Mannschaft is a kind of Gruppe. Spieler is a conventional member Meronym, but Dumgen never requests the downward relation.",
		failureModes: ["wrong-kind", "omission"],
		contaminationKey: "relation-de-mannschaft-team",
		inverseJudgments: [
			inv(
				"meronym",
				t("Spieler", "Lexeme", "NOUN"),
				"Mannschaft → Spieler is the inverse of Spieler → Mannschaft Holonym.",
			),
		],
	},
	"relation-adv-20-koerperteil-inverse": {
		context: "Das verletzte <TARGET>Körperteil</TARGET> wurde untersucht.",
		reading: noun("Körperteil", "🩻", "Neut"),
		accepted: {
			hypernym: [t("anatomische Struktur", "Lexeme", "NOUN")],
			holonym: [t("Körper", "Lexeme", "NOUN")],
		},
		rationale:
			"Körperteil is an anatomical structure and part of a Körper; Pfote is a narrower inverse-only Hyponym judgment.",
		failureModes: ["wrong-kind", "omission"],
		contaminationKey: "relation-de-koerperteil-body-part",
		inverseJudgments: [
			inv(
				"hyponym",
				t("Pfote", "Lexeme", "NOUN"),
				"Körperteil → Pfote is the inverse of Pfote → Körperteil Hypernym.",
			),
		],
	},
	"relation-adv-21-innerhalb": {
		context: "Bleiben Sie <TARGET>innerhalb</TARGET> der Markierung.",
		reading: lexeme("innerhalb", "ADP", adpositionCore, "⭕"),
		accepted: { antonym: [t("außerhalb", "Lexeme", "ADP")] },
		rationale:
			"Innerhalb and außerhalb form a conventional complementary spatial opposition; in is broader and syntactically different.",
		failureModes: ["positive", "negative"],
		contaminationKey: "relation-de-innerhalb-inside",
	},
	"relation-adv-22-trotz": {
		context: "<TARGET>Trotz</TARGET> des Regens gingen wir spazieren.",
		reading: lexeme("trotz", "ADP", adpositionCore, "☔"),
		accepted: { nearSynonym: [t("ungeachtet", "Lexeme", "ADP")] },
		rationale:
			"Ungeachtet shares the concessive relation but is systematically more formal, so only Near Synonym passes.",
		failureModes: ["register", "null"],
		contaminationKey: "relation-de-trotz-despite",
	},
	"relation-adv-23-immer": {
		context: "Sie kommt <TARGET>immer</TARGET> pünktlich.",
		reading: lexeme("immer", "ADV", adverbCore, "♾️"),
		accepted: { antonym: [t("nie", "Lexeme", "ADV")] },
		rationale:
			"The temporal-frequency Readings immer and nie are conventional endpoint opposites; manchmal is an intermediate frequency.",
		failureModes: ["positive", "negative"],
		contaminationKey: "relation-de-immer-always",
		harmfulTargets: [
			h(
				"antonym",
				t("manchmal", "Lexeme", "ADV"),
				"An intermediate value is not the opposing pole.",
			),
		],
	},
	"relation-adv-24-manchmal": {
		context: "<TARGET>Manchmal</TARGET> fährt sie mit dem Zug.",
		reading: lexeme("manchmal", "ADV", adverbCore, "🕰️"),
		accepted: { nearSynonym: [t("bisweilen", "Lexeme", "ADV")] },
		rationale:
			"Primary lexicography supports the shared occasional-frequency meaning; the elevated/literary distribution is reviewer-adjudicated as a Near-Synonym restriction.",
		failureModes: ["register", "negative"],
		contaminationKey: "relation-de-manchmal-sometimes",
		authority: "contract-reviewer",
		evidenceRefs: [sources.primary],
	},
	"relation-adv-25-muessen": {
		context: "Wir <TARGET>müssen</TARGET> jetzt gehen.",
		reading: lexeme("müssen", "AUX", { verbType: "Mod" }, "❗"),
		accepted: { nearSynonym: [t("sollen", "Lexeme", "AUX")] },
		rationale:
			"Sollen overlaps in obligation contexts but introduces reported or normative modality instead of preserving necessity.",
		failureModes: ["negative", "polysemy"],
		contaminationKey: "relation-de-muessen-obligation",
	},
	"relation-adv-26-und": {
		context: "Anna <TARGET>und</TARGET> Ben kommen.",
		reading: lexeme("und", "CCONJ", conjunctionCore, "➕"),
		accepted: { nearAntonym: [t("oder", "Lexeme", "CCONJ")] },
		rationale:
			"Und and oder are conventionally paired coordination choices but not strict logical complements in ordinary German; CCONJ does not request Near Synonym.",
		failureModes: ["negative", "omission"],
		contaminationKey: "relation-de-und-coordination",
		authority: "contract-reviewer",
		harmfulTargets: [
			h(
				"antonym",
				t("oder", "Lexeme", "CCONJ"),
				"Inclusive and contextual uses prevent strict complementary opposition.",
			),
		],
	},
	"relation-adv-27-jeder": {
		context: "<TARGET>Jeder</TARGET> Gast erhielt ein Glas.",
		reading: lexeme("jeder", "DET", determinerCore, "🌐"),
		accepted: { nearAntonym: [t("kein", "Lexeme", "DET")] },
		rationale:
			"Jeder and kein conventionally contrast universal and zero quantity but are not logical complements because intermediate quantities exist.",
		failureModes: ["negative", "wrong-kind"],
		contaminationKey: "relation-de-jeder-every",
		authority: "contract-reviewer",
	},
	"relation-adv-28-ja": {
		context: "<TARGET>Ja</TARGET>, ich komme mit.",
		reading: lexeme("ja", "INTJ", { partType: null }, "✅"),
		accepted: { antonym: [t("nein", "Lexeme", "INTJ")] },
		rationale:
			"As response particles, ja and nein conventionally affirm and reject the same proposition in parallel discourse roles.",
		failureModes: ["positive"],
		contaminationKey: "relation-de-ja-response",
	},
	"relation-adv-29-zwei": {
		context: "Wir brauchen <TARGET>zwei</TARGET> Tickets.",
		reading: lexeme(
			"zwei",
			"NUM",
			{ abbr: null, foreign: null, numType: "Card" },
			"2️⃣",
		),
		rationale:
			"No distinct exact-equivalent Lemma is adjudicated; the source Lemma and inflected Surfaces are forbidden, so the sole requested Synonym is null.",
		failureModes: ["null", "self-relation"],
		contaminationKey: "relation-de-zwei-number",
		authority: "contract-reviewer",
		harmfulTargets: [
			h(
				"synonym",
				t("zwei", "Lexeme", "NUM"),
				"A Reading may not target its own Lemma.",
			),
			h(
				"synonym",
				t("zweier", "Lexeme", "NUM"),
				"An inflected Surface is not a target Lemma.",
			),
		],
	},
	"relation-adv-30-nicht": {
		context: "Das ist <TARGET>nicht</TARGET> wahr.",
		reading: lexeme(
			"nicht",
			"PART",
			{ abbr: null, foreign: null, partType: null, polarity: "Neg" },
			"🚫",
		),
		accepted: { nearSynonym: [t("keineswegs", "Lexeme", "ADV")] },
		rationale:
			"Keineswegs shares negation but adds emphatic intensity and differs grammatically, allowing Near Synonym but blocking exact equivalence.",
		failureModes: ["register", "wrong-kind"],
		contaminationKey: "relation-de-nicht-negation",
	},
	"relation-adv-31-niemand": {
		context: "<TARGET>Niemand</TARGET> antwortete.",
		reading: lexeme("niemand", "PRON", pronounCore, "🚷"),
		accepted: { antonym: [t("jemand", "Lexeme", "PRON")] },
		rationale:
			"For the existential-person Reading, niemand and jemand form a conventional complementary opposition.",
		failureModes: ["positive"],
		contaminationKey: "relation-de-niemand-nobody",
	},
	"relation-adv-32-obwohl": {
		context: "<TARGET>Obwohl</TARGET> es regnete, gingen wir spazieren.",
		reading: lexeme("obwohl", "SCONJ", conjunctionCore, "☔"),
		accepted: { nearSynonym: [t("obgleich", "Lexeme", "SCONJ")] },
		rationale:
			"Obgleich shares the concessive core but has a stable elevated register, so it is Near Synonym rather than exact Synonym.",
		failureModes: ["register", "negative"],
		contaminationKey: "relation-de-obwohl-although",
	},
	"relation-adv-33-plus-symbol": {
		context: "Rechne drei <TARGET>+</TARGET> zwei.",
		reading: lexeme("+", "SYM", { foreign: null, numType: null }, "➕"),
		accepted: { antonym: [t("−", "Lexeme", "SYM")] },
		rationale:
			"Under the mathematical-operator Reading, plus and minus form a conventional reversive/opposing pair; the spelled word plus is another target identity.",
		failureModes: ["positive", "wrong-kind"],
		contaminationKey: "relation-de-plus-operator",
	},
	"relation-adv-34-aphorism-null": {
		context: "Es gilt: <TARGET>Der Weg ist das Ziel</TARGET>.",
		reading: phraseme("Der Weg ist das Ziel", "Aphorism", "🛤️"),
		rationale:
			"No adjudicated expression preserves this aphorism's proposition and stance; the null follows contract review, not dictionary silence, and thematic travel words are associations.",
		failureModes: ["null", "multi-member"],
		contaminationKey: "relation-de-weg-ist-ziel",
		authority: "contract-reviewer",
	},
	"relation-adv-35-in-betracht-ziehen": {
		context: "Wir müssen den Einwand <TARGET>in Betracht ziehen</TARGET>.",
		reading: phraseme("in Betracht ziehen", "Collocation", "🤔"),
		accepted: {
			synonym: [t("berücksichtigen", "Lexeme", "VERB")],
			nearSynonym: [t("bedenken", "Lexeme", "VERB")],
		},
		rationale:
			"Berücksichtigen preserves the consideration proposition; bedenken adds reflective-concern nuance. The complete Collocation, not its member words, owns both judgments.",
		failureModes: ["multi-member", "wrong-family", "omission"],
		contaminationKey: "relation-de-in-betracht-ziehen",
		authority: "contract-reviewer",
	},
	"relation-adv-36-auf-jeden-fall": {
		context: "Das ist <TARGET>auf jeden Fall</TARGET> richtig.",
		reading: phraseme("auf jeden Fall", "DiscourseFormula", "✅"),
		accepted: {
			nearSynonym: [t("definitiv", "Lexeme", "ADV")],
			antonym: [t("auf keinen Fall", "Phraseme", "DiscourseFormula")],
		},
		rationale:
			"Definitiv shares emphatic certainty with a discourse-role restriction, while auf keinen Fall is the conventional complete-phraseme opposition.",
		failureModes: ["multi-member", "wrong-family", "positive"],
		contaminationKey: "relation-de-auf-jeden-fall",
	},
	"relation-adv-37-proverb-null": {
		context: "Sie sagt: <TARGET>Morgenstund hat Gold im Mund</TARGET>.",
		reading: phraseme("Morgenstund hat Gold im Mund", "Proverb", "🌅"),
		rationale:
			"Related proverbs about early action make different propositions; conservative nulls prevent a miscellaneous related-saying bucket.",
		failureModes: ["null", "multi-member", "negative"],
		contaminationKey: "relation-de-morgenstund",
		authority: "contract-reviewer",
		harmfulTargets: [
			h(
				"nearSynonym",
				t("Der frühe Vogel fängt den Wurm", "Phraseme", "Proverb"),
				"The sayings encourage related behavior but make materially different propositions.",
			),
		],
	},
	"relation-adv-38-vereinigte-staaten": {
		context:
			"Die <TARGET>Vereinigten Staaten</TARGET> liegen in Nordamerika.",
		reading: properNoun("Vereinigte Staaten", "🇺🇸", null),
		accepted: {
			hypernym: [t("Staat", "Lexeme", "NOUN")],
			holonym: [t("Nordamerika", "Lexeme", "PROPN")],
		},
		rationale:
			"A fixed multi-word proper name remains one Lexeme/PROPN; it is an instance of Staat and geographically part of Nordamerika, never a Phraseme.",
		failureModes: ["multi-member", "wrong-family"],
		contaminationKey: "relation-de-vereinigte-staaten",
		authority: "contract-reviewer",
	},
	"relation-adv-39-eilen-multiword-target": {
		context: "Wir müssen uns <TARGET>eilen</TARGET>.",
		reading: verb("eilen", "⏱️"),
		accepted: {
			nearSynonym: [t("sich beeilen", "Phraseme", "Collocation")],
		},
		rationale:
			"Sich beeilen is a complete multi-member near-paraphrase with reflexive framing; no broader action is forced merely to fill the requested Hypernym leaf.",
		failureModes: ["multi-member", "wrong-family"],
		contaminationKey: "relation-de-eilen-hurry",
	},
	"relation-adv-40-gluecklich-family": {
		context: "Sie ist heute sehr <TARGET>glücklich</TARGET>.",
		reading: adjective("glücklich", "😊"),
		accepted: {
			nearSynonym: [t("froh", "Lexeme", "ADJ")],
			antonym: [t("unglücklich", "Lexeme", "ADJ")],
		},
		rationale:
			"Froh is distributionally narrower and unglücklich is the conventional opposite; a related phrase must be typed Phraseme, never Construction.",
		failureModes: ["wrong-family", "wrong-kind"],
		contaminationKey: "relation-de-gluecklich-happy",
		harmfulTargets: [
			h(
				"nearSynonym",
				t("in Hochstimmung sein", "Construction", "Fusion"),
				"Construction targets are forbidden; a lexicalized phrase requires a Phraseme kind.",
			),
		],
	},
	"relation-adv-41-schnell-kind": {
		context: "Das ist ein <TARGET>schnelles</TARGET> Fahrrad.",
		reading: adjective("schnell", "⚡"),
		accepted: {
			synonym: [t("rasch", "Lexeme", "ADJ")],
			antonym: [t("langsam", "Lexeme", "ADJ")],
		},
		rationale:
			"Rasch and langsam preserve the adjectival role; the associated noun Eile is grammatically incompatible and not semantic similarity.",
		failureModes: ["wrong-kind", "negative"],
		contaminationKey: "relation-de-schnell-fast",
		harmfulTargets: [
			h(
				"nearSynonym",
				t("Eile", "Lexeme", "NOUN"),
				"An associated noun fails grammatical compatibility and shared denotation.",
			),
		],
	},
	"relation-adv-42-beginnen-alternative": {
		context: "Die Sitzung <TARGET>beginnt</TARGET> um neun.",
		reading: verb("beginnen", "▶️"),
		accepted: {
			synonym: [t("anfangen", "Lexeme", "VERB")],
			nearSynonym: [t("starten", "Lexeme", "VERB")],
		},
		rationale:
			"Anfangen is adjudicated as equivalent here; starten is event-type/register restricted. Einsetzen is recorded as a bounded alternative target set.",
		failureModes: ["omission", "register"],
		contaminationKey: "relation-de-beginnen-start",
		authority: "contract-reviewer",
		acceptableTargetSets: { synonym: [[t("einsetzen", "Lexeme", "VERB")]] },
	},
	"relation-adv-43-selbstbezug": {
		context: "Das <TARGET>Kreditinstitut</TARGET> prüfte den Antrag.",
		reading: noun("Kreditinstitut", "🏦", "Neut"),
		accepted: { synonym: [t("Bank", "Lexeme", "NOUN")] },
		rationale:
			"Primary lexicography supports Bank as the distinct target Lemma; Kreditinstitut itself remains forbidden even if another Reading is imagined.",
		failureModes: ["self-relation", "positive"],
		contaminationKey: "relation-de-kreditinstitut",
		authority: "contract-reviewer",
		evidenceRefs: [sources.primary],
		harmfulTargets: [
			h(
				"synonym",
				t("Kreditinstitut", "Lexeme", "NOUN"),
				"Direct self-targets are categorically forbidden.",
			),
		],
	},
	"relation-adv-44-rose-association": {
		context: "Die <TARGET>Rose</TARGET> blüht im Garten.",
		reading: noun("Rose", "🌹", "Fem"),
		accepted: { hypernym: [t("Blütenpflanze", "Lexeme", "NOUN")] },
		rationale:
			"Rose is a kind of Blütenpflanze; Garten is only a location and Dorn only a possible part, so fluent associations cannot fill upward slots.",
		failureModes: ["negative", "wrong-kind", "null"],
		contaminationKey: "relation-de-rose-flower",
		harmfulTargets: [
			h(
				"holonym",
				t("Garten", "Lexeme", "NOUN"),
				"A garden is a contingent location.",
			),
			h(
				"hypernym",
				t("Dorn", "Lexeme", "NOUN"),
				"A possible part is not a broader category.",
			),
		],
	},
	"relation-adv-45-fahrrad-granularity": {
		context: "Das <TARGET>Fahrrad</TARGET> steht im Hof.",
		reading: noun("Fahrrad", "🚲", "Neut"),
		accepted: { hypernym: [t("Zweirad", "Lexeme", "NOUN")] },
		rationale:
			"Zweirad is the nearest useful category; Verkehrsmittel is too distant, Hof contingent, and wheel-sense Rad a part rather than a category.",
		failureModes: ["negative", "wrong-kind", "omission"],
		contaminationKey: "relation-de-fahrrad-bicycle",
		authority: "primary-source",
		evidenceRefs: [sources.primary],
		harmfulTargets: [
			h(
				"hypernym",
				t("Verkehrsmittel", "Lexeme", "NOUN"),
				"The target skips the useful intermediate Zweirad.",
			),
			h(
				"holonym",
				t("Hof", "Lexeme", "NOUN"),
				"The encountered location is contingent.",
			),
			h(
				"hypernym",
				t("Rad", "Lexeme", "NOUN"),
				"Wheel-sense Rad is a component, not a category.",
			),
		],
		inverseJudgments: [
			inv(
				"meronym",
				t("Rad", "Lexeme", "NOUN"),
				"Fahrrad → wheel-sense Rad is the inverse-only part judgment.",
			),
		],
	},
} satisfies Record<string, Seed>);

/** Provider-untouched #193 reservation; never used by demonstrations or development. */
const acceptance = defineCases({
	"relation-acceptance-syn-01-streichholz": {
		context:
			"Sie entzündete die Kerze mit einem <TARGET>Streichholz</TARGET>.",
		reading: noun("Streichholz", "🔥", "Neut"),
		requestedRelations: ["synonym"],
		accepted: { synonym: [t("Zündstäbchen", "Lexeme", "NOUN")] },
		rationale:
			"Reciprocal unlabeled Duden synonymy supports exact Streichholz–Zündstäbchen equivalence; labeled Zündholz is unsafe as unrestricted exact synonymy.",
		failureModes: ["positive", "register"],
		contaminationKey: "acceptance-reservation-de-streichholz-candle-2026",
		authority: "primary-source",
		evidenceRefs: [sources.contract, sources.acceptance],
		harmfulTargets: [
			h(
				"synonym",
				t("Zündholz", "Lexeme", "NOUN"),
				"Duden marks this otherwise equivalent form as technical or regional.",
			),
		],
	},
	"relation-acceptance-syn-02-apfelsine-null": {
		context:
			"Zum Frühstück schälte Mara eine saftige <TARGET>Apfelsine</TARGET>.",
		reading: noun("Apfelsine", "🍊", "Fem"),
		requestedRelations: ["synonym"],
		rationale:
			"Regional and collocational restrictions prevent exact unrestricted equivalence with Orange.",
		failureModes: ["null", "register"],
		contaminationKey: "acceptance-reservation-de-apfelsine-breakfast-2026",
		authority: "primary-source",
		evidenceRefs: [sources.contract, sources.acceptance],
		harmfulTargets: [
			h(
				"synonym",
				t("Orange", "Lexeme", "NOUN"),
				"Same fruit denotation does not erase the sourced regional and compositional restriction.",
			),
		],
	},
	"relation-acceptance-near-syn-01-semmel": {
		context:
			"In München bestellte er zum Frühstück eine <TARGET>Semmel</TARGET>.",
		reading: noun("Semmel", "🥖", "Fem"),
		requestedRelations: ["nearSynonym"],
		accepted: { nearSynonym: [t("Brötchen", "Lexeme", "NOUN")] },
		rationale:
			"Semmel and Brötchen share central denotation while Semmel carries a material Austrian/Bavarian distribution restriction.",
		failureModes: ["positive", "register"],
		contaminationKey: "acceptance-reservation-de-semmel-munich-2026",
		authority: "primary-source",
		evidenceRefs: [sources.contract, sources.acceptance],
		harmfulTargets: [
			h(
				"nearSynonym",
				t("Brot", "Lexeme", "NOUN"),
				"A broader baked-food category is taxonomy, not near synonymy.",
			),
		],
	},
	"relation-acceptance-near-syn-02-geige-null": {
		context:
			"Die Solistin stimmte ihre <TARGET>Geige</TARGET> vor dem Konzert.",
		reading: noun("Geige", "🎻", "Fem"),
		requestedRelations: ["nearSynonym"],
		rationale:
			"Bratsche denotes a distinct larger instrument tuned a fifth lower, not a usage variant of Geige.",
		failureModes: ["null", "wrong-kind"],
		contaminationKey: "acceptance-reservation-de-geige-concert-2026",
		authority: "primary-source",
		evidenceRefs: [sources.contract, sources.acceptance],
		harmfulTargets: [
			h(
				"nearSynonym",
				t("Bratsche", "Lexeme", "NOUN"),
				"A co-member of an instrument family is not a Near Synonym.",
			),
		],
	},
	"relation-acceptance-ant-01-lebendig": {
		context: "Der gerettete Käfer war noch <TARGET>lebendig</TARGET>.",
		reading: adjective("lebendig", "🫀"),
		requestedRelations: ["antonym"],
		accepted: { antonym: [t("tot", "Lexeme", "ADJ")] },
		rationale:
			"The marked biological readings of lebendig and tot form a directly sourced complementary opposition.",
		failureModes: ["positive", "wrong-kind"],
		contaminationKey: "acceptance-reservation-de-lebendig-beetle-2026",
		authority: "primary-source",
		evidenceRefs: [sources.contract, sources.acceptance],
		harmfulTargets: [
			h(
				"antonym",
				t("krank", "Lexeme", "ADJ"),
				"Illness can coexist with being alive and is not its complement.",
			),
		],
	},
	"relation-acceptance-ant-02-nass": {
		context:
			"Nach dem Wolkenbruch war der Mantel völlig <TARGET>nass</TARGET>.",
		reading: adjective("nass", "💧"),
		requestedRelations: ["antonym"],
		accepted: { antonym: [t("trocken", "Lexeme", "ADJ")] },
		rationale:
			"Nass and trocken are conventional opposite endpoints of the moisture scale.",
		failureModes: ["positive", "wrong-kind"],
		contaminationKey: "acceptance-reservation-de-nass-raincoat-2026",
		authority: "primary-source",
		evidenceRefs: [sources.contract, sources.acceptance],
		harmfulTargets: [
			h(
				"antonym",
				t("feucht", "Lexeme", "ADJ"),
				"Feucht lies on the same scale and overlaps low wetness rather than opposing it.",
			),
		],
	},
	"relation-acceptance-near-ant-01-erben": {
		context: "Nora wird das Haus von ihrer Tante <TARGET>erben</TARGET>.",
		reading: verb("erben", "📜"),
		requestedRelations: ["nearAntonym"],
		accepted: { nearAntonym: [t("vererben", "Lexeme", "VERB")] },
		rationale:
			"Erben and vererben profile the same inheritance event from exchanged participant perspectives.",
		failureModes: ["positive", "wrong-kind"],
		contaminationKey: "acceptance-reservation-de-erben-house-2026",
		authority: "primary-source",
		evidenceRefs: [sources.contract, sources.acceptance],
		harmfulTargets: [
			h(
				"nearAntonym",
				t("vermachen", "Lexeme", "VERB"),
				"Vermachen shares the bequeather direction and does not reverse viewpoint.",
			),
		],
	},
	"relation-acceptance-near-ant-02-geben": {
		context:
			"Die Großmutter wird dem Kind ein Buch <TARGET>geben</TARGET>.",
		reading: verb("geben", "🎁"),
		requestedRelations: ["nearAntonym"],
		accepted: { nearAntonym: [t("bekommen", "Lexeme", "VERB")] },
		rationale:
			"Geben and bekommen conventionally profile the same transfer from giver and recipient perspectives.",
		failureModes: ["positive", "wrong-kind"],
		contaminationKey: "acceptance-reservation-de-geben-gift-2026",
		authority: "primary-source",
		evidenceRefs: [sources.contract, sources.acceptance],
		harmfulTargets: [
			h(
				"nearAntonym",
				t("wegnehmen", "Lexeme", "VERB"),
				"Removal is an opposing event, not the recipient view of the same transfer.",
			),
		],
	},
	"relation-acceptance-hyp-01-amsel": {
		context:
			"Im Garten zog eine <TARGET>Amsel</TARGET> einen Wurm aus dem Rasen.",
		reading: noun("Amsel", "🐦", "Fem"),
		requestedRelations: ["hypernym"],
		accepted: { hypernym: [t("Drossel", "Lexeme", "NOUN")] },
		rationale:
			"Drossel is the directly evidenced nearest useful category for Amsel.",
		failureModes: ["positive", "omission"],
		contaminationKey: "acceptance-reservation-de-amsel-garden-2026",
		authority: "primary-source",
		evidenceRefs: [sources.contract, sources.acceptance],
		harmfulTargets: [
			h(
				"hypernym",
				t("Vogel", "Lexeme", "NOUN"),
				"This skips the directly evidenced nearer category Drossel.",
			),
			h(
				"hypernym",
				t("Singvogel", "Lexeme", "NOUN"),
				"This is also farther than the directly evidenced Drossel category.",
			),
		],
	},
	"relation-acceptance-hyp-02-zylinderkopf-null": {
		context:
			"Die Werkstatt ersetzte den gerissenen <TARGET>Zylinderkopf</TARGET> des Motors.",
		reading: noun("Zylinderkopf", "🔧", "Masc"),
		requestedRelations: ["hypernym"],
		rationale:
			"Zylinder is the containing technical whole, not a broader category of Zylinderkopf.",
		failureModes: ["null", "wrong-kind"],
		contaminationKey: "acceptance-reservation-de-zylinderkopf-engine-2026",
		authority: "primary-source",
		evidenceRefs: [sources.contract, sources.acceptance],
		harmfulTargets: [
			h(
				"hypernym",
				t("Zylinder", "Lexeme", "NOUN"),
				"Returning the whole as Hypernym confuses taxonomy with part–whole.",
			),
		],
	},
	"relation-acceptance-hol-01-zeh": {
		context:
			"Beim Barfußlaufen stieß er sich den kleinen <TARGET>Zeh</TARGET>.",
		reading: noun("Zeh", "🦶", "Masc"),
		requestedRelations: ["holonym"],
		accepted: { holonym: [t("Fuß", "Lexeme", "NOUN")] },
		rationale:
			"Fuß is the directly sourced immediate anatomical whole for Zeh.",
		failureModes: ["positive", "wrong-kind"],
		contaminationKey: "acceptance-reservation-de-zeh-barefoot-2026",
		authority: "primary-source",
		evidenceRefs: [sources.contract, sources.acceptance],
		harmfulTargets: [
			h(
				"holonym",
				t("Schuh", "Lexeme", "NOUN"),
				"A shoe may cover a toe but is not its constitutive whole.",
			),
		],
	},
	"relation-acceptance-hol-02-kapitell": {
		context:
			"Das korinthische <TARGET>Kapitell</TARGET> krönt die Marmorsäule.",
		reading: noun("Kapitell", "🏛️", "Neut"),
		requestedRelations: ["holonym"],
		accepted: { holonym: [t("Säule", "Lexeme", "NOUN")] },
		rationale:
			"Säule is the immediate constitutive architectural whole for Kapitell.",
		failureModes: ["positive", "wrong-kind"],
		contaminationKey: "acceptance-reservation-de-kapitell-column-2026",
		authority: "primary-source",
		evidenceRefs: [sources.contract, sources.acceptance],
		harmfulTargets: [
			h(
				"holonym",
				t("Bauwerk", "Lexeme", "NOUN"),
				"This remote contextual container skips the immediate constitutive whole.",
			),
		],
	},
} satisfies Record<string, Seed>);

export const demonstrationCases = goldenCases(demonstrations);
export const basicCases = goldenCases(basic);
export const adversarialCases = goldenCases(adversarial);
export const acceptanceCases = goldenCases(acceptance);

const allCases: Readonly<Record<string, RetainedCase>> = {
	...demonstrations,
	...basic,
	...adversarial,
	...acceptance,
};

export const relationCorpusAdjudications = Object.freeze({
	inputSchema: germanKnowledgeGenerationInputSchema,
	outputSchema: germanKnowledgeAnalysisSchema,
	byCaseId: Object.freeze(
		Object.fromEntries(
			Object.entries(allCases).map(([id, value]) => [
				id,
				value.adjudication,
			]),
		) as Readonly<Record<string, RelationCorpusAdjudication>>,
	),
});

function defineCases<const Registry extends Readonly<Record<string, Seed>>>(
	registry: Registry,
): { readonly [Key in keyof Registry]: RetainedCase } {
	return Object.fromEntries(
		Object.entries(registry).map(([id, seed]) => [id, retainedCase(seed)]),
	) as { readonly [Key in keyof Registry]: RetainedCase };
}

function retainedCase(seed: Seed): RetainedCase {
	const requested =
		seed.requestedRelations ?? requestedRelations(seed.reading);
	const semanticRelations = Object.fromEntries(
		requested.map((relation) => [
			relation,
			seed.accepted?.[relation] ?? null,
		]),
	) as Record<RequestableRelation, readonly Target[] | null>;
	return {
		goldenCase: {
			input: {
				markedContext: seed.context,
				reading: seed.reading,
				request: {
					semanticRelations: Object.fromEntries(
						requested.map((relation) => [relation, null]),
					),
				},
			},
			idealOutput: { semanticRelations },
			explanation: seed.rationale,
			contaminationKeys: [seed.contaminationKey],
		},
		adjudication: Object.freeze({
			rationale: seed.rationale,
			failureModes: Object.freeze([...seed.failureModes]),
			authority: seed.authority ?? "contract-reviewer",
			evidenceRefs: Object.freeze(
				seed.evidenceRefs ?? [sources.contract],
			),
			...(seed.acceptableTargetSets === undefined
				? {}
				: { acceptableTargetSets: seed.acceptableTargetSets }),
			harmfulTargets: Object.freeze(seed.harmfulTargets ?? []),
			inverseJudgments: Object.freeze(seed.inverseJudgments ?? []),
		}),
	};
}

function requestedRelations(
	reading: Reading<"de">,
): readonly RequestableRelation[] {
	const applicable = defaultKnowledgeRequestMask(reading);
	if (applicable === undefined) {
		throw new Error(
			"German relation corpus Reading has no Dumrel applicability.",
		);
	}
	return requestableRelationSchema.options.filter(
		(relation) => applicable.semanticRelations?.[relation] === null,
	);
}

function goldenCases<
	const Registry extends Readonly<Record<string, RetainedCase>>,
>(registry: Registry) {
	return Object.fromEntries(
		Object.entries(registry).map(([id, value]) => [id, value.goldenCase]),
	) as { readonly [Key in keyof Registry]: Registry[Key]["goldenCase"] };
}

function h(relation: RequestableRelation, target: Target, reason: string) {
	return { relation, target, reason } as const;
}

function inv(
	relation: "hyponym" | "meronym",
	target: Target,
	rationale: string,
) {
	return { relation, target, rationale } as const;
}

function t(canonicalForm: string, family: string, kind: string): Target {
	return { language: "de", canonicalForm, family, kind } as Target;
}

function noun(
	canonicalForm: string,
	emojiDescription: string,
	gender: "Fem" | "Masc" | "Neut",
) {
	return lexeme(
		canonicalForm,
		"NOUN",
		{ gender, hyph: null },
		emojiDescription,
	);
}

function properNoun(
	canonicalForm: string,
	emojiDescription: string,
	gender: "Fem" | "Masc" | "Neut" | null,
) {
	return lexeme(
		canonicalForm,
		"PROPN",
		{ abbr: null, foreign: null, gender },
		emojiDescription,
	);
}

function adjective(canonicalForm: string, emojiDescription: string) {
	return lexeme(canonicalForm, "ADJ", adjectiveCore, emojiDescription);
}

function verb(canonicalForm: string, emojiDescription: string) {
	return lexeme(canonicalForm, "VERB", verbCore, emojiDescription);
}

function lexeme(
	canonicalForm: string,
	kind: string,
	coreFeatures: object,
	emojiDescription: string,
): Reading<"de"> {
	return reading(
		canonicalForm,
		"Lexeme",
		kind,
		coreFeatures,
		emojiDescription,
	);
}

function phraseme(
	canonicalForm: string,
	kind: "Aphorism" | "Collocation" | "DiscourseFormula" | "Idiom" | "Proverb",
	emojiDescription: string,
) {
	return reading(
		canonicalForm,
		"Phraseme",
		kind,
		kind === "DiscourseFormula" ? { discourseFormulaRole: null } : {},
		emojiDescription,
	);
}

function reading(
	canonicalForm: string,
	family: string,
	kind: string,
	coreFeatures: object,
	emojiDescription: string,
): Reading<"de"> {
	return {
		lemma: {
			language: "de",
			canonicalForm,
			family,
			kind,
			coreFeatures,
		} as Reading<"de">["lemma"],
		emojiDescription,
	};
}
