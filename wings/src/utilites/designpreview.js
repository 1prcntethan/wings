export function designPreviewRequested() {
  return (
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("preview") === "1"
  );
}

export async function loadDesignPreview() {
  if (!import.meta.env.DEV) return null;
  if (!designPreviewRequested()) return null;
  return import("./designpreview-data.js");
}
