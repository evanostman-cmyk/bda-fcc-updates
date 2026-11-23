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

## v1.4 — Terrain elevation profiles (November 23, 2026)
- In **P25 Site Finder**, set your job-site address or GPS coordinates and click **Find towers**.
- For any mapped FCC transmitter, select **⛰ Elevation profile** to see a popup terrain profile along the geodesic site-to-tower path.
- Available actions: inspect elevations with the chart cursor, export ground-path **KML**, export sampled **CSV**.
- Selected KML towers also have a **Profile** button.
- Terrain is requested on demand from Open Topo Data (USGS NED / SRTM), with a USGS 3DEP EPQS fallback; this requires an internet connection for a new path.
- Previously viewed profiles are cached locally in the browser (up to 24 routes) for possible offline reuse. Cache availability depends on browser storage.
- **Important:** The profile is *sampled ground elevation*, not an RF line-of-sight or Fresnel clearance report. It does not model AGL antenna heights, obstructions, trees, buildings, Earth curvature or propagation. FCC license coordinates do not prove an on-air transmitter.
- **Offline HTML:** `BDA_Channel_Planner_Evan_Andrew_v1.4_OFFLINE.html` is a standalone single-file build and does not require the separate elevation script.

## v1.5 — Site-to-tower true azimuth (November 23, 2026)
- After entering an address or GPS reference under P25 Site Finder, mapped tower cards show **Azimuth from site → tower**, alongside FCC GPS and distance.
- Bearings are **initial great-circle bearings clockwise from true north**, shown in decimal degrees and 16-point compass notation (e.g. 089.8°T (E)).
- Selected KML tower chips include their true azimuth, and the elevation popup includes an azimuth metric even before terrain data loads.
- This is **not a magnetic bearing**. Apply local magnetic declination for magnetic compass alignment; FCC tower coordinates and license data remain subject to field verification.
- Offline release: `BDA_Channel_Planner_Evan_Andrew_v1.5_OFFLINE.html`.

## v1.6 — RF Link Budget / EIRP checkpoints (November 23, 2026)
- **⚡ Link Budget** appears directly next to **⌕ P25 Site Finder** in the top navigation; dialogs can switch between the two tools.
- Enter TX conducted power in **dBm, dBW, or W**; changing input units preserves the original physical power.
- Add, edit, copy, reorder, and remove up to **250 user-defined gain/loss components**. Presets for coax, connectors, couplers, splitters, and amplifiers start at **0 dB** and must be populated with real manufacturer or measured data.
- Every checkpoint shows running **conducted power in dBm/dBW** plus **EIRP if the reference antenna were connected at that point** in dBm/dBW. Choose any checkpoint for a pinned readout; an interactive power-chain chart shows both values.
- Antenna gain can be entered in **dBi or dBd** (dBd + 2.15 dB = dBi). The final EIRP is the conducted output after all components plus antenna gain.
- Save budgets in browser storage; export/import a standalone **JSON** budget or export a stage-by-stage **CSV**. The Link Budget does not require internet access, an FCC database, or GitHub.
- **Engineering distinction:** intermediate EIRP values are hypothetical until an antenna is actually connected at that point; this is a **TX conducted power and EIRP chain** tool, not a received-power/FSPL, Fresnel-zone or path-propagation calculator. Enter the correct single-channel or aggregate source power. The default 30 dBm and 0 dBi values are **placeholders**, not design assumptions.
- Offline release: `BDA_Channel_Planner_Evan_Andrew_v1.6_OFFLINE.html` (single self-contained HTML file).

## v1.7 — Watts at every checkpoint (November 23, 2026)
- The selected Link Budget checkpoint displays **conducted dBm / dBW / W** and **prospective EIRP dBm / dBW / W**.
- Every stage in the power-chain results table includes **Conducted W** and **EIRP W** columns, and the CSV export includes those numeric watt columns.
- The transmitter and antenna calculations are unchanged; watts are derived using `W = 10^((dBm - 30)/10)`.
- Watts are shown explicitly in W at the checkpoint, including very small powers in scientific notation when needed.
- **Saved v1.6 budgets remain available**: v1.7 intentionally uses the same browser storage key, and v1.6 JSON budget files can still be imported.
- Offline release: `BDA_Channel_Planner_Evan_Andrew_v1.7_OFFLINE.html`.

## v1.8 — Inspector row deletion and footer layout (November 23, 2026)
- The Link Budget modal uses a vertically constrained, flex-column layout: its footer actions stay inside the viewport while the editable budget body scrolls.
- In **Section 4: Inspect EIRP at any point**, editable gain/loss checkpoints now have a **× Delete** action beside **Inspect**. Removing the checkpoint deletes the corresponding component from the source power chain and recomputes downstream conducted power and EIRP, including dBm, dBW, W, chart, and CSV.
- The **TX output/source** and **final reference antenna** rows are fixed endpoints and cannot be deleted.
- **Undo last deletion** restores the most recently deleted component to its previous position.
- Both original component-table row deletion and the new inspector deletion update the same saved browser budget. Storage key remains unchanged, so previously saved v1.6/v1.7 budgets continue to load.
- Offline file: `BDA_Channel_Planner_Evan_Andrew_v1.8_OFFLINE.html`

## v1.9 — Branching DAS Site Plan (November 23, 2026)
- **🗺 Site Plan** now appears beside **⚡ Link Budget** and **⌕ P25 Site Finder**. It opens a fully offline, interactive SVG **signal-flow schematic**, not a geographic building map.
- Starting with a single conducted TX/BDA source, click a diagram component to **add or insert** a **2–8 way splitter**, **directional coupler**, **coax cable**, **amplifier**, **attenuator/loss**, **connector** or **server antenna**.
- A splitter creates its output port branches automatically. Each equal splitter output starts at **input − 10 log10(port count) − entered excess insertion loss**, in dB. A directional coupler creates separate **through** and **tap** paths with user-entered losses.
- Coax sections use **length (feet) × manufacturer/measurement loss (dB per 100 ft) / 100**. Every branch carries its own running conducted power in **dBm, dBW and W**; antenna endpoints additionally show **EIRP = conducted dBm + antenna dBi**.
- Click any node for its path, input/output power, stage delta, and **hypothetical EIRP with the user-entered test antenna**; edit its parameters or insert a new device on the selected branch.
- Supports selective deletion, one-level **Undo delete**, loading a two-wing sample network, copying TX source power from the existing linear Link Budget, diagram zoom, **SVG schematic export**, **per-element CSV**, standalone **JSON save/load**, and browser-local saving.
- **Engineering limitations:** a preliminary **single-input TX distribution-tree** model, not a floor plan or real map. It excludes reflected power, PIM, RF exposure, antenna patterns, coverage, Fresnel/LOS, split mismatch, power-combining, and hardware ratings. Default non-splitter device losses/gains are **0 dB placeholders**: use actual manufacturer specs and field measurements. Cable attenuation varies with frequency; the operator must enter the correct value. The displayed EIRP at intermediate non-antenna nodes is a hypothetical test-antenna value.
- **Offline single HTML:** `BDA_Channel_Planner_Evan_Andrew_v1.9_OFFLINE.html`. The new site planner works without internet and without FCC data.
