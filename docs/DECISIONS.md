# Decision Log (ADR)

## ADR-001: Local desktop app, not hosted web app

**Decision:** Local Electron app, not Vercel/Render.

**Why:** YouTube blocks downloads from datacenter/cloud IPs. Residential IPs (user's machine) work reliably. Hosted app would need paid residential proxies (~$10–50/mo), breaking the "zero ongoing cost" requirement. The user's machine is also where the iPod plugs in.

## ADR-002: Electron + TypeScript, not Python/C/Rust

**Decision:** Electron + TypeScript.

**Why:** The perf-critical work (transcode) is in ffmpeg (C). Downloads are network-bound. Another language would not be faster. Python's one-click packaging (PyInstaller) has flaky antivirus false-positives, losing on the top priority (effortless install). Electron gives reliable one-click installers via electron-builder and single-language (TS) end-to-end.

## ADR-003: yt-dlp as the only download + auth tool

**Decision:** yt-dlp handles both library fetch (--cookies-from-browser) and audio download.

**Why:** Avoids a separate auth library (ytmusicapi/Python). yt-dlp supports both cookie-based auth and flat-playlist dump, so no Selenium needed.

## ADR-004: No Selenium

**Decision:** Rejected Selenium for discovery or auth.

**Why:** Slow, fragile (breaks on DOM changes), bundles a whole browser, and still cannot produce audio. yt-dlp with browser cookies is faster and more reliable.

## ADR-005: Google Takeout CSV + exact Video IDs

**Decision:** Primary import path is Takeout CSV with exact Video IDs.

**Why:** Exact IDs = no fuzzy search/matching ambiguity. User gets precisely the tracks they saved. No search API key required.

## ADR-006: 256 kbps MP3 default

**Decision:** Default 256 kbps CBR MP3.

**Why:** YouTube Music source is ~128–256 kbps. Higher would be cosmetic upsampling. 256 kbps is the sweet spot — transparent quality, iPod-compatible.

## ADR-007: ID3v2.3 tags

**Decision:** Force ID3v2.3 via `--ppa "EmbedThumbnail+ffmpeg_o:-id3v2_version 3"`.

**Why:** iPod/iTunes compatibility. ID3v2.4 is not reliably recognized by older iPod firmware. v2.3 is universally supported.

## ADR-008: Unsigned installer + published SHA-256

**Decision:** Ship unsigned installers; publish SHA-256 checksums.

**Why:** Code signing costs $99+/yr (Windows EV cert) or Apple Developer Program. This is a personal, zero-cost tool. SHA-256 checksums allow users to verify integrity. Users accept a one-time OS warning.

## ADR-009: No telemetry

**Decision:** Zero telemetry, zero analytics.

**Why:** Privacy, trust, and simplicity. No external services means no API keys, no cost, no data exposure.

## ADR-010: Original pixel art only for visual theme

**Decision:** Retro XP-style theme uses original pixel art — no Microsoft Bliss photo, no real brand logos.

**Why:** IP/trademark risk. Original pixel-art homage is safe. Real Bliss or Apple/Google logos would be infringing.
