/**
 * CanvasScrollbars.tsx
 *
 * Custom scrollbar overlays for the diagram canvas.
 * Uses requestAnimationFrame polling + graph.getBBox() for reliable tracking.
 */
'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { dia } from '@joint/core';

// ============================================================
// CONSTANTS
// ============================================================

const BAR_SIZE = 10;
const MIN_THUMB = 30;
const CONTENT_PAD = 200;
const TRACK_INSET = 3;

// ============================================================
// COMPONENT
// ============================================================

interface Props {
  paper: dia.Paper;
  graph: dia.Graph;
}

export default function CanvasScrollbars({ paper, graph }: Props) {
  const hTrackRef = useRef<HTMLDivElement>(null);
  const vTrackRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  const [hThumb, setHThumb] = useState({ left: 0, width: 0, show: false });
  const [vThumb, setVThumb] = useState({ top: 0, height: 0, show: false });
  const [activeDrag, setActiveDrag] = useState<'h' | 'v' | null>(null);
  const dragRef = useRef<{
    axis: 'h' | 'v';
    startMouse: number;
    startTx: number;
    startTy: number;
    pxPerScroll: number;
  } | null>(null);

  // ── Core calculation using graph.getBBox() ─────────────────
  const recalc = useCallback(() => {
    if (!paper || !graph) return;

    const el = paper.el as HTMLElement;
    const viewW = el.clientWidth;
    const viewH = el.clientHeight;
    if (viewW === 0 || viewH === 0) return;

    // Use graph.getBBox() for model-coordinate content bounds
    const elements = graph.getElements();
    if (elements.length === 0) {
      setHThumb(t => ({ ...t, show: false }));
      setVThumb(t => ({ ...t, show: false }));
      return;
    }

    const bbox = graph.getBBox();
    if (!bbox || bbox.width === 0 && bbox.height === 0) {
      setHThumb(t => ({ ...t, show: false }));
      setVThumb(t => ({ ...t, show: false }));
      return;
    }

    const scale = paper.scale().sx;
    const { tx, ty } = paper.translate();

    // Content area with padding (model coords)
    const cx = bbox.x - CONTENT_PAD;
    const cy = bbox.y - CONTENT_PAD;
    const cw = bbox.width + CONTENT_PAD * 2;
    const ch = bbox.height + CONTENT_PAD * 2;

    // Content in screen pixels
    const totalW = cw * scale;
    const totalH = ch * scale;

    // Viewport in model coords
    const vpX = -tx / scale;
    const vpY = -ty / scale;
    const vpW = viewW / scale;
    const vpH = viewH / scale;

    // ── Horizontal ──
    const hTrackLen = hTrackRef.current?.clientWidth || (viewW - 30);
    const showH = totalW > viewW + 5;
    if (showH && hTrackLen > 0) {
      const thumbW = Math.max(MIN_THUMB, Math.min(hTrackLen, (vpW / cw) * hTrackLen));
      const scrollRange = cw - vpW;
      const ratio = scrollRange > 0 ? Math.max(0, Math.min(1, (vpX - cx) / scrollRange)) : 0;
      setHThumb({ left: ratio * (hTrackLen - thumbW), width: thumbW, show: true });
    } else {
      setHThumb(t => ({ ...t, show: false }));
    }

    // ── Vertical ──
    const vTrackLen = vTrackRef.current?.clientHeight || (viewH - 30);
    const showV = totalH > viewH + 5;
    if (showV && vTrackLen > 0) {
      const thumbH = Math.max(MIN_THUMB, Math.min(vTrackLen, (vpH / ch) * vTrackLen));
      const scrollRange = ch - vpH;
      const ratio = scrollRange > 0 ? Math.max(0, Math.min(1, (vpY - cy) / scrollRange)) : 0;
      setVThumb({ top: ratio * (vTrackLen - thumbH), height: thumbH, show: true });
    } else {
      setVThumb(t => ({ ...t, show: false }));
    }
  }, [paper, graph]);

  // ── Polling ───────────────────────────────────────────────
  useEffect(() => {
    if (!paper || !graph) return;

    let running = true;
    let prev = { tx: NaN, ty: NaN, s: NaN, n: -1 };

    const tick = () => {
      if (!running) return;
      const { tx, ty } = paper.translate();
      const s = paper.scale().sx;
      const n = graph.getCells().length;
      if (tx !== prev.tx || ty !== prev.ty || s !== prev.s || n !== prev.n) {
        prev = { tx, ty, s, n };
        recalc();
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    // Initial
    setTimeout(recalc, 200);
    rafRef.current = requestAnimationFrame(tick);

    const onChange = () => recalc();
    graph.on('change:position', onChange);
    graph.on('change:size', onChange);
    window.addEventListener('resize', recalc);

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
      graph.off('change:position', onChange);
      graph.off('change:size', onChange);
      window.removeEventListener('resize', recalc);
    };
  }, [paper, graph, recalc]);

  // ── Drag ──────────────────────────────────────────────────
  const onThumbDown = useCallback((axis: 'h' | 'v', e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!paper || !graph) return;

    const { tx, ty } = paper.translate();
    const scale = paper.scale().sx;
    const el = paper.el as HTMLElement;
    const viewW = el.clientWidth;
    const viewH = el.clientHeight;

    const bbox = graph.getBBox();
    if (!bbox) return;

    const cw = bbox.width + CONTENT_PAD * 2;
    const ch = bbox.height + CONTENT_PAD * 2;
    const totalW = cw * scale;
    const totalH = ch * scale;

    if (axis === 'h') {
      const trackLen = hTrackRef.current?.clientWidth || viewW;
      const thumbW = Math.max(MIN_THUMB, (viewW / totalW) * trackLen);
      const usable = trackLen - thumbW;
      dragRef.current = {
        axis: 'h', startMouse: e.clientX, startTx: tx, startTy: ty,
        pxPerScroll: usable > 0 ? (totalW - viewW) / usable : 0,
      };
    } else {
      const trackLen = vTrackRef.current?.clientHeight || viewH;
      const thumbH = Math.max(MIN_THUMB, (viewH / totalH) * trackLen);
      const usable = trackLen - thumbH;
      dragRef.current = {
        axis: 'v', startMouse: e.clientY, startTx: tx, startTy: ty,
        pxPerScroll: usable > 0 ? (totalH - viewH) / usable : 0,
      };
    }
    setActiveDrag(axis);
  }, [paper, graph]);

  useEffect(() => {
    if (!activeDrag) return;
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d || !paper) return;
      if (d.axis === 'h') {
        const delta = (e.clientX - d.startMouse) * d.pxPerScroll;
        paper.translate(d.startTx - delta, d.startTy);
      } else {
        const delta = (e.clientY - d.startMouse) * d.pxPerScroll;
        paper.translate(d.startTx, d.startTy - delta);
      }
    };
    const onUp = () => { setActiveDrag(null); dragRef.current = null; };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [activeDrag, paper]);

  // ── Inline styles (no styled-components dependency) ───────
  const trackBaseH: React.CSSProperties = {
    position: 'absolute',
    bottom: TRACK_INSET,
    left: TRACK_INSET,
    right: TRACK_INSET + BAR_SIZE + 6,
    height: BAR_SIZE,
    borderRadius: BAR_SIZE,
    zIndex: 50,
    pointerEvents: 'auto',
    display: hThumb.show ? 'block' : 'none',
  };

  const trackBaseV: React.CSSProperties = {
    position: 'absolute',
    right: TRACK_INSET,
    top: TRACK_INSET,
    bottom: TRACK_INSET + BAR_SIZE + 6,
    width: BAR_SIZE,
    borderRadius: BAR_SIZE,
    zIndex: 50,
    pointerEvents: 'auto',
    display: vThumb.show ? 'block' : 'none',
  };

  const thumbStyle = (active: boolean): React.CSSProperties => ({
    position: 'absolute',
    borderRadius: BAR_SIZE,
    background: active ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.25)',
    cursor: 'pointer',
    transition: active ? 'none' : 'background 0.15s',
  });

  return (
    <>
      <div ref={hTrackRef} style={trackBaseH}>
        <div
          style={{
            ...thumbStyle(activeDrag === 'h'),
            left: hThumb.left,
            width: hThumb.width,
            top: 0,
            height: '100%',
          }}
          onMouseDown={(e) => onThumbDown('h', e)}
        />
      </div>

      <div ref={vTrackRef} style={trackBaseV}>
        <div
          style={{
            ...thumbStyle(activeDrag === 'v'),
            top: vThumb.top,
            height: vThumb.height,
            left: 0,
            width: '100%',
          }}
          onMouseDown={(e) => onThumbDown('v', e)}
        />
      </div>
    </>
  );
}
