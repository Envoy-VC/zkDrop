import {
	Field,
	UInt64,
	SmartContract,
	state,
	State,
	method,
	Permissions,
	PublicKey,
	Signature,
	Provable,
	Bool,
	MerkleMap,
	MerkleMapWitness,
	Mina,
	PrivateKey,
	AccountUpdate,
	Scalar,
} from 'snarkyjs';

// The public key of our trusted data provider
const ORACLE_PUBLIC_KEY =
	'B62qkyP8a2RfB5dZbdoRSWQqmbsdkTNWA8aDWNWt8ocndZhL7qqtgFD';

export class Airdrop extends SmartContract {
	@state(PublicKey) oraclePublicKey = State<PublicKey>();
	@state(Field) mapRoot = State<Field>();

	init() {
		super.init();
		this.account.permissions.set({
			...Permissions.default(),
			editState: Permissions.proofOrSignature(),
		});
		this.oraclePublicKey.set(PublicKey.fromBase58(ORACLE_PUBLIC_KEY));
		this.mapRoot.set(initialRoot);
		this.requireSignature();
	}

	@method deposit(amount: UInt64) {
		let senderUpdate = AccountUpdate.createSigned(this.sender);
		senderUpdate.send({ to: this, amount });
	}

	@method claimAirdrop(
		codeBalance: Field,
		nftsOwned: Field,
		signature: Signature,
		keyWitness: MerkleMapWitness,
		keyToChange: Field,
		valueBefore: Field
	) {
		// Get Oracle Public Key
		const oraclePublicKey = this.oraclePublicKey.get();
		this.oraclePublicKey.assertEquals(oraclePublicKey);

		// Verify Signature
		const validSignature = signature.verify(oraclePublicKey, [
			codeBalance,
			nftsOwned,
		]);
		validSignature.assertTrue();

		// Check CODE Tokens
		const hasEnoughCodeBalance = Provable.if(
			codeBalance.greaterThanOrEqual(Field(400 * 10 * 18)),
			Bool(true),
			Bool(false)
		);

		// Check NFTs
		const hasEnoughNFTs = Provable.if(
			nftsOwned.greaterThanOrEqual(Field(1)),
			Bool(true),
			Bool(false)
		);

		// Check if the user has either enough CODE Tokens or NFTs
		const isEligible = hasEnoughCodeBalance.or(hasEnoughNFTs);
		isEligible.assertEquals(Bool(true), 'Not Eligible for Airdrop');

		// Get the Initial Root and and Check valueBefore
		const initialRoot = this.mapRoot.get();
		this.mapRoot.assertEquals(initialRoot);

		valueBefore.assertEquals(Field(0));

		// Now Update the Root before sending MINA to prevent reentrancy attacks
		const [rootBefore, key] = keyWitness.computeRootAndKey(valueBefore);
		rootBefore.assertEquals(initialRoot, 'Airdrop Already Claimed');

		key.assertEquals(keyToChange);

		const [rootAfter, _] = keyWitness.computeRootAndKey(Field(1));
		this.mapRoot.set(rootAfter);

		// SEND MINA
		let amount = UInt64.from(1e10);
		this.send({ to: this.sender, amount });
	}
}

/*******************************************************************************
 * 1) Setup initial environment and test accounts
 ******************************************************************************/
const map = new MerkleMap();
let initialRoot = map.getRoot();

let useProof = false;
if (useProof) await Airdrop.compile();

let Local = Mina.LocalBlockchain({ proofsEnabled: useProof });
Mina.setActiveInstance(Local);

const { privateKey: deployerKey, publicKey: deployerAccount } =
	Local.testAccounts[0];

// Test Accounts
let account1Key = PrivateKey.random();
let account1Address = account1Key.toPublicKey();

let account2Key = PrivateKey.random();
let account2Address = account2Key.toPublicKey();

/*******************************************************************************
 * 2) Deploy the zkApp
 ******************************************************************************/

console.log('---------- Deploying zkApp  ----------');

const zkAppPrivateKey = PrivateKey.random();
const zkAppAddress = zkAppPrivateKey.toPublicKey();

let zkapp = new Airdrop(zkAppAddress);
let tx;

tx = await Mina.transaction(deployerAccount, () => {
	const feePayerUpdate = AccountUpdate.fundNewAccount(deployerAccount, 3);
	feePayerUpdate.send({ to: account1Address, amount: 1e11 });
	feePayerUpdate.send({ to: account2Address, amount: 0 });
	zkapp.deploy();
});
await tx.sign([deployerKey, zkAppPrivateKey]).send();

console.log(`\nDeployed zkApp at ${zkAppAddress.toBase58()}`);
console.log(
	'Balance of Account 1: ',
	Number(Mina.getBalance(account1Address).toString()) / 10 ** 9
);

/*******************************************************************************
 * 2) Send Funds to zkApp
 ******************************************************************************/

console.log('\n---------- Sending Funds to zkApp  ----------');
tx = await Mina.transaction(account1Address, () => {
	zkapp.deposit(UInt64.from(1e11));
});
await tx.prove();
await tx.sign([account1Key]).send();

console.log(
	'\nBalance of zkApp: ',
	Number(Mina.getBalance(zkAppAddress).toString()) / 10 ** 9
);
console.log(
	'Balance of Account 1: ',
	Number(Mina.getBalance(account1Address).toString()) / 10 ** 9
);

/*******************************************************************************
 * 3) Claim Airdrop
 ******************************************************************************/

console.log('\n---------- Claiming Airdrop  ----------');

async function claimAirdrop(
	pb: PublicKey,
	pk: PrivateKey,
	ethAdddress: string
) {
	const res = await fetch('http://localhost:3001', {
		method: 'POST',
		body: JSON.stringify({
			address: ethAdddress,
		}),
		headers: {
			'Content-Type': 'application/json',
		},
	});

	const { data, signature } = await res.json();
	const pbToField = Field.fromFields(pb.toFields());
	const witness = map.getWitness(pbToField);
	const valueBefore = Field(0);

	console.log(
		'\nBalance of Account before Airdrop: ',
		Number(Mina.getBalance(pb).toString()) / 10 ** 9
	);

	tx = await Mina.transaction(pb, () => {
		zkapp.claimAirdrop(
			Field(data?.codeBalance),
			Field(data?.isNFTHolder),
			new Signature(Field(signature?.r), Scalar.from(signature?.s)),
			witness,
			pbToField,
			valueBefore
		);
	});
	await tx.prove();
	await tx.sign([pk]).send();
	console.log(
		'Balance of Account after Airdrop: ',
		Number(Mina.getBalance(pb).toString()) / 10 ** 9
	);
	console.log(
		'Balance of zkApp after Airdrop: ',
		Number(Mina.getBalance(zkAppAddress).toString()) / 10 ** 9
	);
}

console.log('\n---------- Test 3 ----------');

await claimAirdrop(
	account2Address,
	account2Key,
	'0xe269688F24e1C7487f649fC3dCD99A4Bf15bDaA1'
);
