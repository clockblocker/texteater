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
import { useEffect, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { KnowledgePreferences } from "../../shared/knowledge-preferences";
import {
	type KnowledgeSettingPath,
	knowledgeSettingValue,
	withKnowledgeSetting,
} from "./knowledge-settings";

export function KnowledgeSettingsForm({
	visitorId,
	initialSettings,
}: {
	visitorId: string;
	initialSettings: KnowledgePreferences;
}) {
	const updateSettings = useMutation(api.knowledgeSettings.update);
	const [settings, setSettings] = useState(initialSettings);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		setSettings(initialSettings);
	}, [initialSettings]);

	async function change(next: KnowledgePreferences) {
		setSettings(next);
		setIsSaving(true);
		setError(null);
		try {
			await updateSettings({ visitorId, settings: next });
		} catch (cause) {
			setSettings(initialSettings);
			setError(
				cause instanceof Error
					? cause.message
					: "Knowledge settings update failed.",
			);
		} finally {
			setIsSaving(false);
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

const KNOWLEDGE_SETTING_LABELS: ReadonlyArray<{
	readonly path: KnowledgeSettingPath;
	readonly label: string;
}> = [
	{ path: "transcription", label: "Transcription" },
	{ path: "definition", label: "Definition" },
	{ path: "translations.en", label: "English translations" },
	{ path: "translations.ru", label: "Russian translations" },
	{ path: "morphologicalTree", label: "Morphological tree" },
	{ path: "lexicalBreakdown", label: "Lexical breakdown" },
	...directSemanticRelationValues.map((relation) => ({
		path: `semanticRelations.${relation}` as const,
		label: relationLabel(relation),
	})),
];

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
				{KNOWLEDGE_SETTING_LABELS.map(({ path, label }) => (
					<Field key={path} orientation="horizontal">
						<Checkbox
							id={`knowledge-setting-${path}`}
							checked={knowledgeSettingValue(settings, path)}
							onCheckedChange={(checked) =>
								onChange?.(
									withKnowledgeSetting(
										settings,
										path,
										checked,
									),
								)
							}
						/>
						<FieldLabel htmlFor={`knowledge-setting-${path}`}>
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
