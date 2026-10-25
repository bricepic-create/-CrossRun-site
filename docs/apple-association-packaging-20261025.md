# Apple association: Pages packaging correction

Status: prepared only. Do not merge or dispatch Pages without explicit release approval.

The published site belongs to `bricepic-create/-CrossRun-site`, not the mobile repository's `website/` directory. The current site source is `2b8dc50508bcec4148424d9156809d77bb6e30f0`; its last Pages run was `39162635444`. On 2026-10-25, `https://crossrunapp.fr/.well-known/apple-app-site-association` and the root alternative returned HTTP 404, while the homepage returned HTTP 200.

The source already contains a valid association and `.nojekyll`. The upstream `actions/upload-pages-artifact@v4` archive command adds `--exclude=".[^/]*"`, removing both hidden paths. Reproducing this exact tar exclusion locally confirmed their absence. Source reference: https://github.com/actions/upload-pages-artifact/blob/v4/action.yml .

The correction builds the same uncompressed tar contract explicitly, retaining hidden paths while excluding Git metadata and workflows, and uploads it with the same pinned upload-artifact revision used by the official action. Before upload, it verifies regular-file entries for the homepage, domain, `.nojekyll`, and AASA, valid JSON, the existing CrossRun app ID, and nonempty URL components. It does not change association routes, app identity, pages, assets, OAuth callback, DNS, or application code.

Local checks passed: four Python tests (required file inclusion and unchanged assets/callback, missing association rejection, wrong app rejection, archive destination safety); archive creation using the actual current association and public homepage; YAML parsing and main-only/manual deployment trigger inspection. No Actions run or deployment was requested. These packaging checks are not proof of successful production hosting.

After an explicitly authorized deployment, verify the real public response: HTTP 200, no redirects, the expected JSON and an Apple-compatible JSON Content-Type. Check Apple's associated-domain/CDN behavior and Universal Links on a physical iPhone. If Pages serves an incompatible MIME type for this extensionless file, configure an appropriate host/proxy response before claiming the association is operational; the packaging correction alone cannot prove this. Re-run the mobile public-endpoint publication guard only after the live URL is corrected.

Mobile candidate remains https://github.com/bricepic-create/Crossrun-mobile/pull/220 . This site PR is a separate prerequisite, not another mobile release candidate. It does not resolve the Zod advisory, visual approval, physical-device tests, EAS authentication, or server production prerequisites documented there.
