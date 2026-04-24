import docsearch from "@docsearch/js";
import * as params from "@params";

function meta(name) {
  const element = document.querySelector(`meta[name="docsearch:${name}"]`);
  return element ? element.content : "";
}

const currentTag = meta("tag");
const currentProduct = meta("product");

// Each tag encodes product + version in one value (e.g. "docs-2.19").
// This avoids needing a cross-attribute filter like (product AND version)
// which Algolia's filter syntax does not support in OR groups.
const tags = {
  docs: "docs-" + params.latestDocs,
  "http-add-on": "http-add-on-" + params.latestHttpAddon,
};
if (currentProduct in tags && currentTag) {
  tags[currentProduct] = currentTag;
}

const facetFilters = Object.values(tags)
  .map((tag) => "tag:" + tag)
  .concat("tag:blog");

try {
  docsearch({
    apiKey: params.apiKey,
    appId: params.appId,
    indices: [
      {
        name: params.indexName,
        searchParameters: { facetFilters: [facetFilters] },
      },
    ],
    container: "#navbar-search",
    insights: true,
  });
} catch (err) {
  console.error("DocSearch failed to initialize:", err);
}
