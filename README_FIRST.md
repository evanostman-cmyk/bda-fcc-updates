# BDA Channel Planner — automatic weekly FCC updates

The calculator retains the original channel-planning, FCC search, tower selection and KML export tools.
New: automatic online manifest checks and state-by-state downloads with offline caching.

## Initial setup (once)

1. Create a **public GitHub repository**, such as `bda-fcc-updates`. Keep the contents of this folder at the repository root: `index.html`, `scripts`, and `.github/workflows/publish_fcc.yml`.
2. On GitHub, go to **Settings → Pages → Build and deployment → Source → GitHub Actions**.
3. In **Actions**, find **Refresh and publish FCC database** and click **Run workflow**. (A push to `main` also starts the workflow.)
4. When the workflow finishes successfully, open `https://YOURNAME.github.io/bda-fcc-updates/`. This is your hosted calculator. **No link needs to be configured** when you use the hosted page.
5. If you prefer your existing locally saved `.html` calculator, open that file and paste `https://YOURNAME.github.io/bda-fcc-updates/manifest.json` into **Automatic FCC updates**, then choose **Save & check now**.

## Ongoing operation

- The GitHub Actions workflow runs every **Monday at 12:00 UTC**, after the weekly FCC bulk files are normally produced. It downloads the FCC ULS land-mobile private, commercial, and broadcast-auxiliary complete LICENSE archives.
- It filters for **FCC-authorized P25-compatible emissions** and publishes GPS coordinates from FCC location records when available.
- The calculator checks the published manifest on opening (unless you uncheck automatic updates). If a state changed, it downloads just that state when selected; the state is cached in browser storage for offline use.
- A failed update does not overwrite the previous cached state; a failed GitHub build will not deploy a partial snapshot. Selected tower KML exports and channel plans remain separate.
- Since browser caches are tied to the address used, a file opened from your computer and the hosted webpage have **separate** browser storage. Export/back up your projects as needed.

## Important restrictions

- **The FCC data itself is public.** A PUBLIC GitHub Pages site, however, can be viewed by anyone who knows the URL. Do not publish proprietary project files or private site details.
- GitHub must be connected/configured by you; this package does **not** automatically publish itself or enable an online service.
- The first successful GitHub Actions build needs access to FCC servers and can take substantial time. Large downloads may be subject to FCC/GitHub temporary limits; check Actions logs if a build fails.
- Licensed P25-compatible emissions are **not** proof of an on-air P25 site, a control-channel assignment, or interoperability with a particular DAS/BDA. Confirm the current license, channel, and AHJ requirements.
- Geographic pins are taken from ULS licensed coordinates; not all records have them. They are **not approximated** from city names.

## Files
- `index.html` — fully functioning channel planner with auto-updates and KML tower selection.
- `scripts/fcc_builder.py` — adapted original nationwide FCC builder, now extracting ULS LO.dat GPS coordinates.
- `scripts/build_hosted.py` — weekly full snapshot downloader and per-state manifest generator.
- `.github/workflows/publish_fcc.yml` — scheduled build and deploy to GitHub Pages.

## FCC source reference
- https://www.fcc.gov/uls/transactions/daily-weekly
- https://data.fcc.gov/download/pub/uls/complete/