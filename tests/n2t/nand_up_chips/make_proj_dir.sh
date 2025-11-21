#!/bin/bash

# Loop over all .hdl files in the current directory
for file in *.hdl; do
    # Skip if no .hdl files exist
    [ -e "$file" ] || continue

    # Strip extension to get circuit name
    name="${file%.hdl}"

    # Create directory if it doesn't already exist
    mkdir -p "$name"

    # Move file into directory, renaming to match folder
    mv "$file" "$name/$name.hdl"
done
