import { z } from "zod";
import {
	germanAdpositionAttestationError,
	germanClosedClassSurfaceError,
	germanNounSurfaceError,
	germanProperNounSurfaceError,
	germanValencyAttestationError,
	germanVerbalAttestationError,
	germanVerbalSurfaceError,
	isGermanAdpositionAttestation,
	isGermanClosedClassSurface,
	isGermanNounSurface,
	isGermanProperNounSurface,
	isGermanValencyAttestation,
	isGermanVerbalAttestation,
	isGermanVerbalSurface,
} from "../../../validation/semantics.js";
import { routePolicy } from "../../route-policy.js";
import {
	indexSchema,
	memberSchema,
	plainLemmaSchema,
	referentSchema,
} from "../../unit-parts.js";
import { DeAdpositionFeatureBagsSchema } from "./lexeme/adposition.js";

const germanCaseSchema = z.enum(["Nom", "Acc", "Dat", "Gen"]);

/**
 * The German valency complements an occurrence can realize (ADR 0034), after
 * E-VALBU: a bare case, or a preposition's ADP Lemma with the case it governs
 * in this construction. `referent` says whether the complement names a
 * person, a thing, or either. The field is `governedCase`, since an
 * Attestation names no Feature Pool feature (ADR 0032). Evidence takes no
 * Adverbial, Predicative or Clause: nothing produces or reads them here.
 */
const germanComplementSchema = z.union([
	z.strictObject({
		kind: z.literal("Case"),
		governedCase: germanCaseSchema,
		referent: referentSchema,
	}),
	z.strictObject({
		kind: z.literal("Preposition"),
		preposition: plainLemmaSchema(
			{ language: "de", family: "Lexeme", kind: "ADP" },
			DeAdpositionFeatureBagsSchema.shape.core,
		),
		governedCase: germanCaseSchema.exclude(["Nom"]),
		referent: referentSchema,
	}),
]);

/**
 * The valency slots one occurrence realizes (ADR 0034). `member` indexes the
 * owned member realizing the slot's marker, such as a governed preposition,
 * and is null when no member does. `realizedCase` is the case the occurrence
 * shows.
 */
const valencyEvidenceSchema = z.array(
	z.strictObject({
		member: indexSchema.nullable(),
		complement: germanComplementSchema,
		realizedCase: germanCaseSchema,
	}),
);

/**
 * German's route conditions. Its Heads that can open a phrase, and a NOUN
 * Locution, own their article (ADR 0040, amended 2026-10-02). A German verbal
 * Attestation names its owned subject-expletive member as evidence (ADR
 * 0022). Every German governor (a Lexeme or Locution VERB, ADJ or NOUN, and
 * AUX) names the valency slots it realizes, such as its governed preposition
 * member (ADR 0034). A German ADP Attestation, Lexeme or Locution, records the
 * case its complement took as its one bare-case slot, and no position;
 * dumcorpus checks the case against the ADP Case Table. A Locution route is a
 * governor where the Lexeme route of its Kind is (ADR 0039); the Kind alone
 * never decides, since Lexeme and Locution share Kind names.
 */
export const deRoutePolicy = routePolicy("de", {
	conditions: {
		/**
		 * German PRON opts in first: only the referent tells some of its pillar
		 * cells, and some of a stem's Surfaces, apart (system ADR 0046). Other
		 * routes reject both fields.
		 */
		syncretism: ["de/Lexeme/PRON"],
		foreign: ["de/Foreign/Foreign"],
		germanNoun: ["de/Lexeme/NOUN"],
		germanProperNoun: ["de/Lexeme/PROPN"],
		lexemeArticleOwner: [
			"de/Lexeme/NOUN",
			"de/Lexeme/PROPN",
			"de/Lexeme/ADJ",
			"de/Lexeme/NUM",
			"de/Lexeme/PRON",
		],
		// A NOUN Locution heads its phrase and owns its article as a Lexeme NOUN
		// does (ADR 0040, amended 2026-10-02).
		locutionArticleOwner: ["de/Locution/NOUN"],
		germanVerbal: ["de/Lexeme/VERB", "de/Lexeme/AUX", "de/Locution/VERB"],
		germanAdposition: ["de/Lexeme/ADP", "de/Locution/ADP"],
		germanAdnominalGovernor: [
			"de/Lexeme/ADJ",
			"de/Lexeme/NOUN",
			"de/Locution/ADJ",
			"de/Locution/NOUN",
		],
		// Comparability decides Degree on ADV and ADJ (ADR 0042).
		comparability: [
			"de/Lexeme/ADV",
			"de/Lexeme/ADJ",
			"de/Locution/ADV",
			"de/Locution/ADJ",
		],
		germanClosedClass: [
			"de/Lexeme/PRON",
			"de/Lexeme/DET",
			"de/Locution/PRON",
			"de/Locution/DET",
		],
	},
	surfaceChecks: [
		[
			"germanClosedClass",
			isGermanClosedClassSurface,
			germanClosedClassSurfaceError,
		],
		["germanNoun", isGermanNounSurface, germanNounSurfaceError],
		[
			"germanProperNoun",
			isGermanProperNounSurface,
			germanProperNounSurfaceError,
		],
		["germanVerbal", isGermanVerbalSurface, germanVerbalSurfaceError],
	],
	attestationChecks: [
		[
			"germanAdnominalGovernor",
			isGermanValencyAttestation,
			germanValencyAttestationError,
		],
		[
			"germanVerbal",
			isGermanVerbalAttestation,
			germanVerbalAttestationError,
		],
		[
			"germanAdposition",
			isGermanAdpositionAttestation,
			germanAdpositionAttestationError,
		],
	],
	attestationEvidence: {
		expletiveEvidence: { germanVerbal: memberSchema.nullable() },
		valencyEvidence: {
			germanVerbal: valencyEvidenceSchema,
			germanAdposition: valencyEvidenceSchema,
			germanAdnominalGovernor: valencyEvidenceSchema,
		},
	},
});
