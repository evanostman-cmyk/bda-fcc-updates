# BDA Channel Plan Calculator — automatic FCC updates

A single-page channel planning and FCC P25-compatible licensing search tool, with selectable transmitter sites and KML export.

## Online calculator
Once GitHub Pages is enabled and the first FCC workflow succeeds, open:
**https://evanostman-cmyk.github.io/bda-fcc-updates/**

## One-time setup
1. In this repository open **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Go to **Actions → Refresh and publish FCC database**.
4. Check the most recent workflow run; if necessary click **Run workflow**.
5. When the workflow and Pages deployment are successful, use the link above.

## How updates work
- The workflow is scheduled every Monday at **12:00 UTC**, and it also runs when the calculator or processing scripts change.
- Each run downloads FCC ULS weekly complete license archives and generates `manifest.json` plus per-state JSON records.
- When opening the hosted calculator, it checks `manifest.json`, downloads the selected state as needed, and caches that state in the browser for offline access.
- If a state has not changed, the cached copy is reused. Imported local project data and KML selection remain separate.
- FCC **P25-compatible license emissions do not prove an active on-air P25 site**. Verify licensing and real-world transmitters before engineering use.

**Privacy:** GitHub Pages for this public repository is public. Do not commit private customer/project files or confidential radio data.

For technical details see [README_FIRST.md](README_FIRST.md).
