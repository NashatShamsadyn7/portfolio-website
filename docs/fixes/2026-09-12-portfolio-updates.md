# Portfolio release-update panel

Date: 12/09/2026

## What changed

- Preserved the existing live portfolio enhancements and added a clearer hero message.
- Added a verified latest-app panel that shows the app name, version, release-notes link, and actual update date in `dd/mm/yyyy` format.
- Added `app-updates.json` as the small, reviewable source of release metadata.
- Made the hero panel responsive and reduced-motion friendly.
- Ensured the release feed is not cached, while documentation and development files are excluded from Firebase Hosting.

## Verification

- JavaScript syntax check passed.
- The local site was inspected in a browser at desktop and mobile widths.
- The release link and timestamp point to the published Nashat TV v1.6 GitHub release.
