import type {
	DumlingDescriptorCsv,
	LanguageApi,
	Lemma,
	Selection,
	SupportedLanguage,
	Surface,
} from "../../types/public-types";
import { extractLemma } from "./entity-accessors";
import { csvRow } from "./id-codec/readable-csv";

type EntityValue<L extends SupportedLanguage> =
	| Lemma<L>
	| Surface<L>
	| Selection<L>;

function descriptorToCsv<L extends SupportedLanguage>(
	entityKind: "Lemma" | "Surface" | "Selection",
	descriptor: Record<string, string>,
): DumlingDescriptorCsv<L> {
	const fields =
		entityKind === "Lemma"
			? [
					entityKind,
					descriptor.language,
					descriptor.lemmaKind,
					descriptor.lemmaSubKind,
				]
			: entityKind === "Surface"
				? [
						entityKind,
						descriptor.language,
						descriptor.surfaceKind,
						descriptor.lemmaKind,
						descriptor.lemmaSubKind,
					]
				: [
						entityKind,
						descriptor.language,
						descriptor.surfaceKind,
						descriptor.lemmaKind,
						descriptor.lemmaSubKind,
					];

	return csvRow(fields) as DumlingDescriptorCsv<L>;
}

export function buildDescribeOperations<
	L extends SupportedLanguage,
>(): LanguageApi<L>["describe"] {
	const as = {
		lemma(value: EntityValue<L>) {
			const lemma = extractLemma(value);

			return {
				language: lemma.language,
				lemmaKind: lemma.lemmaKind,
				lemmaSubKind: lemma.lemmaSubKind,
			} as never;
		},
		surface(value: EntityValue<L>) {
			if ("surfaceKind" in value) {
				return {
					language: value.language,
					surfaceKind: value.surfaceKind,
					lemmaKind: value.lemma.lemmaKind,
					lemmaSubKind: value.lemma.lemmaSubKind,
				} as never;
			}

			if ("surface" in value) {
				return {
					language: value.language,
					surfaceKind: value.surface.surfaceKind,
					lemmaKind: value.surface.lemma.lemmaKind,
					lemmaSubKind: value.surface.lemma.lemmaSubKind,
				} as never;
			}

			return {
				language: value.language,
				surfaceKind: "Citation",
				lemmaKind: value.lemmaKind,
				lemmaSubKind: value.lemmaSubKind,
			} as never;
		},
		selection(value: EntityValue<L>) {
			if ("surface" in value) {
				return {
					language: value.language,
					surfaceKind: value.surface.surfaceKind,
					lemmaKind: value.surface.lemma.lemmaKind,
					lemmaSubKind: value.surface.lemma.lemmaSubKind,
				} as never;
			}

			if ("surfaceKind" in value) {
				return {
					language: value.language,
					surfaceKind: value.surfaceKind,
					lemmaKind: value.lemma.lemmaKind,
					lemmaSubKind: value.lemma.lemmaSubKind,
				} as never;
			}

			return {
				language: value.language,
				surfaceKind: "Citation",
				lemmaKind: value.lemmaKind,
				lemmaSubKind: value.lemmaSubKind,
			} as never;
		},
	} satisfies LanguageApi<L>["describe"]["as"];

	return {
		as,
		asCsv: {
			lemma(value: EntityValue<L>) {
				return descriptorToCsv<L>("Lemma", as.lemma(value));
			},
			surface(value: EntityValue<L>) {
				return descriptorToCsv<L>("Surface", as.surface(value));
			},
			selection(value: EntityValue<L>) {
				return descriptorToCsv<L>("Selection", as.selection(value));
			},
		},
	} as unknown as LanguageApi<L>["describe"];
}
