# Issue tracker

Issues and PRDs live in GitHub Issues for `clockblocker/texteater`. Use
`gh api`; do not use the deprecated `gh issue` command family.

Read an issue and its discussion with:

```sh
gh api repos/clockblocker/texteater/issues/<number>
gh api --paginate repos/clockblocker/texteater/issues/<number>/comments
```

Create, comment on, update, or close issues through the corresponding REST
endpoint. Post a final result before closing work. Infer no authentication
failure from `gh auth status` alone; verify with `gh api user --jq .login` and
treat network errors separately from a GitHub `401` response.

## Triage labels

Use these five roles:

| Role | GitHub label |
| --- | --- |
| Needs maintainer triage | `needs-triage` |
| Waiting for information | `needs-info` |
| Ready for an agent | `ready-for-agent` |
| Requires human implementation | `ready-for-human` |
| Will not be implemented | `wontfix` |

## Wayfinder work

- A map is an issue labelled `wayfinder:map`.
- Its child issues use `wayfinder:research`, `wayfinder:prototype`,
  `wayfinder:grilling`, or `wayfinder:task`.
- Use native sub-issues and dependencies when available.
- The frontier is the map's open, unblocked, unassigned children in map order.
- Claim work by assigning it to the current user.
- Resolve a child by posting the result, closing it, and adding a linked
  one-line decision to the map.
