/**
 * Root Layout
 * 
 * Sets up:
 * - Google Fonts (Inter)
 * - Styled-components SSR registry
 * - HTML metadata
 */
import type { Metadata } from 'next';
import StyledComponentsRegistry from '@/lib/registry';

export const metadata: Metadata = {
  title: 'Diagram Studio — Visual Diagramming Tool',
  description:
    'Production-grade diagramming application built with @joint/core and React. Create flowcharts, BPMN diagrams, topology maps, and more.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Google Fonts: Inter */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <StyledComponentsRegistry>{children}</StyledComponentsRegistry>
      </body>
    </html>
  );
}
