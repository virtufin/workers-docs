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
| C# (DLL) | `application/x-dotnet-dll` | `worker.nupkg` of published DLLs |
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
│   │   └── Virtufin.Worker.WebSocketManagerController/
│   │       ├── Virtufin.Worker.WebSocketManagerController.csproj
│   │       └── WebSocketManagerController.cs
│   └── scripts/
│       ├── build.sh                    # dotnet publish → worker.nupkg
│       └── publish.sh                  # build + upload to Gitea NuGet package
└── AGENTS.md                           # project-specific agent guidelines
```

## Adding a new worker

1. Create a new top-level directory whose name describes the worker
   (e.g. `MarketDataRecorder`).
2. Under it, create `src/<LanguageWorkerProjectName>/` with the worker source.
   - C#: a `.csproj` targeting `net10.0` that references `Virtufin.Worker.DevKit`
     and implements `IWorker` (directly or via `CommandWorker` / `ApiCommandWorker`).
   - Python: a module that subclasses `WorkerBase` (or one of its variants from
     `virtufin.worker_devkit`).
   - TypeScript: a module that implements the worker interface exported from
     `@virtufin/worker`.
3. Add a `versions.env` (with `LIBRARY_VERSION`) at the worker root.
4. Add a `scripts/build.py` (and `scripts/publish.py`) that produces the
   deployable artefact and uploads it to the Gitea NuGet package.
5. Bump `LIBRARY_VERSION` in the worker's `versions.env` if the change is a release.

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
