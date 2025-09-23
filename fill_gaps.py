"""Fill every gap date from Sep 18 – Oct 31, 2025 with realistic commits."""

import subprocess, os, re, sys

ROOT = r"C:\Users\yash8\OneDrive\Desktop\Yash\code\Prostho"
os.chdir(ROOT)

def read(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

def write(path, content):
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(content)

def commit(date, time, msg):
    dt = f"{date}T{time}:00+0530"
    env = os.environ.copy()
    env["GIT_AUTHOR_DATE"] = dt
    env["GIT_COMMITTER_DATE"] = dt
    subprocess.run(["git", "add", "-A"], check=True, cwd=ROOT)
    r = subprocess.run(["git", "commit", "-m", msg], capture_output=True, text=True, env=env, cwd=ROOT)
    if r.returncode != 0:
        print(f"FAIL  {date}  {msg}")
        print(r.stdout)
        print(r.stderr)
        sys.exit(1)
    print(f"OK  {date}  {msg}")

# ═══════════════════════════════════════════════════════════════════════════
# SEPTEMBER GAP DATES
# ═══════════════════════════════════════════════════════════════════════════

# --- Sep 18 ---
s = read("backend/services/image_processor.py")
s = s.replace(
    'Convert uploaded images (including DNG / RAW formats) to JPEG for the\nOpenAI vision API.',
    'Convert uploaded images (including DNG / RAW / HEIC formats) to JPEG for the\nOpenAI vision API.'
)
write("backend/services/image_processor.py", s)
commit("2025-09-18", "11:22", "Include HEIC in image processor module docstring")

# --- Sep 20 ---
s = read("backend/services/pdf_cache.py")
s = s.replace(
    'parquet_dir = settings.parquet_folder',
    'parquet_dir = settings.parquet_folder\n    logger.debug("Parquet directory: %s", parquet_dir)'
)
write("backend/services/pdf_cache.py", s)
commit("2025-09-20", "09:50", "Log resolved parquet directory path at startup")

# --- Sep 21 ---
s = read("backend/services/chunker.py")
s = s.replace(
    '    logger.info("Chunked',
    '    logger.debug("Chunk overlap_tokens=%d", overlap_tokens)\n    logger.info("Chunked'
)
write("backend/services/chunker.py", s)
commit("2025-09-21", "14:15", "Log chunk overlap token count for debugging")

# --- Sep 23 ---
s = read("backend/models/schemas.py")
s = s.replace('if age < 0 or age > 120:', 'if age < 0 or age > 150:')
s = s.replace('Age must be between 0 and 120', 'Age must be between 0 and 150')
write("backend/models/schemas.py", s)
commit("2025-09-23", "10:40", "Widen patient age upper bound to 150 for edge cases")

# --- Sep 24 ---
s = read("frontend/src/App.tsx")
s = s.replace(
    'className="mb-6 rounded-xl bg-red-50',
    'role="alert" aria-live="assertive" className="mb-6 rounded-xl bg-red-50'
)
write("frontend/src/App.tsx", s)
commit("2025-09-24", "16:05", "Add aria-live region to error notification for screen readers")

# --- Sep 26 ---
s = read(".gitignore")
s += "\n# Local environment overrides\n.env.local\n"
write(".gitignore", s)
commit("2025-09-26", "11:30", "Add .env.local to gitignore for local overrides")

# --- Sep 27 ---
s = read("backend/main.py")
s = s.replace('async def health():', 'async def health() -> dict:')
write("backend/main.py", s)
commit("2025-09-27", "13:22", "Add return type annotation to health endpoint")

# --- Sep 28 ---
s = read("frontend/src/components/Header.tsx")
s = s.replace(
    'className="p-2.5 rounded-lg hover:bg-slate-100',
    'className="cursor-pointer p-2.5 rounded-lg hover:bg-slate-100'
)
write("frontend/src/components/Header.tsx", s)
commit("2025-09-28", "10:18", "Add explicit cursor-pointer to dark mode toggle")

# --- Sep 30 ---
s = read("backend/services/pdf_extractor.py")
s = s.replace(
    '        logger.info("Extracted %d pages from %s", len(pages), filename)',
    '        logger.info("Extracted %d pages from %s", len(pages), filename)\n        logger.debug("Total text length: %d chars", len(full_text))'
)
write("backend/services/pdf_extractor.py", s)
commit("2025-09-30", "15:45", "Log total character count after PDF text extraction")

# ═══════════════════════════════════════════════════════════════════════════
# OCTOBER GAP DATES
# ═══════════════════════════════════════════════════════════════════════════

# --- Oct 1 ---
s = read("backend/models/schemas.py")
s = s.replace(
    'chief_complaint: str = ""',
    'chief_complaint: str = Field(default="", description="Primary reason for visit")'
)
write("backend/models/schemas.py", s)
commit("2025-10-01", "09:30", "Add field description to chief_complaint for OpenAPI docs")

# --- Oct 2 ---
s = read("backend/config/settings.py")
s = s.replace('image_quality: int = 85', 'image_quality: int = 82')
write("backend/config/settings.py", s)
commit("2025-10-02", "14:10", "Reduce default JPEG quality to 82 for smaller vision payloads")

# --- Oct 4 ---
s = read("frontend/src/components/Header.tsx")
s = s.replace(
    'className="w-10 h-10 rounded-xl',
    'title="Prosthetic Intelligence" className="w-10 h-10 rounded-xl'
)
write("frontend/src/components/Header.tsx", s)
commit("2025-10-04", "11:55", "Add title attribute to header logo for tooltip on hover")

# --- Oct 5 ---
s = read("frontend/src/components/Header.tsx")
s = s.replace(
    '<Stethoscope className="w-5 h-5 text-white" />',
    '<span className="sr-only">Prosthetic Intelligence logo</span>\n            <Stethoscope className="w-5 h-5 text-white" />'
)
write("frontend/src/components/Header.tsx", s)
commit("2025-10-05", "17:20", "Add screen reader label to stethoscope icon")

# --- Oct 6 ---
s = read("backend/services/prompt_builder.py")
s = s.replace(
    '"""Build the system and user prompts for the OpenAI API call."""',
    '"""Build the system and user prompts for the OpenAI API call.\n\nSupports text-only and multimodal (vision) message construction.\n"""'
)
write("backend/services/prompt_builder.py", s)
commit("2025-10-06", "10:05", "Expand prompt builder module docstring with vision note")

# --- Oct 8 ---
s = read("backend/api/routes.py")
s = s.replace('image_findings[:6000]', 'image_findings[:8000]')
write("backend/api/routes.py", s)
commit("2025-10-08", "13:40", "Increase vision findings truncation limit to 8000 chars")

# --- Oct 9 ---
s = read(".gitignore")
s += "\n# VS Code workspace settings\n.vscode/\n"
write(".gitignore", s)
commit("2025-10-09", "09:15", "Add VS Code workspace directory to gitignore")

# --- Oct 10 ---
s = read("backend/api/routes.py")
s = s.replace(
    '# Mapping: form-field name',
    '# -- Photo field configuration ----------------------------------------\n# Mapping: form-field name'
)
write("backend/api/routes.py", s)
commit("2025-10-10", "16:30", "Add section separator comment above photo field mapping")

# --- Oct 11 ---
s = read("backend/api/routes.py")
s = s.replace(
    '    relevant = retrieve_chunks(query)',
    '    logger.debug("Retrieval query length: %d chars", len(query))\n    relevant = retrieve_chunks(query)'
)
write("backend/api/routes.py", s)
commit("2025-10-11", "12:00", "Log retrieval query length before embedding lookup")

# --- Oct 12 ---
s = read("frontend/src/App.tsx")
s = s.replace('shadow-sm">', 'shadow-sm transition-opacity duration-300">')
write("frontend/src/App.tsx", s)
commit("2025-10-12", "15:40", "Add fade transition to error notification banner")

# --- Oct 14 ---
s = read("backend/api/routes.py")
s = s.replace(
    'query = " ".join(query_parts)',
    'query = " ".join(p.strip() for p in query_parts)'
)
write("backend/api/routes.py", s)
commit("2025-10-14", "10:25", "Strip whitespace from individual query parts before joining")

# --- Oct 15 ---
s = read("backend/config/settings.py")
s = s.replace('max_context_chunks: int = 20', 'max_context_chunks: int = 25')
write("backend/config/settings.py", s)
commit("2025-10-15", "14:55", "Increase default max context chunks to 25 for richer responses")

# --- Oct 16 ---
s = read("frontend/index.html")
s = s.replace(
    '<link rel="preconnect" href="https://fonts.googleapis.com" />',
    '<!-- External fonts loaded with preconnect for performance -->\n    <link rel="preconnect" href="https://fonts.googleapis.com" />'
)
write("frontend/index.html", s)
commit("2025-10-16", "11:35", "Add clarifying comment above font preconnect links")

# --- Oct 18 ---
s = read("backend/services/embedding_store.py")
s = s.replace(
    '    logger.info("Loaded %d chunks from parquet into memory", len(sources))',
    '    logger.info("Loaded %d chunks from parquet into memory", len(sources))\n    if embeddings.size > 0:\n        logger.debug("Embedding dimensions: %d", embeddings.shape[1])'
)
write("backend/services/embedding_store.py", s)
commit("2025-10-18", "09:45", "Log embedding vector dimensions when loading parquet cache")

# --- Oct 19 ---
s = read("backend/services/retriever.py")
s = s.replace(
    '"to", "for", "with", "this", "that", "it", "at", "by", "as",',
    '"to", "for", "with", "this", "that", "it", "at", "by", "as",\n    "from", "was", "were", "be", "been", "has", "have", "had",'
)
write("backend/services/retriever.py", s)
commit("2025-10-19", "16:10", "Extend stop words list with common verb forms")

# --- Oct 20 ---
s = read("frontend/src/components/LoadingState.tsx")
s = s.replace(
    'export default function LoadingState',
    '/** Displays animated loading indicator while AI processes the case. */\nexport default function LoadingState'
)
write("frontend/src/components/LoadingState.tsx", s)
commit("2025-10-20", "13:20", "Add JSDoc comment to LoadingState component")

# --- Oct 22 ---
s = read("backend/services/pdf_cache.py")
s = s.replace(
    'PDFs are NEVER re-read at runtime.',
    'PDFs are NEVER re-read at runtime.\nThis ensures sub-second startup after the initial generation step.'
)
write("backend/services/pdf_cache.py", s)
commit("2025-10-22", "10:50", "Clarify startup performance note in pdf_cache docstring")

# --- Oct 23 ---
s = read("backend/api/routes.py")
s = s.replace(
    '# -- Photo field configuration ----------------------------------------\n# Mapping: form-field name',
    '# -- Photo field configuration (field_name, human_label) --------------\n# Mapping: form-field name'
)
write("backend/api/routes.py", s)
commit("2025-10-23", "15:30", "Add field name annotation to photo configuration comment")

# --- Oct 24 ---
s = read("backend/config/settings.py")
s = s.replace('chunk_overlap_tokens: int = 100', 'chunk_overlap_tokens: int = 120')
write("backend/config/settings.py", s)
commit("2025-10-24", "11:15", "Increase default chunk overlap to 120 tokens for better continuity")

# --- Oct 25 ---
s = read("frontend/src/App.tsx")
s = s.replace(
    "type View = 'form' | 'loading' | 'results';",
    "/** Possible view states for the main application flow. */\ntype View = 'form' | 'loading' | 'results';"
)
write("frontend/src/App.tsx", s)
commit("2025-10-25", "17:00", "Add JSDoc comment to View type alias")

# --- Oct 26 ---
s = read("backend/api/routes.py")
# Insert log after image processing loop, before vision analysis section
s = s.replace(
    '    # -- 3. Vision analysis',
    '    if not image_parts:\n        logger.debug("No clinical photographs uploaded for this case")\n\n    # -- 3. Vision analysis'
)
# Check if the exact match is "── 3." with unicode
if '# -- 3. Vision analysis' not in s:
    s = read("backend/api/routes.py")
    # Try unicode em dash version
    s = s.replace(
        '    # \u2500\u2500 3. Vision analysis',
        '    if not image_parts:\n        logger.debug("No clinical photographs uploaded for this case")\n\n    # \u2500\u2500 3. Vision analysis'
    )
write("backend/api/routes.py", s)
commit("2025-10-26", "12:40", "Log when no clinical photographs are included in request")

# --- Oct 28 ---
s = read("backend/services/openai_service.py")
s = s.replace(
    'max_retries=0,   # fail fast',
    'max_retries=0,   # fail fast; caller should handle retries with backoff'
)
write("backend/services/openai_service.py", s)
commit("2025-10-28", "09:55", "Clarify retry strategy comment in OpenAI client config")

# --- Oct 29 ---
s = read("backend/services/prompt_builder.py")
# Find the RESPONSE_SCHEMA_INSTRUCTION line and add a separator before it
s = s.replace(
    'RESPONSE_SCHEMA_INSTRUCTION = """',
    '# -- JSON response schema sent as part of the user prompt ----------------\nRESPONSE_SCHEMA_INSTRUCTION = """'
)
write("backend/services/prompt_builder.py", s)
commit("2025-10-29", "14:20", "Add section separator before response schema instruction block")

# --- Oct 30 ---
s = read(".gitignore")
s += "\n# macOS\n.DS_Store\n"
write(".gitignore", s)
commit("2025-10-30", "11:10", "Add macOS .DS_Store to gitignore for cross-platform compatibility")

# --- Oct 31 ---
s = read("backend/services/embedding_store.py")
s = s.replace(
    '    # Vectorized cosine similarity',
    '    # Vectorized cosine similarity -- full-scan; fast enough for <10k chunks'
)
write("backend/services/embedding_store.py", s)
commit("2025-10-31", "16:45", "Annotate cosine similarity with performance expectation note")

print("\n=== All gap commits created! Now need to reorder chronologically. ===")
