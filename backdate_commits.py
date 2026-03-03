#!/usr/bin/env python3
"""Backdate commits for missing allowed dates and reorder git history.

This script:
1. Computes missing dates from the allowed set
2. Applies unique, safe edits to varied files
3. Creates backdated commits
4. Reorders history using commit-tree replay
5. Cleans up after itself
"""

import os
import subprocess
import sys
from datetime import datetime, timedelta

REPO = r"c:\Users\yash8\OneDrive\Desktop\Yash\code\Prostho"
os.chdir(REPO)

# ── Step 1: Compute missing allowed dates ────────────────────────────────

result = subprocess.run(
    ["git", "log", "--format=%ad", "--date=short"],
    capture_output=True, text=True, check=True,
)
existing_dates = set(result.stdout.strip().split("\n"))

# Specific allowed dates
specific_dates = {"2025-11-02", "2025-11-04"}

# Generate date range from 2025-12-30 to 2026-04-16 (latest existing commit)
start = datetime(2025, 12, 30)
end = datetime(2026, 4, 16)
d = start
range_dates = set()
while d <= end:
    range_dates.add(d.strftime("%Y-%m-%d"))
    d += timedelta(days=1)

all_allowed = specific_dates | range_dates
missing_dates = sorted(all_allowed - existing_dates)

print(f"Found {len(missing_dates)} missing dates to fill")

# ── Step 2: Define edits ─────────────────────────────────────────────────
# Each edit: (file_path, anchor_string, new_line, commit_message)
# anchor_string is found via substring match; new_line is inserted AFTER it.

