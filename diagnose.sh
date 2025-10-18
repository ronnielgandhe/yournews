#!/bin/bash

echo "=== DIAGNOSING ASTRO + REACT HYDRATION ==="
echo ""

echo "1. Checking server status..."
curl -s http://localhost:4322 > /tmp/page.html
if [ $? -eq 0 ]; then
  echo "✅ Server is responding"
else
  echo "❌ Server is NOT responding"
  exit 1
fi

echo ""
echo "2. Checking for astro-island elements..."
if grep -q "astro-island" /tmp/page.html; then
  echo "✅ astro-island elements found"
  grep -o '<astro-island[^>]*' /tmp/page.html | head -3
else
  echo "❌ NO astro-island elements - React won't hydrate!"
fi

echo ""
echo "3. Checking for React scripts..."
if grep -q "react" /tmp/page.html; then
  echo "✅ React references found"
else
  echo "❌ NO React scripts"
fi

echo ""
echo "4. Checking for client:load directive..."
if grep -q "client:load" /tmp/page.html; then
  echo "✅ client:load found in HTML"
else
  echo "❌ client:load NOT in HTML (this is expected, it's processed)"
fi

echo ""
echo "5. Checking for JavaScript modules..."
grep -o '<script[^>]*type="module"[^>]*>' /tmp/page.html | head -5

echo ""
echo "6. HTML file size..."
wc -l /tmp/page.html

echo ""
echo "7. Sample of body content..."
grep -A 20 "<body" /tmp/page.html | head -25

echo ""
echo "=== DIAGNOSIS COMPLETE ==="
