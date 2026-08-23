import { fixedMembersFor } from "dumling/fixed";
import type { Lemma, Reading } from "dumling/types";
import { compileGrammaticalSeries } from "../../../grammatical-relations.js";
import type {
	GrammaticalRelationClaim,
	ReadingGrammaticalSeries,
} from "../../../types.js";

type PronounLemma = Lemma<"de", "Lexeme", "PRON">;
type PronounReading = Reading<"de", "Lexeme", "PRON">;
type ReferenceNumber = "Plur" | "Sing" | null;
type ReferenceGender = "Fem" | "Masc" | "Neut" | null;
type Polite = "Form" | "Infm" | null;

const catalog = fixedMembersFor.lemma({
	language: "de",
	family: "Lexeme",
	kind: "PRON",
});
if (!catalog)
	throw new Error("Fixed German personal PRON population is missing.");

function reading(
	canonicalForm: string,
	person: "1" | "2" | "3",
	referenceNumber: ReferenceNumber,
	referenceGender: ReferenceGender = null,
	polite: Polite = null,
	poss: "Yes" | null = null,
): PronounReading {
	const matches = catalog?.members.filter(
		(candidate) =>
			candidate.canonicalForm === canonicalForm &&
			candidate.coreFeatures.person === person &&
			candidate.coreFeatures.referenceNumber === referenceNumber &&
			candidate.coreFeatures.referenceGender === referenceGender &&
			candidate.coreFeatures.polite === polite &&
			candidate.coreFeatures.poss === poss,
	);
	if (matches?.length !== 1 || !matches[0]) {
		throw new Error(
			`Expected one fixed PRON identity for ${canonicalForm}.`,
		);
	}
	const readings = fixedMembersFor.reading(matches[0] as PronounLemma);
	if (readings?.members.length !== 1 || !readings.members[0]) {
		throw new Error(
			`Expected one fixed PRON Reading for ${canonicalForm}.`,
		);
	}
	return readings.members[0];
}

function member(axisValue: string, endpoint: PronounReading) {
	return Object.freeze({ axisValue, endpoint });
}

function caseSeries(
	fixedCoordinates: Readonly<Record<string, string | null>>,
	members: readonly [
		ReturnType<typeof member>,
		...ReturnType<typeof member>[],
	],
): ReadingGrammaticalSeries<PronounReading> {
	return deepFreeze({
		endpointKind: "reading",
		relation: "CaseCounterpart",
		axis: "case",
		fixedCoordinates,
		members,
	});
}

function personSeries(
	fixedCoordinates: Readonly<Record<string, string | null>>,
	members: readonly [
		ReturnType<typeof member>,
		...ReturnType<typeof member>[],
	],
): ReadingGrammaticalSeries<PronounReading> {
	return deepFreeze({
		endpointKind: "reading",
		relation: "PersonCounterpart",
		axis: "person",
		fixedCoordinates,
		members,
	});
}

const ich = (form: string) => reading(form, "1", "Sing");
const du = (form: string) => reading(form, "2", "Sing", null, "Infm");
const er = (form: string) => reading(form, "3", "Sing", "Masc");
const sieFem = (form: string) => reading(form, "3", "Sing", "Fem");
const es = (form: string) => reading(form, "3", "Sing", "Neut");
const wir = (form: string) => reading(form, "1", "Plur");
const ihr = (form: string) => reading(form, "2", "Plur", null, "Infm");
const siePlur = (form: string) => reading(form, "3", "Plur");
const formalSing = (form: string) => reading(form, "2", "Sing", null, "Form");
const formalPlur = (form: string) => reading(form, "2", "Plur", null, "Form");

