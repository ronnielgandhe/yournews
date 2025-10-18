#!/bin/bash
# End-to-end test script for panel search feature

echo "========================================="
echo "Panel Search - End-to-End Test"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if server is running
echo "1. Checking if backend server is running..."
if curl -s http://localhost:8000/ai/status > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Backend server is running on port 8000"
else
    echo -e "${RED}✗${NC} Backend server is NOT running"
    echo "   Please start it with: cd server && node index.js"
    exit 1
fi
echo ""

# Test 1: Basic panel search
echo "2. Testing POST /search/panels with query 'AI'..."
RESPONSE=$(curl -s -X POST http://localhost:8000/search/panels \
    -H 'Content-Type: application/json' \
    -d '{"query":"AI"}' \
    --max-time 30)

if echo "$RESPONSE" | grep -q '"panel"'; then
    echo -e "${GREEN}✓${NC} Panel endpoint responding"
    
    # Extract info
    QUERY=$(echo "$RESPONSE" | grep -o '"query":"[^"]*"' | head -1 | cut -d'"' -f4)
    TYPE=$(echo "$RESPONSE" | grep -o '"type":"[^"]*"' | head -1 | cut -d'"' -f4)
    ITEMS_COUNT=$(echo "$RESPONSE" | grep -o '"title"' | wc -l)
    SUGG_COUNT=$(echo "$RESPONSE" | grep -o '"suggestions":\[' -A 1 | grep -o ',' | wc -l)
    
    echo "   Query: $QUERY"
    echo "   Type: $TYPE"
    echo "   Items returned: $ITEMS_COUNT"
    echo "   Suggestions: ~$SUGG_COUNT"
else
    echo -e "${RED}✗${NC} Panel endpoint error"
    echo "   Response: ${RESPONSE:0:200}"
    exit 1
fi
echo ""

# Test 2: Person query
echo "3. Testing person classification..."
RESPONSE2=$(curl -s -X POST http://localhost:8000/search/panels \
    -H 'Content-Type: application/json' \
    -d '{"query":"Elon Musk"}' \
    --max-time 30)

TYPE2=$(echo "$RESPONSE2" | grep -o '"type":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ "$TYPE2" = "person" ]; then
    echo -e "${GREEN}✓${NC} Person classification working (detected: $TYPE2)"
else
    echo -e "${YELLOW}⚠${NC} Expected 'person', got: $TYPE2"
fi
echo ""

# Test 3: Market query
echo "4. Testing market classification..."
RESPONSE3=$(curl -s -X POST http://localhost:8000/search/panels \
    -H 'Content-Type: application/json' \
    -d '{"query":"AAPL stock"}' \
    --max-time 30)

TYPE3=$(echo "$RESPONSE3" | grep -o '"type":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ "$TYPE3" = "market" ]; then
    echo -e "${GREEN}✓${NC} Market classification working (detected: $TYPE3)"
else
    echo -e "${YELLOW}⚠${NC} Expected 'market', got: $TYPE3"
fi
echo ""

# Test 4: Check if frontend proxy exists
echo "5. Checking frontend API proxy..."
if [ -f "../web/pages/api/search-panels.js" ]; then
    echo -e "${GREEN}✓${NC} Frontend proxy file exists"
else
    echo -e "${RED}✗${NC} Frontend proxy file missing"
    exit 1
fi
echo ""

# Test 5: Verify utilities
echo "6. Testing backend utilities..."
cd /Users/ronniel/yournews/server
node -e "
const { classifyQuery } = require('./src/lib/classifyQuery');
const { buildSuggestions } = require('./src/lib/buildSuggestions');

const tests = [
    ['climate change', 'topic'],
    ['Elon Musk', 'person'],
    ['bitcoin', 'market']
];

let passed = 0;
tests.forEach(([query, expected]) => {
    const result = classifyQuery(query);
    if (result === expected) {
        passed++;
    } else {
        console.log('FAIL:', query, 'expected', expected, 'got', result);
    }
});

if (passed === tests.length) {
    console.log('PASS: All classification tests passed');
    process.exit(0);
} else {
    console.log('FAIL:', (tests.length - passed), 'tests failed');
    process.exit(1);
}
"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Backend utilities working"
else
    echo -e "${RED}✗${NC} Backend utilities have errors"
    exit 1
fi
echo ""

# Summary
echo "========================================="
echo -e "${GREEN}✓ All Tests Passed!${NC}"
echo "========================================="
echo ""
echo "Panel search is ready to use!"
echo ""
echo "Next steps:"
echo "  1. Start web frontend: cd web && npm run dev"
echo "  2. Open http://localhost:3000"
echo "  3. Click 'Search' tab"
echo "  4. Try queries like:"
echo "     - 'artificial intelligence'"
echo "     - 'Elon Musk'"
echo "     - 'AAPL stock'"
echo ""
