#!/bin/bash

# Madopic Setup Script
# This script downloads required dependencies locally to improve loading performance

echo "🚀 Setting up Madopic..."
echo "================================="

# Create vendor directories
echo "📁 Creating vendor directories..."
mkdir -p vendor/js vendor/css

# Download critical dependencies
echo "⬇️  Downloading dependencies locally..."

echo "  - Downloading marked.js..."
curl -s -o vendor/js/marked.min.js https://cdn.jsdelivr.net/npm/marked/marked.min.js

echo "  - Downloading KaTeX CSS..."
curl -s -o vendor/css/katex.min.css https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css

echo "  - Downloading KaTeX JavaScript..."
curl -s -o vendor/js/katex.min.js https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js

echo "  - Downloading KaTeX auto-render..."
curl -s -o vendor/js/auto-render.min.js https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js

echo "  - Downloading KaTeX mhchem extension..."
curl -s -o vendor/js/mhchem.min.js https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/mhchem.min.js

echo "  - Downloading html2canvas..."
curl -s -o vendor/js/html2canvas.min.js https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js

echo ""
echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "  1. Start the server: npx serve ."
echo "  2. Open http://localhost:3000 in your browser"
echo ""
echo "💡 The app will now load much faster since dependencies are local!"
