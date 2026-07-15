# 🌟 Stellar MCP Server

A comprehensive Model Context Protocol (MCP) server that enables AI assistants to interact with the Stellar blockchain. This server provides tools for both Stellar Classic operations and Soroban smart contract development, allowing LLMs to manage accounts, process payments, deploy contracts, and perform complex blockchain operations.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Available Tools](#available-tools)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

## 📚 Documentation

Full documentation lives in [`apps/docs`](apps/docs) as a [Fumadocs](https://fumadocs.dev) site.

```bash
cd apps/docs
npm install
npm run dev   # http://localhost:3000
```

See [Deploying the Docs](apps/docs/content/docs/deployment.mdx) for how to publish it (Vercel, Netlify, static export, or Docker).

## 🎯 Overview

Stellar MCP Server bridges the gap between AI assistants and the Stellar blockchain network. It implements the Model Context Protocol to provide a standardized interface for LLMs to:

- **Manage Stellar accounts** - Create, fund, and monitor accounts
- **Process payments** - Send and receive payments across the network
- **Handle assets** - Create custom assets and manage trustlines
- **Deploy smart contracts** - Build and deploy Soroban contracts
- **Interact with contracts** - Retrieve contract interfaces and invoke methods
- **Monitor transactions** - Track transaction history and status

## ✨ Features

### Stellar Classic Operations

- Account creation and management
- Balance inquiries
- Payment processing
- Asset creation and trustline management
- Claimable balance operations
- Transaction history retrieval
- Testnet account funding via Friendbot

### Soroban Smart Contract Operations

- Contract building and optimization
- Contract deployment with constructor support
- Contract interface retrieval
- Support for complex data types (structs, enums, collections)
- Cross-platform compatibility (Windows, Linux, macOS)

### Developer Experience

- Type-safe TypeScript implementation
- Comprehensive JSDoc documentation
- Cross-platform support
- Multiple deployment options (local, NPX, Docker)
- MCP Inspector integration for debugging

## 🏗️ Architecture

The Stellar MCP Server is built with a modular architecture that separates concerns and enables easy maintenance:

```
stellar-mcp-server/
├── src/
│   ├── index.ts                     # Main server entry point + tool routing
│   ├── config/                      # Configuration management
│   │   └── environment.config.ts
│   ├── shared/                      # Types shared across features
│   │   └── common.interface.ts
│   ├── features/                    # Feature modules (co-located logic/types/tests)
│   │   ├── classic/                 # Classic Stellar operations
│   │   │   ├── classic.ts
│   │   │   └── schemas.ts
│   │   ├── soroban/                 # Soroban smart contract operations
│   │   │   ├── soroban.ts
│   │   │   ├── schemas.ts
│   │   │   ├── deployContract.interface.ts
│   │   │   └── getContractMethods.interface.ts
│   │   └── core/                    # Core utilities
│   │       ├── core.ts              # Platform-specific commands
│   │       ├── messages.ts          # Message formatting
│   │       ├── fileSystem.ts        # File system operations
│   │       ├── contractParser.ts    # Contract source parsing
│   │       ├── commands.interface.ts
│   │       └── contract.interface.ts
│   └── tools/                       # MCP tool definitions
│       ├── classic.ts
│       ├── soroban.ts
│       └── tools.ts
├── apps/
│   └── docs/                        # Fumadocs documentation site
├── package.json
├── tsconfig.json
└── README.md
```

### Key Components

- **Server Layer** (`src/index.ts`): MCP server implementation, tool routing, and request handling
- **Feature Layer** (`src/features/`): Blockchain logic for Classic and Soroban, plus the shared `core` utilities
- **Tool Layer** (`src/tools/`): MCP tool definitions and schemas
- **Core Layer** (`src/features/core/`): Cross-platform utilities and shared functionality
- **Shared Layer** (`src/shared/`): Type definitions used across features

## 📦 Installation

### Prerequisites

- Node.js 18+
- npm or yarn
- Git (for cloning the repository)

### Install Dependencies

```bash
npm install
```

### Build the Project

```bash
npm run build
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the project root with the following configuration:

```env
STELLAR_SERVER_URL=https://horizon-testnet.stellar.org
```

**Available Stellar Networks:**

- **Testnet**: `https://horizon-testnet.stellar.org`
- **Public**: `https://horizon.stellar.org`
- **Futurenet**: `https://horizon-futurenet.stellar.org`

### MCP Client Configuration

Configure your MCP client (Cursor, Windsurf, Claude Desktop) to use the Stellar MCP server:

#### Local Installation

```json
{
  "mcpServers": {
    "stellar-mcp": {
      "command": "node",
      "args": ["/path/to/stellar-mcp-server/dist/index.js"]
    }
  }
}
```

#### NPX Installation

```json
{
  "mcpServers": {
    "stellar-mcp": {
      "command": "npx",
      "args": ["-y", "stellar-mcp-server"]
    }
  }
}
```

#### Docker Installation

```json
{
  "mcpServers": {
    "stellar-mcp": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "--init",
        "-e",
        "STELLAR_SERVER_URL=https://horizon-testnet.stellar.org",
        "stellar-mcp-server"
      ]
    }
  }
}
```

## 🚀 Usage

### Running the Server

**Development Mode:**

```bash
npm run start:dev
```

**Production Mode:**

```bash
npm run start:prod
```

### Debugging with MCP Inspector

To debug the server and monitor interactions:

```bash
npx @modelcontextprotocol/inspector node /path/to/stellar-mcp-server/dist/index.js
```

Then open your browser to `http://localhost:5173` to view the inspector interface.

## 🛠️ Available Tools

### Stellar Classic Tools

#### `stellar_create_account`

Create a new Stellar account with a random keypair.

**Returns:** Public key and secret key of the new account

#### `stellar_balance`

Get the balance of a Stellar account including all assets.

**Parameters:**

- `account` (string): The public key of the account to check balance

#### `stellar_payment`

Send a payment to another Stellar account.

**Parameters:**

- `destination` (string, required): The destination account public key
- `amount` (string, required): The amount to send
- `secretKey` (string, required): The secret key of the source account
- `asset` (object, optional): Custom asset details
  - `code` (string): The asset code
  - `issuer` (string): The asset issuer public key

#### `stellar_transactions`

Get transaction history for a Stellar account.

**Parameters:**

- `account` (string): The account public key to get transactions for

#### `stellar_create_asset`

Create a new custom asset on the Stellar network.

**Parameters:**

- `code` (string, required): The asset code
- `issuerSecretKey` (string, required): The secret key of the issuing account
- `distributorSecretKey` (string, required): The secret key of the distributing account
- `totalSupply` (string, required): The total supply of the asset

#### `stellar_change_trust`

Create or modify a trustline for a custom asset.

**Parameters:**

- `asset` (object, required):
  - `code` (string, required): The asset code
  - `issuer` (string, required): The asset issuer public key
- `limit` (string, required): The trust limit
- `secretKey` (string, required): The secret key of the account changing trust

#### `stellar_create_claimable_balance`

Create a claimable balance that can be claimed by specified accounts under certain conditions.

**Parameters:**

- `asset` (object, optional): Custom asset details. If not provided, uses native XLM
  - `code` (string): The asset code (e.g., "USD", "EUR")
  - `issuer` (string): The asset issuer public key
- `amount` (string, required): Amount to lock in the claimable balance
- `claimants` (array, required): List of accounts that can claim this balance
  - `destination` (string): Public key of the account that can claim
  - `predicate` (object): Conditions for claiming
    - `type` (string): One of: "UNCONDITIONAL", "BEFORE_RELATIVE_TIME", "BEFORE_ABSOLUTE_TIME", "NOT", "AND", "OR"
    - `value` (number or array): For time predicates: seconds/timestamp, for compound predicates: array of predicates
- `secretKey` (string, required): Secret key of the account creating the balance

#### `stellar_claim_claimable_balance`

Claim a claimable balance using its ID.

**Parameters:**

- `balanceId` (string, required): ID of the claimable balance to claim
- `secretKey` (string, required): Secret key of the claiming account

#### `stellar_fund_account`

Fund a testnet account using the Friendbot faucet.

**Parameters:**

- `publicKey` (string): The public key of the account to fund

### Soroban Tools

#### `soroban_build_and_optimize`

Build and optimize Soroban smart contracts from source code.

**Parameters:**

- `contractPath` (string, optional): The path to the contract directory. Defaults to current working directory

**Features:**

- Automatically builds contracts using `stellar contract build`
- Finds all WASM files in the target directory
- Optimizes each WASM file using `stellar contract optimize`
- Provides detailed logs of the entire process

#### `soroban_deploy`

Deploy a compiled Soroban contract to the Stellar network.

**Parameters:**

- `wasmPath` (string, required): Path to the compiled WASM file
- `secretKey` (string, required): Secret key of the deploying account
- `constructorArgs` (array, optional): Arguments for contract constructor if applicable
  - Each argument should be an object with:
    - `name` (string): Name of the constructor parameter
    - `type` (string): Type of the argument (e.g., "Address", "String", etc.)
    - `value` (string): Value of the argument

**Features:**

- Automatically detects if contract has a constructor
- Validates constructor arguments before deployment
- Provides detailed deployment logs and status updates
- Supports both simple contracts and contracts with initialization logic

#### `soroban_retrieve_contract_methods`

Retrieve the complete interface of a deployed Soroban smart contract.

**Parameters:**

- `contractAddress` (string, required): Address of the deployed contract (starts with "C")
- `secretKey` (string, required): Secret key of the account making the query

**Returns:** A structured ContractInterface object containing:

- `name`: The name of the contract
- `methods`: Array of contract methods with parameters and return types
- `structs`: Array of contract structs with fields
- `enums`: Array of contract enums with variants

**Features:**

- Supports all Soroban data types (primitives, structs, nested structs, enums)
- Handles complex data types and nested structures
- Automatically filters out the `env` parameter from method signatures
- Supports various enum types including error enums

## 💻 Development

### Project Structure

```
stellar-mcp-server/
├── src/
│   ├── index.ts                 # Main server entry point
│   ├── config/                  # Configuration management
│   ├── shared/                  # Shared TypeScript types
│   ├── features/                # Feature modules (classic, soroban, core)
│   └── tools/                   # MCP tool definitions
├── apps/docs/                   # Fumadocs documentation site
├── package.json
├── tsconfig.json
└── README.md
```

### Available Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run start:dev` - Run in development mode with hot reload
- `npm run start:prod` - Run in production mode
- `npm run lint` - Run ESLint for code quality checks
- `npm test` - Run test suite

### Adding New Tools

To add a new Stellar tool:

1. Define the tool schema in `src/features/[classic|soroban]/schemas.ts`
2. Implement the tool logic in `src/features/[classic|soroban]/[classic|soroban].ts`
3. Add the tool definition in `src/tools/[classic|soroban].ts`
4. Add the tool handler in `src/index.ts`

### Code Style

- Use TypeScript for all new code
- Add JSDoc comments for all public functions and classes
- Follow existing code patterns and conventions
- Use conventional commit messages

## 🤝 Contributing

We welcome contributions to the Stellar MCP Server! Please see our [Contributing Guide](docs/CONTRIBUTING.md) for details on how to get started.

### Quick Start for Contributors

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit with conventional commit messages
5. Push to your fork (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## 📄 License

This MCP server is licensed under the MIT License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the MIT License. For more details, please see the LICENSE file in the project repository.
