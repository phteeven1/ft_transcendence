# 🕹️ FT_TRANSCENDENCE

---

# 📘 README

## 🕹 FT_TRANSCENDENCE

A full-stack web application built with modern scalable architecture.

This project combines:

* A reactive frontend
* A structured backend
* A relational database
* High-performance caching
* Containerized infrastructure

---

## 📂 Project Structure

```
ft_transcendence/
│
├── apps/
│   ├── frontend/        # Next.js application
│   └── backend/         # NestJS application
│
├── packages/
|   ├── database/
|       ├──prisma/
|
├── docker-compose.yml
└── README.md
```

---

## ⚙️ Environment Requirements

* Docker
* Docker Compose
* Node.js (for local development without Docker)
* npm

---

## 🚀 Starting the Environment (Docker)

From project root:

```bash
docker-compose up --build
```

Services will start:

* Frontend → [http://localhost:3000](http://localhost:3000)
* Backend → [http://localhost:4000](http://localhost:4000)
* PostgreSQL → internal container
* Redis → internal container

---

## 🧪 Current Implementation Example

At the moment, the project includes:

* A backend-managed counter
* REST endpoint:

  * `GET /counter`
  * `POST /counter`
* Frontend button triggering backend increment
* Retro-style counter display

Flow:

1. Button click
2. POST request to backend
3. Backend increments counter
4. New value returned
5. Frontend re-renders updated number

---

## 🧱 Development (Without Docker)

### Backend

```bash
cd apps/backend
npm install
npm run start:dev
```

### Frontend

```bash
cd apps/frontend
npm install
npm run dev
```

---

## 🔮 Future Extensions

* Persistent counters via PostgreSQL
* Redis-backed session storage
* Realtime multiplayer via WebSockets
* Authentication with JWT
* Game logic expansion

---

## 👥 Team Collaboration

* Git-based workflow
* Feature branches
* Clean modular architecture
* Separation of concerns

---

Built with scalability, structure, and performance in mind.
