HTMLTEST_DIR=tmp
HTMLTEST?=htmltest # Specify as make arg if different
HTMLTEST_ARGS?=--skip-external

DOCS=public/docs
LATEST_VERSION=$(shell grep -e '^docs' config.toml | grep -oe '[0-9][0-9]*.[0-9][0-9]' | head -1)

# Use $(HTMLTEST) in PATH, if available; otherwise, we'll get a copy
ifeq (, $(shell which $(HTMLTEST)))
override HTMLTEST=$(HTMLTEST_DIR)/bin/htmltest
ifeq (, $(shell which $(HTMLTEST)))
GET_LINK_CHECKER_IF_NEEDED=get-link-checker
endif
endif

check-links: $(GET_LINK_CHECKER_IF_NEEDED) make-redirects-for-checking
	$(HTMLTEST) $(HTMLTEST_ARGS)
	find public/* -type l -ls -exec rm -f {} \;

make-redirects-for-checking:
	@if [ -z $(LATEST_VERSION) ]; then \
		echo "Failed to extract LATEST_VERSION. Cannot setup symlinks for checking"; \
		exit 1; \
	fi
	@echo "Creating symlinks of 'latest' to $(LATEST_VERSION) for the purpose of link checking"
	(cd public && rm -f scalers && ln -s docs/$(LATEST_VERSION)/scalers scalers)
	(cd public/docs && rm -f latest && ln -s $(LATEST_VERSION) latest)

get-link-checker:
	rm -Rf $(HTMLTEST_DIR)/bin
	curl https://htmltest.wjdp.uk | bash -s -- -b $(HTMLTEST_DIR)/bin

clean:
	rm -rf $(HTMLTEST_DIR) public/* resources
