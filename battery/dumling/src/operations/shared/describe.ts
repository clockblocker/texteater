import type {
	DumlingDescriptorCsv,
	Lemma,
	Selection,
	SupportedLanguage,
	Surface,
} from "../../types/public-types.js";
import type { LanguageApi } from "../api-shape.js";
import { inspectEntity } from "./entity-accessors.js";
import { csvRow } from "./id-codec/readable-csv.js";

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
	function surfaceDescriptor(value: EntityValue<L>) {
		const inspection = inspectEntity(value);
		return {
			language: inspection.language,
			surfaceKind: inspection.surfaceKind,
			lemmaKind: inspection.lemma.lemmaKind,
			lemmaSubKind: inspection.lemma.lemmaSubKind,
		};
	}

	const as = {
		lemma(value: EntityValue<L>) {
			const { lemma } = inspectEntity(value);

			return {
				language: lemma.language,
				lemmaKind: lemma.lemmaKind,
				lemmaSubKind: lemma.lemmaSubKind,
			} as never;
		},
		surface(value: EntityValue<L>) {
			return surfaceDescriptor(value) as never;
		},
		selection(value: EntityValue<L>) {
			return surfaceDescriptor(value) as never;
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
