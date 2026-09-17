/**
 * Playback Controls & Timeline Scrubber
 */

export class ControlsManager {
  constructor(options) {
    this.playBtn = document.getElementById(options.playBtnId);
    this.prevBtn = document.getElementById(options.prevBtnId);
    this.nextBtn = document.getElementById(options.nextBtnId);
    this.resetBtn = document.getElementById(options.resetBtnId);
    this.speedSelect = document.getElementById(options.speedSelectId);
    this.progress = document.getElementById(options.progressId);
    this.stepLabel = document.getElementById(options.stepLabelId);
    this.explanationBanner = document.getElementById(options.explanationBannerId);

    this.onStepChange = options.onStepChange || (() => {});

    this.playing = false;
    this.playTimer = null;
    this.speed = 1.0;
    this.totalSteps = 0;
    this.currentStep = 0;

    this.initEvents();
  }

  initEvents() {
    this.playBtn.addEventListener('click', () => {
      this.playing ? this.pause() : this.play();
    });

    this.prevBtn.addEventListener('click', () => this.stepBy(-1));
    this.nextBtn.addEventListener('click', () => this.stepBy(1));
    this.resetBtn.addEventListener('click', () => {
      this.pause();
      this.setStep(0);
    });

    this.speedSelect.addEventListener('change', () => {
      this.speed = parseFloat(this.speedSelect.value);
    });

    this.progress.addEventListener('input', () => {
      this.pause();
      this.setStep(parseInt(this.progress.value, 10));
    });

    // Global keyboard shortcuts (when not typing in an input/textarea)
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        this.playing ? this.pause() : this.play();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        this.stepBy(-1);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        this.stepBy(1);
      } else if (e.key === 'r' || e.key === 'R') {
        this.pause();
        this.setStep(0);
      }
    });
  }

  setTimelineLength(length) {
    this.totalSteps = length;
    const max = Math.max(0, length - 1);
    this.progress.max = max;
    if (this.currentStep > max) {
      this.currentStep = max;
    }
  }

  setStep(idx) {
    if (this.totalSteps === 0) return;
    this.currentStep = Math.max(0, Math.min(this.totalSteps - 1, idx));
    this.progress.value = this.currentStep;
    this.stepLabel.textContent = `Step ${this.currentStep} / ${Math.max(0, this.totalSteps - 1)}`;
    this.onStepChange(this.currentStep);
  }

  stepBy(delta) {
    this.pause();
    this.setStep(this.currentStep + delta);
  }

  play() {
    if (this.totalSteps <= 1) return;
    if (this.currentStep >= this.totalSteps - 1) {
      this.currentStep = 0;
    }
    this.playing = true;
    this.playBtn.innerHTML = '<span class="btn-text">Pause</span>';
    this.tick();
  }

  pause() {
    this.playing = false;
    this.playBtn.innerHTML = '<span class="btn-text">Play</span>';
    clearTimeout(this.playTimer);
  }

  tick() {
    if (!this.playing) return;
    this.setStep(this.currentStep);
    if (this.currentStep >= this.totalSteps - 1) {
      this.pause();
      return;
    }
    const baseMs = 1000;
    this.playTimer = setTimeout(() => {
      this.currentStep++;
      this.tick();
    }, baseMs / this.speed);
  }

  updateExplanation(text, isError = false, meta = {}) {
    if (!this.explanationBanner) return;

    let badge = '';
    if (meta.error || isError) {
      badge = '<span class="exp-badge exp-error">ERROR</span>';
    } else if (meta.leaks && meta.leaks.length > 0) {
      badge = `<span class="exp-badge exp-warn">LEAK (${meta.leaks.length})</span>`;
    } else if (meta.kind === 'condition') {
      badge = '<span class="exp-badge exp-info">COND</span>';
    } else if (meta.kind === 'return') {
      badge = '<span class="exp-badge exp-success">RETURN</span>';
    } else if (meta.kind === 'end') {
      badge = '<span class="exp-badge exp-success">DONE</span>';
    } else if (meta.frameChange) {
      badge = '<span class="exp-badge exp-call">CALL</span>';
    }

    this.explanationBanner.innerHTML = `${badge} <span class="exp-text">${text}</span>`;
    this.explanationBanner.classList.toggle('error', !!(meta.error || isError));
  }
}
