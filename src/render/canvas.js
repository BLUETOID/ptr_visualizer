/**
 * SVG Canvas Manager: Pan & Zoom with Cursor-Centered Scaling
 */

export class CanvasManager {
  constructor(svgRootId, viewportId) {
    this.svgRoot = document.getElementById(svgRootId);
    this.viewport = document.getElementById(viewportId);

    this.viewState = { x: 50, y: 30, scale: 1 };
    this.panning = false;
    this.panStart = { x: 0, y: 0 };
    this.viewStart = { x: 0, y: 0 };

    this.initEvents();
  }

  applyTransform() {
    this.viewport.setAttribute(
      'transform',
      `translate(${this.viewState.x}, ${this.viewState.y}) scale(${this.viewState.scale})`
    );
  }

  resetView(defaultX = 60, defaultY = 40, defaultScale = 1) {
    this.viewState = { x: defaultX, y: defaultY, scale: defaultScale };
    this.applyTransform();
  }

  zoomBy(factor, clientX = null, clientY = null) {
    const minScale = 0.25;
    const maxScale = 3.0;
    const newScale = Math.min(maxScale, Math.max(minScale, this.viewState.scale * factor));

    if (clientX !== null && clientY !== null) {
      const rect = this.svgRoot.getBoundingClientRect();
      const mouseX = clientX - rect.left;
      const mouseY = clientY - rect.top;

      // Adjust x and y so the point under cursor remains stationary
      const scaleRatio = newScale / this.viewState.scale;
      this.viewState.x = mouseX - (mouseX - this.viewState.x) * scaleRatio;
      this.viewState.y = mouseY - (mouseY - this.viewState.y) * scaleRatio;
    }

    this.viewState.scale = newScale;
    this.applyTransform();
  }

  initEvents() {
    // Mouse wheel zoom centered on cursor
    this.svgRoot.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.09 : 0.91;
      this.zoomBy(factor, e.clientX, e.clientY);
    }, { passive: false });

    // Drag-to-pan
    this.svgRoot.addEventListener('mousedown', (e) => {
      // Ignore clicks on control buttons if bubbling
      if (e.target.closest('button')) return;
      this.panning = true;
      this.panStart = { x: e.clientX, y: e.clientY };
      this.viewStart = { x: this.viewState.x, y: this.viewState.y };
      this.svgRoot.classList.add('panning');
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.panning) return;
      this.viewState.x = this.viewStart.x + (e.clientX - this.panStart.x);
      this.viewState.y = this.viewStart.y + (e.clientY - this.panStart.y);
      this.applyTransform();
    });

    window.addEventListener('mouseup', () => {
      if (this.panning) {
        this.panning = false;
        this.svgRoot.classList.remove('panning');
      }
    });

    // Touch support for mobile / tablets
    let lastTouchDistance = null;
    this.svgRoot.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.panning = true;
        this.panStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        this.viewStart = { x: this.viewState.x, y: this.viewState.y };
      } else if (e.touches.length === 2) {
        this.panning = false;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastTouchDistance = Math.hypot(dx, dy);
      }
    }, { passive: true });

    this.svgRoot.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && this.panning) {
        this.viewState.x = this.viewStart.x + (e.touches[0].clientX - this.panStart.x);
        this.viewState.y = this.viewStart.y + (e.touches[0].clientY - this.panStart.y);
        this.applyTransform();
      } else if (e.touches.length === 2 && lastTouchDistance) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        const factor = dist / lastTouchDistance;
        lastTouchDistance = dist;
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        this.zoomBy(factor, midX, midY);
      }
    }, { passive: true });

    this.svgRoot.addEventListener('touchend', () => {
      this.panning = false;
      lastTouchDistance = null;
    });
  }
}
