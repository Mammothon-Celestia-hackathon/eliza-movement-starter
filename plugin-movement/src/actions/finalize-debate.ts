import { elizaLogger } from "@elizaos/core";
import {
  type ActionExample,
  type Content,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  ModelClass,
  type State,
  type Action,
} from "@elizaos/core";
import { composeContext } from "@elizaos/core";
import { generateObjectDeprecated } from "@elizaos/core";
import {
  Account,
  Ed25519PrivateKey,
  Aptos,
  AptosConfig,
  Network,
  MoveFunctionId,
  PrivateKey,
  PrivateKeyVariants,
} from "@aptos-labs/ts-sdk";
import { MOVEMENT_NETWORK_CONFIG } from "../constants";
import { finalizeDebateTemplate } from "../templates";

function isMoveFunctionId(value: string): value is MoveFunctionId {
  return /^.+::.+::.+$/.test(value);
}

async function fetchLastDebateId(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();

    // Extract debates array
    const debates: { id: string }[] = data?.data?.debates;
    if (!Array.isArray(debates) || debates.length === 0) {
      throw new Error("No debates found in the response");
    }

    // Get the last debate
    const lastDebateId: string = debates[debates.length - 1].id;
    return lastDebateId;
  } catch (error) {
    console.error("Error fetching or parsing data:", error.message);
    return null;
  }
}

export interface FinalizeDebateContent extends Content {
  winnerId: number;
}

export { finalizeDebateTemplate };

export const finalizeDebateAction = {
  name: "finalize-debate",
  description: "make finalize debate transaction to end the debate",
  priority: 1000,
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: { [key: string]: unknown },
    callback?: HandlerCallback
  ) => {
    elizaLogger.debug("finalize-debate action handler called");

    const privateKey = runtime.getSetting("MOVEMENT_PRIVATE_KEY");
    elizaLogger.debug("Got private key:", privateKey ? "Present" : "Missing");

    const network = runtime.getSetting("MOVEMENT_NETWORK");
    elizaLogger.debug("Network config:", network);

    const contractAddress = runtime.getSetting("MOVEMENT_CONTRACT_ADDRESS");
    const contractName = runtime.getSetting("MOVEMENT_CONTRACT_NAME");
    const debateStore = "DebateStore";
    const finalizeDebateFunctionId = "finalize_debate";

    const resourceType = `${contractAddress}::${contractName}::${debateStore}`;
    const functionId: MoveFunctionId = `${contractAddress}::${contractName}::${finalizeDebateFunctionId}`;

    elizaLogger.info("Movement Resource Type:", resourceType);
    elizaLogger.info("Movement Function ID:", functionId);

    const movementAccount = Account.fromPrivateKey({
      privateKey: new Ed25519PrivateKey(
        PrivateKey.formatPrivateKey(privateKey, PrivateKeyVariants.Ed25519)
      ),
    });

    elizaLogger.debug(
      "Created Movement account:",
      movementAccount.accountAddress.toStringLong()
    );

    const aptosClient = new Aptos(
      new AptosConfig({
        network: Network.CUSTOM,
        fullnode: MOVEMENT_NETWORK_CONFIG[network].fullnode,
      })
    );

    // first call recent debateId from the contract
    // example: https://aptos.testnet.bardock.movementlabs.xyz/v1/accounts/0xd7ae4e1e8d4486450936d8fdbb93af0cba8e1ae00c00f82653f76c5d65d76a6f/resource/0xd7ae4e1e8d4486450936d8fdbb93af0cba8e1ae00c00f82653f76c5d65d76a6f::ai_debate_v4::DebateStore
    const url = `${MOVEMENT_NETWORK_CONFIG[network].fullnode}/accounts/${contractAddress}/resource/${resourceType}`;
    const debateId = await fetchLastDebateId(url);
    if (debateId == null) {
      elizaLogger.error(`failed to get debate id from: ${url}`);
      return false;
    }
    elizaLogger.info("Last Debate ID:", debateId);

    // Compose finalizeDebate context
    const finalizeDebateContext = composeContext({
      state,
      template: finalizeDebateTemplate,
    });

    const content = await generateObjectDeprecated({
      runtime,
      context: finalizeDebateContext,
      modelClass: ModelClass.LARGE,
    });

    if (content.winnerId == null) {
      elizaLogger.error("Sorry I'm not sure who is winner!");
      return false;
    }

    try {
      // Build a new tx
      const tx = await aptosClient.transaction.build.simple({
        sender: movementAccount.accountAddress,
        data: {
          function: functionId,
          functionArguments: [debateId, content.winnerId],
        },
      });

      // Sign and submit the transaction
      const pendingTransaction = await aptosClient.signAndSubmitTransaction({
        signer: movementAccount,
        transaction: tx,
      });

      if (callback) {
        callback({
          text: `Successfully broadcasted finalize debate message tx`,
          content: {
            success: true,
            hash: pendingTransaction.hash,
          },
        });
      }

      return true;
    } catch (error) {
      elizaLogger.error("Error in finalize debate handler:", error.message);
      if (callback) {
        callback({ text: `Error: ${error.message}` });
      }
      return false;
    }
  },
  template: finalizeDebateTemplate,
  validate: async () => {
    return true;
  },
  // examples: [
  //   [
  //     {
  //       user: "user",
  //       content: {
  //         text: "1 debate is over and then I think you are winner. I losed the game",
  //         action: "FINALIZE_DEBATE",
  //       },
  //     },
  //   ],
  //   [
  //     {
  //       user: "user",
  //       content: {
  //         text: "I think I'm a winner the 2 debate!",
  //         action: "FINALIZE_DEBATE",
  //       },
  //     },
  //   ],

  examples: [
    // Example 1: User suggests that the AI is the winner
    [
      {
        user: "user",
        content: {
          text: "The debate is over. I think you won!",
          action: "FINALIZE_DEBATE",
        },
      },
      {
        user: "agent",
        content: {
          text: "Based on the discussion, I am indeed the winner.",
          action: "FINALIZE_DEBATE",
          content: {
            winnerId: 1,
          },
        },
      },
    ],

    // Example 2: User claims to be the winner, but AI analyzes before finalizing
    [
      {
        user: "user",
        content: {
          text: "I think I won this debate!",
          action: "FINALIZE_DEBATE",
        },
      },
      {
        user: "agent",
        content: {
          text: "Analyzing the debate... It turns out that you actually won.",
          action: "FINALIZE_DEBATE",
          content: {
            winnerId: 2,
          },
        },
      },
    ],

    // Example 3: User asks to end the debate, AI determines winner based on logic
    [
      {
        user: "user",
        content: {
          text: "Let's conclude the debate now!",
          action: "FINALIZE_DEBATE",
        },
      },
      {
        user: "agent",
        content: {
          text: "Analyzing the discussion... I have determined the winner.",
          action: "FINALIZE_DEBATE",
          content: {
            winnerId: 1, // Or 2, depending on analysis
          },
        },
      },
    ],

    // Example 4: Debate is inconclusive
    [
      {
        user: "user",
        content: {
          text: "Let's wrap up the debate. Who won?",
          action: "FINALIZE_DEBATE",
        },
      },
      {
        user: "agent",
        content: {
          text: "This debate was inconclusive. No clear winner.",
          action: "FINALIZE_DEBATE",
          content: {
            winnerId: null,
          },
        },
      },
    ],
  ] as ActionExample[][],
  similes: ["FINALIZE_DEBATE"],
} as Action;

// Let's start to debate about BTC price in the future
