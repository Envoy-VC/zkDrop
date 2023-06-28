import express from 'express';
import { Request, Response } from 'express';
import { Network, Alchemy } from 'alchemy-sdk';
import { PrivateKey, Field, Signature } from 'snarkyjs';

const dotenv = require('dotenv');
dotenv.config({ path: './.env.local' });

const settings = {
	apiKey: process.env.ALCHEMY_API_KEY,
	network: Network.ETH_MAINNET,
};

const alchemy = new Alchemy(settings);
const codeAddress = '0xb24cd494faE4C180A89975F1328Eab2a7D5d8f11';
const DevDaoContract = '0x25ed58c027921E14D86380eA2646E3a1B5C55A8b';

const app = express();

app.post('/', async (req: Request, res: Response) => {
	const address: string = req.body.address;
	if (!address) res.status(400).send({ error: 'Address is required' });

	// Oracle Public and Private Key
	const privateKey = PrivateKey.fromBase58(process.env.PRIVATE_KEY ?? '');
	const publicKey = privateKey.toPublicKey();

	// Get CODE BALANCE
	const codeBalance = await alchemy.core
		.getTokenBalances(address, [codeAddress])
		.then((result) => Number(result?.tokenBalances?.at(0)?.tokenBalance));

	// Get NFTs
	const totalNFTs = await alchemy.nft
		.getNftsForOwner(address, {
			contractAddresses: [DevDaoContract],
		})
		.then((result) => result?.totalCount);

	const signature = Signature.create(privateKey, [
		Field(codeBalance),
		Field(totalNFTs),
	]);

	res.send({
		data: { codeBalance: codeBalance, isNFTHolder: totalNFTs },
		signature: signature,
		publicKey: publicKey,
	});
});

app.listen(process.env.PORT, () => {
	console.log(`Application started on port ${process.env.PORT}!`);
});
