# Batwing RF Suite — RF Engineering Toolkit

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

## v1.10 — Batwing RF Suite branding (November 23, 2026)
- Renamed the app from **BDA Channel Planner** to **Batwing RF Suite**, an independent Motorola-inspired RF engineering toolkit with the RF Wizard mascot.
- The original FCC, P25 Site Finder, tower distances, azimuth, terrain profiles, Link Budget, and branching Site Plan tools are unchanged.
- The online URL and GitHub repository name intentionally stay the same to preserve bookmarks and automatic FCC updates.
- Existing browser storage keys and the format of previous project, budget, and Site Plan JSON files remain unchanged for compatibility.
- Offline single-file release: `Batwing_RF_Suite_Evan_Andrew_v1.10_OFFLINE.html`.

## v1.11 — Full workspace pages (November 23, 2026)
- The four main tools—**Channel Planner, P25 Site Finder, Link Budget, and Site Plan**—now live in **separate, full-width pages inside Batwing RF Suite**, selected from a sticky navigation bar.
- No tool is dismissed by clicking outside its content. The former close buttons are now explicit **← Channel Planner** actions; tool-to-tool navigation remains available.
- The desktop navigation is one row; on smaller displays it wraps into two rows. The Channel Planner's project controls appear only on its page.
- The FCC search, budget and DAS plan states stay in memory while switching pages; browser-local storage and JSON export formats are unchanged.
- Small, purpose-specific dialogs—including terrain profiles, mascot artwork, system selection, and channel editing—remain popups.
- You can link directly to `#planner`, `#fcc`, `#budget` or `#siteplan` on the hosted site.
- **Offline single-file build:** `Batwing_RF_Suite_Evan_Andrew_v1.11_OFFLINE.html`. No network required for channel planning, Link Budget, or Site Plan operations.

## v1.12 — Uplink Gain + KMZ/KML import (November 23, 2026)
- **Uplink Gain** is a separate full-width page at #uplink. Enter configured uplink gain, measured tower RSSI at that gain, target tower RSSI, measured isolation, required isolation margin and the tower receiver noise floor with the BDA **OFF** and **ON**.
- **Required gain = current gain + (target tower RSSI − measured tower RSSI)**, assuming the same test location, radio and a linear RF path. The **isolation ceiling = measured isolation − required margin** (20 dB prefilled, editable). A provisional test gain is capped at that ceiling.
- Tower noise rise above the entered tolerance (default 0 dB, unchanged) is marked **STOP**. If the tower noise-floor readings are missing, the result is **planning-only**. Commission against actual AHJ, tower operator and manufacturer criteria; check isolation, oscillation, DAQ and tower-receiver noise.
- Optional input power, donor feeder loss, donor antenna gain and amplifier output limit estimate conducted uplink power and donor EIRP; this is a linear-chain estimate, not a propagation, nonlinearity, or regulatory-compliance model. Settings are stored under a separate browser key BATWING_UPLINK_GAIN_v1.12. CSV export is provided.
- In **P25 Site Finder**, **Import Google Earth KMZ / KML** opens local KMZ or KML files. Point placemarks, lines and polygons are drawn in an offline **coordinate overview** without satellite imagery. Click **Use as site** for an imported Point to set the tower distance/azimuth origin. Imported geometry is not treated as verified FCC data.
- KMZ import works locally in the browser: stored/deflated KML documents can be extracted without uploading the file. KMZ images, 3D assets and remote links are not loaded. Limits: 25 MB compressed file, 16 MB KML, 1,500 geometries, 40,000 coordinate vertices. The importer requires native browser raw-deflate decompression for compressed KMZ; plain KML is an alternative. Imports are session-only and cleared on page refresh.
- The hosted GitHub Pages workflow includes uplink_gain.js and kmz_import.js. All legacy project, FCC, budget, and Site Plan storage keys and file formats remain unchanged. **A v1.12 all-in-one offline HTML build is included:** Batwing_RF_Suite_Evan_Andrew_v1.12_OFFLINE.html (all seven add-on scripts are embedded). Older v1.11 HTML copies will not update themselves. On Android, use the GitHub Pages URL for refreshable access; temporary content:// file links can become invalid after refresh.

