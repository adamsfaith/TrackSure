# TrackSure: Blockchain Supply Chain Tracking System

A smart contract solution built on the Stacks blockchain for immutable supply chain tracking from origin to consumer.

![Supply Chain Tracking](https://cdnjs.cloudflare.com/ajax/libs/clarity-icons/2.0.0/svg/blocks-group.svg)

## Overview

TrackSure is a decentralized supply chain tracking system that provides end-to-end visibility, verification, and immutable record-keeping for products as they move through the supply chain. Using Clarity smart contracts on the Stacks blockchain, the system creates trust and transparency among all participants.

## Key Features

- **Entity Management**: Register and verify manufacturers, distributors, retailers, and other supply chain participants
- **Product Registration**: Create immutable product records with detailed descriptions and origin information
- **Ownership Transfer**: Track product custody changes with complete transfer history
- **Certification Records**: Record quality checks, inspections, and certifications for products
- **Product Lifecycle Management**: Track products from creation to end-of-life or consumption

## Smart Contract Details

The TrackSure smart contract is written in Clarity for the Stacks blockchain and includes:

- Secure entity registration and verification
- Product registration with origin tracking
- Transfer history with timestamps and location data
- Role-based permissions to ensure authorized operations
- Immutable certification and quality check records

## Project Structure

```
stx-tracksure/
├── contracts/
│   └── stx_tracksure.clar       # Main smart contract
├── tests/
│   └── stx_tracksure.test.ts    # Contract tests
├── README.md                    # This documentation
└── package.json                 # Project dependencies
```

## Getting Started

### Prerequisites

- [Clarinet](https://github.com/hirosystems/clarinet) for local Clarity development
- Node.js and npm
- Vitest for testing

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/stx-tracksure.git
   cd stx-tracksure
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Test the contract locally:
   ```
   npm test
   ```

4. Run contract checks:
   ```
   clarinet check
   ```

## Usage Examples

### Registering an Entity

```clarity
(contract-call? .stx-tracksure register-entity "Acme Manufacturing" "manufacturer")
```

### Verifying an Entity (Contract Owner Only)

```clarity
(contract-call? .stx-tracksure verify-entity 'SPMANUFACTURER)
```

### Registering a Product

```clarity
(contract-call? .stx-tracksure register-product 
  "PROD-001" 
  "Smartphone XYZ" 
  "Latest smartphone model" 
  "Factory A")
```

### Transferring Product Ownership

```clarity
(contract-call? .stx-tracksure transfer-product 
  "PROD-001" 
  'SPDISTRIBUTOR 
  "Distribution Center B" 
  "Bulk shipment of 1000 units")
```

### Adding Certification

```clarity
(contract-call? .stx-tracksure add-certification 
  "PROD-001" 
  "Quality assurance passed: All tests successful" 
  "QA Lab")
```

## Supply Chain Flow Example

1. **Manufacturing**: A verified manufacturer registers a new product with its detailed information.
2. **Quality Check**: The manufacturer adds certification data after internal quality control.
3. **Distribution**: The manufacturer transfers ownership to a distributor who updates the product location.
4. **Retail**: The distributor transfers ownership to a retailer.
5. **Consumer**: When sold to a consumer, the product is marked as inactive (end of tracked lifecycle).

## Error Codes

The contract returns the following error codes:

- `err-owner-only (100)`: Only the contract owner can perform this action
- `err-not-found (101)`: The specified entity or product was not found
- `err-already-exists (102)`: The entity or product already exists
- `err-unauthorized (103)`: The user is not authorized to perform this action

## Testing

The project includes comprehensive tests to verify all contract functionality:

- Entity registration and verification tests
- Product registration tests
- Transfer and ownership tests
- Authorization and permission tests
- End-to-end supply chain flow tests

Run tests with:

```
npm test
```

## Security Considerations

- Only verified entities can register products and participate in transfers
- Ownership verification prevents unauthorized transfers
- Contract owner verification prevents unauthorized entity verification
- Immutable history preserves the complete record of all operations

## Future Enhancements

- Integration with IoT devices for automated tracking
- QR code generation for consumer verification
- Analytics dashboard for supply chain insights
- Multi-signature approval for high-value transfers
- Regulatory compliance reporting capabilities

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

For questions or support, please open an issue in the GitHub repository or contact the maintainers.

---

Built with ❤️ for transparent supply chains and product authenticity