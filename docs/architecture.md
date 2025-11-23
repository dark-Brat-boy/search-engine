# 📘 Architecture Design Document  
## AI-Powered Product Search Engine (Vespa + Node.js)

---

## 1. System Overview

This project is a lightweight but production-aligned search engine built to satisfy the interview assignment requirements while demonstrating scalable architecture design.

The system provides:

- 🔍 Full-text BM25 keyword search
- 🧠 Semantic vector search (ANN)
- 👥 Multi-tenant document indexing
- 📦 Document CRUD operations
- 🚦 Per-tenant rate limiting
- ⚡ In-memory caching
- 🐳 Docker-based reproducible environment

Everything runs locally using Vespa.ai + Node.js (Express).

---

## 2. High-Level Architecture Diagram

```
              ┌─────────────────────────────────────────┐
              │             Client / Postman             │
              └───────────────────┬──────────────────────┘
                                  │ REST API Calls
                                  ▼
                 ┌──────────────────────────────────┐
                     │        Node.js API (Express)      │
                     │-----------------------------------│
                     │ /documents   → CRUD                │
                     │ /search      → BM25 + ANN search   │
                     │ /health      → System check        │
                     │ Rate limiting (per tenant)         │
                     │ LRU cache (query-level caching)    │
                     └──────────────┬─────────────────────┘
                                    │ HTTP JSON
                                ▼
             ┌──────────────────────────────────────────────────┐
                 │                      Vespa.ai                    │
             │--------------------------------------------------│
                 │ Document Store + Search Index + ANN Engine       │
                 │ Ranking Profiles (BM25, semantic vector)         │
                 │ Schema: doc.sd                                   │
                 │ Container + Content Node (Single-node cluster)   │
             └──────────────────────────────────────────────────┘
```

---

## 3. Component Breakdown

### 3.1 Node.js API Layer

The API is responsible for:

- Feeding documents into Vespa
- Running BM25 searches
- Running vector searches
- Rate-limiting per tenant
- Caching frequent searches
- Providing CRUD endpoints
- Simplifying Vespa's interface for clients

#### API Endpoints (All Required by the Assignment)

| Endpoint | Purpose |
|----------|---------|
| **POST /documents** | Insert a new document |
| **GET /documents/:id** | Retrieve document details |
| **DELETE /documents/:id** | Delete a document |
| **GET /search?q=…&tenant=…** | BM25 + ANN search |
| **GET /health** | Health check including Vespa |

#### Why Node.js → Vespa?

**Node.js provides:**
- Multi-tenant logic
- Request validation
- Query caching
- Rate limiting
- Optional embedding generation

**Vespa handles the heavy lifting:**
- Scoring
- ANN
- BM25
- Data persistence

---

### 3.2 Vespa.ai Layer

Vespa provides:

#### Core Features Used

| Feature | Purpose |
|---------|---------|
| `doc.sd` schema | Defines fields + vector |
| BM25 index | Full-text search |
| Nearest-neighbor ANN | Vector search |
| Ranking profiles | BM25 ranking + semantic ranking |
| Document API | CRUD operations |
| Search API | Querying with YQL |

#### Vespa Deployment Components

| File | Purpose |
|------|---------|
| `deployment.xml` | Deployment descriptor |
| `services.xml` | Container + content cluster configuration |
| `schemas/doc.sd` | Schema and ranking profiles |

---

## 4. Multi-Tenancy Strategy

A simple but effective multi-tenant model was implemented:

- ✔ **Tenant is provided via query param**: `?tenant=`
- ✔ **Every document stores tenantId**: `fields.tenantId = ""`
- ✔ **Searches filter by tenant**: `where tenantId contains ""`
- ✔ **Per-tenant isolation includes**:
  - Rate limiting
  - Cache segmentation
  - Query filtering

**📈 Scalable future version:**
- Use Vespa namespaces → `document/v1/{tenant}/doc/…`

---

## 5. Data Flow Diagrams

### 5.1 Document Ingestion (POST /documents)

