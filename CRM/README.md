# Delivery Operations Application (CRM)

A multi-device web application for managing delivery operations with real-time synchronization powered by Supabase.

## Features

- **Multi-device Sync**: Real-time synchronization across all devices using Supabase Realtime
- **User Management**: Admin interface for managing users, roles, and permissions
- **Analytics Dashboard**: Comprehensive analytics and reporting for delivery operations
- **File Storage**: Secure screenshot uploads with automatic thumbnail generation
- **Authentication**: Secure email/password authentication with Supabase Auth
- **Role-based Access**: Admin and Photographer roles with appropriate permissions

## Prerequisites

- Node.js 18+ and npm
- A Supabase account and project

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set Up Supabase**
   - Follow the detailed guide in [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)
   - Create a Supabase project
   - Run the database migrations
   - Configure environment variables

3. **Configure Environment**
   - Copy `.env.example` to `.env`
   - Add your Supabase URL and anon key

4. **Run the Application**
   ```bash
   npm run dev
   ```

## Project Structure

```
src/app/
├── components/          # React components
│   ├── admin/          # Admin-specific components
│   └── ui/             # Reusable UI components
├── context/            # React context providers
├── lib/
│   ├── db/             # Database access layer
│   ├── hooks/          # Custom React hooks
│   └── storage.ts      # File storage utilities
└── types/              # TypeScript type definitions
```

## Key Technologies

- **React 18** with TypeScript
- **Supabase** for backend (PostgreSQL, Auth, Storage, Realtime)
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **React Router** for navigation

## Documentation

- [Supabase Setup Guide](./SUPABASE_SETUP.md) - Detailed setup instructions
- Database schema is defined in `supabase/migrations/001_initial_schema.sql`
