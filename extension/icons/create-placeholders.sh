#!/bin/bash
# Create simple placeholder PNG icons using base64 encoding
# These are minimal valid 1x1 green PNGs that can be replaced with proper icons

# 16x16 green pixel (base64 encoded PNG)
echo -n 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAHklEQVQ4jWNgGAWjYBSMgsELGBkZGf7//09KGQDsIQGnqZe+fAAAAABJRU5ErkJggg==' | base64 -d > icon16.png

# 48x48 green pixel
echo -n 'iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAPklEQVR4Ae3OsQ0AIAwDwZj9dwYKJBpEQZT/7q0MAAAAAAAAAAAAAAAAAAAAAAAAYOr+2tYJAAAA' | base64 -d > icon48.png

# 128x128 green pixel  
echo -n 'iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAAWElEQVR4Ae3QAQ0AAADCIPunNsU+YAE3NpjYYGKDiQ0mNpjYYGKDiQ0mNpjYYGKDiQ0mNpjYYGKDiQ0mNpjYYGKDiQ0mNpjYYGKDiQ0mNpjYYGKDyR8CjHsD6FhPTVYAAAAASUVORK5CYII=' | base64 -d > icon128.png

echo "Placeholder icons created"
