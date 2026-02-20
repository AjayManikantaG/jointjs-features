/**
 * Home Page
 * 
 * Renders the DiagramApp client component.
 * Uses 'use client' because next/dynamic with ssr:false
 * requires a Client Component in Next.js App Router.
 */
'use client';

import dynamic from 'next/dynamic';

// Dynamic import with SSR disabled — @joint/core needs the browser DOM
const DiagramApp = dynamic(() => import('@/diagram/DiagramApp'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        width: '100vw',
        background: '#0D0D0F',
        color: '#9B9BA4',
        fontFamily: "'Inter', sans-serif",
        fontSize: '14px',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.4 }}>⬡</div>
        <div>Loading Diagram Studio…</div>
      </div>
    </div>
  ),
});

export default function Home() {
  return <DiagramApp />;
}
