import docsearch from "@docsearch/js";
import * as params from "@params";

const latest = params.latest;
let currentVersion = latest;

// Extract docs version from URL path (/docs/{version}/...).
// Non-docs pages default to the latest version for search filtering.
const pathSegments = window.location.pathname.split("/");
if (pathSegments[1] === "docs") {
  currentVersion = pathSegments[2];
}

try {
  docsearch({
    apiKey: params.apiKey,
    appId: params.appId,
    indices: [
      {
        name: params.indexName,
        searchParameters: { facetFilters: [`version: ${currentVersion}`] },
      },
    ],
    container: "#navbar-search",
    insights: true,
  });
} catch (err) {
  console.error("DocSearch failed to initialize:", err);
}
