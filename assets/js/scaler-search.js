// Client-side search and filtering for the scaler listing page.
// Data is fetched once from /scalers.json (built-in) and ArtifactHub (external),
// then filtered and searched entirely in-memory.

window.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const searchInput = document.getElementById("search-input");
  if (!searchInput) return;

  const resultsContainer = document.querySelector(".is-search-result");
  const filterIcon = document.querySelector(".filter-icon");
  const filterOptions = document.querySelector(".filter-options");
  const heading = document.getElementById("search-results");
  const template = document.getElementById("is-search-template");
  const checkboxes = document.querySelectorAll('input[name="resource_filter"]');

  // Extracts version from URL path segment (e.g. "2.21" from /docs/2.21/scalers/)
  const currentVersion = window.location.pathname.split("/")[2];

  let allScalers = [];

  // --- Data fetching ---

  async function fetchBuiltInScalers() {
    try {
      const response = await fetch("/scalers.json");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (err) {
      console.warn("Failed to fetch built-in scalers:", err);
      return [];
    }
  }

  async function fetchExternalScalers() {
    const url =
      "https://artifacthub.io/api/v1/packages/search?offset=0&limit=20&facets=false&kind=8&deprecated=false&sort=relevance";

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      return (data.packages || []).map((pkg) => ({
        type: "external",
        availability: `v${pkg.version}+`,
        title: pkg.display_name,
        maintainer:
          pkg.repository.organization_name ?? pkg.repository.user_alias,
        href:
          "https://artifacthub.io/packages/keda-scaler/" +
          pkg.repository.name +
          "/" +
          pkg.normalized_name,
        version: currentVersion,
        description: pkg.description,
        category: null,
      }));
    } catch (err) {
      console.warn("Failed to fetch external scalers:", err);
      return [];
    }
  }

  async function fetchAllScalers() {
    const [builtIn, external] = await Promise.all([
      fetchBuiltInScalers(),
      fetchExternalScalers(),
    ]);

    allScalers = [...builtIn, ...external].filter(
      (s) => s.version === currentVersion,
    );
  }

  // --- Filtering ---

  // Parses checked checkboxes into a Map<field, Set<value>>.
  // Checkbox values use the convention "field:value" (e.g. "type:built-in").
  function parseActiveFilters() {
    const filters = new Map();

    checkboxes.forEach((cb) => {
      if (!cb.checked) return;

      // Use indexOf instead of split to handle values containing colons.
      const colonIdx = cb.value.indexOf(":");
      if (colonIdx === -1) return;

      const field = cb.value.slice(0, colonIdx);
      const value = cb.value.slice(colonIdx + 1);

      if (!filters.has(field)) filters.set(field, new Set());
      filters.get(field).add(value.toLowerCase());
    });

    return filters;
  }

  // OR within a field (any checked value matches), AND across fields.
  function filterByFacets(scalers, activeFilters) {
    if (activeFilters.size === 0) return scalers;

    return scalers.filter((scaler) => {
      for (const [field, values] of activeFilters) {
        const scalerValue = (scaler[field] || "").toLowerCase();
        if (!values.has(scalerValue)) return false;
      }
      return true;
    });
  }

  // --- Text search ---

  // All terms must match at least one field (AND across terms).
  // Results ranked by weighted score: title > maintainer > description.
  function searchByText(scalers, query) {
    if (!query) return scalers;

    // Split the search on whitespace and search for all terms individually
    const terms = query.toLowerCase().split(/\s+/);
    if (terms.length === 0) return scalers;

    const scored = [];

    for (const scaler of scalers) {
      const title = (scaler.title || "").toLowerCase();
      const description = (scaler.description || "").toLowerCase();
      const maintainer = (scaler.maintainer || "").toLowerCase();

      let score = 0;
      let allTermsMatch = true;

      // Every term must match at least one field
      for (const term of terms) {
        const inTitle = title.includes(term);
        const inMaintainer = maintainer.includes(term);
        const inDescription = description.includes(term);

        // If a scaler doesn't contain match at all, we will ignore it
        if (!inTitle && !inMaintainer && !inDescription) {
          allTermsMatch = false;
          break;
        }

        if (inTitle) score += 3;
        if (inMaintainer) score += 2;
        if (inDescription) score += 1;
      }

      // Only consider all scalers where all search terms had a match
      if (allTermsMatch) {
        scored.push({ scaler, score });
      }
    }

    // Sort all results descending
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.scaler.title.localeCompare(b.scaler.title);
    });

    return scored.map((entry) => entry.scaler);
  }

  // --- Rendering ---

  function render(scalers, query) {
    // Preserve the <template> (first child), remove all rendered cards
    while (resultsContainer.children.length > 1) {
      resultsContainer.removeChild(resultsContainer.lastChild);
    }

    const count = scalers.length;

    if (count === 0) {
      heading.textContent = "No scalers found";
    } else if (count === 1) {
      heading.textContent = query ? "1 scaler found" : "1 scaler available";
    } else {
      heading.textContent = query
        ? `${count} scalers found`
        : `${count} scalers available`;
    }

    if (!("content" in template)) {
      return;
    }

    // Create elements for all matching scalers
    for (const scaler of scalers) {
      const element = template.content.cloneNode(true);
      const badge = element.querySelector(".badge");
      const titleLink = element.querySelector(".scaler-title");

      badge.textContent = scaler.type;
      titleLink.textContent = scaler.title;
      titleLink.setAttribute("href", scaler.href);

      if (scaler.type === "external") {
        badge.style.color = "purple";
      }

      if (scaler.description) {
        element.querySelector(".description").textContent = scaler.description;
      }

      if (scaler.maintainer) {
        element.querySelector(".maintainer").textContent = scaler.maintainer;
      }

      if (scaler.availability) {
        element.querySelector(".availability").textContent =
          scaler.availability;
      }

      resultsContainer.appendChild(element);
    }
  }

  // --- Orchestration ---

  function applyFiltersAndSearch() {
    const activeFilters = parseActiveFilters();
    const filtered = filterByFacets(allScalers, activeFilters);
    const query = searchInput.value.trim();
    const results = searchByText(filtered, query);
    render(results, query);
  }

  searchInput.addEventListener("input", applyFiltersAndSearch);

  checkboxes.forEach((cb) => {
    cb.addEventListener("change", applyFiltersAndSearch);
  });

  // Toggle filter panel visibility on mobile
  filterIcon.addEventListener("click", () => {
    const isHidden =
      filterOptions.style.display === "none" ||
      filterOptions.style.display === "";
    filterOptions.style.display = isHidden ? "flex" : "none";
  });

  fetchAllScalers().then(applyFiltersAndSearch);
});
