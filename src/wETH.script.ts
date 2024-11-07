import {
    AccountUpdate,
    Mina,
    PrivateKey,
    PublicKey,
    UInt64,
    Bytes,
    UInt8,
    Bool,
} from 'o1js';

import { FungibleToken } from './wETH.js';
import { FungibleTokenAdmin } from './FungibleTokenAdmin.js';

let proofsEnabled = true;

let deployerAccount: Mina.TestPublicKey,
    deployerKey: PrivateKey,
    senderAccount: Mina.TestPublicKey,
    senderKey: PrivateKey,
    tokenAdmin: Mina.TestPublicKey,
    tokenAdminKey: PrivateKey,
    wethAddress: PublicKey,
    wethPrivateKey: PrivateKey;

if (proofsEnabled) {
    await FungibleToken.compile();
    await FungibleTokenAdmin.compile();
}
const Local = await Mina.LocalBlockchain({ proofsEnabled });
Mina.setActiveInstance(Local);

// Retrieve test accounts from the local blockchain instance
[deployerAccount, senderAccount, tokenAdmin] = Local.testAccounts;
deployerKey = deployerAccount.key;
senderKey = senderAccount.key;
tokenAdminKey = tokenAdmin.key;

// Generate random keys for the wETH contract address and a mint receiver
wethPrivateKey = PrivateKey.random();
wethAddress = wethPrivateKey.toPublicKey();
let mintReceiverPriv = PrivateKey.random();
const weth = new FungibleToken(wethAddress);

let mintReceiverAddress = mintReceiverPriv.toPublicKey();

let tokenAdminContractPrivKey = PrivateKey.random();
let tokenAdminContractAddress = tokenAdminContractPrivKey.toPublicKey();
const tokenAdminContract = new FungibleTokenAdmin(tokenAdminContractAddress);

// Log key addresses for debugging and verification
console.log("Empty Public Key:", PublicKey.empty().toBase58());
console.log("Token Admin Address:", tokenAdmin.toBase58());
console.log("Mint Receiver Address:", mintReceiverAddress.toBase58());
console.log("wETH zkApp Address:", wethAddress.toBase58());
console.log("Token Admin zkApp Address:", tokenAdminContractAddress.toBase58());
const txn0 = await Mina.transaction(deployerAccount, async () => {
    AccountUpdate.fundNewAccount(deployerAccount, 1
    );

    await tokenAdminContract.deploy({
        adminPublicKey: tokenAdmin,
    });
});
await txn0.prove();
await txn0.sign([deployerKey, tokenAdminContractPrivKey]).send();

const txn1 = await Mina.transaction(deployerAccount, async () => {
    AccountUpdate.fundNewAccount(deployerAccount, 2);

    await weth.deploy({
        symbol: "wETH",
        src: "https://github.com/MinaFoundation/mina-fungible-token/blob/main/FungibleToken.ts",
    });

    await weth.initialize(
        tokenAdminContractAddress,
        UInt8.from(100),
        Bool(false)
    );
});
await txn1.prove();
await txn1.sign([deployerKey, wethPrivateKey, tokenAdminKey, tokenAdminContractPrivKey]).send();

const txn2 = await Mina.transaction(senderAccount, async () => {
    await weth.mint(mintReceiverAddress, UInt64.from(1));
});
await txn2.prove();
await txn2.sign([deployerKey, senderKey, wethPrivateKey, tokenAdminKey, tokenAdminContractPrivKey]).send();
