# HTTP Monitoring Dashboard

A full-stack real-time HTTP monitoring system with intelligent anomaly detection. Periodically polls HTTP endpoints, analyzes response times using statistical methods, detects anomalies via Z-score analysis and EMA prediction, and streams live updates through Server-Sent Events (SSE).

![Node.js](https://img.shields.io/badge/Node.js-20.x-green) ![React](https://img.shields.io/badge/React-18.2-blue) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue)

## 📋 Table of Contents

- [Overview](#-overview)
- [Architecture](#️-architecture)
- [Technology Stack](#️-technology-stack)
- [Folder Structure](#-folder-structure)
- [Setup Instructions](#-setup-instructions)
- [How It Works](#️-how-it-works)
- [Anomaly Detection](#-anomaly-detection)
- [Testing Strategy](#-testing-strategy)
- [Assumptions](#-assumptions)
- [Future Improvements](#-future-improvements)

---

## 🎯 Overview

This system monitors HTTP endpoint health by:
- **Polling** configurable HTTP endpoints every 5 minutes (default)
- **Storing** response data with randomly generated request payloads
- **Calculating** rolling statistics (mean, standard deviation) over 24-hour windows
- **Detecting** anomalies using Z-score analysis (2.5σ threshold) and EMA prediction
- **Streaming** real-time updates to connected clients via Server-Sent Events
- **Visualizing** response times, anomalies, and statistical metrics in an interactive dashboard

### Key Features

✅ Real-time monitoring with live updates  
✅ Statistical anomaly detection (Z-score + EMA)  
✅ Rolling window analysis (24-hour)  
✅ Multiple anomaly classifications (high, severe_high, low)  
✅ Comprehensive test coverage (35+ tests)  
✅ CI/CD pipeline with GitHub Actions  
✅ Interactive visualization with Recharts  

---

## 🏗️ Architecture

### System Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │ Header     │  │ Stats Cards│  │ Live Feed  │            │
│  │ (Health)   │  │ (Metrics)  │  │  (SSE)     │            │
│  └────────────┘  └────────────┘  └────────────┘            │
│                                                              │
│  ┌──────────────────────────┐  ┌───────────────────────┐   │
│  │   PerformanceChart       │  │  ResponseTable        │   │
│  │   (Recharts + SSE)       │  │  (Pagination + SSE)   │   │
│  └──────────────────────────┘  └───────────────────────┘   │
│         │                │                    │              │
│         └────────────────┴────────────────────┘              │
│                          │                                   │
│                   API Calls (REST)                           │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Backend (Node.js + Express)                 │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              SSE Manager (Real-time Updates)          │  │
│  └──────────────────────────────────────────────────────┘  │
│                            │                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         HTTP Poller (Cron: */5 * * * *)              │  │
│  │    • Polls endpoint every 5 minutes (configurable)    │  │
│  │    • Generates random request data                    │  │
│  │    • Measures response time                           │  │
│  └──────────────────────────────────────────────────────┘  │
│                            │                                 │
│                            ▼                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Anomaly Detector Service                    │  │
│  │    • Calculates Z-score (2.5σ threshold)             │  │
│  │    • EMA prediction (α=0.3)                          │  │
│  │    • Rolling stats (24h window, min 5 samples)       │  │
│  │    • Classifies: severe_high, high, low              │  │
│  └──────────────────────────────────────────────────────┘  │
│                            │                                 │
│                            ▼                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Repositories (Data Layer)                │  │
│  │    • responseRepository: CRUD for responses           │  │
│  │    • anomalyRepository: Anomaly data & stats         │  │
│  │    • rollingStatsService: Statistical calculations   │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  PostgreSQL Database                         │
│  ┌───────────────────┐       ┌──────────────────────────┐  │
│  │  responses        │       │  anomalies               │  │
│  │  • id (PK)        │       │  • id (PK)               │  │
│  │  • request_payload│       │  • response_id (FK)      │  │
│  │  • target_url     │       │  • z_score               │  │
│  │  • response_payload│      │  • predicted_value       │  │
│  │  • status_code    │       │  • actual_value          │  │
│  │  • response_time_ms│      │  • rolling_mean          │  │
│  │  • created_at     │       │  • rolling_stddev        │  │
│  │  • deleted_at     │       │  • is_anomaly            │  │
│  └───────────────────┘       │  • anomaly_type          │  │
│                               │  • created_at            │  │
│                               └──────────────────────────┘  │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  rolling_stats (Performance Cache)                    │  │
│  │  • id (PK)                                            │  │
│  │  • window_start                                       │  │
│  │  • window_end                                         │  │
│  │  • mean_response_time                                 │  │
│  │  • stddev_response_time                               │  │
│  │  • min_response_time                                  │  │
│  │  • max_response_time                                  │  │
│  │  • sample_count                                       │  │
│  │  • sum_response_time                                  │  │
│  │  • sum_squared                                        │  │
│  │  • created_at                                         │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow: HTTP Polling → Anomaly Detection

1. **HTTP Polling (Every 5 minutes)**
   - Cron job triggers `httpPoller.pollEndpoint()` at `*/5 * * * *`
   - Generates random request data (method, body, headers)
   - Sends HTTP request to monitored endpoint
   - Records response time, status code, error details

2. **Data Storage**
   - Response saved to `responses` table
   - Includes: target_url, request_payload (JSONB), response_payload, response_time_ms, status_code, timestamp

3. **Rolling Statistics Cache Check**
   - Check `rolling_stats` table for cached statistics
   - Cache TTL: 5 minutes (enforced by checking created_at)
   - If cache miss or expired:
     - Query last 24 hours from `responses` (minimum 5 samples)
     - Calculate mean, stddev, min, max
     - Store in `rolling_stats` table (TTL checked via created_at column)
   - If cache hit: Use cached statistics

4. **Anomaly Analysis**
   - Triggered immediately after response storage
   - Uses rolling statistics from cache or fresh calculation
   - Calculates:
     - **Mean (μ)**: Average response time
     - **Standard Deviation (σ)**: Response time variance
     - **Z-Score**: `(current_value - μ) / σ`
     - **EMA Prediction**: Exponential Moving Average (α=0.3)

5. **Anomaly Classification**
   - **severe_high**: Response time > 2x mean (extremely slow)
   - **high**: Z-score > 2.5 but response time < 2x mean  
   - **low**: Z-score < -2.5 (anomalously fast response)
   - Saves to `anomalies` table

6. **Real-time Broadcast**
   - SSE Manager broadcasts `new-response` event
   - If anomaly detected, broadcasts `anomaly-detected` event
   - Connected clients receive updates instantly

7. **Frontend Updates**
   - React components subscribe to SSE events
   - Charts re-render with new data points
   - Stats cards update with latest metrics
   - Live feed displays event notifications

---

## 🛠️ Technology Stack

### Backend

| Technology | Version | Purpose | Reasoning |
|------------|---------|---------|-----------|
| **Node.js** | 20.x | Runtime environment | Industry standard, excellent async I/O for real-time apps |
| **Express** | 4.18 | Web framework | Lightweight, minimal overhead, mature ecosystem |
| **PostgreSQL** | 14+ | Database | ACID compliance, excellent for time-series data, JSON support |
| **pg** | 8.11 | PostgreSQL client | Native driver, best performance |
| **node-cron** | 3.0 | Job scheduler | Simple, reliable cron-based scheduling |
| **axios** | 1.6 | HTTP client | Promise-based, interceptor support, widely adopted |
| **winston** | 3.11 | Logging | Structured logging, multiple transports, production-ready |
| **jest** | 29.7 | Testing framework | Rich assertion library, mocking, coverage reports |

### Frontend

| Technology | Version | Purpose | Reasoning |
|------------|---------|---------|-----------|
| **React** | 18.2 | UI framework | Component-based, virtual DOM, hooks API |
| **Vite** | 5.0 | Build tool | Lightning-fast HMR, optimized production builds |
| **Recharts** | 2.10 | Charts library | React-native, composable, responsive charts |
| **Tailwind CSS** | 3.3 | Styling | Utility-first, rapid development, small bundle size |
| **Lucide React** | 0.563 | Icons | Modern, tree-shakeable, consistent design |
| **Vitest** | 1.0 | Testing framework | Vite-native, fast, Jest-compatible API |

### DevOps

- **GitHub Actions**: CI/CD pipeline for automated testing and linting
- **ESLint**: Code quality and consistency
- **Codecov**: Test coverage tracking (optional)

---

## 📁 Folder Structure

```
http-monitoring-dashboard/
├── backend/
│   ├── src/
│   │   ├── __tests__/              # Integration tests
│   │   │   └── anomaly.integration.test.js
│   │   ├── config.js               # Environment configuration
│   │   ├── app.js                  # Express app setup
│   │   ├── index.js                # Server entry point
│   │   ├── db/
│   │   │   ├── pool.js             # PostgreSQL connection pool
│   │   │   ├── schema.sql          # Database schema
│   │   │   └── migrate.js          # Migration runner
│   │   ├── middleware/
│   │   │   └── errorHandler.js     # Global error handler
│   │   ├── routes/
│   │   │   ├── responses.js        # Response history endpoints
│   │   │   ├── anomalies.js        # Anomaly data endpoints
│   │   │   ├── events.js           # SSE endpoint
│   │   │   └── health.js           # Health check
│   │   ├── services/
│   │   │   ├── httpPoller.js       # HTTP endpoint polling
│   │   │   ├── anomalyDetector.js  # Anomaly detection logic (21 unit tests)
│   │   │   ├── responseRepository.js    # Response data access
│   │   │   ├── anomalyRepository.js     # Anomaly data access
│   │   │   ├── rollingStatsService.js   # Statistics calculations
│   │   │   └── sseManager.js       # SSE connection management
│   │   │   └── __tests__/          # Unit tests
│   │   │       └── anomalyDetector.test.js  # 21 tests
│   │   └── utils/
│   │       └── logger.js           # Winston logger
│   ├── package.json
│   └── jest.config.js              # Jest configuration
│
├── frontend/
│   ├── src/
│   │   ├── __tests__/              # Test setup
│   │   │   └── setup.js            # Vitest + ResizeObserver polyfill
│   │   ├── components/
│   │   │   ├── Header.jsx          # App header
│   │   │   ├── StatsCards.jsx      # Metrics display
│   │   │   ├── PerformanceChart.jsx     # Main chart (8 E2E tests)
│   │   │   ├── ResponseTable.jsx   # Response history table
│   │   │   ├── LiveFeed.jsx        # SSE event feed
│   │   │   ├── DetailedHealthModal.jsx  # Modal for details
│   │   │   └── __tests__/
│   │   │       └── PerformanceChart.test.jsx  # 8 E2E tests
│   │   ├── hooks/
│   │   │   ├── useSSE.js           # SSE connection hook
│   │   │   └── useResponses.js     # Response polling hook
│   │   ├── services/
│   │   │   └── api.js              # API client (axios)
│   │   ├── utils/
│   │   │   └── formatters.js       # Data formatting utilities
│   │   ├── App.jsx                 # Root component
│   │   ├── main.jsx                # Entry point
│   │   └── index.css               # Global styles
│   ├── package.json
│   ├── vite.config.js              # Vite configuration
│   ├── vitest.config.js            # Vitest configuration
│   ├── tailwind.config.js          # Tailwind configuration
│   └── index.html                  # HTML template
│
├── .github/
│   └── workflows/
│       ├── ci.yml                  # CI pipeline
│       └── README.md               # Workflow documentation
│
└── README.md                       # This file
```

---

## 🚀 Setup Instructions

### Prerequisites

- **Node.js** 20.x or higher
- **PostgreSQL** 14 or higher
- **npm** 9.x or higher

### 1. Clone Repository

```bash
git clone <repository-url>
cd http-monitoring-dashboard
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create `.env` file:

```env
# Server Configuration
PORT=4000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bizscout
DB_USER=postgres
DB_PASSWORD=postgres

# Monitoring Configuration
TARGET_URL=https://httpbin.org/anything
POLL_INTERVAL_MINUTES=5     # 5 minutes (default)

# Logging
LOG_LEVEL=info
```

Run database migration:

```bash
npm run db:migrate
```

Start backend server:

```bash
npm run dev          # Development mode with nodemon
npm start            # Production mode
```

Backend runs on `http://localhost:4000`

### 3. Frontend Setup

```bash
cd frontend
npm install
```

**Optional**: Create `.env` file (not required for local development due to Vite proxy):

```env
VITE_API_URL=http://localhost:4000/api
VITE_SSE_URL=http://localhost:4000/api/events
```

**Note**: For local development, the Vite proxy (configured in `vite.config.js`) automatically forwards `/api` requests to `http://localhost:4000`, so environment variables are not needed.

Start frontend:

```bash
npm run dev          # Development mode with HMR
npm run build        # Production build
npm run preview      # Preview production build
```

Frontend runs on `http://localhost:3000`

### 4. Run Tests

**Backend:**
```bash
cd backend
npm test                    # Run all tests with coverage
npm run test:watch          # Watch mode
```

**Frontend:**
```bash
cd frontend
npm test                    # Run all tests
npm run test:ui             # Interactive UI mode
```

### 5. Linting

```bash
# Backend
cd backend && npm run lint

# Frontend
cd frontend && npm run lint
```

---

## ⚙️ How It Works

### HTTP Polling Process

**Interval**: Every 5 minutes (configurable via `POLL_INTERVAL_MINUTES` env var, default: 5)

**Flow**:
1. Cron job triggers at `*/${intervalMinutes} * * * *` (minute-based cron expression)
2. `httpPoller.pollEndpoint()` executes:
   ```javascript
   // Generate random request data
   const requestData = {
     method: random(['GET', 'POST', 'PUT']),
     body: { userId: random(1-100), title: uuid(), completed: boolean },
     headers: { 'X-Request-Id': uuid() }
   }
   
   // Measure response time
   const startTime = Date.now()
   const response = await axios(url, requestData)
   const responseTime = Date.now() - startTime
   ```

3. Save response to database:
   ```sql
   INSERT INTO responses (target_url, request_payload, response_payload,
                          response_time_ms, status_code, created_at)
   VALUES (...)
   ```

4. Trigger anomaly detection immediately

### Statistical Calculations

**Rolling Statistics (24-hour window) with Caching**:

```javascript
// 1. Check cache first (5-minute TTL)
const cached = await db.query(`
  SELECT * FROM rolling_stats 
  WHERE created_at >= NOW() - INTERVAL '5 minutes'
  ORDER BY created_at DESC
  LIMIT 1
`)

if (cached.rows.length > 0) {
  // Use cached statistics (fast path)
  return cached.rows[0]
}

// 2. Cache miss - Calculate from raw data
// Note: Cache is also updated every 5 minutes via separate cron job
const responses = await db.query(`
  SELECT response_time_ms 
  FROM responses 
  WHERE created_at >= NOW() - INTERVAL '24 hours'
    AND deleted_at IS NULL
`)

// Calculate mean (μ)
const mean = responses.reduce((sum, r) => sum + r.response_time_ms, 0) / n

// Calculate standard deviation (σ)
const variance = responses.reduce((sum, r) => 
  sum + Math.pow(r.response_time_ms - mean, 2), 0
) / n
const stddev = Math.sqrt(variance)

const min = Math.min(...responses.map(r => r.response_time_ms))
const max = Math.max(...responses.map(r => r.response_time_ms))

// 3. Store in cache (TTL enforced by checking created_at)
await db.query(`
  INSERT INTO rolling_stats 
    (window_start, window_end, mean_response_time, stddev_response_time,
     min_response_time, max_response_time, sample_count, 
     sum_response_time, sum_squared)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
`, [windowStart, windowEnd, mean, stddev, min, max, n, sum, sumSquared])
```

**Caching Benefits**:
- **Performance**: Reduces expensive aggregate queries from O(n) to O(1)
- **Database Load**: 5-minute cache = 12 calculations/hour vs potential re-calculation on every poll
- **Consistency**: All anomaly checks within 5-minute window use same baseline
- **Scalability**: Enables handling higher polling frequencies without database bottleneck

**Z-Score Calculation**:

```javascript
zScore = (currentValue - mean) / stddev

// Example:
// currentValue = 500ms
// mean = 200ms
// stddev = 50ms
// zScore = (500 - 200) / 50 = 6.0 → SEVERE_HIGH anomaly
```

**EMA Prediction (α=0.3)**:

```javascript
function predictNextValue(values, alpha = 0.3) {
  let ema = values[0]
  for (let i = 1; i < values.length; i++) {
    ema = alpha * values[i] + (1 - alpha) * ema
  }
  return ema
}
```

### Anomaly Classification Logic

```javascript
if (sampleCount < 5) {
  // Insufficient data - no anomaly
  return { isAnomaly: false, anomalyType: null }
}

const zScore = calculateZScore(responseTime, mean, stddev)
const predicted = predictNextValue(recentResponses)

if (Math.abs(zScore) < Z_SCORE_THRESHOLD) {
  // Normal response
  return { isAnomaly: false }
}

// Classify anomaly type
if (zScore > 0) {
  // Slow response anomaly
  anomalyType = responseTime > mean * 2 ? 'severe_high' : 'high'
} else {
  // Fast response anomaly
  anomalyType = 'low'
}
```

**Statistical Significance**:
- Z-score > 2.5 = 98.76% confidence (outside normal distribution)
- **severe_high**: Response time > 2x mean (extremely slow)
- **high**: Z-score > 2.5 but response time < 2x mean
- **low**: Z-score < -2.5 (anomalously fast, might indicate caching)

### Server-Sent Events (SSE)

**Connection Lifecycle**:

1. Client connects to `/api/events`
2. Server adds client to SSE manager
3. Server sends initial `connected` event
4. On each HTTP poll completion:
   - Broadcast `new-response` event to all clients
   - If anomaly detected, broadcast `anomaly-detected` event
5. Frontend `useSSE` hook manages reconnection on disconnect

**Event Format**:

```javascript
// new-response event
{
  type: 'new-response',
  data: {
    id: '<uuid>',
    target_url: 'https://httpbin.org/anything',
    request_payload: { requestId: '...', method: 'POST', ... },
    response_payload: { ... },
    response_time_ms: 250,
    status_code: 200,
    created_at: '2026-02-04T10:30:00Z',
    anomaly: { /* anomaly detection result */ }
  }
}

// anomaly-detected event
{
  type: 'anomaly-detected',
  data: {
    response_id: '<uuid>',
    z_score: 6.5,
    anomaly_type: 'severe_high',
    actual_value: 500,
    rolling_mean: 200,
    rolling_stddev: 46,
    predicted_value: 220,
    is_anomaly: true
  }
}
```

### Frontend Polling Strategy

**Chart Data**: Polls `/api/anomalies/visualization?hours=24` every **30 seconds**

**Response Table**: Real-time updates via SSE (no polling - uses `useResponses` hook with SSE events)

**Stats Cards**: Receives data from parent components (no separate polling)

**Health Check**: Header polls `/api/health` every **30 seconds**

**Live Feed**: Real-time via SSE (no polling needed)

---

## 🔍 Anomaly Detection

### Algorithm: Z-Score + EMA Hybrid

**Why Z-Score?**
- **Statistical foundation**: Measures standard deviations from mean
- **Threshold-based**: Clear classification boundaries
- **Adaptive**: Adjusts to changing baselines
- **Industry standard**: Used in network monitoring, APM tools

**Why EMA?**
- **Trend detection**: Captures momentum in response times
- **Smoothing**: Reduces noise from outliers
- **Predictive**: Forecasts expected next value
- **Configurable**: α parameter controls sensitivity

### Configuration

| Parameter | Value | Purpose |
|-----------|-------|---------|
| Z_SCORE_THRESHOLD | 2.5 | Minimum Z-score for anomaly (98.76% confidence) |
| EMA_ALPHA | 0.3 | Exponential smoothing factor (30% weight on recent) |
| ROLLING_WINDOW | 24 hours | Time window for baseline calculation |
| MIN_SAMPLES | 5 | Minimum data points required for Z-score analysis |
| POLL_INTERVAL_MINUTES | 5 minutes | Frequency of endpoint checks (configurable) |

### Example Scenarios

**Scenario 1: Gradual Degradation**
```
Responses: [200ms, 210ms, 220ms, 240ms, 280ms, 350ms]
Mean: 250ms, Stddev: 56ms
Current: 350ms → Z-score: 1.79 → NOT anomaly (< 2.5)
```

**Scenario 2: Sudden Spike**
```
Responses: [200ms, 195ms, 205ms, 198ms, 202ms, 600ms]
Mean: 267ms, Stddev: 165ms
Current: 600ms → Z-score: 2.02 → NOT anomaly (< 2.5)
After more samples stabilize...
Mean: 200ms, Stddev: 50ms
Current: 600ms → Z-score: 8.0 → SEVERE_HIGH anomaly
```

**Scenario 3: Anomalous Fast Response**
```
Responses: [200ms, 210ms, 195ms, 205ms, 50ms]
Mean: 172ms, Stddev: 68ms
Current: 50ms → Z-score: -1.79
If pattern continues and stddev decreases...
Z-score: -3.2 → LOW anomaly (suspiciously fast)
```

---

## 🧪 Testing Strategy

### Core Component Identification

**Most Critical**: `anomalyDetector.js` (Backend)

**Rationale**:
- **Business logic core**: All anomaly detection logic
- **Complex calculations**: Z-score, EMA, statistical analysis
- **High risk**: Errors cause false positives/negatives
- **Downstream impact**: Affects SSE broadcasts, visualizations, alerts

### Test Coverage

**Backend (27 tests)**:

1. **Unit Tests: anomalyDetector.js (21 tests)**
   - Z-score calculation edge cases (zero/NaN stddev)
   - EMA prediction with various alpha values
   - Response analysis for all anomaly types
   - Error handling (DB failures, invalid data)
   - Insufficient sample handling
   - Predicted value calculations

2. **Integration Tests: anomaly.integration.test.js (6 tests)**
   - GET `/api/anomalies/visualization` endpoint
   - GET `/api/anomalies/status` endpoint
   - Service integration with mocked repositories
   - Multiple anomaly type classification

**Frontend (8 tests)**:

**E2E Tests: PerformanceChart.test.jsx (8 tests)**
- Chart rendering with normal/anomaly data
- Loading and error states
- Statistics display accuracy
- Empty data handling
- Legend display
- Periodic data refresh

### Running Tests

```bash
# Backend - Full suite with coverage
cd backend && npm test

# Backend - Watch mode
cd backend && npm run test:watch

# Frontend - All tests
cd frontend && npm test

# Frontend - UI mode
cd frontend && npm run test:ui

# Frontend - Coverage
cd frontend && npm test -- --coverage
```

### Coverage Reports

**Backend**: 
- `anomalyDetector.js`: **100% coverage** (statements, branches, functions)
- Overall: ~32% (focusing on critical path)

**Frontend**:
- `PerformanceChart.jsx`: **High coverage** (8 comprehensive E2E tests)
- Coverage reports: `frontend/coverage/index.html`

---

## 📌 Assumptions

1. **Single Endpoint Monitoring**: System monitors one endpoint (extendable to multiple)
2. **24-Hour Baseline**: Sufficient window for detecting daily patterns
3. **Minimum 5 Samples**: Statistical validity requires baseline data for Z-score calculation
4. **5-Minute Polling**: Default interval balancing monitoring frequency and server load (configurable)
5. **Z-Score Threshold 2.5**: Standard 98.76% confidence level
6. **Random Request Data**: Simulates varied API usage patterns
7. **PostgreSQL Availability**: Database is running and accessible
8. **Network Stability**: Monitored endpoint is reachable
9. **Single Server Instance**: No distributed/multi-instance coordination
10. **Client-Side Filtering**: Frontend handles data filtering/aggregation

---

## 🚀 Future Improvements

### High Priority

1. **Multi-Endpoint Support**
   - Monitor multiple URLs simultaneously
   - Per-endpoint configuration (interval, thresholds)
   - Dedicated tables: `monitored_endpoints`, `endpoint_responses`

2. **Alert System**
   - Email/Slack/Webhook notifications on anomalies
   - Configurable alert rules and thresholds
   - Alert history and acknowledgment workflow

3. **User Authentication**
   - JWT-based auth with role-based access control
   - User management and audit logs
   - API key support for integrations

4. **Advanced Anomaly Detection**
   - Machine learning models (LSTM, Isolation Forest)
   - Seasonal decomposition (weekly/daily patterns)
   - Multi-variate analysis (status code, payload size)

### Medium Priority

5. **Performance Optimization**
   - Database query optimization (materialized views)
   - **Redis caching for rolling statistics** (replace current `rolling_stats` table approach with Redis for faster cache access and automatic TTL expiration)
   - Connection pooling improvements

6. **Enhanced Visualization**
   - Heatmaps for time-of-day patterns
   - Histogram of response time distribution
   - Anomaly timeline view
   - Exportable reports (PDF/CSV)

7. **Configuration UI**
   - Dynamic endpoint management
   - Threshold tuning interface
   - Alert rule builder

8. **Horizontal Scaling**
   - Multi-instance deployment with leader election
   - Distributed SSE (Redis pub/sub)
   - Load balancer support

### Low Priority

9. **Additional Metrics**
   - Payload size tracking
   - Network latency breakdown (DNS, TCP, TLS)
   - Error rate trending

10. **Mobile App**
    - React Native mobile dashboard
    - Push notifications for critical anomalies

11. **Integration Ecosystem**
    - Grafana/Prometheus metrics export
    - DataDog/New Relic integration
    - Zapier webhook support

---

## 👤 Author

Badar Shafiq

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

**Built using Node.js, React, and PostgreSQL**