```
Client
   │
   ▼
Node.js API
   │  - Create UUID  
   │  - Insert tenantId  
   │  - Generate placeholder vector  
   │  - Wrap fields for Vespa  
   ▼
Vespa Document API
   │
   ▼
Document stored + indexed
```

### 5.2 Search Flow (GET /search)

```
Client
   │
   ▼
Node.js API
   │  - Rate limit  
   │  - Cache check  
   │  - Build YQL  
   ▼
Vespa Search API
   │
   ▼
Node returns ranked results
   │
   ▼
Cache stored for future identical queries
```

---

## 6. Caching Strategy

Using **lru-cache** with:

- **Max size**: 200 entries
- **TTL**: 30 seconds
- **Cache key**: `${tenant}:${q}`

**Benefits:**
- ✔ Reduces repeated search load
- ✔ Important for load-testing
- ✔ Assignment-compliant lightweight caching

---

## 7. Rate Limiting Strategy

Implemented via an in-memory counter per tenant.

**Config:**
- **100 requests / minute / tenant**

**Mechanism:**

| Field | Meaning |
|-------|---------|
| `count` | Number of requests sent |
| `windowStart` | Timestamp when window started |

When exceeded → return **429 Too Many Requests**.

**Assignment requirement satisfied:**
- "Basic rate limiting per tenant" ✔

---

## 8. Vespa Schema Design (doc.sd)

### Fields

```
field id        type string
field tenantId  type string
field title     type string
field body      type string
field tags      type array<string>
field vector    type tensor<float>(x[128])
```

### Ranking Profiles

#### BM25 (default keyword search)

```xml
rank-profile bm25 inherits default {
    first-phase {
        expression: bm25(title) + bm25(body)
    }
}
```

#### Semantic (ANN vector search)

```xml
rank-profile semantic inherits default {
    inputs {
        query(qvec) tensor<float>(x[128])
    }
    first-phase {
        expression: closeness(field, vector)
    }
}
```

---

## 9. Ranking Explained

### 9.1 BM25 Ranking

Used for normal text search:

```
bm25(title) + bm25(body)
```

### 9.2 Vector ANN

Used for semantic search:

```
nearestNeighbor(vector, qvec)
```

**Note:** Vector embeddings are placeholder 128-dimension values (future: HuggingFace MiniLM embeddings).

---

## 10. Deployment Architecture

### Docker Compose Services

```
services:
  vespa     → runs search engine
  api       → Node.js server
```

### Networking

- API → `http://vespa:8080`

Everything runs locally with no external services required.

---

## 11. Production Readiness Checklist

| Category | Status | Notes |
|----------|--------|-------|
| Scalability | ✔ | Vespa scales horizontally |
| Fault tolerance | ✔ | Vespa supports redundancy |
| Security | ⚠ | API keys can be added |
| Monitoring | ✔ | Vespa exposes Prometheus |
| Logging | ✔ | API + Vespa logs |
| Embeddings | ⚠ | Placeholder only (future HF embeddings) |
| Observability | ✔ | Add p99 metrics on API |

---

## 12. Assignment Requirements Mapping

| Requirement | Implemented? | Notes |
|-------------|--------------|-------|
| POST /documents | ✔ | CRUD implemented |
| GET /documents/:id | ✔ | Done |
| DELETE /documents/:id | ✔ | Done |
| GET /search | ✔ | BM25 + ANN |
| Multi-tenant | ✔ | Query param + filtering |
| Rate limiting | ✔ | 100 req/min per tenant |
| Caching | ✔ | LRU |
| Health check | ✔ | Checks Vespa also |
| Documentation | ✔ | Setup + architecture |


---

## 13. Future Enhancements

- **Real HuggingFace MiniLM/GTE/ColBERT embeddings**
- **Hybrid ranking** (BM25 + Vector combined)
- **Reranking using ColBERT**
- **Query rewriting & suggestions**
- **Namespace-based multi-tenant architecture**
- **UI search dashboard**
- **Online learn-to-rank based on clicks**
- **Message queue for async operations**

---
