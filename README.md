🚀 AI-Powered Product Search Engine (Vespa + Node.js)

A lightweight, assignment-friendly keyword + vector search system built with Vespa.ai, Node.js, and Docker, supporting multi-tenant CRUD, BM25 search, vector search, and rate limiting.

This project provides a simple but complete demo of a production-style search backend.

✅ Project Status

✔ Vespa running in Docker
✔ Application package deployed
✔ Document CRUD API (Node.js)
✔ BM25 keyword search
✔ Vector similarity search (static embeddings placeholder)
✔ Per-tenant rate limiting
✔ LRU caching layer
✔ Postman tested
✔ Complete documentation included

✨ Features

🔍 Full-text BM25 search (title, body, tags)

📄 Document CRUD (create / fetch / delete)

🧠 Vector search using Vespa nearest-neighbor

🔒 Per-tenant rate limiting (simple in-memory)

⚡ LRU caching for search queries

🐳 Docker Compose local setup

🌍 Multi-tenant indexing (via tenant query param)

📬 Postman collection provided

🛠 Tech Stack
- Vespa.ai (Search + Vector Index)
- Node.js (Express.js REST API)
- Docker + Docker Compose
- LRU Cache (in-memory)
- HuggingFace embeddings (optional future enhancement)
- Postman for testing

🏗 Architecture Overview

Node.js API receives documents

(Optional) embeddings can be generated — static vector used currently

API feeds documents into Vespa (/document/v1/...)

Vespa indexes + stores

Search queries → API → Vespa /search

📁 Folder Structure
search-engine/
├── api/                     # Node.js API
│   ├── index.js
│   ├── routes/
│   ├── services/
│   ├── utils/
│   └── config/
│
├── vespa-app/               # Vespa application
│   ├── deployment.xml
│   ├── services.xml
│   └── schemas/
│       └── doc.sd
│
├── docs/                    # Setup + Postman guides
│   └── vespa-setup-and-postman-guide.md
│
├── docker-compose.yml
└── README.md

📡 API Endpoints Overview
Documents
Method	Endpoint	Description
POST	/documents?tenant={id}	Create / index a document
GET	/documents/{id}?tenant={id}	Retrieve a document
DELETE	/documents/{id}?tenant={id}	Delete
Search
Method	Endpoint	Description
GET	/search?q=text&tenant={id}	BM25 search
GET	/search/vector?tenant={id}	Vector similarity search
Health Check
Method	Endpoint
GET	/health
⚙️ Quick Start
1. Clone Repo
git clone <your-repo-url>
cd search-engine

2. Start Docker Services
docker-compose up --build

3. Deploy Vespa Application
docker exec -it vespa bash
/opt/vespa/bin/vespa-deploy prepare /app
/opt/vespa/bin/vespa-deploy activate <SESSION_ID>

4. Check Vespa Health
http://localhost:8080/state/v1/health

🧪 Testing with Postman

Import the collection located at:

docs/Search.postman_collection.json


Includes:

✔ Insert document
✔ BM25 search
✔ Vector search
✔ Delete document

🔮 Future Enhancements / Possibilities

These make the project production-ready:

Real HuggingFace embeddings (MiniLM, ColBERT, GTE, MPNet…)

Hybrid ranking: BM25 + ANN fusion

Redis-based cache + rate limiting

Search UI dashboard

Query rewriting + spelling correction

Multi-tenant isolation via namespaces

Facets, filters, and aggregations

⚠️ Simplifications for Assignment

To keep the demo simple and quick to review:

Vector embeddings use a static placeholder (0.5 × 128)

Rate limiting uses in-memory LRU (not Redis)

No authentication needed

Basic logging only
