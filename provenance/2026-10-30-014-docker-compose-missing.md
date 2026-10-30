# docker-compose-missing
- Date: 2026-10-30
- Model: claude-sonnet-5-5

## Prompt
I'm getting this issue still, how do I fix it?

unknown shorthand flag: 'd' in -d

Usage:  docker [OPTIONS] COMMAND [ARG...]

Run 'docker --help' for more information
error Command failed with exit code 125.

## Agent output
Diagnosed: `yarn db:up` runs `docker compose up -d db`, but the Docker Compose v2 plugin is not installed (`docker compose version` -> "unknown command"; no ~/.docker/cli-plugins; no docker-compose binary), so docker misparses `-d`. Advised `yarn db:local` (no Docker) or installing the plugin via `brew install docker-compose` plus a cli-plugins symlink. No code changes.

Files changed: provenance/2026-10-30-014-docker-compose-missing.md
