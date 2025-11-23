# 📘 Architecture Design Document  
## AI-Powered Product Search Engine (Vespa + Node.js)

---

## 1. System Overview

This system implements:

- Full-text **BM25 keyword search**
- Basic **vector ANN search**
- Multi-tenant document indexing
- Node.js API for CRUD + Search
- Per-tenant rate limiting
- Response caching (LRU)
- Docker-based deployment

It is intentionally lightweight to satisfy the assignment requirements while following real-world architecture principles.

---

## 2. High-Level Architecture

              ┌─────────────────────────────────────────┐
              │             Client / Postman             │
              └───────────────────┬──────────────────────┘
                                  │ REST API Calls
                                  ▼
                 ┌──────────────────────────────────┐
                 │      Node.js API (Express)       │
                 │----------------------------------│
                 │ /documents → CRUD                │
                 │ /search    → BM25 + ANN          │
                 │ /health    → health check        │
                 │ Tenant-based rate limiting       │
                 │ LRU caching                      │
                 └──────────────┬───────────────────┘
                                │ HTTP → port 8080
                                ▼
             ┌──────────────────────────────────────────────────┐
             │                    Vespa.ai                      │
             │--------------------------------------------------│
             │ Document storage + indexing + ANN engine         │
             │ Ranking profiles (BM25 + vector)                 │
             │ Schema (doc.sd)                                  │
             │ Container (search API) + Content cluster         │
             └──────────────────────────────────────────────────┘


---

## 3. Component Breakdown

### 3.1 Node.js API

**Location**: `/api/` directory

**Responsibilities**:

- Document ingestion (CRUD operations)
- Query routing to Vespa
- BM25 keyword search via YQL
- Vector similarity search (ANN)
- Multi-tenant filtering
- Per-tenant rate limiting (100 req/min)
- LRU response caching (30s TTL)
- Error handling and validation

**Key Files**:
- `index.js` - Express app setup
- `routes/documents.js` - CRUD endpoints
- `routes/search.js` - Search endpoints (BM25 + vector)
- `routes/health.js` - Health check
- `services/vespaClient.js` - Vespa HTTP client
- `middleware/rateLimit.js` - Per-tenant rate limiting
- `utils/embedding.js` - Vector generation (hash-based)

### Endpoints (Required by assignment)

| Endpoint | Description |
|---------|-------------|
| **POST /documents?tenant={id}** | Index new document (tenant required) |
| **GET /documents/:id** | Retrieve document by ID |
| **DELETE /documents/:id** | Delete document by ID |
| **GET /search?q={query}&tenant={id}** | BM25 keyword search |
| **GET /search?q={query}&tenant={id}&vector=true** | Vector similarity search |
| **GET /health** | Health check + Vespa dependency status |

---

### 3.2 Vespa.ai Search Engine

**Location**: `/vespa-app/` directory

Vespa handles:

| Feature | Purpose |
|--------|---------|
| `doc.sd` schema | Defines document structure, fields, ranking profiles |
| BM25 search | Keyword retrieval via YQL queries |
| Tensor field | Vector storage and ANN search |
| Ranking profiles | `bm25` (default) and `semantic` (vector) |
| Document API | CRUD via `/document/v1/` endpoints |
| Search API | Query execution via `/search/` endpoint |
| Content cluster | Document storage and indexing |

**Deployment Files**:

- **services.xml** - Vespa service configuration
- **deployment.xml** - Cluster deployment settings
- **schemas/doc.sd** - Document schema with fields and ranking profiles

---

## 4. Multi-Tenancy Strategy

This assignment requires *basic* multi-tenant support.  
We implement:

### Tenant Identification:
- **Query Parameter**: `?tenant={id}` (required for POST and search)
- **Document Field**: Stored as `tenantId` in each document
- **Indexing**: Indexed as `attribute` for fast filtering
- **Search Filtering**: Applied in YQL queries: `tenantId contains "{tenantId}"`
- **Rate Limiting**: Per-tenant buckets tracked in-memory
- **Caching**: Cache keys include tenant ID for isolation


### Supports:

- Per-tenant rate limiting
- Per-tenant caching
- Logical separation

(Scalable future upgrade → namespace per tenant.)

