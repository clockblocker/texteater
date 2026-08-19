import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useMutation } from "convex/react";
import {
	type KnowledgeSettings,
	type SemanticRelation,
	semanticRelationValues,
} from "dumrel";
import { useEffect, useState } from "react";

import { api } from "../../convex/_generated/api";

export function KnowledgeSettingsPanel({
	visitorId,
	initialSettings,
}: {
	visitorId: string;
	initialSettings: KnowledgeSettings;
}) {
	const settingsQuery = useQuery({
		...convexQuery(api.knowledgeSettings.get, { visitorId }),
		gcTime: 10_000,
	});
	const updateSettings = useMutation(api.knowledgeSettings.update);
	const [settings, setSettings] = useState(initialSettings);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (settingsQuery.data) setSettings(settingsQuery.data);
	}, [settingsQuery.data]);

	async function change(next: KnowledgeSettings) {
		setSettings(next);
		setIsSaving(true);
		setError(null);
		try {
			await updateSettings({ visitorId, settings: next });
		} catch (cause) {
			setSettings(settingsQuery.data ?? initialSettings);
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
		<section className="rounded-lg border bg-card px-4 py-3">
			<details>
				<summary className="cursor-pointer text-sm font-medium">
					Knowledge settings
				</summary>
				<p className="mt-2 text-xs text-muted-foreground">
					These choices apply to every Reading for this visitor.
				</p>
				<KnowledgeSettingsChecklist
					settings={settings}
					disabled={isSaving || settingsQuery.isPending}
					onChange={(next) => void change(next)}
				/>
				<p className="sr-only" aria-live="polite">
					{isSaving ? "Saving Knowledge settings" : ""}
				</p>
				{error ? (
					<p className="mt-2 text-sm text-destructive" role="alert">
						{error}
					</p>
				) : null}
			</details>
		</section>
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
		<fieldset
			className="mt-3 grid gap-2 sm:grid-cols-2"
			disabled={disabled}
		>
			<legend className="sr-only">Visible Knowledge</legend>
			{KNOWLEDGE_SETTING_LABELS.map(({ path, label }) => (
				<label key={path} className="flex items-center gap-2 text-sm">
					<input
						type="checkbox"
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
					{label}
				</label>
			))}
		</fieldset>
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
