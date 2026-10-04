import { germanArticles, reviewedDeterminers } from "./determiner-paradigms.js";
import { germanSyncretisms } from "./generated/syncretisms.js";
import { member as bekommenRezipientenpassiv } from "./members/lexeme/auxiliary/bekommen-rezipientenpassiv.js";
import { member as habenObligation } from "./members/lexeme/auxiliary/haben-obligation.js";
import { member as habenPerfekt } from "./members/lexeme/auxiliary/haben-perfekt.js";
import { member as lassenKausativ } from "./members/lexeme/auxiliary/lassen-kausativ.js";
import { member as seinModalpassiv } from "./members/lexeme/auxiliary/sein-modalpassiv.js";
import { member as seinPerfekt } from "./members/lexeme/auxiliary/sein-perfekt.js";
import { member as seinVerlaufsform } from "./members/lexeme/auxiliary/sein-verlaufsform.js";
import { member as werdenFutur } from "./members/lexeme/auxiliary/werden-futur.js";
import { member as werdenVorgangspassiv } from "./members/lexeme/auxiliary/werden-vorgangspassiv.js";
import { member as werdenWuerdeKonjunktiv } from "./members/lexeme/auxiliary/werden-wuerde-konjunktiv.js";
import { member as derlei } from "./members/lexeme/determiner/demonstrative/derlei.js";
import { member as etwas } from "./members/lexeme/determiner/quantifying/etwas.js";
import { member as lauter } from "./members/lexeme/determiner/quantifying/lauter.js";
import { member as nichts } from "./members/lexeme/pronoun/negative/nichts.js";
import { member as esObjectCorrelate } from "./members/lexeme/pronoun/personal/es-object-correlate.js";
import { member as esSubjectCorrelate } from "./members/lexeme/pronoun/personal/es-subject-correlate.js";
import { member as esSubjectExpletive } from "./members/lexeme/pronoun/personal/es-subject-expletive.js";
import { member as sichReflexivity } from "./members/lexeme/pronoun/reflexive/sich-reflexivity.js";
import { member as sichThirdPersonAccusative } from "./members/lexeme/pronoun/reflexive/sich-third-person-accusative.js";
import { member as sichThirdPersonDative } from "./members/lexeme/pronoun/reflexive/sich-third-person-dative.js";
import { germanParticles } from "./particles.js";
import { pronominalAdverbs } from "./pronominal-adverbs.js";
import { reviewedPronouns } from "./pronoun-paradigms.js";
import { whAdverbs } from "./wh-adverbs.js";

/**
 * Every German member authored by hand, the source the Syncretisms are
 * generated from (`codegen/generate-syncretisms.ts`). ADR 0021 decides which
 * units belong in an inventory. Single members are defined in
 * `src/inventories/de/members/`, and the paradigm, adverb and particle
 * modules beside this file define the rest. German PART is fully authored:
 * nicht, infinitive zu and the modal particles, one member per Reading
 * (`particles.ts`, #734).
 */
export const sourceMembers = [
	...germanArticles,
	derlei,
	etwas,
	lauter,
	seinPerfekt,
	habenPerfekt,
	werdenFutur,
	werdenVorgangspassiv,
	werdenWuerdeKonjunktiv,
	bekommenRezipientenpassiv,
	seinModalpassiv,
	habenObligation,
	seinVerlaufsform,
	lassenKausativ,
	sichThirdPersonAccusative,
	sichThirdPersonDative,
	sichReflexivity,
	nichts,
	...reviewedDeterminers.map(({ member }) => member),
	...reviewedPronouns.map(({ member }) => member),
	// After the referential es cells in reviewedPronouns, whose Lemma they share.
	esSubjectExpletive,
	esSubjectCorrelate,
	esObjectCorrelate,
	...pronominalAdverbs,
	...whAdverbs,
	...germanParticles,
];

/**
 * Every German authored member in one list: the members authored by hand and
 * the Syncretisms generated from their pronoun cells (system ADR 0046).
 */
export const authoredMembers = [...sourceMembers, ...germanSyncretisms];
