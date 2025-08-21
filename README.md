# AirAware

A simple Node + Express app with weather UI and a chatbot powered by Groq API with local datasets (txt/md/json, including README.md) for retrieval-augmented answers.

## Prerequisites
- Node.js 18+
- npm

## Setup
1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the project root:
```bash
# Required to enable Groq responses
GROQ_API_KEY=your_groq_api_key

# Optional
GROQ_MODEL=llama3-8b-8192
DATASETS_DIR=./datasets
PORT=3000
```

3. Add dataset files:
- Place `.txt`, `.md`, or `.json` files under the `datasets/` folder.
- The loader scans subfolders recursively.
- The project root `README.md` is also included automatically in the index.

4. Start the server:
```bash
npm start
```

- App will run at `http://localhost:3000`.
- Chatbot page: `http://localhost:3000/chatbot`.

## Chat API
- POST `/api/chat`
```json
{
  "message": "Your question",
  "topK": 4
}
```
- Response:
```json
{
  "success": true,
  "answer": "...",
  "context": [
    { "text": "...", "score": 0.42, "meta": {"file": "path"} }
  ]
}
```
- If `GROQ_API_KEY` is not set, you'll get a helpful message and context only.

## Dataset endpoints
- GET `/api/datasets/stats` — returns index stats (files, chunks, vocab size)
- POST `/api/datasets/reload` — reloads datasets from disk

## Notes
- UI is unchanged; only backend + wiring added.
- Retrieval uses a local TF‑IDF cosine similarity for simplicity.
