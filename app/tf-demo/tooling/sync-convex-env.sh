#!/usr/bin/env sh
# Push the provider API keys from the shell (or .env.local) into the Convex deployment,
# and open the global wipes and inspection capture on the local one.
# Usage: bun run env:sync            # local dev deployment
#        bun run env:sync -- --prod  # production deployment
set -eu

cd "$(dirname "$0")/.."

# .env.local fills in anything the shell does not already export.
if [ -f .env.local ]; then
	set -a
	# shellcheck disable=SC1091
	. ./.env.local
	set +a
fi

status=0
for name in OPENAI_API_KEY TYPESAFE_API_KEY; do
	eval "value=\${$name:-}"
	if [ -z "$value" ]; then
		echo "$name is not set in the shell or .env.local; skipping (is it exported? try: export $name)" >&2
		status=1
		continue
	fi
	echo "setting $name"
	CONVEX_AGENT_MODE=anonymous npx convex env set "$name" "$value" "$@"
done

# A hosted deployment leaves these unset, so anonymous callers cannot wipe
# shared data or capture inspection there.
case " $* " in
*" --prod "*) ;;
*)
	for name in TF_DEMO_ADMIN TF_INSPECTION; do
		echo "setting $name"
		CONVEX_AGENT_MODE=anonymous npx convex env set "$name" 1 "$@"
	done
	;;
esac
exit $status
