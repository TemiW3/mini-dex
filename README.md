# 🚀 Mini DEX - Solana Decentralized Exchange

A fully functional decentralized exchange (DEX) built on Solana using Anchor framework and React. This project provides a complete trading platform with token swaps, liquidity pools, and analytics.

![Mini DEX](https://img.shields.io/badge/Solana-DEX-blue?style=for-the-badge&logo=solana)
![React](https://img.shields.io/badge/React-19.1.1-blue?style=for-the-badge&logo=react)
![Anchor](https://img.shields.io/badge/Anchor-0.31.1-purple?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9.2-blue?style=for-the-badge&logo=typescript)

## ✨ Features

### 🔄 **Token Swapping**

- Instant token-to-token swaps
- Real-time price calculations
- Slippage protection
- Price impact warnings
- Support for multiple token pairs

### 💧 **Liquidity Pools**

- Create new liquidity pools
- Add/remove liquidity
- LP token management
- Automated market maker (AMM) functionality
- Pool ratio calculations

### 📊 **Analytics Dashboard**

- Real-time pool statistics
- Trading volume metrics
- Liquidity tracking
- User activity monitoring
- Performance analytics

### 🔐 **Security & Wallet Integration**

- Non-custodial trading
- Multi-wallet support (Phantom, Solflare)
- Secure transaction handling
- Wallet connection management

### 🚰 **Built-in Faucet System**

- One-click test token distribution
- One-time use rate limiting
- Automatic ATA creation
- Pre-determined token amounts
- Instant token transfers

## 🏗️ Architecture

### **Smart Contract (Anchor Program)**

- **Program ID**: `5hLC8bG9NicQQLHyByQxfoW6n8TjiHqpy3sHURkyUxPW`
- **Network**: Solana Devnet
- **Framework**: Anchor 0.31.1
- **Language**: Rust

#### Core Instructions:

- `initialize_pool` - Create new liquidity pools
- `add_liquidity` - Provide liquidity to pools
- `remove_liquidity` - Withdraw liquidity from pools
- `swap_tokens` - Execute token swaps
- `initialize_vault_a/b` - Setup token vaults
- `initialize_lp_mint` - Create LP token mint

### **Frontend Application**

- **Framework**: React 19.1.1 with TypeScript
- **Styling**: Tailwind CSS with custom gradients
- **UI Components**: Radix UI + Gill wallet components
- **State Management**: Jotai + React Query
- **Routing**: React Router v7

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Rust 1.70+
- Solana CLI 1.17+
- Anchor CLI 0.31.1+

### Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd mini-dex
```

2. **Install dependencies**

```bash
pnpm install
```

3. **Setup the program**

```bash
pnpm run setup
```

4. **Build the program**

```bash
pnpm anchor-build
```

5. **Start local validator**

```bash
pnpm anchor-localnet
```

6. **Run tests**

```bash
pnpm anchor-test
```

7. **Start the web application**

```bash
pnpm dev
```

## 📱 Usage

### **Getting Started**

1. **Connect your Solana wallet** (Phantom, Solflare, etc.)
2. **Get test tokens** using the built-in faucet on the Home page
3. **Get SOL** from the Solana faucet for transaction fees

### **Token Swapping**

1. Navigate to the Swap page
2. Select token pairs (SOL, TUSDC, TUSDT, TBTC, TETH, MDX)
3. Enter swap amounts
4. Review price impact and slippage
5. Confirm transaction

### **Liquidity Management**

1. Go to the Pools page
2. Create new pools or manage existing ones
3. Add liquidity by providing both tokens
4. Monitor your LP token balance
5. Remove liquidity when needed

### **Analytics**

1. Visit the Analytics page
2. View pool statistics and trading metrics
3. Monitor total volume and liquidity
4. Track user activity

## 🪙 Getting Test Tokens

To interact with the Mini DEX, you'll need test tokens. The application includes a built-in faucet system for easy token distribution.

### **Built-in Faucet System**

The Mini DEX includes a convenient faucet that allows you to get test tokens directly from the application:

1. **Connect your wallet** to the application
2. **Navigate to the Home page**
3. **Click "Get Test Tokens"** for any token you want
4. **Sign the transaction** to receive tokens

### **Available Test Tokens**

| Token           | Symbol | Amount per Claim | Decimals |
| --------------- | ------ | ---------------- | -------- |
| **Test USDC**   | TUSDC  | 100 tokens       | 6        |
| **Test USDT**   | TUSDT  | 100 tokens       | 6        |
| **Test BTC**    | TBTC   | 0.1 tokens       | 8        |
| **Test ETH**    | TETH   | 0.1 tokens       | 8        |
| **MyDex Token** | MDX    | 1000 tokens      | 9        |

### **Faucet Features**

- **One-time use per token**: Each token can only be claimed once per wallet
- **Automatic ATA creation**: Associated Token Accounts are created automatically
- **Pre-determined amounts**: No need to specify amounts - fixed amounts are distributed
- **Instant distribution**: Tokens are transferred immediately after transaction confirmation

### **Getting SOL for Transaction Fees**

For transaction fees, you'll need SOL:

1. Visit the [Solana Faucet](https://faucet.solana.com/)
2. Enter your wallet address
3. Request SOL (needed for transaction fees)

### **Token Balance Check**

You can check your token balances directly in the DEX interface:

- **Home page**: Shows faucet status and available tokens
- **Swap page**: Displays your token balances
- **Pools page**: Shows LP token balances

## 🛠️ Development

### **Project Structure**

```
mini-dex/
├── anchor/                 # Solana program (Rust/Anchor)
│   ├── programs/minidex/  # Main program code
│   ├── tests/             # Program tests
│   └── target/            # Build artifacts
├── src/                   # React frontend
│   ├── components/        # UI components
│   ├── hooks/            # Custom React hooks
│   ├── pages/            # Application pages
│   ├── constants/        # Token configurations
│   └── types/            # TypeScript types
└── public/               # Static assets
```

### **Available Scripts**

#### **Anchor Commands**

```bash
pnpm anchor-build          # Build the program
pnpm anchor-localnet      # Start local validator
pnpm anchor-test          # Run program tests
pnpm anchor deploy        # Deploy to devnet
```

#### **Frontend Commands**

```bash
pnpm dev                  # Start development server
pnpm build               # Build for production
pnpm preview             # Preview production build
pnpm lint                # Run ESLint
pnpm format              # Format code with Prettier
```

### **Supported Tokens**

- **SOL** - Native Solana token
- **TUSDC** - Test USDC (6 decimals)
- **TUSDT** - Test USDT (6 decimals)
- **TBTC** - Test Bitcoin (8 decimals)
- **TETH** - Test Ethereum (8 decimals)
- **MDX** - Custom DEX token (9 decimals)

## 🔧 Configuration

### **Environment Setup**

- **Network**: Solana Devnet
- **RPC Endpoint**: `https://api.devnet.solana.com`
- **Program ID**: `5hLC8bG9NicQQLHyByQxfoW6n8TjiHqpy3sHURkyUxPW`

### **Wallet Integration**

- Phantom Wallet
- Solflare Wallet
- Mobile wallet support via Wallet Standard

## 🧪 Testing

### **Program Tests**

```bash
pnpm anchor-test
```

### **Frontend Tests**

```bash
pnpm test
```

### **Integration Tests**

The project includes comprehensive tests for:

- Pool creation and management
- Token swapping functionality
- Liquidity operations
- Error handling and edge cases

## 📦 Deployment

### **Deploy to Devnet**

```bash
pnpm anchor deploy --provider.cluster devnet
```

### **Build for Production**

```bash
pnpm build
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🔗 Links

- [Solana Documentation](https://docs.solana.com/)
- [Anchor Framework](https://www.anchor-lang.com/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)

## ⚠️ Disclaimer

This is a development project for educational purposes. Use at your own risk. Always audit smart contracts before using with real funds.

---

**Built with ❤️ using Solana, Anchor, and React**