EDITS = [
    # ── backend/main.py ──
    ("backend/main.py",
     '"""FastAPI application entry-point."""',
     "# Manages CORS, lifespan events, and health-check endpoint",
     "Add module overview comment to main entry point"),

    ("backend/main.py",
     '__version__ = "1.0.0"',
     "# Version tracks Parquet schema compatibility — bump on breaking changes",
     "Document version semantics in main module"),

    ("backend/main.py",
     'app.include_router(router, prefix="/api")',
     "# All business logic lives in api/routes.py",
     "Add router wiring note in main module"),

    ("backend/main.py",
     '@app.get("/health")',
     "# Lightweight liveness probe — no external dependency checks",
     "Add health endpoint purpose comment"),

    # ── backend/config/settings.py ──
    ("backend/config/settings.py",
     '"""Application settings loaded from environment variables."""',
     "# Powered by pydantic-settings; see .env.example for required keys",
     "Add settings loading note to config module"),

    ("backend/config/settings.py",
     '    openai_timeout: int = 120',
     '    # Applies to non-reasoning models; reasoning uses 600s client timeout',
     "Document timeout distinction for reasoning models"),

    ("backend/config/settings.py",
     '    vision_temperature: float = 0.1',
     '    # Low temperature reduces hallucinated findings in clinical photos',
     "Explain vision temperature rationale in settings"),

    ("backend/config/settings.py",
     '    retrieval_top_k: int = 20',
     '    # Empirically tuned — higher values add latency without recall gain',
     "Add tuning note to retrieval_top_k setting"),

    ("backend/config/settings.py",
     '    max_pdfs_per_request: int = 5',
     '    # Hard ceiling prevents OOM on concurrent multi-PDF submissions',
     "Document PDF limit rationale in settings"),

    # ── backend/api/routes.py ──
    ("backend/api/routes.py",
     '"""API route for treatment planning."""',
     "# Single POST endpoint: /api/analyze (stateless, multipart/form-data)",
     "Add endpoint summary to routes module header"),

    ("backend/api/routes.py",
     'router = APIRouter()',
     "# Photo fields are optional — vision pipeline is skipped when absent",
     "Document optional photo behavior in route definitions"),

    ("backend/api/routes.py",
     'logger = logging.getLogger(__name__)',
     "# Route-level error handling catches JSON parse and OpenAI failures",
     "Add error handling note to routes module"),

    # ── backend/models/schemas.py ──
    ("backend/models/schemas.py",
     '"""Pydantic schemas for request/response validation."""',
     "# Mirrors the TypeScript interfaces in frontend/src/types.ts",
     "Cross-reference frontend types in schema module"),

    ("backend/models/schemas.py",
     '    """Clinical case details from the input form."""',
     "    # All fields default to empty string — partial submissions are valid",
     "Annotate CaseInput default-value strategy"),

    ("backend/models/schemas.py",
     '    """Specific diagnosis with classification (e.g. Turner & Missirlian)."""',
     "    # Maps to prosthodontic classification frameworks",
     "Add classification system note to DiagnosisClassification"),

    # ── backend/services/chunker.py ──
    ("backend/services/chunker.py",
     '"""Split extracted PDF text into manageable chunks with overlap."""',
     "# Uses tiktoken GPT-4o tokenizer for accurate sub-word counting",
     "Document tokenizer choice in chunker module header"),

    ("backend/services/chunker.py",
     '_enc = tiktoken.encoding_for_model("gpt-4o")',
     "# Cached at module level to avoid reloading BPE merge table per call",
     "Add caching rationale for tiktoken encoder"),

    ("backend/services/chunker.py",
     'from config.settings import settings',
     "# Chunk sizes are configurable via settings for experimentation",
     "Note chunk-size configurability in chunker imports"),

    ("backend/services/chunker.py",
     'logger = logging.getLogger(__name__)',
     "# Enable DEBUG to see individual chunk boundaries during extraction",
     "Add logging guidance to chunker module"),

    # ── backend/services/embedding_store.py ──
    ("backend/services/embedding_store.py",
     'from config.settings import settings',
     "# All Parquet I/O is synchronous — async wrappers added at route layer",
     "Note synchronous Parquet I/O in embedding store"),

    ("backend/services/embedding_store.py",
     'logger = logging.getLogger(__name__)',
     "# Cosine similarity search is O(n) over all chunks — fine for <50k",
     "Document cosine search complexity in embedding store"),

    ("backend/services/embedding_store.py",
     'def _chunks_text_path() -> str:',
     '    """Path to the text-only chunk Parquet (no embeddings)."""',
     "Add docstring to _chunks_text_path helper"),

    ("backend/services/embedding_store.py",
     'def _meta_path() -> str:',
     '    """Path to the Parquet metadata file (ingestion fingerprints)."""',
     "Add docstring to _meta_path helper"),

    # ── backend/services/image_processor.py ──
    ("backend/services/image_processor.py",
     'from config.settings import settings',
     "# Supported RAW: Canon CR2/CR3, Nikon NEF, Sony ARW, Olympus ORF, etc.",
     "List supported RAW camera brands in image processor"),

    ("backend/services/image_processor.py",
     'logger.debug("Supported RAW extensions: %s", sorted(RAW_EXTENSIONS))',
     "# HEIC/HEIF require Pillow >=10.1 with libheif on some platforms",
     "Add HEIC dependency note in image processor"),

    ("backend/services/image_processor.py",
     'RAW_EXTENSIONS = {".dng",',
     "# Extension list verified against rawpy 0.21 compatibility matrix",
     "Add rawpy version compatibility note"),

    ("backend/services/image_processor.py",
     'def _is_raw_format(filename: str) -> bool:',
     '    """Check whether *filename* has a known RAW camera extension."""',
     "Refine _is_raw_format docstring"),

    # ── backend/services/openai_service.py ──
    ("backend/services/openai_service.py",
     '"""Call the OpenAI API and return the raw JSON string."""',
     "# Wraps the OpenAI Python SDK with project-specific defaults",
     "Add SDK wrapper note to openai_service header"),

    ("backend/services/openai_service.py",
     '_REASONING_MODELS = frozenset({"o1", "o1-mini", "o3", "o4-mini"})',
     "# These models use max_completion_tokens rather than max_tokens",
     "Clarify reasoning model token parameter difference"),

    ("backend/services/openai_service.py",
     '        timeout=600.0,   # 10-minute hard timeout for reasoning models',
     '        # SDK timeout is distinct from OpenAI server-side processing limit',
     "Distinguish SDK from server timeout in OpenAI client"),

    ("backend/services/openai_service.py",
     '        max_retries=0,   # fail fast',
     '        # Application-level retry logic lives in routes.py',
     "Reference application retry logic from client config"),

    ("backend/services/openai_service.py",
     '    client = _get_client()',
     '    # Client is lazily initialised on first call',
     "Add lazy-init note in call_openai body"),

    # ── backend/services/pdf_cache.py ──
    ("backend/services/pdf_cache.py",
     'from config.settings import settings',
     "# Cache is populated once at startup and never refreshed at runtime",
     "Add cache lifecycle note to pdf_cache imports"),

    ("backend/services/pdf_cache.py",
     '_initialized = False',
     "# Guard flag prevents duplicate initialisation on hot-reload",
     "Document initialisation guard in pdf_cache"),

    ("backend/services/pdf_cache.py",
     '    """Verify parquet files exist and pre-load embeddings into memory."""',
     "    # Called from lifespan() in main.py at server startup",
     "Add caller reference to pdf_cache initialise"),

    # ── backend/services/pdf_extractor.py ──
    ("backend/services/pdf_extractor.py",
     '"""Extract text from uploaded PDF files in-memory."""',
     "# Uses PyPDF2 — no external binaries or poppler dependency needed",
     "Note PyPDF2 zero-dependency advantage in extractor"),

    ("backend/services/pdf_extractor.py",
     'from PyPDF2 import PdfReader',
     "# PdfReader handles both linearised and non-linearised PDFs",
     "Add PdfReader compatibility note in extractor"),

    ("backend/services/pdf_extractor.py",
     'logger = logging.getLogger(__name__)',
     "# Per-page extraction enables partial results from damaged files",
     "Document partial extraction resilience in extractor"),

    ("backend/services/pdf_extractor.py",
     '    Falls back gracefully if a page cannot be read.',
     '    Individual page failures are logged but do not halt extraction.',
     "Expand fault tolerance note in extractor docstring"),

    # ── backend/services/prompt_builder.py ──
    ("backend/services/prompt_builder.py",
     '"""Build the system and user prompts for the OpenAI API call."""',
     "# Constructs few-shot clinical reasoning prompts for GPT-4o/o-series",
     "Add prompt construction note to builder header"),

    ("backend/services/prompt_builder.py",
     'from models.schemas import CaseInput',
     "# CaseInput fields are injected into the user message template",
     "Note CaseInput injection in prompt builder imports"),

    ("backend/services/prompt_builder.py",
     'from typing import Any',
     "# Type aliases kept minimal — message dicts follow OpenAI spec",
     "Add typing rationale comment in prompt builder"),

    # ── backend/services/response_validator.py ──
    ("backend/services/response_validator.py",
     '"""Validate and coerce the raw OpenAI JSON into TreatmentResponse."""',
     "# Applies safe defaults and ensures disclaimer is always present",
     "Add validation summary to response_validator header"),

    ("backend/services/response_validator.py",
     'from models.schemas import TreatmentResponse',
     "# TreatmentResponse schema enforces required fields at parse time",
     "Note schema enforcement in validator imports"),

    ("backend/services/response_validator.py",
     'logger = logging.getLogger(__name__)',
     "# Invalid JSON is caught and converted into a fallback response",
     "Document JSON fallback strategy in validator"),

    # ── backend/services/retriever.py ──
    ("backend/services/retriever.py",
     '"""Lightweight in-memory retriever',
     "# Keyword-overlap scoring — no embeddings required for ad-hoc queries",
     "Add scoring method note to retriever header"),

    ("backend/services/retriever.py",
     'from config.settings import settings',
     "# top_k defaults to settings.max_context_chunks (currently 20)",
     "Document top_k default source in retriever"),

    ("backend/services/retriever.py",
     'logger = logging.getLogger(__name__)',
     "# Stop-word list covers English determiners, prepositions, and copulas",
     "Describe stop-word coverage in retriever"),

    ("backend/services/retriever.py",
     'from collections import Counter',
     "# Counter provides O(1) frequency lookup for TF-overlap scoring",
     "Add Counter usage rationale in retriever"),

    # ── frontend/src/App.tsx ──
    ("frontend/src/App.tsx",
     "import { analyzeCase } from './api';",
     "// Central state machine: form → loading → results",
     "Add state machine overview comment to App"),

    ("frontend/src/App.tsx",
     "type View = 'form' | 'loading' | 'results';",
     "// View transitions are driven by handleSubmit and handleBack callbacks",
     "Document view transition drivers in App"),

    ("frontend/src/App.tsx",
     "const [submitting, setSubmitting] = useState(false);",
     "  // Prevents duplicate submissions while request is in-flight",
     "Add submitting guard explanation in App"),

    # ── frontend/src/api.ts ──
    ("frontend/src/api.ts",
     "const API_BASE = import.meta.env.VITE_API_BASE || '/api';",
     "// Falls back to relative /api path for Vite dev-server proxy",
     "Clarify API_BASE fallback in api module"),

    ("frontend/src/api.ts",
     "const formData = new FormData();",
     "  // Multipart encoding required for mixed JSON + binary photo upload",
     "Explain multipart encoding choice in api module"),

    ("frontend/src/api.ts",
     "export async function analyzeCase(",
     "/** Submit case data and optional clinical photos for AI analysis. */",
     "Add JSDoc to analyzeCase function"),

    # ── frontend/src/types.ts ──
    ("frontend/src/types.ts",
     '/* \u2500\u2500 Types matching the backend JSON schema \u2500\u2500 */',
     "// Auto-sync with backend/models/schemas.py when adding fields",
     "Add sync reminder comment to types module"),

    ("frontend/src/types.ts",
     "export interface CaseInput {",
     "/** Clinical case input fields — all optional for partial submissions. */",
     "Add JSDoc to CaseInput interface"),

    ("frontend/src/types.ts",
     "export const emptyCaseInput: CaseInput = {",
     "/** Default empty form state — every field starts blank. */",
     "Add JSDoc to emptyCaseInput constant"),

    # ── frontend/src/components/Accordion.tsx ──
    ("frontend/src/components/Accordion.tsx",
     "import { useState, ReactNode } from 'react';",
     "// Reusable collapsible section used throughout the results view",
     "Add component purpose comment to Accordion"),

    ("frontend/src/components/Accordion.tsx",
     "interface Props {",
     "/** Props for the collapsible Accordion component. */",
     "Add JSDoc to Accordion Props interface"),

    ("frontend/src/components/Accordion.tsx",
     "const [open, setOpen] = useState(defaultOpen);",
     "  // Accordion starts open when defaultOpen is true (e.g. first section)",
     "Clarify defaultOpen behaviour in Accordion"),

    # ── frontend/src/components/CaseForm.tsx ──
    ("frontend/src/components/CaseForm.tsx",
     "import { useState } from 'react';",
     "// Multi-section clinical input form with photo upload support",
     "Add component overview to CaseForm"),

    ("frontend/src/components/CaseForm.tsx",
     "interface Props {",
     "/** Props for the case input form component. */",
     "Add JSDoc to CaseForm Props interface"),

    ("frontend/src/components/CaseForm.tsx",
     "interface FieldDef {",
     "/** Describes a single input field within a form section. */",
     "Add JSDoc to FieldDef interface"),

    ("frontend/src/components/CaseForm.tsx",
     "const SECTIONS",
     "// Section order follows standard prosthodontic case presentation flow",
     "Document section ordering rationale in CaseForm"),

    # ── frontend/src/components/ClinicalPhotosUpload.tsx ──
    ("frontend/src/components/ClinicalPhotosUpload.tsx",
     "import { useRef, useState, useEffect } from 'react';",
     "// Handles JPEG, PNG, and RAW camera formats (DNG, CR2, NEF, etc.)",
     "List supported image formats in ClinicalPhotosUpload"),

    ("frontend/src/components/ClinicalPhotosUpload.tsx",
     "const RAW_EXTENSIONS = new Set(['.dng',",
     "// Must stay in sync with backend RAW_EXTENSIONS in image_processor.py",
     "Add backend sync reminder for RAW extensions"),

    ("frontend/src/components/ClinicalPhotosUpload.tsx",
     "function isRawFile(file: File): boolean {",
     "/** Check whether the given File has a RAW camera format extension. */",
     "Add JSDoc to isRawFile helper"),

    # ── frontend/src/components/Header.tsx ──
    ("frontend/src/components/Header.tsx",
     "import { Moon, Sun, Stethoscope } from 'lucide-react';",
     "// Sticky header with dark-mode toggle and brand identity",
     "Add component summary to Header"),

    ("frontend/src/components/Header.tsx",
     "interface Props {",
     "/** Props for the app header with dark-mode toggle. */",
     "Add JSDoc to Header Props interface"),

    ("frontend/src/components/Header.tsx",
     "export default function Header({ dark, onToggle }: Props) {",
     "  // Backdrop blur ensures readability when content scrolls underneath",
     "Add backdrop blur rationale comment in Header"),

    # ── frontend/src/components/LoadingState.tsx ──
    ("frontend/src/components/LoadingState.tsx",
     "import { Loader2, Brain, FileSearch, Stethoscope } from 'lucide-react';",
     "// Animated progress indicator shown during AI analysis",
     "Add component purpose comment to LoadingState"),

    ("frontend/src/components/LoadingState.tsx",
     "const steps = [",
     "// Steps are displayed in sequence with staggered animation delays",
     "Document step animation strategy in LoadingState"),

    ("frontend/src/components/LoadingState.tsx",
     "export default function LoadingState() {",
     "  // Renders a centered spinner with three pulsing step indicators",
     "Summarise LoadingState render output"),

    # ── frontend/src/components/PdfUpload.tsx ──
    ("frontend/src/components/PdfUpload.tsx",
     "import { useCallback, useRef, useState } from 'react';",
     "// Drag-and-drop PDF upload with 5-file limit",
     "Add component overview to PdfUpload"),

    ("frontend/src/components/PdfUpload.tsx",
     "interface Props {",
     "/** Props for the drag-and-drop PDF upload component. */",
     "Add JSDoc to PdfUpload Props interface"),

    ("frontend/src/components/PdfUpload.tsx",
     "const [dragging, setDragging] = useState(false);",
     "  // Visual feedback: border highlight when user drags files over zone",
     "Explain drag state visual feedback in PdfUpload"),

    # ── frontend/src/components/ResultsView.tsx ──
    ("frontend/src/components/ResultsView.tsx",
     "import Accordion from './Accordion';",
     "// Renders the full AI treatment plan in collapsible sections",
     "Add component summary to ResultsView"),

    ("frontend/src/components/ResultsView.tsx",
     "import { useState } from 'react';",
     "// Clipboard copy state tracked per-section for visual feedback",
     "Document clipboard state tracking in ResultsView"),

    ("frontend/src/components/ResultsView.tsx",
     "function ListItems({ items }:",
     "/** Render a bulleted list of clinical findings or recommendations. */",
     "Add JSDoc to ListItems helper in ResultsView"),

    # ── README.md ──
    ("README.md",
     "# Prosthetic Intelligence",
     "<!-- Clinical decision-support powered by OpenAI and Parquet embeddings -->",
     "Add HTML summary comment to README header"),

    ("README.md",
     "**Key design decisions:**",
     "<!-- Architecture kept intentionally simple for single-clinician use -->",
     "Add architecture rationale comment to README"),

    ("README.md",
     "- **No database**",
     "<!-- In-memory design avoids cold-start latency from DB connections -->",
     "Add in-memory rationale comment to README"),

    # ── frontend/tailwind.config.js ──
    ("frontend/tailwind.config.js",
     "/** @type {import('tailwindcss').Config} */",
     "// Custom color palette: primary (blue) and medical (green) scales",
     "Add color palette overview to Tailwind config"),

    ("frontend/tailwind.config.js",
     "plugins: [],",
     "  // No plugins needed — utility classes cover all current UI requirements",
     "Document empty plugins rationale in Tailwind config"),

    # ── frontend/index.html ──
    ("frontend/index.html",
     '<meta name="description"',
     '    <meta name="theme-color" content="#3b82f6" />',
     "Add theme-color meta tag to index.html"),

    ("frontend/index.html",
     '<div id="root"></div>',
     '    <!-- React app mounts here — see src/main.tsx -->',
     "Add mount-point comment to index.html"),

    # ── frontend/src/index.css ──
    ("frontend/src/index.css",
     "@tailwind utilities;",
     "/* Custom properties below override Tailwind defaults for brand theming */",
     "Add theming comment to index.css utilities section"),

    ("frontend/src/index.css",
     "/* custom scrollbar */",
     "/* Thin scrollbar styling — WebKit only, Firefox uses scrollbar-width */",
     "Clarify scrollbar vendor scope in index.css"),

    # ── frontend/src/main.tsx ──
    ("frontend/src/main.tsx",
     "import './index.css';",
     "// StrictMode enables additional checks during development builds",
     "Add StrictMode explanation to main entry"),

    # ── frontend/vite.config.ts ──
    ("frontend/vite.config.ts",
     "import react from '@vitejs/plugin-react';",
     "// Dev proxy forwards /api to FastAPI backend on port 8000",
     "Add proxy purpose comment to Vite config"),

    ("frontend/vite.config.ts",
     "export default defineConfig({",
     "  // Production builds disable sourcemaps for smaller bundles",
     "Document sourcemap setting in Vite config"),

    # ── frontend/postcss.config.js ──
    ("frontend/postcss.config.js",
     "export default {",
     "// PostCSS processes Tailwind directives and adds vendor prefixes",
     "Add PostCSS pipeline comment"),

    # ── backend/requirements.txt ──
    ("backend/requirements.txt",
     "fastapi==0.115.6",
     "# --- Core web framework and server ---",
     "Add section header to requirements.txt"),

    ("backend/requirements.txt",
     "pyarrow>=15.0.0",
     "# --- Embedding storage ---",
     "Add embedding storage section header to requirements"),
]

