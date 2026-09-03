# Serverless Research — Task Management Benchmark

An end-to-end benchmark research repository designed to compare the performance, throughput, latency, and scalability of a traditional **Monolithic Express/Node.js API** versus a **Serverless AWS Lambda + API Gateway Architecture**, backed by a PostgreSQL database and tested via **k6**.

---

## 🔒 Security Audit & Sensitive Data Protection

Before pushing this repository to GitHub, a security audit was performed across all code, environment configuration, and benchmark log files.

### Security Findings
- ⚠️ **Sensitive API Endpoints**: Live cloud API Gateway endpoints were detected in local environment files (`frontend/.env` and `performance-tests/.env`).
- ⚠️ **Local Database Credentials**: Plaintext database credentials (`DB_PASSWORD`) were configured in `backend/.env`.

### Mitigation & Safe Git Push Strategy
1. **Ignored Files**: Root `.gitignore` and subdirectory `.gitignore` files are now active to prevent uploading `.env` files or `node_modules`.
2. **Sanitized Commit**: Never commit `.env` files containing live cloud infrastructure endpoints or DB credentials. Use `.env.example` templates.
3. **Revocation Recommendation**: If any API Gateway URL was publicly accessible without authorization, ensure appropriate API key authorization, IAM policies, or CORS restrictions are configured in AWS API Gateway, or redeploy/rotate the stage endpoint.

---

## 🏗️ Architecture Overview

```
                        +----------------------+
                        |   Vite + React UI    |
                        |     (Frontend)       |
                        +----------+-----------+
                                   |
            +-----------------------+------------------------+
            |                                                |
            v                                                 v
+------------------------+                       +------------------------+
| Express / Node.js API  |                       | AWS API Gateway        |
|  (Monolithic Backend)  |                       +-----------+------------+
+-----------+------------+                                   |
            |                                                v
            |                                    +------------------------+
            |                                    |   AWS Lambda Handler   |
            |                                    |    (lambda-backend)    |
            |                                    +-----------+------------+
            |                                                |
            |                                                |
            v                                                v
+----------------------+                          +----------------------+
|   PostgreSQL DB      |                          |   PostgreSQL DB      |
|     (Local)          |                          |     (AWS RDS)        |
+----------------------+                          +----------------------+
```

---

## 📁 Repository Structure

- `backend/` — Express REST API with PostgreSQL connection pooling (`server.js`, `taskController.js`, `database.js`).
- `frontend/` — Vite + React SPA interface for CRUD task operations (`App.jsx`, `api.js`).
- `lambda-backend/` — Single-file AWS Lambda handler utilizing connection pooling per warm container (`index.js`).
- `performance-tests/` — `k6` benchmark suite containing full CRUD test scenarios (`crud-test.js`, `lambda-crud-test.js`, `run-crud-baseline.sh`) and raw result logs (`crud-result.txt`, `lambda-crud-result.txt`).

---

## 📊 Comprehensive Performance Benchmark & Comparison

Below is the comparative analysis based on the actual benchmark execution logs in `crud-result.txt` (Express Baseline) and `lambda-crud-result.txt` (AWS Lambda).

### 📊 Benchmark Comparison Summary Table

| Concurrency (VUs) | Target Architecture | Throughput (Req/s) | Avg Latency | p(95) Latency | Error Rate (%) | Status |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| **1 VU** | Express Backend (Monolith) | *N/A* | *N/A* | *N/A* | *N/A* | *N/A* |
| | **AWS Lambda + API Gateway** | **1.64 req/s** | **346 ms** | **467 ms** | **0%** | ✅ Stable |
| **10 VUs** | **Express Backend (Monolith)** | **9.98 req/s** | **1.56 ms** | **2.96 ms** | **0%** | ✅ Stable |
| | AWS Lambda + API Gateway | 17.68 req/s | 293 ms | 342 ms | 0% | ✅ Stable |
| **50 VUs** | **Express Backend (Monolith)** | **49.88 req/s** | **2.02 ms** | **5.89 ms** | **0%** | ✅ Stable |
| | AWS Lambda + API Gateway | 87.88 req/s | 291 ms | 334 ms | 0% | ✅ Stable |
| **100 VUs** | **Express Backend (Monolith)** | **99.72 req/s** | **2.29 ms** | **6.78 ms** | **0%** | ✅ Stable |
| | AWS Lambda + API Gateway | 138.14 req/s | 371 ms | 486 ms | 39.28% | ⚠️ Degraded |
| **500 VUs** | **Express Backend (Monolith)** | **497.20 req/s** | **3.65 ms** | **14.58 ms** | **0%** | ✅ Stable |
| | AWS Lambda + API Gateway | 233.18 req/s | 1.51 s | 3.31 s | 78.16% | 🚨 Severe degradation |

