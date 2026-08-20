import { useMutation } from "convex/react";
import {
	type KnowledgeSettings,
	type SemanticRelation,
	semanticRelationValues,
} from "dumrel";
import { useEffect, useState } from "react";

import {
	Field,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "@/components/ui/field";
import { api } from "../../convex/_generated/api";

export function KnowledgeSettingsForm({
	visitorId,
	initialSettings,
}: {
	visitorId: string;
	initialSettings: KnowledgeSettings;
}) {
	const updateSettings = useMutation(api.knowledgeSettings.update);
	const [settings, setSettings] = useState(initialSettings);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		setSettings(initialSettings);
	}, [initialSettings]);

	async function change(next: KnowledgeSettings) {
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

type KnowledgeSettingPath =
	| "transcription"
	| "definition"
	| "translations.en"
	| "morphologicalTree"
	| "lexicalBreakdown"
	| `semanticRelations.${SemanticRelation}`;

const KNOWLEDGE_SETTING_LABELS: ReadonlyArray<{
	readonly path: KnowledgeSettingPath;
	readonly label: string;
}> = [
	{ path: "transcription", label: "Transcription" },
	{ path: "definition", label: "Definition" },
	{ path: "translations.en", label: "English translations" },
	{ path: "morphologicalTree", label: "Morphological tree" },
	{ path: "lexicalBreakdown", label: "Lexical breakdown" },
	...semanticRelationValues.map((relation) => ({
		path: `semanticRelations.${relation}` as const,
		label: relationLabel(relation),
	})),
];

export function KnowledgeSettingsChecklist({
	settings,
	disabled = false,
	onChange,
}: {
	settings: KnowledgeSettings;
	disabled?: boolean;
	onChange?: (settings: KnowledgeSettings) => void;
}) {
	return (
		<FieldSet disabled={disabled}>
			<FieldLegend className="sr-only">Visible Knowledge</FieldLegend>
			<FieldGroup className="grid grid-cols-1 gap-3 sm:grid-cols-2">
				{KNOWLEDGE_SETTING_LABELS.map(({ path, label }) => (
					<Field key={path} orientation="horizontal">
						<input
							id={`knowledge-setting-${path}`}
							type="checkbox"
							className="size-4 shrink-0 accent-primary"
							checked={knowledgeSettingValue(settings, path)}
							onChange={(event) =>
								onChange?.(
									withKnowledgeSetting(
										settings,
										path,
										event.currentTarget.checked,
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

export function withKnowledgeSetting(
	settings: KnowledgeSettings,
	path: KnowledgeSettingPath,
	enabled: boolean,
): KnowledgeSettings {
	if (path === "transcription" || path === "definition") {
		return { ...settings, [path]: enabled };
	}
	if (path === "translations.en") {
		return { ...settings, translations: { en: enabled } };
	}
	if (path === "morphologicalTree" || path === "lexicalBreakdown") {
		return { ...settings, [path]: enabled };
	}
	const relation = path.slice(
		"semanticRelations.".length,
	) as SemanticRelation;
	return {
		...settings,
		semanticRelations: {
			...settings.semanticRelations,
			[relation]: enabled,
		},
	};
}

function knowledgeSettingValue(
	settings: KnowledgeSettings,
	path: KnowledgeSettingPath,
): boolean {
	if (path === "translations.en") return settings.translations.en;
	if (path.startsWith("semanticRelations.")) {
		const relation = path.slice(
			"semanticRelations.".length,
		) as SemanticRelation;
		return settings.semanticRelations[relation];
	}
	switch (path) {
		case "transcription":
			return settings.transcription;
		case "definition":
			return settings.definition;
		case "morphologicalTree":
			return settings.morphologicalTree;
		case "lexicalBreakdown":
			return settings.lexicalBreakdown;
	}
	throw new Error(`Unsupported Knowledge setting: ${path}`);
}

function relationLabel(relation: SemanticRelation): string {
	return relation.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`);
}
