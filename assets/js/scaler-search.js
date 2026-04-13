import lunr from "lunr";

window.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const input = document.getElementById("search-input");
  if (!input) return;

  let index;
  let debounceTimer;
  const currentUrl = window.location.pathname;
  const currentLocation = String(currentUrl).split("/");
  const currentVersion = currentLocation[2];
  const form = document.getElementById("search");
  const target = document.querySelector(".is-search-result");
  const filterIcon = document.querySelector(".filter-icon");
  const filterOptions = document.querySelector(".filter-options");
  const searchResultCount = document.querySelector(".results");
  const template = document.getElementById("is-search-template");
  const interval = 500;
  let query = input.value.trim();
  let parse = {};
  let searchQueue = [];
  let checkboxes = document.querySelectorAll('input[name="resource_filter"]');

  // fetch all scalers on initial load
  if (!query) {
    initSearchIndex();
  }

  // logic for input search
  input.addEventListener(
    "input",
    function (event) {
      event.preventDefault();
      clearTimeout(debounceTimer);
      const keywords = input.value.trim();

      query = keywords;

      debounceTimer = setTimeout(initSearchIndex, interval);

      // clear out all the scaler item card during search
      while (target.firstChild.nextSibling) {
        target.removeChild(template.nextSibling.nextElementSibling);
      }
    },
    false,
  );

  // logic for category filter
  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", function (event) {
      if (checkbox.checked) {
        const inputValue = event.target.value.split(" ");
        // for single queries with spacing, use the first word
        const inputQuery = inputValue[0];
        searchQueue.push(inputQuery);
        query = searchQueue.join(" ");
        initSearchIndex();
      }

      if (!checkbox.checked) {
        const inputValue = event.target.value.split(" ");
        // for single queries with spacing, use the first word
        const inputQuery = inputValue[0];
        searchQueue = searchQueue.filter((word) => word != inputQuery);
        query = searchQueue.join(" ");
        initSearchIndex();
      }

      // clear out all the scaler item card during search
      while (target.firstChild.nextSibling) {
        target.removeChild(template.nextSibling.nextElementSibling);
      }
    });
  });

  // show filter options on mobile
  filterIcon.addEventListener("click", function () {
    if (filterOptions.style.display === "none" || filterOptions.style.display === "") {
      filterOptions.style.display = "flex";
    } else {
      filterOptions.style.display = "none";
    }
  });

  async function initSearchIndex() {
    const builtInScalers = await fetch("/index.json", { method: "GET" })
      .then((response) => response.json())
      .then((data) => {
        return data;
      })
      .catch((err) => console.error("error:", err));

    const externalScalerUrl =
      "https://artifacthub.io/api/v1/packages/search?offset=0&limit=20&facets=false&kind=8&deprecated=false&sort=relevance";
    const externalScalersData = await fetch(externalScalerUrl)
      .then((response) => response.json())
      .then((data) => {
        return data.packages;
      })
      .catch((err) => console.error("error:", err));

    const externalScalers = (externalScalersData || []).map((scaler) => ({
      type: "external",
      availability: `v${scaler.version}+`,
      title: scaler.display_name,
      maintainer:
        scaler.repository.organization_name ?? scaler.repository.user_alias,
      href:
        "https://artifacthub.io/packages/keda-scaler/" +
        scaler.repository.name +
        "/" +
        scaler.normalized_name,
      version: currentVersion,
      description: scaler.description,
      category: null,
    }));

    const scalers = [...(builtInScalers || []), ...externalScalers];

    index = lunr(function () {
      const documents = scalers;

      this.ref("title");
      this.field("title", {
        boost: 20,
        usePipeline: true,
        wildcard: lunr.Query.wildcard.TRAILING,
        presence: lunr.Query.presence.REQUIRED,
      });
      this.field("maintainer", {
        boost: 15,
      });
      this.field("href", {
        boost: 15,
      });
      this.field("description", {
        boost: 10,
      });
      this.field("availability", {
        boost: 5,
      });
      this.field("category", {
        boost: 10,
      });
      this.field("type", {
        boost: 20,
      });

      documents.forEach(function (doc) {
        if (doc.version === currentVersion) {
          this.add(doc);
          parse[doc.title] = {
            href: doc.href,
            title: doc.title,
            maintainer: doc.maintainer,
            description: doc.description,
            availability: doc.availability,
            category: doc.category,
            type: doc.type,
          };
        }
      }, this);
    });

    search(query);
  }

  function search(keywords) {
    // show all scalers by default
    let queryString = index.search("");

    /* Lunr only matches complete words by default. If an exact match fails,
    retry with a trailing wildcard to support prefix matching. */
    if (keywords.length > 0) {
      queryString = index.search(keywords);
      queryString =
        queryString.length <= 0 ? index.search(`${keywords}*`) : queryString;
    }

    const results = queryString;

    if ("content" in template) {
      // show result count
      const title = document.createElement("h3");
      title.id = "search-results";
      title.className = "subtitle is-size-3";

      if (results.length == 0) title.textContent = `No results found`;
      else if (results.length == 1) title.textContent = `Found 1 result`;
      else if (results.length > 1 && keywords === "")
        title.textContent = `${results.length} scalers available`;
      else title.textContent = `Found ${results.length} results`;
      searchResultCount.replaceChildren(title);

      // show the matched result
      results.forEach(function (result) {
        const doc = parse[result.ref];
        const element = template.content.cloneNode(true);
        element.querySelector(".badge").textContent = doc.type;
        element.querySelector(".scaler-title").textContent = doc.title;
        element.querySelector(".scaler-title").setAttribute("href", doc.href);
        if (doc.type === "external") {
          element.querySelector(".badge").style.color = "purple";
        }
        if (doc.description) {
          element.querySelector(".description").textContent = doc.description;
        }
        if (doc.maintainer) {
          element.querySelector(".maintainer").textContent = doc.maintainer;
        }
        if (doc.availability) {
          element.querySelector(".availability").textContent = doc.availability;
        }
        target.appendChild(element);
      }, this);
    }
  }
});