---

## 5. Data Flow

### 5.1 Document Ingestion

Detailed steps:

1. **Client Request**: `POST /documents?tenant=abc` with JSON body:
   ```json
   {
     "title": "Product Name",
     "body": "Description",
     "tags": ["tag1", "tag2"]
   }
   ```

2. **API Processing**:
   - Validates `tenant` query parameter (required)
   - Generates UUID v4 as document ID
   - Adds `tenantId` to document fields
   - Generates 128-dim vector embedding from `title + body`:
     - Uses hash-based algorithm (placeholder)
     - Normalized to 0-1 float range
   - Wraps into Vespa format: `{ fields: { id, tenantId, title, body, tags, vector } }`

3. **Vespa Indexing**:
   - POST to `/document/v1/default/doc/docid/{id}`
   - Vector formatted as `tensor<float>(x[128])`
   - Vespa indexes text fields (title, body, tags) for BM25
   - Stores vector in attribute for ANN search
   - Document stored in content cluster

---

### 5.2 Search Flow

```
1. Client → GET /search?q=text&tenant=abc&vector=false
2. Node API receives request
3. Rate limiter checks tenant quota (100 req/min)
4. Check LRU cache: key = "tenant:query:isVector"
5. If cache hit → return cached result
6. If cache miss:
   a. Build YQL query for Vespa
   b. For BM25: title/body contains query + tenantId filter
   c. For vector: nearestNeighbor(vector, qvec) + tenantId filter (uses static [0.5...] vector)
7. Send HTTP GET → Vespa /search/ endpoint
8. Vespa executes query with ranking profile (bm25 or semantic)
9. Results returned to API
10. Cache result (TTL: 30 seconds)
11. Return JSON response to client
```


---

## 6. Caching Strategy

Using **LRU cache** (lru-cache npm package):

- **Key Format**: `{tenantId}:{query}:{isVector}`
- **TTL**: **30 seconds** (30,000 ms)
- **Max Size**: 200 entries
- **Location**: In-memory, per API instance
- **Behavior**: 
  - Cache hit → returns `{ cached: true, ...data }`
  - Cache miss → queries Vespa, then caches result
- **Purpose**: Maximizes performance during repetitive querying
- **Limitation**: Not shared across instances (in-memory only)

**Note**: Not intended for production (use Redis for distributed caching).

---

## 7. Rate Limiting Strategy

**Implementation**: Custom middleware (`api/middleware/rateLimit.js`)

**Per-tenant limits**:
- **Max Requests**: 100 per tenant
- **Time Window**: 60 seconds (1 minute)
- **Storage**: In-memory Map (`tenant → { count, windowStart }`)

**Algorithm**:
1. Extract tenant from `?tenant=` query param or `x-tenant-id` header
2. If tenant missing → return 400 error
3. Check if bucket exists for tenant
4. If window expired (now - windowStart > 60s) → reset counter
5. If count >= 100 → return **429 Too Many Requests**
6. Otherwise → increment count and proceed

**Response on limit exceeded**:
```json
{
  "error": "Rate limit exceeded",
  "tenant": "abc",
  "limit": 100,
  "windowSeconds": 60
}
```

**Limitation**: In-memory only, not shared across API instances.

---

## 8. Vespa Schema (doc.sd)

### Fields

| Field | Type | Indexing |
|-------|------|----------|
| id | string | attribute + summary |
| tenantId | string | attribute + summary |
| title | string | index + summary |
| body | string | index + summary |
| tags | array<string> | index + summary |
| vector | tensor<float>(x[128]) | attribute |

### Ranking Profiles

1. **bm25** (default) – Text ranking:
   - Expression: `bm25(title) + bm25(body)`
   - Used for keyword search queries
   - Inherits `default` fieldset (title, body, tags)

2. **semantic** – ANN vector search:
   - Input: `query(qvec) tensor<float>(x[128])`
   - Expression: `closeness(field, vector)`
   - Used when `?vector=true` in search query
   - Target hits: 10 nearest neighbors
   - **Note**: Query vector is currently a static placeholder `[0.5, ..., 0.5]`
---

## 9. Ranking Overview

### BM25 (Keyword Search)

