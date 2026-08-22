# CraftBook 📖⚡

[![Next.js 15](https://img.shields.io/badge/Next.js_15-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js_20-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript_5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma_ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL_16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Pinecone](https://img.shields.io/badge/Pinecone_Vector_DB-000000?style=for-the-badge&logo=pinecone&logoColor=white)](https://www.pinecone.io/)
[![ElevenLabs](https://img.shields.io/badge/ElevenLabs_Voice_AI-FF6B6B?style=for-the-badge&logo=elevenlabs&logoColor=white)](https://elevenlabs.io/)

**CraftBook** is an interactive AI-powered research and study workbench that turns your documents, PDFs, YouTube videos, and web links into dynamic knowledge artifacts and interactive dual-host AI debate podcasts.

Unlike static audio summaries, CraftBook features **Live "Interrupt & Ask"**: listeners can pause the podcast mid-episode, ask the AI co-hosts questions, receive an in-character audio response grounded in their source notes, and seamlessly resume the show.

---

## ✨ Key Features

### 🎙️ 1. Multi-Host AI Debate Podcasts & Live Voice Interruption
- **Dual AI Co-Hosts**: Synthesizes source notes into intellectual debate discussions featuring two AI hosts:
  - **Alex**: The analytical, evidence-focused host.
  - **Jordan**: The big-picture, dynamic challenger.
- **Live "Interrupt & Ask"**: Interject at any timestamp to ask specific questions. The hosts generate an immediate conversational response grounded in your workspace materials before continuing.
- **Voice Synthesis**: Powered by ElevenLabs dual-speaker text-to-speech with Cloudinary media hosting.

### 📚 2. Automated Study & Learning Artifacts
- **Interactive Flashcards**: 3D flip card deck for active recall testing.
- **Interactive Quizzes**: Multiple-choice assessments with instant grading and detailed explanations.
- **Visual Mind Maps**: Node-and-edge hierarchical concept trees visualizing knowledge connections.
- **Executive Summaries & Reports**: Deep-dive structured long-form markdown documents.
- **Key Takeaways**: High-impact bulleted bullet-point extracts.
- **1-Click Notion Export**: Export any generated study artifact directly to a Notion page.

### 🌐 3. Multi-Format Source Ingestion
- **PDF Documents**: Parsed, chunked, embedded, and stored via Cloudinary and `unpdf`.
- **Web Pages & Articles**: Full-page scraping and markdown conversion powered by Firecrawl.
- **YouTube Videos**: Automated transcript extraction from YouTube links.
- **Cloud Integrations**: Import files and pages directly from Google Drive and Notion.
- **Raw Text / Markdown**: Paste snippets, notes, and research materials directly.

### 🧠 4. Grounded Semantic RAG & Personalized Memory
- **Grounded Chat with Citations**: Semantic search powered by Pinecone vectors to eliminate hallucinations and link answers back to exact source passages.
- **Real-Time Web Search**: Tavily search integration fallback for questions outside source notes.
- **Long-Term User Memory**: Personalized preference recall powered by Mem0.
- **Background Event Queues**: Inngest asynchronous workers managing text extraction, chunking, and generation tasks.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js 15 Client                        │
│  (Studio Panel, Podcast Player, RAG Chat, Artifact Viewers) │
└──────────────┬──────────────────────────────▲───────────────┘
               │                              │
          REST / SSE                     Audio Streaming
               │                              │
┌──────────────▼──────────────────────────────┴───────────────┐
│                 Express Backend Server (Node/TS)            │
│  (Auth, Ingestion Pipeline, RAG Engine, Payment Controller) │
└──────┬──────────────┬──────────────┬──────────────┬─────────┘
       │              │              │              │
┌──────▼──────┐┌──────▼──────┐┌──────▼──────┐┌──────▼───────┐
│  PostgreSQL ││   Pinecone  ││  Cloudinary ││  ElevenLabs  │
│  (Prisma)   ││  Vector DB  ││ Media Store ││  Dual TTS    │
└─────────────┘└─────────────┘└─────────────┘└──────────────┘
                      ▲
                      │ Triggers background jobs
               ┌──────┴──────┐
               │   Inngest   │
               │   Workers   │
               └─────────────┘
```

---

## 🛠️ Tech Stack

### Frontend (`/client`)
- **Framework**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS, Radix UI primitives, Lucide Icons
- **State & Data Fetching**: TanStack React Query, Vercel AI SDK
- **Audio Player**: Custom HTML5 player with waveform visualizer and interruption timeline markers

### Backend (`/server`)
- **Runtime**: Node.js, Express, TypeScript
- **Database & ORM**: PostgreSQL with Prisma ORM
- **Authentication**: Better-Auth (with Google OAuth & Session Management)
- **Vector Database**: Pinecone
- **Background Jobs**: Inngest
- **Media Storage**: Cloudinary (PDFs & Podcast Audio)
- **AI Models & Speech**: OpenAI (GPT-4o, Embeddings), Google Gemini, ElevenLabs TTS, Tavily Search, Firecrawl, Mem0

---

## 🚀 Quick Start (Local Setup)

### 1. Prerequisites
- **Node.js**: v18.18+ or v20+
- **Docker Desktop**: For running local PostgreSQL with `pgvector`

---

### 2. Clone the Repository
```bash
git clone https://github.com/Rajivswain-17/Craft-Book.git
cd Craft-Book
```

---

### 3. Start PostgreSQL via Docker
```bash
docker compose up -d
```
> Runs PostgreSQL on `localhost:5435` with database `bookcraft`.

---

### 4. Backend Setup (`/server`)

1. Navigate to the server folder:
   ```bash
   cd server
   npm install
   ```

2. Configure environment variables in `server/.env`:
   ```env
   PORT=8081
   CLIENT_URL=http://localhost:3000
   SERVER_URL=http://localhost:8081
   DATABASE_URL="postgresql://postgres:postgres@localhost:5435/bookcraft"
   BETTER_AUTH_SECRET=your_32_char_random_secret
   BETTER_AUTH_URL=http://localhost:8081

   OPENAI_API_KEY=sk-proj-...
   PINECONE_API_KEY=pcsk_...
   PINECONE_INDEX=craftbook

   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   CLOUDINARY_UPLOAD_PRESET=your_upload_preset

   ELEVENLABS_API_KEY=your_elevenlabs_key
   FIRECRAWL_API_KEY=fc-...
   TAVILY_API_KEY=tvly-...
   MEM0_API_KEY=m0-...
   GEMINI_API_KEY=...
   INNGEST_DEV=1
   ```

3. Sync database schema and generate Prisma client:
   ```bash
   npx prisma db push
   npx prisma generate
   ```

4. Start Express Server & Inngest Dev Server (2 terminals):
   ```bash
   # Terminal 1: Express Server
   npm run dev

   # Terminal 2: Inngest Queue Worker
   npm run inngest
   ```

---

### 5. Frontend Setup (`/client`)

1. Open a new terminal and navigate to client:
   ```bash
   cd client
   npm install
   ```

2. Configure `client/.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8081
   NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:8081
   BACKEND_INTERNAL_URL=http://localhost:8081
   ```

3. Start the Next.js development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

---

## 📂 Project Structure

```
Craft-Book/
├── client/                     # Next.js 15 Frontend
│   ├── app/                    # App Router pages (auth, dashboard, workspace)
│   ├── components/             # Reusable UI component library (Radix / Tailwind)
│   ├── features/
│   │   ├── auth/               # Login & signup flows
│   │   ├── chat/               # Conversational RAG interface & citations
│   │   ├── learn/              # Studio workbench, podcast player, 3D flashcards
│   │   ├── sources/            # Document manager, PDF upload, YouTube & web import
│   │   ├── memory/             # Mem0 preference & memory settings
│   │   └── billing/            # Subscription & upgrade modals
│   └── lib/                    # API client and helper utilities
│
└── server/                     # Node.js / Express Backend
    ├── prisma/                 # Database schema & migrations
    ├── src/
    │   ├── controllers/        # Express request handlers
    │   ├── routes/             # REST routing definitions
    │   ├── services/           # Business logic & AI generation pipelines
    │   ├── inngest/            # Event-driven background queue workers
    │   └── lib/                # Pinecone, Cloudinary, ElevenLabs & OpenAI clients
    └── uploads/                # Local file fallback storage
```

---

## 📄 License

This project is open-source and licensed under the [MIT License](LICENSE).

---

## 👤 Author

**Rajiv Swain**
- GitHub: [@Rajivswain-17](https://github.com/Rajivswain-17)
- Repository: [Craft-Book](https://github.com/Rajivswain-17/Craft-Book)
