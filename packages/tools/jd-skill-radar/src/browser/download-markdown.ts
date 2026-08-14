interface DownloadGlobals {
  document?: Document;
  Blob?: typeof Blob;
  URL?: {
    createObjectURL?: (object: Blob | MediaSource) => string;
    revokeObjectURL?: (url: string) => void;
  };
}

export function downloadMarkdown(markdown: string, filename: string): void {
  const browserGlobals: DownloadGlobals = globalThis;

  if (
    browserGlobals.document === undefined ||
    browserGlobals.Blob === undefined ||
    typeof browserGlobals.URL?.createObjectURL !== "function" ||
    typeof browserGlobals.URL.revokeObjectURL !== "function"
  ) {
    throw new Error("Download API is unavailable.");
  }

  const blob = new browserGlobals.Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const anchor = browserGlobals.document.createElement("a");
  const url = browserGlobals.URL.createObjectURL(blob);

  try {
    anchor.href = url;
    anchor.download = filename;
    anchor.hidden = true;
    browserGlobals.document.body.append(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    browserGlobals.URL.revokeObjectURL(url);
  }
}
