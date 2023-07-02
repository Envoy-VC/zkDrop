# 🪂 zkDrop

![Airdrop](https://images.unsplash.com/photo-1592763235816-d816aed4f981)

The zkDrop project is a simple airdrop contract that leverages zero knowledge proofs and the [Mina Protocol](https://minaprotocol.com/). This contract provides a streamlined process for conducting airdrops while ensuring user eligibility through verification from a trusted off-chain source.

---

## Features ✨

- **Zero Knowledge Proofs**: The zkDrop contract utilizes zero knowledge proofs to verify user eligibility for the airdrop. This cryptographic technique allows for efficient and secure verification without revealing sensitive user information.
- **Mina Protocol Integration**: The zkDrop contract is built on the Mina Protocol, a lightweight blockchain that prioritizes privacy and scalability. By leveraging the Mina Protocol, the contract benefits from its efficient consensus mechanism and low resource requirements.
- **Off-Chain Verification**: The contract verifies user eligibility by relying on a trusted off-chain source. This approach ensures that the airdrop is conducted fairly and accurately, while maintaining the privacy of user data.

---

## Getting Started 🚀

To run this project, follow the steps below:

### Running the Oracle

Navigate to the oracle directory and install the required packages:

```bash
cd oracle
npm install
```

To start the Oracle, run the following command:

```bash
npm start
```

### Running the Airdrop Contract

Go to the contracts directory and install the necessary packages:

```bash
cd contracts
npm install
```

To run the Airdrop contract, execute the following command:

```bash
npm run build && node build/src/index.js
```

For a more detailed overview of how this contract works and instructions on how to build it, please refer to the accompanying blog post.

https://blog.vedantc.dev/build-an-zkapp-with-mina-protocol

---