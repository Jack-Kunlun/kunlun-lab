interface BrowserGlobals {
  navigator?: {
    clipboard?: {
      writeText?: (text: string) => Promise<void>;
    };
  };
}

export async function copyMarkdown(markdown: string): Promise<void> {
  const browserGlobals: BrowserGlobals = globalThis;
  const clipboard = browserGlobals.navigator?.clipboard;

  if (clipboard === undefined || typeof clipboard.writeText !== "function") {
    throw new Error("Clipboard API is unavailable.");
  }

  await clipboard.writeText(markdown);
}
