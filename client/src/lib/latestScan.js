/**
 * The most recent scan, cached in the browser so the Analytics page renders without a round trip.
 * Browser-local, so it is wiped on sign-out: the next account to use this browser must not be able
 * to read the previous one's resume feedback.
 */
const LATEST_SCAN_KEY = 'resumon_latest_scan';

export function saveLatestScan(scan) {
  try {
    localStorage.setItem(LATEST_SCAN_KEY, JSON.stringify(scan));
  } catch {
    // Storage blocked or full — the scan is still shown on the results page.
  }
}

export function loadLatestScan() {
  try {
    const raw = localStorage.getItem(LATEST_SCAN_KEY);

    return raw ? JSON.parse(raw) : null;
  } catch {
    return null; // Unreadable or malformed: treat it as no scan yet.
  }
}

export function clearLatestScan() {
  try {
    localStorage.removeItem(LATEST_SCAN_KEY);
  } catch {
    // Nothing stored to begin with.
  }
}
