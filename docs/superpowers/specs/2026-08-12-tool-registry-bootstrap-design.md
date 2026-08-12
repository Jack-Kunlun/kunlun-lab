# Tool Registry Bootstrap Design

## Context

Task 6 introduces the internal-tool contract, registry validation, build-time work-to-tool checks,
and the isolated `ToolShell`. The checked-in work metadata already references
`jd-skill-radar`, but the original V1 plan deferred that tool's first manifest until Task 10.

That ordering is contradictory: Task 6 requires every checked-in `toolId` to resolve through the
registry, while the only manifest that can satisfy the current reference would not exist yet.
Allowing an unknown ID for draft work would weaken an explicit build boundary, and maintaining a
separate ID list would create a second source of truth.

## Decision

Task 6 will create the real `jdSkillRadarManifest` in the JD radar package as a truthful draft
manifest. It uses the stable tool ID and title, declares `runtime: "client"`, keeps
`status: "draft"`, advertises no capabilities, and loads a minimal draft placeholder component.

The draft manifest is not a fake launch promise. It exists so the checked-in work metadata and
the runtime registry share one authoritative identity while the actual analyzer is still under
construction. The work remains non-launchable because its content status is also `draft`.

Task 10 will update this same manifest in place. It replaces the placeholder component with the
real `JdSkillRadar` workbench, changes the status to `alpha`, and declares the approved
`clipboard` and `download` capabilities. It must not introduce a parallel manifest or a separate
tool-ID catalog.

## Package Boundaries

- `@kunlun/shared` owns the stable `ToolManifest` type because work metadata, the registry, and
  later tool packages all consume it.
- `@kunlun/tool-kit` owns runtime manifest validation, registry creation, work-link validation,
  and `ToolShell`.
- `@kunlun/jd-skill-radar` owns its one manifest and its draft placeholder component.
- `scripts/validate-tools.ts` imports the explicit manifest list, reads checked-in work metadata,
  builds the registry, and validates every work `toolId`.
- The root `prebuild` runs content validation before tool validation.

The validator uses explicit imports. It does not discover manifests with filesystem globbing or
derive valid IDs from package names.

## Registry Validation

`createToolRegistry` validates every manifest before adding it to a `ReadonlyMap`:

- IDs and titles must contain non-whitespace text;
- IDs must use lowercase kebab case;
- IDs must be unique;
- runtime must be `client`;
- status must not be `archived`;
- capabilities must be unique and limited to `clipboard` and `download`;
- component must be callable. The registry never invokes a loader during registration; the
  `ToolManifest` TypeScript contract enforces its Promise return type for authored manifests.

`validateWorkToolLinks` ignores works without `toolId`. A referenced ID must exist in the
registry; failures include both the work title and invalid ID. It does not decide whether a draft
work should display a launch action—that remains the shared work-action policy.

## ToolShell State Boundary

`ToolShell` renders a stable outer section and replaces only its viewport content:

- `ready` renders the default slot;
- `loading` renders the `loading` slot or safe default loading copy;
- `error` renders the `error` slot or safe error copy plus a native retry button;
- `feedback` renders the `feedback` slot or safe feedback copy.

The component never renders an exception message or stack. Retry emits one `retry` event. Status
copy uses appropriate live-region semantics and visible text, so state is not communicated by
color alone. The page header, navigation, work introduction, and long explanation remain outside
`ToolShell` and cannot be replaced by a tool failure.

## Data Flow

1. The explicit JD radar manifest is imported by `validate-tools.ts`.
2. `createToolRegistry` validates it and creates the ID-indexed registry.
3. The script reads and parses work frontmatter from `apps/web/content/works`.
4. `validateWorkToolLinks` checks each optional `toolId` against the registry.
5. Any invalid manifest or work reference exits non-zero before the production build begins.

## Testing and Failure Probes

- Registry unit tests cover empty/malformed/duplicate IDs, invalid runtime, archived status,
  unsupported or duplicate capabilities, and valid registration.
- Work-link tests cover absent IDs, valid IDs, and missing IDs whose errors contain the work title.
- Component tests cover all four states, default and named slots, live-region behavior, safe error
  copy, stack/message suppression, and retry emission.
- Script tests or exported validation helpers use temporary controlled work metadata rather than
  asserting source text.
- Deliberate probes prove that a duplicate manifest and a checked-in unknown `toolId` fail, then
  restore the clean state before commit.

## Scope

Task 6 does not implement JD analysis, exports, state management, or the final workbench. It does
not add automatic tool discovery or relax the checked-in content boundary. Those responsibilities
remain in Tasks 7–10.