- **Ranking Profile**: `bm25` (default)
- **Formula**: `bm25(title) + bm25(body)`
- **Query**: YQL with `title contains "query" or body contains "query"`
- **Fieldset**: Searches across `title`, `body`, and `tags` fields
- **Tenant Filter**: Applied via `tenantId contains "{tenantId}"`

### Semantic (Vector ANN)

- **Ranking Profile**: `semantic`
- **Method**: `nearestNeighbor(vector, qvec)` with `closeness(field, vector)`
- **Target Hits**: 10 nearest neighbors
- **Query Vector**: Static placeholder `[0.5, 0.5, ..., 0.5]` (128 dimensions)
  - **Note**: Currently uses a fixed vector for all queries (placeholder implementation)
  - Future: Should generate embedding from query text using same hash-based algorithm
- **Document Vectors**: Generated from `title + body` during indexing (hash-based, 128 dims)
- **Tenant Filter**: Applied alongside vector search

---

## 10. Deployment Architecture

### Docker Compose launches:

| Service | Description |
|---------|-------------|
| `vespa` | Search engine |
| `api` | Node.js REST service |

**Networking**:

- API → Vespa: `http://vespa:8080` (internal Docker network)
- Client → API: `http://localhost:3000` (exposed port)
- Vespa Admin: `http://localhost:19071` (exposed for monitoring)

**Environment Variables**:
- `VESPA_ENDPOINT`: `http://vespa:8080` (default)
- `PORT`: `3000` (default)

**Volume Mounts**:
- `./vespa-app:/app` - Vespa application package
- `./api:/usr/src/app` - API source code (development)

**Note**: Local development only, no external dependencies required.

---

## 11. Production-Readiness Checklist

✔ Horizontal scaling (Vespa cluster)  
✔ Node is stateless → scale via containers  
✔ Monitoring (`/prometheus/v1`)  
✔ Logging (stdout → can integrate ELK/Datadog)  
✔ Security options (API key, HTTPS)  
✔ Deployment via CI/CD  

---

## 12. Trade-offs (Vespa vs Elasticsearch)

| Requirement | Vespa | Elasticsearch |
|-------------|-------|---------------|
| Native vector field | ✔ | ❌ plugin required |
| Hybrid BM25 + ANN | ✔ | ⚠️ limited |
| Free clustering | ✔ | ❌ paid |
| Query-time ranking functions | ✔ | ⚠️ limited |

Assignment requires vectors → Vespa is correct choice.

---

## 13. Embedding Generation

**Current Implementation** (Placeholder):

- **Location**: `api/utils/embedding.js`
- **Method**: Hash-based deterministic vector generation
- **Dimensions**: 128 (fixed)
- **Algorithm**:
  1. For each dimension `i` (0-127):
  2. Hash function: `hash(text + "_" + i)`
  3. Normalize: `(hash % 1000) / 1000` → float in [0, 1]
- **Input**: `title + " " + body` text
- **Output**: Array of 128 floats

**Usage**:
- **Document Indexing**: ✅ Used when creating documents (generates vector from title+body)
- **Vector Search**: ❌ NOT used - search uses static `[0.5, ..., 0.5]` placeholder vector

**Purpose**: 
- Satisfies assignment requirement for vector field in documents
- Ready for upgrade to real embeddings (HuggingFace models)

**Future Enhancement**: 
- Replace with HuggingFace transformers (MiniLM, MPNet, ColBERT, GTE)
- Generate query embeddings from search text (currently uses static vector)

---

## 14. Future Improvements

- **Real HuggingFace embeddings** (MiniLM, MPNet, ColBERT, GTE)
- **Hybrid ranking**: Combine BM25 + ANN scores with boosting
- **Query expansion** + spelling correction
- **Reranking**: Transformer-based reranking models
- **Multi-index routing**: Route queries to specialized indices
- **Freshness & recency boosting**: Time-based ranking factors
- **UI dashboard**: Web interface for search testing
- **Redis caching**: Distributed cache for multi-instance deployments
- **Authentication**: API key or JWT-based auth
- **Monitoring**: Prometheus metrics + Grafana dashboards
- **Logging**: Structured logging (Winston/Pino) with ELK stack

---

# END OF DOCUMENT
