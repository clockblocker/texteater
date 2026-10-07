import { useMutation } from "convex/react";
import { directSemanticRelationValues } from "dumrel";
import type * as Dumrel from "dumrel/types";
import {
	Checkbox,
	Field,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "lego";
import { useState } from "react";
import { visitorErrorMessage } from "@/lib/visitor-error";
import { api } from "../../convex/_generated/api";
import type { KnowledgePreferences } from "../../shared/knowledge-preferences";

export function KnowledgeSettingsForm({
	visitorId,
	initialSettings,
}: {
	visitorId: string;
	initialSettings: KnowledgePreferences;
}) {
	const updateSettings = useMutation(api.knowledgeSettings.update);
	// Only the in-flight change is local. Convex resolves a mutation's promise
	// after the query results that reflect it have been delivered, so clearing
	// `pending` shows the saved settings, or the unchanged ones after a failure.
	const [pending, setPending] = useState<KnowledgePreferences | null>(null);
	const [error, setError] = useState<string | null>(null);
	const settings = pending ?? initialSettings;
	const isSaving = pending !== null;

	async function change(next: KnowledgePreferences) {
		setPending(next);
		setError(null);
		try {
			await updateSettings({ visitorId, settings: next });
		} catch (cause) {
			setError(visitorErrorMessage(cause));
		} finally {
			setPending(null);
		}
	}

	return (
		<div className="flex flex-col gap-3">
			<KnowledgeSettingsChecklist
				settings={settings}
				disabled={isSaving}
				onChange={(next) => void change(next)}
			/>
			<p className="sr-only" aria-live="polite">
				{isSaving ? "Saving Knowledge settings" : ""}
			</p>
			{error ? (
				<p className="text-sm text-destructive" role="alert">
					{error}
				</p>
			) : null}
		</div>
	);
}

type KnowledgeSetting = {
	readonly id: string;
	readonly label: string;
	readonly read: (settings: KnowledgePreferences) => boolean;
	readonly write: (
		settings: KnowledgePreferences,
		enabled: boolean,
	) => KnowledgePreferences;
};

const KNOWLEDGE_SETTING_LABELS: readonly KnowledgeSetting[] = [
	{
		id: "transcription",
		label: "Transcription",
		read: (settings) => settings.transcription,
		write: (settings, transcription) => ({ ...settings, transcription }),
	},
	{
		id: "definition",
		label: "Definition",
		read: (settings) => settings.definition,
		write: (settings, definition) => ({ ...settings, definition }),
	},
	translationSetting("en", "English translations"),
	translationSetting("ru", "Russian translations"),
	{
		id: "morphologicalTree",
		label: "Morphological tree",
		read: (settings) => settings.morphologicalTree,
		write: (settings, morphologicalTree) => ({
			...settings,
			morphologicalTree,
		}),
	},
	...directSemanticRelationValues.map(
		(relation): KnowledgeSetting => ({
			id: `semanticRelations.${relation}`,
			label: relationLabel(relation),
			read: (settings) => settings.semanticRelations[relation],
			write: (settings, enabled) => ({
				...settings,
				semanticRelations: {
					...settings.semanticRelations,
					[relation]: enabled,
				},
			}),
		}),
	),
];

function translationSetting(
	language: Dumrel.TranslationLanguage,
	label: string,
): KnowledgeSetting {
	return {
		id: `translations.${language}`,
		label,
		read: (settings) => settings.translations[language],
		write: (settings, enabled) => ({
			...settings,
			translations: { ...settings.translations, [language]: enabled },
		}),
	};
}

export function KnowledgeSettingsChecklist({
	settings,
	disabled = false,
	onChange,
}: {
	settings: KnowledgePreferences;
	disabled?: boolean;
	onChange?: (settings: KnowledgePreferences) => void;
}) {
	return (
		<FieldSet disabled={disabled}>
			<FieldLegend className="sr-only">Visible Knowledge</FieldLegend>
			<FieldGroup className="grid grid-cols-1 gap-3 sm:grid-cols-2">
				{KNOWLEDGE_SETTING_LABELS.map(({ id, label, read, write }) => (
					<Field key={id} orientation="horizontal">
						<Checkbox
							id={`knowledge-setting-${id}`}
							checked={read(settings)}
							onCheckedChange={(checked) =>
								onChange?.(write(settings, checked))
							}
						/>
						<FieldLabel htmlFor={`knowledge-setting-${id}`}>
							{label}
						</FieldLabel>
					</Field>
				))}
			</FieldGroup>
		</FieldSet>
	);
}

function relationLabel(relation: Dumrel.SemanticRelation): string {
	return relation.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`);
}