---

### 🔍 Key Benchmark Insights & Findings

#### 1. Latency & Network Overhead (Cold vs. Warm Overhead)
- **Express Baseline**: Maintained ultra-low sub-6ms average request latency across all tested concurrency levels (1.56 ms at 10 VUs up to 5.07 ms at 1,000 VUs). The persistent connection pool to PostgreSQL eliminated connection establishment overhead.
- **AWS Lambda**: Exhibited a baseline latency floor of **~290ms–350ms** per operation under low concurrency (1–50 VUs). This overhead stems from AWS API Gateway HTTP serialization, TLS setup over the public internet, and ephemeral database connection overhead.

#### 2. High Concurrency Scaling & Failure Breakdown
- **Express Monolithic Server**: Handled up to **30,000 total requests at 1,000 VUs** with a **0% error rate** and a peak throughput of **991.48 req/s**. The single Node.js process managed database connection pooling smoothly without dropouts.
- **AWS Lambda Failure Threshold**: AWS Lambda maintained **0% error rate up to 50 VUs** (87.88 req/s, 291 ms avg latency). However, performance degraded significantly at **100 VUs** (**39.28% error rate**, 371 ms avg, 486 ms p95) and suffered severe degradation at **500 VUs** (**78.16% error rate**, 1.51 s avg, 3.31 s p95).

#### 3. Root Cause Analysis: Serverless PostgreSQL Bottleneck
1. **Database Connection Pool Exhaustion**: AWS Lambda scales by creating new container instances on-demand. Under high VU concurrency (100–500 VUs), hundreds of simultaneous container instances attempt to establish individual PostgreSQL connections, rapidly exhausting PostgreSQL's max client connection limit (`FATAL: sorry, too many clients already`).
2. **Lack of Connection Multiplexing**: Without a proxy layer like RDS Proxy or PgBouncer, direct relational database connections degrade rapidly under serverless concurrency spikes.

#### 💡 Recommendations for Serverless Architectures
To achieve high concurrency parity with the monolithic backend in serverless environments:
- **Deploy AWS RDS Proxy or PgBouncer**: Multiplexes thousands of ephemeral Lambda connections into a shared pool for PostgreSQL.
- **Use HTTP-Based Database APIs**: Leverage serverless-native drivers (e.g. Neon Serverless Driver, Supabase JS, AWS Aurora Data API).
- **Configure Provisioned Concurrency**: Eliminates Lambda cold-start latency spikes.

---

## 🛠️ Getting Started & Setup

### Prerequisites
- Node.js (v18+) & npm
- PostgreSQL database
- k6 installed for running load scripts

### 1. Database Schema
Execute the following SQL script in your PostgreSQL instance:

```sql
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

### 2. Environment Setup

Copy example environment files and configure your local credentials:

#### Backend (`backend/.env`)
```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=serverless_research
DB_USER=postgres
DB_PASSWORD=your_password_here
```

#### Frontend (`frontend/.env`)
```env
VITE_API_ENDPOINT=your_api_endpoint_here
```

#### Lambda Function Configuration
Configure the following environment variables in your AWS Lambda function or Serverless framework template:
`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`.

---

### 3. Local Execution

#### Run Express Backend
```bash
cd backend
npm install
npm run serve   # or npm run dev for hot-reloading
```

#### Run React Frontend
```bash
cd frontend
npm install
npm run dev
```

#### Run Performance Benchmarks
```bash
# Baseline Express Benchmark (10 VUs)
BASE_URL=<API_BASE_URL> k6 run performance-tests/crud-test.js

# Full Automated Concurrency Test Suite
cd performance-tests
bash run-crud-baseline.sh

# AWS Lambda Benchmark
API_ENDPOINT=<LAMBDA_API_ENDPOINT> k6 run performance-tests/lambda-crud-test.js
```

---
