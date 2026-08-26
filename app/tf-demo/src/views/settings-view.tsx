import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";

import { DataControls } from "@/components/data-controls";
import { useTheme } from "@/components/theme-provider";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldLabel,
	FieldTitle,
} from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useAnonymousVisitorId } from "@/hooks/use-anonymous-visitor";
import type { SettingsTarget } from "@/lib/navigation";
import { api } from "../../convex/_generated/api";
import { KnowledgeSettingsForm } from "./unit-reading-knowledge-settings";

export function SettingsView({ target }: { target: SettingsTarget }) {
	const visitorId = useAnonymousVisitorId();
	const settingsQuery = useQuery({
		...convexQuery(api.knowledgeSettings.get, { visitorId }),
		gcTime: 10_000,
	});

	return (
		<div className="flex-1 bg-muted/30 px-4 py-8 sm:px-6 sm:py-12">
			<div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
				<header>
					<h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
						Settings
					</h1>
				</header>

				<Card>
					<CardHeader>
						<CardTitle>Appearance</CardTitle>
						<CardDescription>
							Choose how tf-demo looks in this browser.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<ThemeSettings />
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Knowledge</CardTitle>
						<CardDescription>
							Choose what appears on every Reading note for this
							browser.
						</CardDescription>
					</CardHeader>
					<CardContent>
						{settingsQuery.isPending ? (
							<div
								className="grid grid-cols-1 gap-3 sm:grid-cols-2"
								role="status"
								aria-label="Loading Knowledge settings"
							>
								{Array.from({ length: 6 }, (_, index) => (
									<Skeleton
										key={index}
										className="h-5 w-36"
									/>
								))}
							</div>
						) : settingsQuery.data ? (
							<KnowledgeSettingsForm
								visitorId={visitorId}
								initialSettings={settingsQuery.data}
							/>
						) : (
							<p
								className="text-sm text-destructive"
								role="alert"
							>
								{settingsQuery.error instanceof Error
									? settingsQuery.error.message
									: "Knowledge settings could not be loaded."}
							</p>
						)}
					</CardContent>
				</Card>

				{target.textId ? (
					<TextDataControls textId={target.textId} />
				) : (
					<DataControls />
				)}
			</div>
		</div>
	);
}

function ThemeSettings() {
	const { theme, setTheme } = useTheme();

	return (
		<FieldLabel htmlFor="dark-mode">
			<Field orientation="horizontal">
				<FieldContent>
					<FieldTitle>Dark mode</FieldTitle>
					<FieldDescription>
						Use the dark appearance throughout the demo.
					</FieldDescription>
				</FieldContent>
				<Switch
					id="dark-mode"
					checked={theme === "dark"}
					onCheckedChange={(checked) =>
						setTheme(checked ? "dark" : "light")
					}
				/>
			</Field>
		</FieldLabel>
	);
}

function TextDataControls({ textId }: { textId: string }) {
	const textQuery = useQuery({
		...convexQuery(api.textViews.get, { textId }),
		gcTime: 10_000,
	});

	if (textQuery.isPending) {
		return (
			<div className="flex flex-col gap-6" role="status">
				<Skeleton className="h-32 w-full rounded-xl" />
				<Skeleton className="h-36 w-full rounded-xl" />
			</div>
		);
	}

	const text = textQuery.data;
	return (
		<DataControls
			text={
				text
					? {
							textId: text.textId,
							sourceText: text.sourceText,
							isAnalyzed: text.sentences.some(
								(sentence) => sentence.segments.length > 0,
							),
						}
					: undefined
			}
		/>
	);
}
