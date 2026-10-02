#!/usr/bin/env sh
# Push the keys tf-demo's Convex code reads into the Convex deployment, and
# open the global wipes and inspection capture on the local one.
#
# Each key comes from the first place that sets it: the shell, then
# app/tf-demo/.env.local, then the repository root's .env.local, then a zsh
# login shell (~/.zshrc and the rest), since `bun run dev` may start from a
# shell that never read those. Values are never printed, and reach Convex on
# stdin rather than the command line.
#
# Usage: bun run env:sync            # local dev deployment
#        bun run env:sync -- --prod  # production deployment
set -eu

# The keys the deployment reads (declared in convex/convex.config.ts).
# tests/sync-convex-env.test.ts fails when this list and the code drift apart.
provider_keys="TYPESAFE_API_KEY"
# Flags set to "1" on a local deployment only.
local_flags="TF_DEMO_ADMIN TF_INSPECTION"

cd "$(dirname "$0")/.."

# The value the env file $2 assigns to $1, or nothing. The file is sourced in
# a subshell, so it never overrides what the shell exports.
file_value() {
	[ -f "$2" ] || return 0
	(
		unset "$1"
		set +u
		set -a
		# shellcheck disable=SC1090
		. "$2" >/dev/null 2>&1
		eval "printf '%s' \"\${$1:-}\""
	) || true
}

# One "__tf_demo_env__ NAME=value" line per name in $@, as a zsh login shell
# exports it. The marker separates the values from whatever the startup files
# print. Nothing when zsh is not installed.
zsh_exports() {
	command -v zsh >/dev/null 2>&1 || return 0
	# shellcheck disable=SC2016
	zsh -lic 'for name in "$@"; do print -r -- "__tf_demo_env__ $name=$(printenv "$name")"; done' \
		zsh "$@" </dev/null 2>/dev/null || true
}

zsh_output=""
zsh_read=false
missing=""
for name in $provider_keys; do
	eval "value=\${$name:-}"
	origin="the shell"
	if [ -z "$value" ]; then
		value=$(file_value "$name" ./.env.local)
		origin="app/tf-demo/.env.local"
	fi
	if [ -z "$value" ]; then
		value=$(file_value "$name" ../../.env.local)
		origin="the repository root's .env.local"
	fi
	if [ -z "$value" ]; then
		if [ "$zsh_read" = false ]; then
			# shellcheck disable=SC2086
			zsh_output=$(zsh_exports $provider_keys)
			zsh_read=true
		fi
		value=$(printf '%s\n' "$zsh_output" |
			sed -n "s/.*__tf_demo_env__ $name=//p" | tail -n 1)
		origin="a zsh login shell"
	fi
	if [ -z "$value" ]; then
		missing="$missing $name"
		continue
	fi
	echo "setting $name from $origin"
	printf '%s' "$value" |
		CONVEX_AGENT_MODE=anonymous npx convex env set "$name" "$@"
done

# A hosted deployment leaves these unset, so anonymous callers cannot wipe
# shared data or capture inspection there.
case " $* " in
*" --prod "*) ;;
*)
	for name in $local_flags; do
		echo "setting $name"
		CONVEX_AGENT_MODE=anonymous npx convex env set "$name" 1 "$@"
	done
	;;
esac

if [ -n "$missing" ]; then
	if command -v zsh >/dev/null 2>&1; then
		zsh_place="a zsh login shell (~/.zshrc and the rest)"
	else
		zsh_place="zsh (not installed, so skipped)"
	fi
	cat >&2 <<EOF

########################################################################
#  WARNING: not pushed to the Convex deployment:$missing
#
#  Searched, in order: the shell, app/tf-demo/.env.local, the
#  repository root's .env.local and $zsh_place.
#
#  The deployment keeps whatever it had; a fresh one has nothing, and
#  every text submission then fails with "Intake isn't configured".
#  Fix: add the key to the repository root's .env.local, then run
#  \`bun run env:sync\` from app/tf-demo and restart the dev server.
########################################################################

EOF
	exit 1
fi
