# Release and GitHub Pages

Read [AGENTS](../AGENTS.md) first; [the documentation index](README.md) routes other work.

## Ownership and entry points

- Repository: `crdunwel/learn-cs-games`; publishing branch: `main`.
- Public site: `https://crdunwel.github.io/learn-cs-games/`.
- [Pages workflow](../.github/workflows/pages.yml) owns verification and deployment.
- [Vite config](../vite.config.js) defaults to relative assets for local use. `VITE_BASE_PATH` overrides this; `npm run build:pages` explicitly builds for `/learn-cs-games/`.
- [Production browser config](../playwright.release.config.js) and [smoke test](../tests/release/pages.spec.js) serve the actual `dist/` build under that subdirectory.
- [Package scripts](../package.json), [lockfile](../package-lock.json), [Node version](../.nvmrc), and [PDF test requirements](../tests/pdf-requirements.txt) define the toolchain.

The app is static. Only `dist/` is published. Source, documentation, test artifacts, reference PDFs, credentials, and local progress are not website assets. There is no backend or secret needed at runtime. Public repository source remains visible on GitHub; do not commit personal exam attachments or local artifacts.

## One-time repository setup

In repository **Settings → Pages → Build and deployment**, choose **GitHub Actions** as Source. This requires an authenticated repository administrator. SSH permission to push commits does not itself configure Pages. No personal access token is stored in the repository or workflow.

The `github-pages` environment and standard short-lived Actions token handle deployments. Preserve environment protections. The workflow grants `contents: read` globally; only the deployment job gets `pages: write` and `id-token: write`. Pull requests never deploy. Official actions are pinned to commit SHAs; when updating one, confirm the upstream release and review its change.

## On every push to main

The workflow installs locked dependencies on Ubuntu with Node 22, Clang, Chromium, Python, and Poppler. It then runs:

1. `npm run docs:check` — context routes and local documentation links.
2. `npm test` — grading, generators, state transitions, exhaustive finite-domain checks, and native practice C.
3. `npm run test:exam-c` — exam C compiled and executed with sanitizers.
4. `npm run test:browser` — all games, exam states, mobile layouts, accessibility interactions, and print exports.
5. `tests/check-pdf-grids.py` — actual PDF paths and raster borders at 72, 96, and 144 DPI.
6. `npm run test:release` — production build and all nine hash routes beneath the Pages subdirectory.

Only a successful verification job can upload the website artifact and start deployment. Pull requests run the same verification without publishing. Manual workflow dispatch may deploy `main`. Queued releases do not interrupt an in-progress deployment. Test evidence is retained for seven days in Actions artifacts; it is not committed or published with the website.

Browser tests use the development server at the root; the final smoke test uses the production subdirectory. Do not remove that distinction: a development-only check will not catch broken asset paths on Pages. CI refuses focused `.only` tests, starts its own server, and does not silently retry failing tests.

## Local release check

```sh
nvm use
npm ci
npx playwright install chromium
npm run docs:check
npm test
npm run test:exam-c
mkdir -p artifacts/review
SCREENSHOT_DIR="$PWD/artifacts/review" npm run test:browser
python3 -m pip install -r tests/pdf-requirements.txt
python3 tests/check-pdf-grids.py --output-dir artifacts/review/grid-check artifacts/review/postfix-practice.pdf artifacts/review/the-exam.pdf
npm run test:release
```

Clang and `pdftoppm` must be installed separately; on Ubuntu use `clang` and `poppler-utils`. A local existing Chrome can be selected with `PLAYWRIGHT_CHANNEL=chrome`. Use `PLAYWRIGHT_PORT` to avoid another development server; use `RELEASE_PORT` to change the production smoke port. Do not reuse a different project's server or clear a user's browser storage to test.

Before committing, inspect `git status`, the staged diff, and `git diff --check`. Keep generated `dist/`, screenshots, PDFs, node_modules, and `.env` files out of Git. Then commit and push to the existing `origin`; do not recreate the repository or force-push shared history.

## Verify the published result

A successful local build or push is not proof of publication. Confirm the Actions run for the exact pushed SHA passed both jobs and its `github-pages` deployment succeeded. Open the site, inspect its loaded assets, visit `#postfix`, `#queue`, and `#exam`, and reload a hash route. Confirm phone width has no horizontal overflow. If needed, compare served asset filenames or hashes with that run's build artifact.

For a failed verification, read the first failing job and retained evidence; fix the issue and push a new commit. For a Pages configuration failure, check Source is GitHub Actions and the environment allows `main`. Do not disable tests or broaden permissions to hide a failure. To roll back a bad release, revert its source commit and push the revert so the same checks and deployment run again.

If renaming the repository or using a custom domain, update the Pages base in the build script, workflow, production config/test, and links in README. Re-run the production smoke check. Hash routes avoid server rewrites, but the asset base still matters.

## User data boundary

Progress is localStorage per browser origin. The first public visit will not inherit localhost progress, and changing browsers clears nothing but uses a separate store. Deploying updated assets does not intentionally reset saved progress; changing saved question semantics requires a version/migration decision described in [state and persistence](state.md). This app provides self-practice, not secure proctoring: answer models necessarily exist in the client bundle, even though the interface hides exam review until submission.

## Authoritative platform references

- [GitHub custom Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [Vite static deployment](https://vite.dev/guide/static-deploy)
- [Configure Pages action](https://github.com/actions/configure-pages)
