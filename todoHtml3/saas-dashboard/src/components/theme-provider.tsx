'use client';

// Light / dark theme provider using next-themes.
// WHAT: Controls the `class` on <html> so Tailwind's `.dark` styles work.
// WHY: Gives users a manual toggle independent of OS settings.

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: React.PropsWithChildren) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}

