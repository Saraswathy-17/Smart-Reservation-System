# Smart Reservation System with Dynamic Availability and Queue Prediction

A production-grade, full-stack academic platform engineered to handle high-concurrency reservation workflows, dynamic slot capacity tracking, double-booking prevention, automated queue promotion, and machine-learning wait-time estimation.

---

## 🚀 Key Highlights & Architecture

1. **ACID Concurrency & Double-Booking Prevention**:
   - Implements transactional pessimistic row-level locking (`SELECT ... FOR UPDATE`) in PostgreSQL/SQLite to guarantee zero overselling or double-booking during peak reservation spikes.
2. **Dynamic Slot Availability**:
   - Status updates automatically (`AVAILABLE`, `PARTIAL`, `FULL`) as reservations are confirmed or cancelled.
3. **Automated FIFO Waiting Queue & Backfilling**:
   - When a slot reaches full capacity, users can join a FIFO waiting queue.
   - When a confirmed reservation is cancelled, the vacancy is immediately detected and the #1 queued user is automatically promoted to confirmed status.
4. **Hybrid Wait-Time Prediction Engine**:
   - Combines $M/M/c$ Queuing Theory formulas with a trained Scikit-Learn `HistGradientBoostingRegressor` model considering queue depth, server capacity, arrival hours, and cancellation probabilities.
5. **Modern Reactive UI**:
   - React + Vite SPA featuring glassmorphism design tokens, animated queue status cards, date picker, booking wizard, and interactive admin canvas analytics.

---

## 🛠 Technology Stack

- **Backend**: Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2.0 Async, Uvicorn
- **Machine Learning**: Scikit-Learn, NumPy, Pandas, Joblib
- **Database**: PostgreSQL 16 (production/Docker) & SQLite `aiosqlite` (zero-setup local execution)
- **Frontend**: React 18, Vite, Vanilla CSS Design System, Lucide Icons
- **DevOps**: Docker, Docker Compose, Nginx, Multi-Stage Builds

---

## ⚡ Quickstart (Running Locally)

### 1. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create virtual environment and activate
python -m venv .venv
# Windows:
.\.venv\Scripts\activate
# Linux/macOS:
# source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run initial database seeder (seeds Admin, Demo Users, Resources & 160 Slots)
python -m app.seed

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
```
API Documentation (Swagger UI) is available at: **http://localhost:8000/docs**

---

### 2. Frontend Setup
```bash
# In a new terminal, navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```
Open your browser at: **http://localhost:5173**

---

## 🐳 Docker Deployment

To spin up the entire production stack (PostgreSQL + FastAPI + React Nginx):
```bash
docker-compose up --build -d
```
- Web Application: **http://localhost**
- Backend API Docs: **http://localhost:8000/docs**

---

## 👥 Development & Evaluation Accounts (Database Only)

Pre-seeded testing credentials exist in the database for evaluation. **In production, no credentials or demo buttons are exposed in the user interface.**

| Role | Email | Password | Pre-configured State |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin@smartreserve.com` | `Admin@123` | Direct access to Admin Dashboard, Resources, Slots, Analytics, and Users |
| **Demo User 1 (Alice)** | `alice@example.com` | `Alice@123` | Holds confirmed booking for today's 10:00 AM slot |
| **Demo User 2 (Bob)** | `bob@example.com` | `Bob@123` | Queue Position #1 for today's 10:00 AM slot |
| **Demo User 3 (Carol)** | `carol@example.com` | `Carol@123` | Queue Position #2 for today's 10:00 AM slot |

---

## 🔒 Production Authentication & Role-Based Navigation

### 1. User Experience & Navigation
- **USER Navigation**:
  - `Dashboard`: Personalized greeting, upcoming bookings, active queue status, and quick booking shortcuts.
  - `Browse Slots`: Real-time dynamic availability matrix (`Available`, `Partial`, `Full`).
  - `My Reservations`: Confirmed booking receipts with one-click cancellation.
  - `My Queue`: Animated queue position counter with ML wait-time predictions.
  - `Profile`: Personal details update and secure password change.
  - `Logout`: Clears JWT tokens and resets session.
- **ADMIN Navigation**:
  - `Dashboard`: Executive KPI telemetry and canvas-rendered hourly demand distribution.
  - `Reservations`: Full audit log of all system reservations with status and user filtering.
  - `Queue`: Real-time waiting queue monitor with manual "Force Promote" override.
  - `Resources & Slots`: Asset management and batch slot generator.
  - `Availability`: Live capacity and occupancy breakdown by resource and date.
  - `Analytics`: Model accuracy telemetry (MAE, RMSE, R²) and on-demand model retraining.
  - `Users`: Registered user directory with status toggles and administrative role management.
  - `Logout`

### 2. Google OAuth 2.0 Architecture
Configure Google OAuth using environment variables in `.env`:
```env
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:5173/auth/google/callback"
```
When unconfigured, the UI gracefully informs the user rather than faking authentication.

---

## 🧪 Running Automated Tests

Run the complete backend integration and unit test suite:
```bash
cd backend
pytest tests -v
```

All 10 test suites verify:
- User registration, JWT issuance, and authentication failure handling
- Strict Role-Based Access Control (RBAC): Regular users receive `403 Forbidden` on admin APIs
- Google OAuth configuration and graceful unconfigured rejection
- User profile updates and password lifecycle management
- ACID reservation locking and double-booking rejection
- Queue FIFO ordering, vacancy promotion, and position re-indexing
- Machine learning synthetic data generation, model training, and wait-time inference
