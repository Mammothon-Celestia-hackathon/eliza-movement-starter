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
  PrivateKey,
  PrivateKeyVariants,
} from "@aptos-labs/ts-sdk";
import { MOVEMENT_NETWORK_CONFIG } from "../constants";

export interface ViewContractContent extends Content {
  contractAddress: string;
  typeName: string;
}

function isViewContractContent(
  content: unknown
): content is ViewContractContent {
  elizaLogger.debug("Validating view contract content:", content);
  return (
    typeof (content as ViewContractContent).contractAddress === "string" &&
    typeof (content as ViewContractContent).typeName === "string" // TODO: add validate check ::
  );
}

const generateAPIUrl = (contractAddress: String, typeName: String): String => {
  const rpcEndpoint = "https://aptos.testnet.bardock.movementlabs.xyz/v1";
  const moduleAndType = "message::MessageHolder"; // Module and type for the resource
  return `${rpcEndpoint}/accounts/${contractAddress}/resource/${typeName}`;
};

import { setMessageTemplate } from "../templates";

export { setMessageTemplate };

export const setMessaageAction = {
  name: "set-message",
  description: "set a new messsage on the movement contract",
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: { [key: string]: unknown },
    callback?: HandlerCallback
  ) => {
    elizaLogger.debug("set-message action handler called");

    const privateKey = runtime.getSetting("MOVEMENT_PRIVATE_KEY");
    elizaLogger.debug("Got private key:", privateKey ? "Present" : "Missing");

    const network = runtime.getSetting("MOVEMENT_NETWORK");
    elizaLogger.debug("Network config:", network);

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

    // Compose set-message context
    const setMessageContext = composeContext({
      state,
      template: setMessageTemplate,
    });

    const content = await generateObjectDeprecated({
      runtime,
      context: setMessageContext,
      modelClass: ModelClass.LARGE,
    });

    try {
      // Build a new tx for set new message
      const tx = await aptosClient.transaction.build.simple({
        sender: movementAccount.accountAddress,
        data: {
          function: content.function,
          functionArguments: content.functionArguments,
        },
      });

      // Sign and submit the transaction
      const pendingTransaction = await aptosClient.signAndSubmitTransaction({
        signer: movementAccount,
        transaction: tx,
      });

      if (callback) {
        callback({
          text: `Successfully broadcasted set message tx`,
          content: {
            success: true,
            hash: pendingTransaction.hash,
          },
        });
      }

      // text: `Successfully transferred ${content.amount} MOVE to ${content.recipient}\nTransaction: ${executedTransaction.hash}\nView on Explorer: ${explorerUrl}`,
      // content: {
      //   success: true,
      //   hash: executedTransaction.hash,
      //   amount: content.amount,
      //   recipient: content.recipient,
      //   explorerUrl,
      // },

      return true;
    } catch (error) {
      elizaLogger.error("Error in set message handler:", error.message);
      if (callback) {
        callback({ text: `Error: ${error.message}` });
      }
      return false;
    }

    //   try {
    //     const swapResp = await action.swap(swapOptions);
    //     if (callback) {
    //         callback({
    //             text: `Successfully swap ${swapOptions.amount} ${swapOptions.fromToken} tokens to ${swapOptions.toToken}\nTransaction Hash: ${swapResp.hash}`,
    //             content: {
    //                 success: true,
    //                 hash: swapResp.hash,
    //                 recipient: swapResp.to,
    //                 chain: content.chain,
    //             },
    //         });
    //     }
    //     return true;
    // } catch (error) {
    //     elizaLogger.error("Error in swap handler:", error.message);
    //     if (callback) {
    //         callback({ text: `Error: ${error.message}` });
    //     }
    //     return false;
    // }
  },
  template: setMessageTemplate,
  validate: async () => {
    return true;
  },
  examples: [
    [
      {
        user: "user",
        content: {
          text: `Set "I'm Jeongseup" message on the 0xa07ab7d3739dc793f9d538f7d7163705176ba59f7a8c994a07357a3a7d97d843::messsage::set_message`,
          action: "SET_MESSAGE",
        },
      },
    ],
    [
      {
        user: "user",
        content: {
          text: `I want to set a new message, "elizaOS message" at 0xa07ab7d3739dc793f9d538f7d7163705176ba59f7a8c994a07357a3a7d97d843::messsage::set_message`,
          action: "SET_MESSAGE",
        },
      },
    ],
  ] as ActionExample[][],
  similes: ["SET_MESSAGE", "ADD_MESSAGE", "EXECUTE_MESSAGE"],
} as Action;
