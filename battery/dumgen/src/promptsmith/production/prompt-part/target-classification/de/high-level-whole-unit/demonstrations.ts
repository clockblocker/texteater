import { productionDemonstrationSelection } from "./corpus/selections";

/**
 * Prompt-facing guidance for the exact production demonstration selection.
 * Canonical inputs and ideal outputs remain owned by the Golden Corpus.
 */
export const productionDemonstrationGuidance: Readonly<Record<string, string>> =
	Object.freeze({
		"target-de-demo-perfect-arbeiten-click-habe":
			"habe + gearbeitet = one perfect verb. Take both. gestern is extra. VERB.",
		"target-de-demo-governed-rechnen-click-rechnet":
			"mit is lexically governed by rechnet. The marked verb is implicit; return only mit's i as the additional member. The nominal complement remains free. VERB.",
		"target-de-demo-adjunct-rechnen-click-mit":
			"mit dem Taschenrechner tells how the calculation happens; rechnen does not require mit in this sense. The clicked mit is ADP only.",
		"target-de-demo-idiom-faden-click-den":
			"den is a fixed idiom word here. Take verlor + den + Faden. völlig is extra.",
		"target-de-demo-aphorism-zeit-click-ist":
			"Zeit ist Geld is one fixed Aphorism. The clicked middle word still selects every realized member: Zeit + ist + Geld.",
		"target-de-demo-literal-gras-click-biss":
			"A rabbit physically bites grass. Familiar idiom-shaped words do not matter. No death meaning, no Idiom. biss/VERB only.",
		"target-de-demo-idiom-katze-click-dem":
			"dem is the fixed article following fixed aus inside the Idiom. Its click selects ließ + die + Katze + aus + dem + Sack. Exclude the inserted adjective verdammte.",
		"target-de-demo-paired-einerseits-click-lokal":
			"lokal fills the first adjective slot before the comma. It is not an anchor. Return lokal/ADJ only.",
		"target-de-demo-inherent-reflexive-click-beeile":
			"beeilen needs a reflexive pronoun. Take beeile + mich. VERB.",
		"target-de-demo-optional-reflexive-click-dich":
			"kämmen works without dich. dich is an object, not part of the verb. PRON only.",
		"target-de-demo-modal-arbeiten-click-kann":
			"kann means ability. It is not tense or voice glue. AUX only.",
		"target-de-demo-passive-briefe-click-werden":
			"werden + verschickt = one passive realization. Whole target is VERB, not AUX. morgen is extra.",
		"target-de-demo-state-passive-banken-click-sind":
			"sind + geöffnet keeps the productive öffnen meaning and corresponds to werden geöffnet. TIGER treats this as a state passive. Take both as one VERB target.",
		"target-de-demo-state-passive-banken-click-geoeffnet":
			"The marked participle belongs to the same productive state passive as sind. Take sind + geöffnet as the identical VERB target for either click.",
		"target-de-demo-repeated-anfangen-click-first-an":
			"This first an introduces and governs der Kreuzung. It is an ADP, not the objectless final verb particle. Return this an alone.",
		"target-de-diagnostic-repeated-click-final-an":
			"The marked final an is objectless and completes kommt. Take kommt + final an only. Exclude the earlier an because it introduces der Haltestelle.",
		"target-de-demo-typo-mitmachen-click-mit":
			"mact is an obvious typo for macht. The objectless final mit still completes that separable verb. Take mact + mit as Lexeme/VERB.",
		"target-de-demo-predicative-cringe-click-cringe":
			"cringe describes the subject after wirkt. It is an indeclinable borrowed property word here: ADJ, not NOUN.",
		"target-de-demo-paired-sowohl-click-robust":
			"sowohl + als + auch are anchors. robust is a filler click. Take robust/ADJ only.",
		"target-de-demo-idiom-kragen-click-der":
			"der is a fixed article in platzte + der + Kragen. Its function-word click selects the whole Idiom. ihm and sprichwörtliche are ordinary dependents; leave them out.",
		"target-de-demo-symbol-percent":
			"% is the clicked symbol. zwölf is a separate number. SYM only.",
		"target-de-core-unresolved-qzxv":
			"The marked string has no defensible German Family/Kind route in this context. Return Unresolved with both nullable fields null.",
		"target-de-diagnostic-idiom-oel-click-ins":
			"The marked function token is a fixed realized member of the Idiom. Its click selects the complete Idiom, while the inserted descriptive modifier remains outside membership.",
	});

const selectedIds = new Set(productionDemonstrationSelection.ids);
for (const caseId of productionDemonstrationSelection.ids) {
	if (productionDemonstrationGuidance[caseId] === undefined) {
		throw new Error(
			`Production demonstration ${caseId} has no prompt guidance.`,
		);
	}
}
for (const caseId of Object.keys(productionDemonstrationGuidance)) {
	if (!selectedIds.has(caseId)) {
		throw new Error(
			`Production prompt guidance names unselected case ${caseId}.`,
		);
	}
}
