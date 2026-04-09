# Prosthetic Intelligence — Treatment Planning Assistant
<!-- Clinical decision-support powered by OpenAI and Parquet embeddings -->

A modern clinical decision-support web application that combines uploaded PDF reference material with AI-powered analysis to generate structured prosthodontic treatment plans.

---

## Architecture Overview

```
┌─────────────────────┐        HTTP         ┌─────────────────────────┐       API        ┌──────────┐
│   React Frontend    │ ◄─────────────────► │    FastAPI Backend      │ ───────────────► │  OpenAI  │
│   (Vite + Tailwind) │  multipart/form     │                         │                  │  GPT-4o  │
│                     │     + JSON           │  ┌─ pdf_extractor.py   │                  └──────────┘
│   • Case Form       │                     │  ├─ chunker.py          │
│   • PDF Upload      │                     │  ├─ retriever.py        │
│   • Result Cards    │                     │  ├─ prompt_builder.py   │
│   • Evidence View   │                     │  ├─ openai_service.py   │
│                     │                     │  └─ response_validator  │
└─────────────────────┘                     └─────────────────────────┘
```

**Key design decisions:**
<!-- Architecture kept intentionally simple for single-clinician use -->
- **No database** — all processing is in-memory per request
<!-- In-memory design avoids cold-start latency from DB connections -->
- **No authentication** — single-user clinical tool
- **Stateless** — every request is self-contained
- **Structured JSON output** — OpenAI JSON mode enforces the response schema
- **Medical safety guardrails** — built into the system prompt

---

## Folder Structure

```
Prostho/
├── backend/
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes.py              # POST /api/analyze endpoint
│   ├── config/
│   │   ├── __init__.py
│   │   └── settings.py            # Pydantic settings from .env
│   ├── models/
│   │   ├── __init__.py
│   │   └── schemas.py             # Request/response Pydantic models
│   ├── services/
│   │   ├── __init__.py
│   │   ├── pdf_extractor.py       # PyPDF2-based text extraction
│   │   ├── chunker.py             # Token-aware text chunking
│   │   ├── retriever.py           # Keyword-based chunk ranking
│   │   ├── prompt_builder.py      # System/user prompt construction
│   │   ├── openai_service.py      # OpenAI API client
│   │   └── response_validator.py  # JSON → TreatmentResponse validation
│   ├── .env.example
│   ├── main.py                    # FastAPI app entry point
│   └── requirements.txt
├── frontend/
│   ├── public/
│   │   └── favicon.svg
│   ├── src/
│   │   ├── components/
│   │   │   ├── Accordion.tsx
│   │   │   ├── CaseForm.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── LoadingState.tsx
│   │   │   ├── PdfUpload.tsx
│   │   │   └── ResultsView.tsx
│   │   ├── api.ts
│   │   ├── App.tsx
│   │   ├── index.css
│   │   ├── main.tsx
│   │   └── types.ts
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
├── .gitignore
└── README.md
```

---

## API Contract

### `POST /api/analyze`

**Content-Type:** `multipart/form-data`

| Field       | Type                | Required | Description                        |
|-------------|---------------------|----------|------------------------------------|
| `case_data` | string (JSON)       | Yes      | JSON-serialized `CaseInput` object |
| `files`     | File[] (PDF)        | No       | Up to 5 PDF files, max 20 MB each |

**Response:** `APIResponse`

```json
{
  "success": true,
  "data": { /* TreatmentResponse */ },
  "error": null
}
```

### `GET /health`

Returns `{"status": "ok"}`.

---

## Data Flow

1. **User** fills in the case form and uploads PDF(s)
2. **Frontend** sends `multipart/form-data` to `POST /api/analyze`
3. **Backend** receives the request:
   - Validates `case_data` via Pydantic
   - Validates PDF files (type, size, count)
   - **pdf_extractor** reads each PDF into text in-memory
   - **chunker** splits text into ~600-token chunks
   - **retriever** ranks chunks by keyword relevance to the case
   - **prompt_builder** assembles system prompt + user prompt with PDF excerpts and case details
   - **openai_service** calls GPT-4o with JSON mode
   - **response_validator** parses and validates the response
4. **Backend** returns structured `APIResponse`
5. **Frontend** renders the treatment plan in cards and accordions

