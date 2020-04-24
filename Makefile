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