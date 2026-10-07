/** Findings per workspace path (`.` for the root), as sorted baseline lines. */
export type Findings = Record<string, string[]>;

interface ReportedSymbol {
	name?: string;
}

interface ReportRow {
	file: string;
	[issueType: string]: unknown;
}

export interface KnipReport {
	issues: ReportRow[];
}

export interface BaselineComparison {
	added: Findings;
	removed: Findings;
}

/** The workspace path that owns `file`, relative to the repository root. */
function workspaceOf(file: string, workspacePaths: string[]): string {
	return workspacePaths.find((path) => file.startsWith(`${path}/`)) ?? ".";
}

function symbolName(symbol: unknown): string {
	if (Array.isArray(symbol)) return symbol.map(symbolName).join(" = ");
	return (symbol as ReportedSymbol).name ?? JSON.stringify(symbol);
}

/** Groups a knip JSON report into one `file: type name` line per finding. */
export function findingsOf(
	report: KnipReport,
	workspacePaths: string[],
): Findings {
	const findings: Findings = {};
	for (const { file, ...row } of report.issues) {
		for (const [type, symbols] of Object.entries(row)) {
			if (type === "owners" || !Array.isArray(symbols)) continue;
			for (const symbol of symbols) {
				const line =
					type === "files"
						? `${file}: file`
						: `${file}: ${type} ${symbolName(symbol)}`;
				const workspace = workspaceOf(file, workspacePaths);
				findings[workspace] ??= [];
				findings[workspace].push(line);
			}
		}
	}
	return sortedFindings(findings);
}

function sortedFindings(findings: Findings): Findings {
	return Object.fromEntries(
		Object.entries(findings)
			.filter(([, lines]) => lines.length > 0)
			.map(
				([workspace, lines]) =>
					[workspace, [...new Set(lines)].sort()] as const,
			)
			.sort(([left], [right]) => left.localeCompare(right)),
	);
}

function inScope(findings: Findings, scope: string | undefined): Findings {
	if (scope === undefined) return findings;
	return findings[scope] ? { [scope]: findings[scope] } : {};
}

function difference(left: Findings, right: Findings): Findings {
	const result: Findings = {};
	for (const [workspace, lines] of Object.entries(left)) {
		const known = new Set(right[workspace] ?? []);
		result[workspace] = lines.filter((line) => !known.has(line));
	}
	return sortedFindings(result);
}

/** What `found` adds to and drops from `baseline`, within `scope`. */
export function compareWithBaseline(
	found: Findings,
	baseline: Findings,
	scope: string | undefined,
): BaselineComparison {
	const current = inScope(found, scope);
	const expected = inScope(baseline, scope);
	return {
		added: difference(current, expected),
		removed: difference(expected, current),
	};
}

/** `baseline` with the scope's findings replaced by `found`. */
export function updatedBaseline(
	found: Findings,
	baseline: Findings,
	scope: string | undefined,
): Findings {
	if (scope === undefined) return sortedFindings(found);
	return sortedFindings({ ...baseline, [scope]: found[scope] ?? [] });
}
