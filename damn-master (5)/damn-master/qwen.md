# Project Information for Qwen Code

## Overview
This is a Vendure e-commerce backend project with a Qwik storefront frontend. The project uses modern web technologies and follows best practices for performance and scalability.

## Technology Stack

### Backend
- **Vendure**: Latest version (v3.4.0) - Headless e-commerce framework
- **Node.js**: Backend runtime
- **TypeScript**: Primary language
- **PM2**: Process management for production deployment
- **Redis**: For caching and job queue management
- **PostgreSQL**: Primary database
- **pnpm**: Package manager

### Frontend
- **Qwik**: Latest beta version (v2.0.0-beta.2) - Resumable framework for instant-loading web applications
- **Tailwind CSS**: Version 4 - Utility-first CSS framework
- **TypeScript**: Primary language
- **Vite**: Build tool and development server
- **PM2**: Process management for production deployment
- **pnpm**: Package manager

## Project Structure
```
.
├── backend/              # Vendure backend application
│   ├── src/              # Source code
│   ├── dist/             # Compiled output
│   └── ecosystem.config.js  # PM2 configuration
├── frontend/             # Qwik storefront
│   ├── src/              # Source code
│   ├── dist/             # Build output
│   └── ecosystem.config.cjs # PM2 configuration
└── ...
```

## Build Process
The project uses `pnpm build` commands that include PM2 restart functionality:

### Backend
- Build command: `pnpm build` (compiles TypeScript and restarts PM2 processes)
- PM2 processes: 
  - `admin` (Vendure admin server)
  - `worker` (Vendure worker for background jobs)
  - `redis` (Redis monitoring)

### Frontend
- Build command: `pnpm build` (Qwik build with PM2 restart)
- PM2 process: `store` (Qwik Express server)

## Key Features
1. **Headless Architecture**: Vendure backend provides GraphQL API consumed by Qwik frontend
2. **Performance Optimized**: 
   - PM2 process management with memory/CPU limits
   - Tailwind CSS v4 for efficient styling
   - Qwik's resumable architecture for instant loading
3. **Production Ready**: 
   - Separate PM2 configurations for frontend/backend
   - Health checks and monitoring
   - Optimized memory settings
4. **Modern Tooling**: 
   - TypeScript for type safety
   - Vite for fast builds
   - pnpm for efficient dependency management

## Development
- Start backend in development: `pnpm dev` in backend directory
- Start frontend in development: `pnpm dev` in frontend directory

## Production Deployment
- Build and deploy backend: `pnpm build` in backend directory
- Build and deploy frontend: `pnpm build` in frontend directory
- Both commands automatically restart the respective PM2 processes