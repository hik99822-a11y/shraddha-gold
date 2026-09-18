# Shraddha Gold — Backend API (Node.js + Express + MongoDB)

Production REST API for **Shraddha Gold** B2B Jewellery Manufacturing Platform.

## Features
- **Identifier-Flexible Authentication**: Supports Login with Email OR Username OR Mobile Number.
- **Security**: Passwords hashed with `bcryptjs`, authenticated sessions via `jsonwebtoken` (JWT).
- **Inquiry Processing**: B2B manufacturing quote and sample requests saved to MongoDB.
- **Role-Based Architecture**: Ready for admin and partner portals.

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment:
   ```bash
   cp .env.example .env
   ```

3. Seed initial B2B Partner & Admin test accounts:
   ```bash
   npm run seed
   ```

4. Start development server:
   ```bash
   npm run dev
   ```
   Or production server:
   ```bash
   npm start
   ```

## Default Test Credentials
- **Email**: `partner@shraddhagold.com`
- **Username**: `shraddha_partner`
- **Mobile**: `+919876543210`
- **Password**: `Shraddha@2026`
