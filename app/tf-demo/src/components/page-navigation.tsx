import { LibraryIcon, SettingsIcon } from "lucide-react";
import { Link } from "react-router-dom";

import { hrefFor } from "@/lib/navigation";

const linkClassName =
	"inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

export function PageNavigation({
	showLibrary = true,
	showSettings = true,
	settingsTextId,
}: {
	showLibrary?: boolean;
	showSettings?: boolean;
	settingsTextId?: string;
}) {
	return (
		<nav className="flex flex-wrap items-center gap-4" aria-label="Primary">
			{showSettings ? (
				<Link
					to={hrefFor({
						kind: "Settings",
						...(settingsTextId ? { textId: settingsTextId } : {}),
					})}
					className={linkClassName}
				>
					<SettingsIcon className="size-4" aria-hidden="true" />
					Settings
				</Link>
			) : null}
			{showLibrary ? (
				<Link
					to={hrefFor({ kind: "Library" })}
					className={linkClassName}
				>
					<LibraryIcon className="size-4" aria-hidden="true" />
					Library
				</Link>
			) : null}
		</nav>
	);
}
