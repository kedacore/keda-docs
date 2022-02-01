clean:
	rm -rf public resources

yarn:
	yarn

serve: yarn
	hugo server \
		--buildDrafts \
		--buildFuture

production-build: clean
	hugo \
		--minify

preview-build: clean
	hugo \
		--baseURL $(DEPLOY_PRIME_URL) \
		--buildDrafts \
		--buildFuture \
		--minify

open:
	open https://keda.sh

link-checker-setup:
	curl https://htmltest.wjdp.uk | bash

run-link-checker:
	bin/htmltest

check-links: link-checker-setup run-link-checker