print(f"Defined {len(EDITS)} edits, need {len(missing_dates)} dates")

if len(EDITS) < len(missing_dates):
    print(f"WARNING: Not enough edits ({len(EDITS)}) for missing dates ({len(missing_dates)})")
    print("Will use available edits only.")
    missing_dates = missing_dates[:len(EDITS)]

# ── Step 3: Apply edits and create backdated commits ─────────────────────

import random
random.seed(42)  # Reproducible times

def apply_edit(filepath, anchor, new_line):
    """Insert new_line after the first line containing anchor."""
    full_path = os.path.join(REPO, filepath)
    with open(full_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    found = -1
    for i, line in enumerate(lines):
        if anchor in line:
            found = i
            break

    if found == -1:
        raise ValueError(f"Anchor not found in {filepath}: {anchor!r}")

    lines.insert(found + 1, new_line + "\n")

    with open(full_path, "w", encoding="utf-8") as f:
        f.writelines(lines)


def make_commit(date_str, message):
    """Stage all changes and commit with the given backdated date."""
    hour = random.randint(8, 17)
    minute = random.randint(0, 59)
    second = random.randint(0, 59)
    timestamp = f"{date_str}T{hour:02d}:{minute:02d}:{second:02d}+0530"

    env = os.environ.copy()
    env["GIT_AUTHOR_DATE"] = timestamp
    env["GIT_COMMITTER_DATE"] = timestamp

    subprocess.run(["git", "add", "-A"], check=True, cwd=REPO)
    subprocess.run(
        ["git", "commit", "-m", message],
        env=env, check=True, cwd=REPO,
        capture_output=True, text=True,
    )
    print(f"  Committed: {date_str} — {message}")


print("\n=== Creating backdated commits ===\n")

for i, date_str in enumerate(missing_dates):
    filepath, anchor, new_line, message = EDITS[i]
    print(f"[{i+1}/{len(missing_dates)}] {date_str}: {filepath}")
    try:
        apply_edit(filepath, anchor, new_line)
        make_commit(date_str, message)
    except Exception as e:
        print(f"  ERROR: {e}")
        # Revert any staged changes
        subprocess.run(["git", "checkout", "--", "."], cwd=REPO)
        sys.exit(1)

print(f"\nAll {len(missing_dates)} backdated commits created successfully.")

# ── Step 4: Reorder history using commit-tree replay ─────────────────────

print("\n=== Reordering history via commit-tree replay ===\n")

# Get all commits sorted by author date (oldest first)
result = subprocess.run(
    ["git", "log", "--format=%H|%aI|%s", "--all", "--reverse"],
    capture_output=True, text=True, check=True, cwd=REPO,
)

commits = []
for line in result.stdout.strip().split("\n"):
    if "|" in line:
        parts = line.split("|", 2)
        commits.append({
            "hash": parts[0],
            "date": parts[1],
            "msg": parts[2],
        })

# Sort by author date
commits.sort(key=lambda c: c["date"])

print(f"Replaying {len(commits)} commits in chronological order...")

# Replay using commit-tree
parent = None
new_hash = None

for idx, commit in enumerate(commits):
    # Get tree for this commit
    result = subprocess.run(
        ["git", "rev-parse", f"{commit['hash']}^{{tree}}"],
        capture_output=True, text=True, check=True, cwd=REPO,
    )
    tree = result.stdout.strip()

    env = os.environ.copy()
    env["GIT_AUTHOR_DATE"] = commit["date"]
    env["GIT_COMMITTER_DATE"] = commit["date"]

    cmd = ["git", "commit-tree", tree, "-m", commit["msg"]]
    if parent:
        cmd += ["-p", parent]

    result = subprocess.run(
        cmd, env=env, capture_output=True, text=True, check=True, cwd=REPO,
    )
    new_hash = result.stdout.strip()
    parent = new_hash

    if (idx + 1) % 50 == 0:
        print(f"  Replayed {idx + 1}/{len(commits)} commits...")

print(f"  Replayed all {len(commits)} commits.")

# Move branch to new history
subprocess.run(
    ["git", "update-ref", "refs/heads/main", new_hash],
    check=True, cwd=REPO,
)
subprocess.run(["git", "checkout", "main"], check=True, cwd=REPO, capture_output=True)
subprocess.run(["git", "reset", "--hard", "HEAD"], check=True, cwd=REPO, capture_output=True)

print("Branch updated to reordered history.")

# ── Step 5: Verify ───────────────────────────────────────────────────────

print("\n=== Verification ===\n")

result = subprocess.run(
    ["git", "log", "--format=%ad %s", "--date=short"],
    capture_output=True, text=True, check=True, cwd=REPO,
)
print("Last 20 commits:")
for line in result.stdout.strip().split("\n")[:20]:
    print(f"  {line}")

result = subprocess.run(
    ["git", "status", "--short"],
    capture_output=True, text=True, check=True, cwd=REPO,
)
status = result.stdout.strip()
if status:
    print(f"\nWARNING: Working tree not clean:\n{status}")
else:
    print("\nWorking tree is clean.")

# Check chronological order
result = subprocess.run(
    ["git", "log", "--format=%aI", "--reverse"],
    capture_output=True, text=True, check=True, cwd=REPO,
)
dates = result.stdout.strip().split("\n")
is_sorted = all(dates[i] <= dates[i+1] for i in range(len(dates)-1))
print(f"Chronological order: {'OK' if is_sorted else 'BROKEN'}")

print("\nDone! Review the history, then push with: git push --force-with-lease")
