/**
 * Interactive C++ Example Library Drawer / Modal
 */

export class ExampleDrawer {
  constructor(catalog, onSelectExample) {
    this.catalog = catalog;
    this.onSelectExample = onSelectExample;
    this.modal = document.getElementById('exampleModal');
    this.grid = document.getElementById('examplesGrid');
    this.searchInput = document.getElementById('exampleSearch');
    this.filterContainer = document.getElementById('exampleCategoryFilters');
    this.closeBtn = document.getElementById('closeModalBtn');
    this.openBtn = document.getElementById('openExamplesBtn');

    this.activeCategory = 'All';
    this.searchQuery = '';

    this.initEvents();
  }

  initEvents() {
    if (this.openBtn) {
      this.openBtn.addEventListener('click', () => this.open());
    }
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.close());
    }

    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) this.close();
      });
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal && this.modal.classList.contains('active')) {
        this.close();
      }
    });

    if (this.searchInput) {
      this.searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.renderCards();
      });
    }

    this.renderCategoryFilters();
    this.renderCards();
  }

  open() {
    if (this.modal) {
      this.modal.classList.add('active');
      if (this.searchInput) {
        this.searchInput.focus();
      }
    }
  }

  close() {
    if (this.modal) {
      this.modal.classList.remove('active');
    }
  }

  renderCategoryFilters() {
    if (!this.filterContainer) return;
    const distinctCategories = Array.from(new Set(Object.values(this.catalog).map(x => x.category).filter(Boolean)));
    const categories = ['All', ...distinctCategories];
    this.filterContainer.innerHTML = '';

    categories.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = `cat-filter-btn ${this.activeCategory === cat ? 'active' : ''}`;
      btn.textContent = cat;
      btn.addEventListener('click', () => {
        this.activeCategory = cat;
        this.renderCategoryFilters();
        this.renderCards();
      });
      this.filterContainer.appendChild(btn);
    });
  }

  renderCards() {
    if (!this.grid) return;
    this.grid.innerHTML = '';

    const list = Object.values(this.catalog).filter(item => {
      const matchCat = this.activeCategory === 'All' || item.category === this.activeCategory;
      const matchSearch = !this.searchQuery ||
        item.label.toLowerCase().includes(this.searchQuery) ||
        item.info.toLowerCase().includes(this.searchQuery) ||
        (item.badge && item.badge.toLowerCase().includes(this.searchQuery));
      return matchCat && matchSearch;
    });

    if (list.length === 0) {
      this.grid.innerHTML = '<div class="no-results">No C++ examples found matching your search.</div>';
      return;
    }

    list.forEach(item => {
      const card = document.createElement('div');
      card.className = 'example-card';

      card.innerHTML = `
        <div class="card-header">
          <div class="card-title">${item.label}</div>
          <span class="card-badge">${item.badge || item.category}</span>
        </div>
        <p class="card-desc">${item.info}</p>
        <div class="card-footer">
          <span class="card-input-preview">Input: <code>${item.defaultArray}</code></span>
          <button class="load-card-btn">Load Example</button>
        </div>
      `;

      card.querySelector('.load-card-btn').addEventListener('click', () => {
        this.onSelectExample(item.id);
        this.close();
      });

      this.grid.appendChild(card);
    });
  }
}
