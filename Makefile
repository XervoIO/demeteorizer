LIB_FILES  := $(shell find ./lib -name "*.js")
TEST_FILES := $(shell find ./spec -name "*.js")

LINT_SRC = $(LIB_FILES) $(TEST_FILES)

test: $(LINT_SRC)
	@node node_modules/.bin/jshint $^
	@node node_modules/.bin/istanbul test node_modules/.bin/_mocha \
		-R spec -- \
		--require should \
		--reporter spec

.PHONY: test
