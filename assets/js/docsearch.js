import docsearch from "@docsearch/js";
import * as params from "@params";

function meta(name) {
  const element = document.querySelector(`meta[name="docsearch:${name}"]`);
  return element ? element.content : "";
}

const currentProduct = meta("product");
const currentVersion = meta("version");

// Start with the latest version of each product (from Hugo config),
// then override the current product with the version we're actually viewing.
const versions = {
  docs: params.latestDocs,
  "http-add-on": params.latestHttpAddon,
};
if (currentProduct in versions && currentVersion) {
  versions[currentProduct] = currentVersion;
}

// Build a compound filter so results from both products are always discoverable,
// each scoped to the version the user is currently viewing.
const parts = Object.entries(versions).map(
  ([product, version]) => `(product:"${product}" AND version:${version})`,
);
// Always include blog posts in the search results
parts.push("product:blog");
const filters = parts.join(" OR ");

try {
  docsearch({
    apiKey: params.apiKey,
    appId: params.appId,
    indices: [
      {
        name: params.indexName,
        searchParameters: { filters: filters },
      },
    ],
    container: "#navbar-search",
    insights: true,
  });
} catch (err) {
  console.error("DocSearch failed to initialize:", err);
}
