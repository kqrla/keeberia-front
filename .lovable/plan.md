# integrate kqrla/keeberia engines + render deployment

## goal
connect the existing keeberia editor to the manufacturing engine from `kqrla/keeberia` and make it deployable on render using the $50 credit balance.

## phase 1 — vendor the engines locally
1. fetch the public `kqrla/keeberia` repo into a temporary sandbox directory.
2. copy only the deterministic engine code into this project:
   - `backend/engines/pcb/pcb-engine` → `src/lib/keeberia-engines/pcb/`
   - `backend/engines/cad/case-engine` → `src/lib/keeberia-engines/case/`
   - `backend/engines/cad/caps-engine` → `src/lib/keeberia-engines/caps/`
3. inspect each engine for runtime dependencies (node-only apis, native modules, file system assumptions). replace or shim anything that breaks the cloudflare worker runtime.
4. add a thin adapter that converts the editor's internal region model into the engine's expected layout json.

## phase 2 — add fast local exports
1. create server functions under `src/lib/keeberia-engines/` that run the pcb/case/caps engines synchronously.
2. add an "export" menu to the editor with options:
   - download `.kicad_pcb`
   - download gerber zip
   - download bom csv
   - download svg preview
   - download case geometry (step/dxf when available)
3. validate exports against a few preset layouts before moving to the worker.

## phase 3 — render worker deployment
1. create a minimal express/fastify entry point in a new top-level `worker/` directory that exposes a single http endpoint:
   - `POST /manufacture` — accepts layout json, returns `{ kicad_pcb, gerbers?, svg?, bom?, case?, caps? }`.
2. add a `worker/render.yaml` so render can deploy it as a web service.
3. add environment-based toggles in this frontend:
   - `VITE_MANUFACTURE_WORKER_URL` — points to the render service.
   - fallback to local server function when the worker is not configured.

## phase 4 — documentation
update the required project docs to reflect the new architecture:
- `underthehood.md` — how the editor, local engines, and render worker fit together.
- `techstack.md` — add the engine tech and render hosting choice with reasoning.
- `features.md` — list the new export features.
- `roadmap.md` — mark engine integration and render deployment as done/in-progress.
- `port.md` — local dev steps now include running the worker.
- `portsb.md` — map the render worker to a supabase edge function alternative.
- `overview.md` — mention manufacturable exports as a core capability.

## out of scope for this plan
- writing a custom router / replacing tanstack start.
- moving the entire frontend to render.
- paid render database or persistent storage on render.

## success criteria
- editor can export a `.kicad_pcb` from a layout without leaving the browser.
- worker runs on render and returns the same outputs as the local engine.
- all required docs are updated and accurate.
