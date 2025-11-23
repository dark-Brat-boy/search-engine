Vespa Setup & Postman Testing Guide (Final Clean Version)
📘 Overview

This guide explains how to run Vespa Search Engine locally using Docker, deploy the schema, feed documents, and test using Postman and the Node.js API layer.

The guide includes:

Vespa installation

Running Vespa via Docker Compose

Deploying services.xml, deployment.xml, doc.sd

Feeding documents

Running BM25 + Vector search

Testing through Node.js assignment API

Clean, simple instructions (non-technical friendly)

🚀 1. Install Required Tools
Install Docker Desktop

Download: https://www.docker.com/products/docker-desktop/

🚀 2. Project Structure
search-engine/
├── docker-compose.yml
│
├── vespa-app/
│   ├── services.xml
│   ├── deployment.xml
│   └── schemas/
│       └── doc.sd
│
├── api/
│   ├── index.js
│   ├── routes/
│   ├── services/
│   ├── utils/
│   └── config/
|   └── middleware/
│
└── docs/
    └── vespa-setup-and-postman-guide.md

🚀 3. Docker Compose (No Changes Needed)

docker-compose.yml already:

Runs the Vespa container

Runs the Node.js API container

Connects both services over Docker network

You don’t need to modify it.

🚀 4. Vespa Application (Inside vespa-app/)

These files control how Vespa runs:

services.xml → search container + content cluster

deployment.xml → deployment configuration

doc.sd → document schema (title, body, tags, vector, ranking config)

These are already configured.

🚀 5. Start Vespa + API

Run:

docker-compose up --build


Check Vespa health:

http://localhost:8080/state/v1/health


You should see:

{"status":{"code":"up"}}

🚀 6. Deploy Vespa Application

Open Vespa container:

docker exec -it vespa bash


Prepare:

/opt/vespa/bin/vespa-deploy prepare /app


Activate:

/opt/vespa/bin/vespa-deploy activate <SESSION_ID>


Check:

http://localhost:8080/ApplicationStatus

🎯 7. Test Using Node.js REST API (Assignment Requirement)

The assignment requires your own API layer — so test using these endpoints:

⭐ Create Document
POST http://localhost:3000/documents?tenant=tenantId


Body:

{
  "title": "High Quality Hammer",
  "body": "Made of steel",
  "tags": ["tools", "hardware"]
}


The API will automatically:

Generate a UUID

Add tenantId

Add placeholder vector

Feed it into Vespa

⭐ Get Document
GET {{API_BASE_URL}}/documents/{id}?tenant=

⭐ BM25 Search
GET {{API_BASE_URL}}/search?q=hammer&tenant=

⭐ Vector Search (Simple placeholder)
GET {{API_BASE_URL}}/search/vector?tenant=


Uses static embedding [0.5 …] for now
(ready for HuggingFace upgrade later)

⭐ Delete Document
DELETE {{API_BASE_URL}}/documents/{id}?tenant=

🚀 8. Testing Vespa Direct API (Optional)

Vespa’s own Document API (skip if using your Node.js API only).

Create Document
POST {{BASE_URL}}/document/v1/default/doc/docid/1

Read Document
GET {{BASE_URL}}/document/v1/default/doc/docid/1

BM25 Search
GET {{BASE_URL}}/search/?query=hammer