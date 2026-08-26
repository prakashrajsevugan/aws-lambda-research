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
         +-------------------------+-------------------------+
         |                                                   |
         v                                                   v
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
            +------------------------+-----------------------+
                                     |
                                     v
                        +----------------------+
                        | PostgreSQL Database  |
                        |   (tasks table)      |
                        +----------------------+
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

### Benchmark Summary Table

| Metric / Concurrency | Target Stack | Throughput (Req/sec) | Avg Latency (ms) | p(95) GET Latency | p(95) POST Latency | Error Rate (%) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **1 VU (Single User)** | **Express Backend** | **3.92 iter/s (~15.7 req/s)** | **4.56 ms** | **13.30 ms** | **11.32 ms** | **0.00%** |
| | AWS Lambda | 4.42 iter/s (~17.68 req/s) | 293.37 ms | 560.15 ms | 314.53 ms | 0.00% |
| **10 VUs** | **Express Backend** | **39.32 req/s** | **4.20 ms** | **6.04 ms** | **10.83 ms** | **0.00%** |
| | AWS Lambda | 87.88 req/s | 291.30 ms | 351.29 ms | 318.24 ms | 0.00% |
| **50 VUs** | **Express Backend** | **196.04 req/s** | **4.84 ms** | **12.49 ms** | **11.60 ms** | **0.00%** |
| | AWS Lambda | 138.14 req/s | 370.58 ms | 1431.94 ms | 444.64 ms | 🚨 **39.28%** |
| **100 VUs** | **Express Backend** | **392.40 req/s** | **4.42 ms** | **11.10 ms** | **10.45 ms** | **0.00%** |
| | AWS Lambda | 144.68 req/s | 355.44 ms | 2155.06 ms | 382.53 ms | ⚠️ **3.64%** |
| **500 VUs** | **Express Backend** | **1,943.73 req/s** | **5.07 ms** | **19.95 ms** | **12.82 ms** | **0.00%** |
| | AWS Lambda | 233.18 req/s | 1,510.00 ms | 3309.34 ms | 3329.93 ms | 🚨 **78.16%** |
| **1000 VUs** | **Express Backend** | **2,662.70 req/s** | **114.80 ms** | **549.90 ms** | **615.22 ms** | **0.00%** |
| | AWS Lambda | *Saturated / Failed* | *N/A* | *N/A* | *N/A* | 🚨 **>80%** |

---

### 🔍 Key Benchmark Insights & Findings

#### 1. Latency & Network Overhead (Cold vs. Warm Overhead)
- **Express Baseline**: Achieved steady sub-5ms average request latency across low and medium concurrency (1 to 500 VUs). The persistent connection to PostgreSQL eliminated connection setup overhead.
- **AWS Lambda**: Exhibited a baseline latency floor of **~280ms–300ms** per operation, even under zero error rates. This is primarily caused by AWS API Gateway HTTP serialization, TLS connection overhead over the public internet, and network round-trips to the database host.

#### 2. High Concurrency Scaling & Failure Breakdown
- **Express Monolithic Server**: Handled up to **60,000 requests at 500 VUs** and **82,552 requests at 1,000 VUs** with a **0.00% error rate**. The single Node.js process managed DB pool connections efficiently.
- **AWS Lambda Failure Cascade**: Under 50 VUs and higher, Lambda experienced massive error rates (**39.28% at 50 VUs**, rising to **78.16% at 500 VUs**).

#### 3. Root Cause Analysis: Serverless PostgreSQL Bottleneck
1. **Database Connection Pool Exhaustion**: In AWS Lambda, concurrent invocations scale horizontally by spinning up isolated container instances. Each container instance initializes its own `pg.Pool` (max 5 connections). Under 500 concurrent VUs, Lambda creates up to 500 concurrent container instances, attempting **2,500 simultaneous PostgreSQL connections**, instantly exceeding PostgreSQL's max connection limits (`FATAL: sorry, too many clients already`).
2. **Lack of Serverless Connection Proxying**: Without an intermediary proxy layer, traditional relational databases collapse under serverless scale.

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

## 📜 License
MIT License.
