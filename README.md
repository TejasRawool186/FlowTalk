# FlowTalk - Multilingual Chat Application

A real-time multilingual chat application that breaks language barriers by automatically translating messages. Built with **Next.js**, **MongoDB**, and **AI-powered translation**.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![MongoDB](https://img.shields.io/badge/MongoDB-7.0-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)

## ✨ Features

- **Real-time Translation** - Messages are instantly translated to each user's preferred language
- **Multi-Language Support** - Supports 20+ languages including Hindi, Spanish, French, Japanese, and more
- **Smart Language Detection** - Automatically detects the source language of messages
- **Code Preservation** - Code blocks and technical terms remain untranslated for accuracy
- **Toggle Views** - Switch between original and translated message views
- **Translation Caching** - Cached translations for improved performance
- **Glossary Protection** - Technical terms and branded names are protected from translation

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- MongoDB (local or Atlas)
- OpenAI API key (for translations)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/TejasRawool186/FlowTalk.git
   cd FlowTalk/multilingual-chat
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env.local` file:
   ```env
   # MongoDB Configuration
   MONGODB_URI=mongodb://localhost:27017
   MONGODB_DB_NAME=flowtalk
   JWT_SECRET=your-secret-key
   
   # OpenAI API (for translation)
   OPENAI_API_KEY=your-openai-api-key
   ```

4. **Start MongoDB** (if running locally)
   ```bash
   mongod
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open the app**
   
   Visit [http://localhost:3000](http://localhost:3000)

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js App   │────▶│  API Routes     │────▶│    MongoDB      │
│   (React UI)    │     │  (Translation)  │     │   (Messages)    │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │   OpenAI API    │
                        │  (Translation)  │
                        └─────────────────┘
```

## 📁 Project Structure

```
src/
├── app/                 # Next.js app router & API routes
├── components/          # React components (Chat, Message, Auth)
├── contexts/           # React contexts (Authentication)
├── lib/                # Utilities (MongoDB, Parser, Auth)
├── services/           # Business logic
│   ├── LanguageDetector.ts     # Language detection
│   ├── OpenAITranslationService.ts  # AI translation
│   ├── TranslationCache.ts     # Caching layer
│   ├── GlossaryManager.ts      # Term protection
│   └── MongoMessageService.ts  # Message storage
└── types/              # TypeScript definitions
```

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Database | MongoDB 7.0 |
| Authentication | JWT + bcrypt |
| Translation | OpenAI GPT API |
| Icons | Lucide React |

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

## 🔑 Key Services

| Service | Description |
|---------|-------------|
| **LanguageDetector** | Detects message language automatically |
| **OpenAITranslationService** | Handles AI-powered translations |
| **TranslationCache** | Caches translations for performance |
| **GlossaryManager** | Protects technical terms from translation |
| **MongoMessageService** | Manages message storage and retrieval |

## 🌐 Supported Languages

English, Hindi, Spanish, French, German, Italian, Portuguese, Russian, Japanese, Korean, Chinese (Simplified/Traditional), Arabic, Bengali, Tamil, Telugu, Marathi, Gujarati, and more.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Built with ❤️ for breaking language barriers**