const CASE_SERIES = [
	caseSeries({ person: "1", referenceNumber: "Sing" }, [
		member("Nom", ich("ich")),
		member("Acc", ich("mich")),
		member("Dat", ich("mir")),
		member("Gen", ich("meiner")),
	]),
	caseSeries({ person: "2", polite: "Infm", referenceNumber: "Sing" }, [
		member("Nom", du("du")),
		member("Acc", du("dich")),
		member("Dat", du("dir")),
		member("Gen", du("deiner")),
	]),
	caseSeries(
		{ person: "3", referenceGender: "Masc", referenceNumber: "Sing" },
		[
			member("Nom", er("er")),
			member("Acc", er("ihn")),
			member("Dat", er("ihm")),
			member("Gen", er("seiner")),
		],
	),
	caseSeries(
		{ person: "3", referenceGender: "Fem", referenceNumber: "Sing" },
		[
			member("Nom", sieFem("sie")),
			member("Acc", sieFem("sie")),
			member("Dat", sieFem("ihr")),
			member("Gen", sieFem("ihrer")),
		],
	),
	caseSeries(
		{ person: "3", referenceGender: "Neut", referenceNumber: "Sing" },
		[
			member("Nom", es("es")),
			member("Acc", es("es")),
			member("Dat", es("ihm")),
			member("Gen", es("seiner")),
		],
	),
	caseSeries({ person: "1", referenceNumber: "Plur" }, [
		member("Nom", wir("wir")),
		member("Acc", wir("uns")),
		member("Dat", wir("uns")),
		member("Gen", wir("unser")),
	]),
	caseSeries({ person: "2", polite: "Infm", referenceNumber: "Plur" }, [
		member("Nom", ihr("ihr")),
		member("Acc", ihr("euch")),
		member("Dat", ihr("euch")),
		member("Gen", ihr("euer")),
	]),
	caseSeries({ person: "3", referenceNumber: "Plur" }, [
		member("Nom", siePlur("sie")),
		member("Acc", siePlur("sie")),
		member("Dat", siePlur("ihnen")),
		member("Gen", siePlur("ihrer")),
	]),
	caseSeries({ person: "2", polite: "Form", referenceNumber: "Sing" }, [
		member("Nom", formalSing("Sie")),
		member("Acc", formalSing("Sie")),
		member("Dat", formalSing("Ihnen")),
		member("Gen", formalSing("Ihrer")),
	]),
	caseSeries({ person: "2", polite: "Form", referenceNumber: "Plur" }, [
		member("Nom", formalPlur("Sie")),
		member("Acc", formalPlur("Sie")),
		member("Dat", formalPlur("Ihnen")),
		member("Gen", formalPlur("Ihrer")),
	]),
	caseSeries({ person: "3", reflex: "Yes" }, [
		member("Acc", reading("sich", "3", null)),
		member("Dat", reading("sich", "3", null)),
	]),
] as const;

const PERSON_SERIES = [
	personSeries({ case: "Nom", referenceNumber: "Sing" }, [
		member("1", ich("ich")),
		member("2", du("du")),
		member("3/Masc", er("er")),
		member("3/Fem", sieFem("sie")),
		member("3/Neut", es("es")),
	]),
	personSeries({ case: "Acc", referenceNumber: "Sing" }, [
		member("1", ich("mich")),
		member("2", du("dich")),
		member("3/Masc", er("ihn")),
		member("3/Fem", sieFem("sie")),
		member("3/Neut", es("es")),
	]),
	personSeries({ case: "Dat", referenceNumber: "Sing" }, [
		member("1", ich("mir")),
		member("2", du("dir")),
		member("3/Masc", er("ihm")),
		member("3/Fem", sieFem("ihr")),
		member("3/Neut", es("ihm")),
	]),
	personSeries({ case: "Gen", referenceNumber: "Sing" }, [
		member("1", ich("meiner")),
		member("2", du("deiner")),
		member("3/Masc", er("seiner")),
		member("3/Fem", sieFem("ihrer")),
		member("3/Neut", es("seiner")),
	]),
	personSeries({ case: "Nom", referenceNumber: "Plur" }, [
		member("1", wir("wir")),
		member("2", ihr("ihr")),
		member("3", siePlur("sie")),
	]),
	personSeries({ case: "Acc", referenceNumber: "Plur" }, [
		member("1", wir("uns")),
		member("2", ihr("euch")),
		member("3", siePlur("sie")),
	]),
	personSeries({ case: "Dat", referenceNumber: "Plur" }, [
		member("1", wir("uns")),
		member("2", ihr("euch")),
		member("3", siePlur("ihnen")),
	]),
	personSeries({ case: "Gen", referenceNumber: "Plur" }, [
		member("1", wir("unser")),
		member("2", ihr("euer")),
		member("3", siePlur("ihrer")),
	]),
] as const;

const SERIES = deepFreeze([...CASE_SERIES, ...PERSON_SERIES]);
const CLAIMS = deepFreeze(
	SERIES.flatMap((series) => compileGrammaticalSeries(series)),
);

export function allFixedGrammaticalSeries(): readonly ReadingGrammaticalSeries<PronounReading>[] {
	return SERIES;
}

export function allFixedGrammaticalRelationClaims(): readonly GrammaticalRelationClaim[] {
	return CLAIMS;
}

function deepFreeze<T>(value: T): T {
	if (value !== null && typeof value === "object") {
		for (const member of Object.values(value)) deepFreeze(member);
		Object.freeze(value);
	}
	return value;
}
