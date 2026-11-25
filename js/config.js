// Change APP_NAME to rename the app inside the interface.
// (The home-screen name comes from manifest.webmanifest and index.html.)
export const APP_NAME = "Plotling";
export const STORAGE_KEY = "mylib.v2";
export const LEGACY_KEY = "mylib.v1"; // the old single-reader save, migrated into the first profile

// Reading levels shown on book cards and in the grown-ups report.
export const LEVELS = {
	1: { name: "Starting out", blurb: "short sentences, everyday words" },
	2: { name: "Growing", blurb: "a mix of short and longer sentences" },
	3: { name: "Confident", blurb: "longer sentences and bigger words" },
};
