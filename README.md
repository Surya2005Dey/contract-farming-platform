# Contract Farming Platform

A modern web application built with Next.js that connects farmers and buyers through secure contract farming agreements.

## Features

- 🌾 **Contract Management**: Create, manage, and track farming contracts
- 👥 **User Authentication**: Secure login system with Supabase
- 💬 **Real-time Messaging**: Built-in chat system for communication
- 📊 **Dashboard**: Comprehensive dashboard for contract monitoring
- 💰 **Payment System**: Integrated escrow and payment management
- 🚚 **Logistics**: Supply chain and logistics tracking
- ⭐ **Rating System**: User ratings and reviews
- 🔍 **Advanced Search**: Marketplace search with filters
- 📱 **Responsive Design**: Mobile-friendly interface

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS, Radix UI
- **Backend**: Supabase (Database, Auth, Real-time)
- **Forms**: React Hook Form with Zod validation
- **State Management**: React Context
- **Package Manager**: pnpm

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd contract-farming-platform
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Configure your Supabase credentials in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

5. Run the development server:
```bash
pnpm dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Setup

The project includes SQL scripts in the `scripts/` directory for setting up the database schema:

1. `001_create_database_schema.sql` - Main database schema
2. `002_create_profile_trigger.sql` - User profile triggers
3. `003_contract_templates_and_signatures.sql` - Contract system
4. `004_enhanced_payment_system.sql` - Payment and escrow
5. `005_default_contract_templates.sql` - Default templates
6. `006_rating_review_system.sql` - Rating system
7. `007_enhanced_messaging_system.sql` - Messaging system
8. `008_logistics_supply_chain_system.sql` - Logistics tracking

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Dashboard pages
│   └── ...
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   └── ...
├── lib/                  # Utility libraries
├── hooks/                # Custom React hooks
├── scripts/              # Database scripts
└── styles/               # Global styles
```

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email [your-email] or create an issue in this repository.