---

## Prompt Orchestration Design

The system prompt establishes the AI as a senior MDS Prosthodontist with strict rules:

- PDF references are the **primary** knowledge base
- Latest clinical knowledge **supplements** (doesn't replace) PDF knowledge
- Conflicts between old and new knowledge must be **explicitly stated**
- Missing information must be **identified**
- Red flags must be **flagged prominently**
- No fabricated citations
- Structured JSON output enforced

The user prompt includes:
- Formatted PDF excerpts (top-k most relevant chunks)
- Formatted case details (non-empty fields only)
- JSON schema instruction

---

## Setup & Run Instructions

### Prerequisites

- Python 3.11+
- Node.js 18+
- OpenAI API key

### Quick Start

1. Clone the repository
2. Set up backend and frontend (see below)
3. Access the application at http://localhost:5173

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env       # Windows
# cp .env.example .env       # macOS/Linux

# Edit .env and set your OPENAI_API_KEY
notepad .env

# Run the server
uvicorn main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server (proxies /api to backend)
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable              | Default                                             | Description                    |
|-----------------------|-----------------------------------------------------|--------------------------------|
| `OPENAI_API_KEY`      | *(required)*                                        | Your OpenAI API key            |
| `OPENAI_MODEL`        | `gpt-4o`                                            | Model to use                   |
| `OPENAI_MAX_TOKENS`   | `8192`                                              | Max tokens for completion      |
| `OPENAI_TEMPERATURE`  | `0.2`                                               | Lower = more deterministic     |
| `MAX_PDF_SIZE_MB`     | `20`                                                | Per-file upload limit          |
| `MAX_PDFS_PER_REQUEST`| `5`                                                 | Max PDFs per request           |
| `MAX_CHUNK_TOKENS`    | `600`                                               | Chunk size in tokens           |
| `MAX_CONTEXT_CHUNKS`  | `15`                                                | Chunks sent to model           |
| `CORS_ORIGINS`        | `["http://localhost:5173","http://localhost:3000"]`  | Allowed origins                |

---

## Sample Request / Response

### Sample cURL Request

```bash
curl -X POST http://localhost:8000/api/analyze \
  -F 'case_data={"patient_age":"55","patient_sex":"Male","chief_complaint":"Wants to replace missing upper front teeth","medical_history":"Controlled Type 2 Diabetes on Metformin","dental_history":"Lost 11, 21 due to trauma 2 years ago","intraoral_findings":"Adequate bone in anterior maxilla","missing_teeth":"11, 21","provisional_diagnosis":"Partial edentulism - Kennedys Class IV","proposed_treatment":"Implant supported FPD or conventional bridge","budget_sensitivity":"Moderate","patient_expectations":"Natural looking teeth"}' \
  -F 'files=@prostho_textbook.pdf'
```

### Sample Response (abbreviated)

```json
{
  "success": true,
  "data": {
    "case_summary": "55-year-old male with controlled T2DM presenting with missing 11, 21 (traumatic loss). Adequate anterior bone reported. Seeks esthetic replacement with natural appearance.",
    "need_more_information": [
      "CBCT scan to assess bone volume and density",
      "HbA1c level to confirm diabetic control",
      "Status of adjacent teeth (12, 22) including vitality and periodontal status"
    ],
    "red_flags": [],
    "working_assessment": "Kennedy Class IV partial edentulism with adequate bone for implant consideration. Diabetes control needs verification.",
    "treatment_objectives": [
      "Restore anterior esthetics",
      "Re-establish function",
      "Maintain long-term bone health"
    ],
    "recommended_treatment_plan": {
      "summary": "Two-implant supported individual crowns for 11 and 21 with provisional restoration during healing.",
      "phases": [
        {
          "phase_name": "Pre-prosthetic Phase",
          "steps": ["Obtain CBCT scan", "Verify HbA1c < 7%", "Diagnostic wax-up"],
          "rationale": "Ensure adequate bone and systemic health before surgical intervention."
        },
        {
          "phase_name": "Surgical Phase",
          "steps": ["Implant placement at 11, 21 positions", "Immediate provisional if primary stability achieved"],
          "rationale": "Two individual implants provide independent support and preserve inter-implant bone."
        },
        {
          "phase_name": "Prosthetic Phase",
          "steps": ["Impression after 3-4 months", "Custom abutments", "Individual zirconia crowns"],
          "rationale": "Individual crowns optimize esthetics and allow independent maintenance."
        }
      ]
    },
    "alternative_options": [
      {
        "option": "Conventional 3-unit FPD (12-X-X-22)",
        "indications": ["Patient declines surgery", "Insufficient bone for implants"],
        "limitations": ["Requires preparation of healthy adjacent teeth", "Pontic site bone resorption over time"],
        "when_to_choose": "When implants are contraindicated or patient refuses surgical approach."
      }
    ],
    "confidence_level": "medium",
    "disclaimer": "This output is generated by an AI clinical decision-support tool. It is NOT a diagnosis and does NOT replace the professional judgment of a qualified prosthodontist or dentist."
  },
  "error": null
}
```

---

## Future Improvements

- **Image upload support** — Clinical photograph analysis via vision models (IN PROGRESS)
- **Multi-turn conversation** — refine the plan iteratively
- **Export to PDF** — generate a printable treatment plan document
- **Voice input** — dictate case details for faster entry
- **Terminology autocomplete** — FDI tooth notation, ICD codes
- **Multi-language support** — for global clinical use
- **Embedding-based retrieval** — replace keyword search with vector similarity for better PDF chunk matching
- **Cost estimation module** — integrate regional pricing data
- **Template cases** — pre-fill common prosthodontic scenarios
- **Audit logging** — optional session logging for quality assurance
- **Offline mode** — cache common references for use without internet
- **Mobile app** — native iOS and Android applications

---

## License

MIT License - See LICENSE file for details

---

**Developed with ❤️ for prosthodontists worldwide**


## Troubleshooting

- **429 rate limit**: Reduce `embedding_batch_size` in `.env`.
- **Empty AI response**: Increase `OPENAI_MAX_TOKENS` for reasoning models.
- **Corrupt PDF**: Re-export from source; `PyPDF2` cannot decode encrypted files.
- **RAW image fails**: Install `rawpy` and `numpy` for DNG/CR2/NEF support.

## Performance

- Semantic search: < 300 ms once embeddings are cached in memory.
- Vision analysis: 5-15 s depending on image count and model latency.
- Full case analysis: 30-90 s end-to-end.
- Token usage: ~8000-18000 tokens per case depending on PDF context depth.

## API Reference

### POST `/api/analyze`

Accepts `multipart/form-data`:

| Field | Type | Required |
|-------|------|----------|
| `case_data` | JSON string | Yes |
| `photo_extraoral_smile` | File | No |
| `photo_intraoral_*` | File | No |
| `photo_maxillary_arch` | File | No |

Returns: `APIResponse { success, data: TreatmentResponse }`.

## Clinical Use Cases

| Scenario | How Prosthetic Intelligence Helps |
|----------|---------------------|
| Worn dentition | Turner-Missirlian classification, VDO assessment, full-mouth rehab guidance |
| Missing posterior teeth | RPD vs implant decision support with bone and occlusion context |
| Aesthetic rehabilitation | Shade planning, smile design, veneer vs crown criteria |
| Compromised abutments | Risk stratification, post-core considerations |

## Embedding Cache

PDF text is chunked and embedded once. The resulting data survives server
restarts. Re-embedding is only triggered when PDF folder content changes
(detected via SHA-256 folder fingerprint).

## Contributing

1. Fork and create a feature branch from `main`.
2. Backend: confirm `uvicorn main:app --reload` starts cleanly.
3. Frontend: run `npm run lint` before committing.
4. Commit messages in imperative mood: Add..., Fix..., Refactor...
5. Open a pull request with a concise description and evidence of testing.

## License and Disclaimer

This software is for **educational and research purposes** only.
It is **not a certified medical device** and must not be the sole basis
for clinical decisions. All outputs must be reviewed by a qualified
dental professional before clinical use.

## Storage Backend

Embeddings were initially stored in a local **SQLite database**.
The system is migrating to **Apache Parquet files** for:
- Zero-dependency portability (no SQLite runtime required in production)
- Fast bulk-load at startup via NumPy vectorised cosine similarity
- Inspectable, portable pre-computed embedding files