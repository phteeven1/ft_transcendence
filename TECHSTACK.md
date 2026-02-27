# 🕹️ FT_TRANSCENDENCE

---

# 📦 Tech Stack Documentation

## 🖥 Frontend Layer

### Next.js

React framework used for building the user interface.

* Routing (App Router)
* Server/Client rendering (SSR / CSR)
* API communication
* Optimized production builds

### React

Component-based UI library.

* State management
* Reusable components
* Reactive rendering

### TypeScript

Strongly typed JavaScript.

* Type safety
* Better maintainability
* Improved developer experience

---

## ⚙️ Backend Layer

### NestJS

Structured Node.js framework for scalable server-side applications.

* REST API
* Controllers / Services / Modules architecture
* Authentication handling
* Business logic layer

### Node.js

JavaScript runtime environment.

* Executes backend logic
* Builds and runs Next.js

---

## 🗄 Data & Persistence

### Prisma

Type-safe ORM.

* Database access abstraction
* Schema management
* Migrations

### PostgreSQL

Relational database.

* Persistent storage
* Structured relational data

---

## 🚀 Performance & State Management

### Redis

In-memory data store.

* Caching
* Session storage
* Rate limiting
* Fast temporary state handling

---

## 🔄 Realtime Communication

### WebSockets (NestJS Gateway)

* Bidirectional real-time communication
* Game state updates
* Live events

---

## 🔐 Authentication

### JWT (JSON Web Token)

* Stateless authentication
* Secure communication between client and server

---

## 🐳 Infrastructure & DevOps

### Docker

* Containerization of services
* Reproducible environments

### Docker Compose

* Orchestration of:

  * Frontend
  * Backend
  * PostgreSQL
  * Redis

---

## 📦 Package & Code Management

### npm

* Dependency management
* Script execution

### Git

* Version control
* Team collaboration

---

# 🏗 Architecture Overview

Frontend (Next.js)
→ communicates via HTTP/WebSocket

Backend (NestJS)
→ processes logic and manages state

Prisma
→ communicates with PostgreSQL

Redis
→ accelerates temporary or frequently accessed data

Docker
→ encapsulates all services

Git
→ manages the codebase