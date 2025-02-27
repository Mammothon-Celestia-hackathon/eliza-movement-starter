import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { WalletProvider } from "../providers/wallet";
import {
  Account,
  Aptos,
  AptosConfig,
  Ed25519PrivateKey,
  Network,
  MoveStructId,
  PrivateKey,
  PrivateKeyVariants,
} from "@aptos-labs/ts-sdk";
import { defaultCharacter, elizaLogger } from "@elizaos/core";
import { MOVE_DECIMALS, MOVEMENT_NETWORK_CONFIG } from "../constants";
import dotenv from "dotenv";

// import { elizaLogger } from "@elizaos/core";

// Mock NodeCache
vi.mock("node-cache", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      set: vi.fn(),
      get: vi.fn().mockReturnValue(null),
    })),
  };
});

// Mock path module
vi.mock("path", async () => {
  const actual = await vi.importActual("path");
  return {
    ...actual,
    join: vi.fn().mockImplementation((...args) => args.join("/")),
  };
});

// Mock the ICacheManager
const mockCacheManager = {
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn(),
  delete: vi.fn(),
};

// describe("Environment Variables Test", () => {
//   it("should load environment variables", () => {
//     const privKey = process.env.MOVEMENT_PRIVATE_KEY;
//     expect(privKey).toBeDefined();
//   });
// });

describe("Movement ViewContract Action", () => {
  let account: Account;
  let wp: WalletProvider;
  let c: Aptos;
  let mockedRuntime;
  // let ga: GetBalanceAction;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockCacheManager.get.mockResolvedValue(null);

    const aptosClient = new Aptos(
      new AptosConfig({
        network: Network.CUSTOM,
        fullnode: MOVEMENT_NETWORK_CONFIG.bardock.fullnode,
      })
    );

    const movementAccount = Account.fromPrivateKey({
      privateKey: new Ed25519PrivateKey(
        PrivateKey.formatPrivateKey(
          process.env.MOVEMENT_PRIVATE_KEY,
          PrivateKeyVariants.Ed25519
        )
      ),
    });

    elizaLogger.info(
      `Got movement account: ${movementAccount.accountAddress.toString()}`
    );

    // set variables
    account = movementAccount;
    c = aptosClient;
    wp = new WalletProvider(
      aptosClient,
      movementAccount.accountAddress.toStringLong(),
      mockCacheManager
    );
    mockedRuntime = {
      character: {
        ...defaultCharacter,
        settings: {
          secrets: {
            MOVEMENT_PRIVATE_KEY:
              "0x5b4ca82e1835dcc51e58a3dec44b857edf60a26156b00f73d74bf96f5daecfb5",
            MOVEMENT_NETWORK: "bardock",
          },
        },
      },
    };

    //     ga = new GetBalanceAction(wp);
  });

  // describe("Get Balance", () => {
  //     it("get BNB balance", async () => {
  //         const input: GetBalanceParams = {
  //             chain: "bsc",
  //             address: account.address,
  //             token: "BNB",
  //         };
  //         const resp = await ga.getBalance(input);
  //         expect(resp.balance).toBeDefined();
  //         expect(typeof resp.balance).toBe("object");
  //     });

  // const privateKey = runtime.getSetting("MOVEMENT_PRIVATE_KEY");
  // elizaLogger.debug("Got private key:", privateKey ? "Present" : "Missing");

  // const network = runtime.getSetting("MOVEMENT_NETWORK");
  // elizaLogger.debug("Network config:", network);
  // elizaLogger.debug(
  //   "Available networks:",
  //   Object.keys(MOVEMENT_NETWORK_CONFIG)
  // );

  describe("Action Configuration", () => {
    it("should validate transfer messages correctly", async () => {
      await fetchResource(c, account);
      await viewContract(c);
      // await setContract(c, account);

      // expect(
      //   transferAction.shouldHandle({ content: { text: validMessage } })
      // ).toBe(true);
      // expect(
      //   transferAction.shouldHandle({ content: { text: invalidMessage } })
      // ).toBe(false);
    });
  });
});

const fetchResource = async (aptosClient: Aptos, account: Account) => {
  if (!account) return [];
  try {
    const result = await aptosClient.getAccountResource({
      accountAddress: account?.accountAddress,
      resourceType: `${account?.accountAddress.toString()}::message::MessageHolder`,
      // 0xd7ae4e1e8d4486450936d8fdbb93af0cba8e1ae00c00f82653f76c5d65d76a6f::message::MessageHolder
    });
    elizaLogger.info(result);
  } catch (e: any) {
    elizaLogger.error(e);
  }
};

const viewContract = async (aptosClient: Aptos) => {
  try {
    const data = await aptosClient.view({
      payload: {
        function:
          "0xd7ae4e1e8d4486450936d8fdbb93af0cba8e1ae00c00f82653f76c5d65d76a6f::message::get_message",
        functionArguments: [
          "0xd7ae4e1e8d4486450936d8fdbb93af0cba8e1ae00c00f82653f76c5d65d76a6f",
        ],
      },
    });
    elizaLogger.info(data);
  } catch (e: any) {
    elizaLogger.error(e);
  }
};

const setContract = async (aptosClient: Aptos, sender: Account) => {
  const CONTRACT_ADDRESS =
    "0xd7ae4e1e8d4486450936d8fdbb93af0cba8e1ae00c00f82653f76c5d65d76a6f";
  const transaction = await aptosClient.transaction.build.simple({
    sender: sender.accountAddress,
    data: {
      function: `${CONTRACT_ADDRESS}::message::set_message`,
      functionArguments: ["Hello, I'm movement elizaOS!"],
    },
  });

  try {
    // Sign and submit the transaction
    const pendingTransaction = await aptosClient.signAndSubmitTransaction({
      signer: sender,
      transaction: transaction,
    });
    elizaLogger.info(pendingTransaction);
  } catch (e: any) {
    elizaLogger.error(e);
  }
};
