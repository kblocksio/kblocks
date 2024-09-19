##########################################################
# Builds the q8s CLI and embeds it into a Node.js executable
# for easy local deployment and distribution.
#
# Output: dist/q8s
##########################################################

# Define variables
NODE_BIN := node
NCC_BIN := npx ncc
Q8S_SRC := cli/q8s
DIST_DIR := dist
TARGET_DIR := target/q8s-build

SEA_CONFIG := $(TARGET_DIR)/cli.sea.json
JS_OUTPUT := $(TARGET_DIR)/index.js
BLOB := $(TARGET_DIR)/q8s.blob
OUTPUT_BINARY := $(DIST_DIR)/q8s

# Default target
all: build

# Create the dist directory
$(DIST_DIR):
	mkdir -p $(DIST_DIR)

$(TARGET_DIR):
	mkdir -p $(TARGET_DIR)

# Build the single-file executable
build: $(DIST_DIR) $(TARGET_DIR)
	$(NCC_BIN) build $(Q8S_SRC) -o $(TARGET_DIR)
	echo '{ "main": "$(JS_OUTPUT)", "output": "$(BLOB)", "disableExperimentalSEAWarning": true, "useSnapshot": false, "useCodeCache": true }' > $(SEA_CONFIG)
	node --experimental-sea-config $(SEA_CONFIG)
	cp $(shell command -v node) $(OUTPUT_BINARY)
	codesign --remove-signature $(OUTPUT_BINARY)
	npx postject $(OUTPUT_BINARY) NODE_SEA_BLOB $(BLOB) \
		--sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 \
		--macho-segment-name NODE_SEA 
	codesign --sign - $(OUTPUT_BINARY)

# Clean the dist directory
clean:
	rm -rf $(DIST_DIR)

# Phony targets
.PHONY: all build clean
