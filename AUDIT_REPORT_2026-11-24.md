# Batwing RF Suite — Double Audit Report
Date: 2026-11-24
Target: GitHub repository evanostman-cmyk/bda-fcc-updates, Batwing v1.14

## Scope and method

**Pass 1: static integrity and integration**
- Read the actual GitHub source: index.html, all 10 external JavaScript modules, scripts/fcc_builder.py, scripts/build_hosted.py, GitHub Actions publishing workflow, and README.
- Syntax-checked the main HTML's inline JavaScript and all 10 external JS modules.
- Checked workspace page definitions, DOM ID references, external script load ordering, and GitHub Pages build copy entries.
- Checked FCC import paths, streaming-state storage, status and caching logic; reviewed the Python FCC archive-processing and hosted-manifest pipeline.
- Reviewed offline HTML packaging, browser storage keys and compatibility with previously saved data.

**Pass 2: calculations, data loss, and edge cases**
- Tested actual source functions for cascaded link-budget dBm/EIRP, uplink gain/noise/isolation limits, splitter and cable-loss propagation, user-entered hardware ratings, Fresnel/curvature and free-space loss, and per-floor coverage scoring.
- Executed 38 synchronous source-based regression checks and 1,050 additional deterministic calculation/scoring cases in the auditor environment; no failures in those checks.
- Added scripts/audit_suite.cjs to the repository, with 40 intended checks (38 synchronous plus stored/deflated KMZ archive tests under Node 22). GitHub Actions now runs that suite before publishing; the two Node KMZ tests require observing the Actions result to confirm they execute successfully in CI.
- Tested the KMZ archive extractor against a synthetic stored ZIP entry previously; actual Android device KMZ/KML files are not yet tested.

## Defects found and fixed

1. **Unsaved coverage-grid edits lost when switching cells.** The Coverage Survey now saves dirty cell readings on valid navigation, including changing floors, previous/next, other suite tabs, export, printing, and closing. Invalid readings or exclusions without written reasons block navigation. A beforeunload warning protects uncommitted edits during browser refresh.
2. **Incorrect tower noise-floor acceptance.** The uplink calculator previously checked only whether tower noise rose. A substantial negative ON/OFF change (for example −120 to −125 dBm) was accepted as unchanged. The calculation now uses the **absolute noise-floor difference** against the operator-entered tolerance and withholds a proposed gain for out-of-tolerance changes.
3. **Compact nationwide FCC imports incorrectly rejected.** A JSON file under 55 MB but containing more than 200,000 rows was incorrectly routed through the smaller FCC importer. JSON objects containing a records array now switch to the streaming nationwide IndexedDB importer regardless of whether the file exceeds 55 MB.
4. **No automated regression gate.** Added the source-based audit suite and Python syntax checks to the GitHub Pages publish workflow, before FCC downloading/deployment.
5. **Outdated deployment jobs queued.** Changed the GitHub Actions Pages concurrency setting to cancel obsolete in-progress jobs when a newer deployment is requested; removed a duplicated file trigger.
6. **Channel Planner exported a physically non-covering filter.** A selected filter narrower than the assumed occupied channel was only warned about, yet a plan export could still proceed. The planner now blocks the export when any calculated filter is flagged 'Too narrow' or 'Coverage', with a specific explanatory message.

## Calculation and workflow findings

- **Channel Planner:** Fixed-width grouping logic, rounding to a filter center, occupied-bandwidth checks, slot/mode warnings, repeated frequencies and conflicting uplink-pair detection were reviewed. The *Smart/Low Delay* grouping is currently a **narrow-first greedy heuristic**, **not** guaranteed to use the minimum possible number of filters; it appropriately warns when filters wider than 75 kHz are involved. Do not assume algorithmic optimality or validated hardware group delay.
- **Link Budget:** Correct for tested dBm/dBW/W conversion examples, cascaded gains/losses and calculated antenna EIRP. The schematic is linear and does not model compression or transmitter limits unless user-specified elsewhere.
- **Site Plan / Smart DAS:** Test branches correctly propagate ideal splitter loss, extra insertion loss, cable loss and antenna gain; the warning engine identifies unverified parts, cable loss thresholds, unused ports, mismatched frequency specs, and entered power/EIRP limits.
- **Uplink Gain:** Test cases cover a clean noise baseline, increased/decreased tower noise, isolation-ceiling clipping and missing field readings. All recommendations remain provisional subject to tower operator/DAQ/AHJ testing.
- **RF Path:** Tested flat, terrain-obstructed, missing-elevation and degenerate-distance paths, first Fresnel-zone geometry, Earth curvature and FSPL. The model does not account for trees, buildings, clutter, diffraction, interference or real-world multipath.
- **Coverage Survey:** Tested untested cells, complete/failing runs, critical-only floors, exclusions with/without reasons, incomplete uplink samples, missing criteria, and floor-by-floor pass targets. Excluded cells require a documented reason; all included untested cells count in the denominator. This is not an AHJ approval certificate.
- **KMZ/KML:** The extraction design restricts archive/KML size and reads local geometry without uploading it. The Node CI archive tests cover stored and raw-deflate-compressed entries; full UI interaction and common GIS export variations still require manual test files.
- **FCC data:** FCC ULS entries describe licensed P25-compatible emissions, **not proof** of operational control channels. Coordinates, transmitter activation and site conditions require confirmation.

## Remaining risks and items that need manual validation

1. **Live website and device smoke testing not independently verified.** Verify the latest GitHub Pages deployment is successful and run the click-through workflow on Chrome desktop and Android, including refresh, switching pages with unsaved coverage readings, printing, and reading saved data after restart. A temporary Android `content://` URL can still fail after refresh; prefer the HTTPS site link.
2. **Coverage floor plans require PNG/JPEG/WebP.** PDFs must be rasterized externally; uploaded grid overlays are not automatically georeferenced. Equal rectangular test cells are not the same as a validated AHJ floor-area sampling plan.
3. **Large FCC database and GIS performance.** The complete ULS database and large KMZ files have not been stress-tested in a real mobile browser during this audit.
4. **GitHub Pages builds still depend on fresh FCC bulk-download availability for each publish.** Outdated runs now cancel, but an FCC outage could block a UI release. Separating weekly FCC refresh from UI deploy would be a good operational follow-up.
5. **Specifications and code criteria must be supplied by an engineer or AHJ.** Manufacturer-specific gain/output and legal coverage targets cannot be inferred safely from the software alone.
6. **Automated tests are predominantly pure-function and source-integrity checks.** They do not guarantee all browser event paths, styling/layout, offline browser quotas or actual RF instrument behavior.

## Recommended manual acceptance checklist

- Launch online page and verify all six workspace tabs.
- Change Site Plan branch losses and confirm both RF CSV and Smart BOM agree with the schematic.
- Open Site Finder with known GPS coordinate and FCC tower, request a terrain profile, set both AGL heights and frequency, inspect Fresnel chart.
- Import a small real-world KMZ with Points and LineStrings; choose a point and verify bearing/distance.
- In Coverage Survey, upload an image plan, enter partial cell values, switch tabs or floors, return and confirm readings saved; verify invalid values block switching. Mark a critical square, test a failed reading, export JSON/CSV/HTML; refresh and reopen project.
- Confirm the GitHub Actions audit job and Pages publish steps complete successfully. Review log for compressed KMZ and Python syntax results.
- Print HTML report as PDF on desktop and Android; confirm floor images, dates and test values.

No existing customer survey projects, FCC imported data, or field measurements were altered by the audit. Changes were made only to GitHub source and tests.
