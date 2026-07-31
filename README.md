# virtufin-workers

A catalogue of Virtufin workers that can be deployed with the
[Virtufin WorkManager](https://gitea.haenerconsulting.com/virtufin/virtufin-workmanager).

A worker is a piece of code — packaged as a DLL, a zip, or a single source file — that
the WorkManager loads at runtime, subscribes to a Dapr pub/sub topic, and dispatches
incoming CloudEvents to the worker's `ProcessAsync` (or equivalent) entry point.

Each top-level directory in this repository corresponds to one worker. Workers may be
implemented in any of the languages supported by the WorkManager's engines:

| Language | Engine (MIME) | Artefact |
|----------|---------------|----------|
| C# (DLL) | `application/x-dotnet-dll` | `<PackageId>.nupkg` of published DLLs (e.g. `Virtufin.Worker.WebSocketManagerController.nupkg`) |
| C# (single file) | `text/x-csharp` | single `.cs` file |
| Python | `text/x-python` | `.py` source (or zip of dependencies) |
| TypeScript | n/a (runs in user process) | `.ts` / `.js` source (or zip) |

The built artefact for every worker is versioned and stored as a private
[NuGet package](https://gitea.haenerconsulting.com/api/packages/virtufin/nuget) on
`nuget.haenerconsulting.com` under the `virtufin` owner. The `.nupkg` is uploaded
via the NuGet API (`PUT api/packages/virtufin/nuget/`). From there any WorkManager
can fetch the code by URL when creating a worker instance.

## Directory layout

```
virtufin-workers/
├── WebSocketManagerController/        # First worker
│   ├── versions.env                    # LIBRARY_VERSION pin (per worker)
│   ├── src/
│   │   ├── Virtufin.Worker.WebSocketManagerController.Managed/  # managed (JIT) project
│   │   └── Virtufin.Worker.WebSocketManagerController.Native/   # NativeAOT project
│   ├── tests/
│   └── scripts/                        # thin wrappers over @common/scripts/
│       ├── build_managed.py            # dotnet publish → <PackageId>.nupkg (managed)
│       ├── build_aot.py                # NativeAOT variant
│       ├── build_both.py               # both variants
│       └── publish.py                  # upload <PackageId>.nupkg to Gitea NuGet
├── HttpGetWorker/                      # GETs a URL (env var) on each trigger, emits the response
├── HelloPython/                        # Python worker: greets the name in the event data
│   └── src/hello_python.py             # deployed as source (text/x-python), no build step
├── GetTimePython/                      # Python worker: GETs the UTC time API on each trigger
│   └── src/gettime_python.py           # deployed as source (text/x-python), no build step
├── @common/scripts/                    # shared Python build/publish/ops helpers
└── AGENTS.md                           # project-specific agent guidelines
```

## Adding a new worker

1. Create a new top-level directory whose name describes the worker
   (e.g. `MarketDataRecorder`).
2. Under it, create `src/<LanguageWorkerProjectName>/` with the worker source.
   - C#: a `.csproj` targeting `net10.0` that references `Virtufin.Worker.DevKit`
     and implements `IWorker` (directly or via `CommandWorker` / `ApiCommandWorker`).
   - Python: a module exposing a module-level `Process(cloud_event)` that the
     WorkManager Python engine calls (returns a CloudEvent dict, or `None`),
     or a `WorkerBase` subclass from `virtufin.worker_devkit`. Deployed as
     source (`text/x-python`) — no build/publish step.
   - TypeScript: a module that implements the worker interface exported from
     `@virtufin/worker`.
3. Add a `versions.env` (with `LIBRARY_VERSION`) and a `CHANGELOG.md` at the
   worker root.
4. Add `scripts/build_managed.py` (plus `build_aot.py`/`build_both.py` if the
   worker ships a NativeAOT variant) and `scripts/publish.py` as thin wrappers
   over `@common/scripts/`, modelled on the WebSocketManagerController ones.
5. Add `.github/workflows/<workername>-nuget.yaml`, a thin caller of the
   shared `worker-nuget-common.yaml` reusable workflow (see AGENTS.md), so
   publishing happens in CI on push to `master` rather than by hand.
6. Bump `LIBRARY_VERSION` in the worker's `versions.env` if the change is a release.

## Deploying a worker

After publishing, deploy the worker by pointing a WorkManager `CreateWorker` call
at the NuGet package URL:

```
https://nuget.haenerconsulting.com/api/packages/virtufin/nuget/<package-name>/<version>/<PackageId>.nupkg
```

The WorkManager fetches the artefact, loads it via the matching engine, and
subscribes a worker instance to the topic you specified. See
[virtufin-workmanager](https://gitea.haenerconsulting.com/virtufin/virtufin-workmanager)
for the gRPC/REST API.

## See also

- [virtufin-workmanager](https://gitea.haenerconsulting.com/virtufin/virtufin-workmanager)
  — the worker engine/runtime.
- [virtufin-examples](https://gitea.haenerconsulting.com/virtufin/virtufin-examples)
  — example workers in C#, Python and TypeScript (some of which are promoted
  into this catalogue once stabilised).
- [Gitea NuGet packages](https://docs.gitea.com/usage/packages/nuget/) —
  the artefact store.
