Test EVERY file format E2E at /Users/naman/llmwiki. Find REAL files on the user's machine and ingest them.

Setup:
export ANTHROPIC_API_KEY=$(grep ANTHROPIC_API_KEY /Users/naman/energy/.env | cut -d= -f2)
cd /Users/naman/llmwiki && pnpm build
node dist/index.js init /tmp/format-test --template personal --force

Find and test real files:
1. Find a PDF: find /Users/naman -name "*.pdf" -maxdepth 3 2>/dev/null | head -3
   Ingest it: node dist/index.js ingest <path> --vault /tmp/format-test
2. Find a DOCX: find /Users/naman -name "*.docx" -maxdepth 3 2>/dev/null | head -3
   Ingest it
3. Find an XLSX: find /Users/naman -name "*.xlsx" -maxdepth 3 2>/dev/null | head -3
   Ingest it
4. Find images: use /Users/naman/energy/resources/unread/*.jpeg
   Ingest them
5. Find audio: find /Users/naman -name "*.mp3" -o -name "*.m4a" -maxdepth 4 2>/dev/null | head -3
   Ingest (will need Whisper or fallback gracefully)
6. Find video: find /Users/naman -name "*.mp4" -o -name "*.mov" -maxdepth 4 2>/dev/null | head -3
   Ingest (needs ffmpeg)

After each ingest:
- Check raw/{date}/ has the copy
- Check wiki/ has new pages
- Check index.md updated
- node dist/index.js status --vault /tmp/format-test

Report EVERY bug. Fix what you can.
Signal: echo "FORMAT-TEST DONE" > /Users/naman/llmwiki/.claude-signals/format-test.done