## v1.13 — Smart DAS Planner and RF Path / Fresnel Calculator (November 24, 2026)

### Smart DAS Site Planner
- The existing full-page **Site Plan** now includes an optional **RF frequency (MHz)** and a **Smart BOM / Checks** button leading to a full-width engineering panel below the schematic. Drawing, branch calculation, antenna EIRP, local autosave, SVG, RF CSV, and legacy JSON remain unchanged.
- Add your own **manufacturer, model, SKU, specification source, reference frequency, per-unit cost** (or cost per foot for cable), insertion losses, gains, port counts, and available input/output dBm ratings to a locally saved equipment catalog. It supports manufacturer identities such as ADRF, Comba, Fiplex, SOLiD, JMA and CommScope, **but intentionally provides no unverified numerical product specifications or prices**. Mark a model verified only after comparing against an actual datasheet or measurement record.
- Select a physical component in the diagram, choose or enter a matching library model, and click **Apply to selected component**. Cable model assignment keeps that segment's measured length. Changing gain or loss afterward automatically clears its previously confirmed-spec flag.
- The engineering review checks for **unterminated and unused branch outputs**, unverified RF component data, manufacturer power-limit exceedances where rated limits have been entered, physically inconsistent directional-coupler split coefficients, missing server antennas, excess cable-section loss against a user-set threshold, mismatch between catalog reference frequency and project frequency, and user-entered min/max antenna EIRP requirements. These flags are advisory, not code/AHJ approval.
- Exports: **BOM CSV** with grouped component counts and aggregated cable footage, **findings CSV**, and portable **equipment catalog JSON**. Cost totals are partial estimates only when some entries lack prices; unpriced components are labeled as such. Catalog and review settings are stored locally under separate v1.13 keys.
- The original site-plan JSON format remains **BDA-Site-Plan**, with optional new equipment fields; previous project files and storage key **BDA_SITE_PLAN_v1.9** still load.

### RF Path & Fresnel
- From **P25 Site Finder**, enter a job-site address or GPS point, search FCC transmitter sites, then click a tower's **RF Path / Fresnel** (formerly Elevation Profile).
- The original sampled terrain chart and cached profile remain. A separate RF calculation panel requires the **site antenna AGL, FCC-tower antenna AGL, and RF frequency in MHz**. No real-world heights or frequencies are guessed.
- The preview models a straight antenna-to-antenna line, terrain adjusted by effective-Earth-radius curvature, first Fresnel radius along every sampled point, an editable clearance percentage (initial **60%**), editable Earth k-factor (initial **4/3**), worst sampled clearance point, terrain LOS, and Fresnel intrusion. A route with any missing elevation sample is explicitly **incomplete**, not called clear.
- Free-space path loss (dB): **32.45 + 20 log10(distance km) + 20 log10(frequency MHz)** (ITU-R P.525). First Fresnel radius and the clearance screen use standard geometric approximations discussed in ITU-R P.530. Optional transmitter and receiver values can show **hypothetical free-space received power and sensitivity margin**; this does *not* account for diffraction, multipath, foliage, structures, absorption, polarization or clutter. Actual tower parameters and terrestrial site conditions must be field-verified.
- The RF profile has a color-coded SVG chart and **RF path CSV** containing ground elevations, modeled Earth bulge, the straight antenna line, Fresnel radius, terrain clearance, and Fresnel margin at the sampled points.
- Newly fetched terrain still requires network access; previously cached terrain profiles can be recalculated offline. Path data are not automatically saved as a customer project.

**Deployment and offline files:** GitHub Pages includes **smart_site_plan.js** and **rf_path.js**, loaded after the workspace page navigation. Offline single HTML: **Batwing_RF_Suite_Evan_Andrew_v1.13_OFFLINE.html** (includes all nine add-on scripts and no external JavaScript file dependency). Existing FCC online downloads still require internet access, and local Android content:// file links may not survive a browser refresh; use the HTTPS GitHub Pages URL when possible.

**Engineering disclaimer:** Outputs are planning aids. Use actual AHJ / code requirements, measured system response, approved tower limits, certified manufacturer specifications and commissioning checks. A Fresnel-clear ground profile does not prove a usable or licensed radio path.
