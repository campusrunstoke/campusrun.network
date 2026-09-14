/**
 * Placeholder pass artwork. Apple requires at least an icon.png for a pass to be
 * openable; these tiny solid PNGs satisfy that so dev/test passes install. KC's real
 * logo/icon assets replace every entry here without touching the builder.
 */

// 1x1 opaque Ink (#003B5C) PNG — smallest valid image that clears Apple's icon requirement.
const PLACEHOLDER_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNgYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

/** File buffers merged into every generated pass. Keys are the pass-bundle filenames Apple expects. */
export const passAssets: Record<string, Buffer> = {
  "icon.png": PLACEHOLDER_PNG,
  "icon@2x.png": PLACEHOLDER_PNG,
  "logo.png": PLACEHOLDER_PNG,
  "logo@2x.png": PLACEHOLDER_PNG,
};
