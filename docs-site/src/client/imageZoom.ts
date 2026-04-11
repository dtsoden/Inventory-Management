// Click any docs image (or rendered Mermaid SVG) to open it in a fullscreen
// modal with pan and zoom. Plain DOM, no React, no extra dependencies.

import ExecutionEnvironmentZoom from '@docusaurus/ExecutionEnvironment';

interface ZoomState {
  scale: number;
  x: number;
  y: number;
  dragging: boolean;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
}

const MIN_SCALE = 0.25;
const MAX_SCALE = 12;

function injectStyles() {
  if (document.getElementById('docs-image-zoom-styles')) return;
  const style = document.createElement('style');
  style.id = 'docs-image-zoom-styles';
  style.textContent = `
    .docs-zoomable { cursor: zoom-in; }
    .docs-zoom-overlay {
      position: fixed; inset: 0; z-index: 9999;
      background: rgba(0,0,0,0.92);
      display: flex; align-items: center; justify-content: center;
      animation: docs-zoom-fade 0.15s ease-out;
    }
    .docs-zoom-stage {
      position: absolute; inset: 0;
      overflow: hidden; cursor: grab;
      touch-action: none;
    }
    .docs-zoom-stage.dragging { cursor: grabbing; }
    .docs-zoom-content {
      position: absolute; top: 50%; left: 50%;
      transform-origin: center center;
      will-change: transform;
      max-width: none; max-height: none;
      user-select: none; -webkit-user-drag: none;
    }
    .docs-zoom-content img, .docs-zoom-content svg {
      display: block; max-width: none; max-height: none;
      width: auto; height: auto;
    }
    .docs-zoom-toolbar {
      position: fixed; top: 16px; right: 16px; z-index: 10000;
      display: flex; gap: 6px; align-items: center;
      background: rgba(20,20,20,0.85);
      border: 1px solid rgba(255,255,255,0.15);
      padding: 6px 10px; border-radius: 999px;
      color: white; font: 14px/1.2 system-ui, -apple-system, sans-serif;
      backdrop-filter: blur(8px);
    }
    .docs-zoom-toolbar button {
      background: transparent; border: 0; color: white;
      cursor: pointer; padding: 6px 10px; border-radius: 999px;
      font: 14px/1.2 system-ui, -apple-system, sans-serif;
    }
    .docs-zoom-toolbar button:hover { background: rgba(255,255,255,0.12); }
    .docs-zoom-toolbar .scale-readout {
      min-width: 48px; text-align: center;
      font-variant-numeric: tabular-nums;
      opacity: 0.85;
    }
    .docs-zoom-hint {
      position: fixed; bottom: 16px; left: 50%;
      transform: translateX(-50%); z-index: 10000;
      color: rgba(255,255,255,0.6); font: 12px system-ui;
      pointer-events: none;
    }
    @keyframes docs-zoom-fade {
      from { opacity: 0; } to { opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}

function openZoom(source: HTMLImageElement | SVGElement) {
  injectStyles();

  const overlay = document.createElement('div');
  overlay.className = 'docs-zoom-overlay';

  const stage = document.createElement('div');
  stage.className = 'docs-zoom-stage';

  const content = document.createElement('div');
  content.className = 'docs-zoom-content';

  // Clone the source so the original stays put.
  const clone = source.cloneNode(true) as HTMLElement;
  // For SVG (Mermaid), strip the constraining inline width/height so it scales freely.
  if (clone.tagName.toLowerCase() === 'svg') {
    clone.removeAttribute('width');
    clone.removeAttribute('height');
    (clone as HTMLElement).style.width = '90vw';
    (clone as HTMLElement).style.maxWidth = '1600px';
    (clone as HTMLElement).style.height = 'auto';
  }
  content.appendChild(clone);
  stage.appendChild(content);
  overlay.appendChild(stage);

  const toolbar = document.createElement('div');
  toolbar.className = 'docs-zoom-toolbar';
  toolbar.innerHTML = `
    <button data-act="zoom-out" aria-label="Zoom out">−</button>
    <span class="scale-readout">100%</span>
    <button data-act="zoom-in" aria-label="Zoom in">+</button>
    <button data-act="reset" aria-label="Reset">Reset</button>
    <button data-act="close" aria-label="Close">Close</button>
  `;
  overlay.appendChild(toolbar);

  const hint = document.createElement('div');
  hint.className = 'docs-zoom-hint';
  hint.textContent = 'Drag to pan, scroll to zoom, double-click to reset, Esc to close';
  overlay.appendChild(hint);

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  const state: ZoomState = {
    scale: 1, x: 0, y: 0,
    dragging: false, startX: 0, startY: 0, lastX: 0, lastY: 0,
  };

  function apply() {
    content.style.transform = `translate(calc(-50% + ${state.x}px), calc(-50% + ${state.y}px)) scale(${state.scale})`;
    const readout = toolbar.querySelector<HTMLElement>('.scale-readout');
    if (readout) readout.textContent = `${Math.round(state.scale * 100)}%`;
  }

  function reset() {
    state.scale = 1; state.x = 0; state.y = 0;
    apply();
  }

  function close() {
    document.body.style.overflow = '';
    overlay.remove();
    document.removeEventListener('keydown', onKey);
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') close();
    if (e.key === '0') reset();
    if (e.key === '+' || e.key === '=') { state.scale = Math.min(MAX_SCALE, state.scale * 1.2); apply(); }
    if (e.key === '-' || e.key === '_') { state.scale = Math.max(MIN_SCALE, state.scale / 1.2); apply(); }
  }

  document.addEventListener('keydown', onKey);

  toolbar.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const act = target.dataset.act;
    if (act === 'zoom-in') { state.scale = Math.min(MAX_SCALE, state.scale * 1.25); apply(); }
    if (act === 'zoom-out') { state.scale = Math.max(MIN_SCALE, state.scale / 1.25); apply(); }
    if (act === 'reset') reset();
    if (act === 'close') close();
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  stage.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = -e.deltaY;
    const factor = delta > 0 ? 1.1 : 1 / 1.1;
    const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, state.scale * factor));
    // Zoom toward cursor
    const rect = stage.getBoundingClientRect();
    const cx = e.clientX - rect.left - rect.width / 2;
    const cy = e.clientY - rect.top - rect.height / 2;
    const ratio = next / state.scale - 1;
    state.x -= (cx - state.x) * ratio / next * state.scale * (next / state.scale);
    state.y -= (cy - state.y) * ratio / next * state.scale * (next / state.scale);
    state.scale = next;
    apply();
  }, {passive: false});

  stage.addEventListener('pointerdown', (e) => {
    state.dragging = true;
    state.startX = e.clientX;
    state.startY = e.clientY;
    state.lastX = state.x;
    state.lastY = state.y;
    stage.classList.add('dragging');
    stage.setPointerCapture(e.pointerId);
  });

  stage.addEventListener('pointermove', (e) => {
    if (!state.dragging) return;
    state.x = state.lastX + (e.clientX - state.startX);
    state.y = state.lastY + (e.clientY - state.startY);
    apply();
  });

  stage.addEventListener('pointerup', (e) => {
    state.dragging = false;
    stage.classList.remove('dragging');
    stage.releasePointerCapture(e.pointerId);
  });

  stage.addEventListener('dblclick', reset);

  apply();
}

function attach() {
  // Real <img> tags inside doc/article content
  const imgs = document.querySelectorAll<HTMLImageElement>('article img, .markdown img');
  imgs.forEach((img) => {
    if (img.dataset.zoomable === '1') return;
    img.dataset.zoomable = '1';
    img.classList.add('docs-zoomable');
    img.addEventListener('click', () => openZoom(img));
  });

  // Mermaid renders inline SVG
  const svgs = document.querySelectorAll<SVGElement>('.docusaurus-mermaid-container svg, article svg.mermaid');
  svgs.forEach((svg) => {
    if (svg.dataset.zoomable === '1') return;
    svg.dataset.zoomable = '1';
    svg.classList.add('docs-zoomable');
    (svg as unknown as HTMLElement).style.cursor = 'zoom-in';
    svg.addEventListener('click', () => openZoom(svg));
  });
}

if (ExecutionEnvironmentZoom.canUseDOM) {

// Initial attach + re-attach after route changes (Mermaid renders async).
const tick = () => {
  attach();
  setTimeout(attach, 200);
  setTimeout(attach, 800);
};
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', tick);
} else {
  tick();
}
const originalPushStateZoom = history.pushState;
history.pushState = function (...args) {
  const result = originalPushStateZoom.apply(this, args);
  setTimeout(tick, 50);
  return result;
};
window.addEventListener('popstate', () => setTimeout(tick, 50));

} // end if (ExecutionEnvironment.canUseDOM)

export default {};
