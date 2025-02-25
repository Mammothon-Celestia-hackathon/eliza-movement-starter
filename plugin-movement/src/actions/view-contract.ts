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
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
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

// https://aptos.testnet.bardock.movementlabs.xyz/v1/accounts/d7ae4e1e8d4486450936d8fdbb93af0cba8e1ae00c00f82653f76c5d65d76a6f/resource/0xd7ae4e1e8d4486450936d8fdbb93af0cba8e1ae00c00f82653f76c5d65d76a6f::message::MessageHolder
const viewContractTemplate = `You are a smart contract state viewer. Extract the contract address and type name from the message.

Example request: "can you show me 0xd7ae4e1e8d4486450936d8fdbb93af0cba8e1ae00c00f82653f76c5d65d76a6f::message::MessageHolder data?"
Example response:
\`\`\`json
{
    "contractAddress": "0xd7ae4e1e8d4486450936d8fdbb93af0cba8e1ae00c00f82653f76c5d65d76a6f",
    "typeName": "0xd7ae4e1e8d4486450936d8fdbb93af0cba8e1ae00c00f82653f76c5d65d76a6f::message::MessageHolder"
}
\`\`\`

Rules:
1. The contract address always starts with "0x"
2. The type name must follow the format 'CONTRACT_ADDRESS::MODULE_NAME::MODULE_TYPE'. It must have exactly two '::'.
3. Return exact values found in the message.

Recent messages:
{{recentMessages}}

Extract and return ONLY the following in a JSON block:
- contractAddress: The smart contract address
- typeName: The contract resource type name

Return ONLY the JSON block with these two fields.`;

export default {
  name: "VIEW_CONTRACT_STATE",
  similes: ["GET_CONTRACT_STATE", "READ_CONTRACT", "QUERY_CONTRACT"],
  triggers: [
    "get contract state",
    "read contract",
    "query contract",
    "view contract",
  ],
  shouldHandle: (message: Memory) => {
    const text = message.content?.text?.toLowerCase() || "";
    return text.includes("contract") && text.includes("state");
  },
  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    elizaLogger.debug("Starting transfer validation for user:", message.userId);
    elizaLogger.debug("Message text:", message.content?.text);
    return true;
  },
  priority: 1000,
  description: "Retrieve and display the state of a specified smart contract",
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: { [key: string]: unknown },
    callback?: HandlerCallback
  ): Promise<boolean> => {
    elizaLogger.info("Starting VIEW_CONTRACT_STATE handler...");
    elizaLogger.info("Message:", {
      text: message.content?.text,
      userId: message.userId,
      action: message.content?.action,
    });

    try {
      const network = runtime.getSetting("MOVEMENT_NETWORK");
      elizaLogger.info("Network config:", network);

      const aptosClient = new Aptos(
        new AptosConfig({
          network: Network.CUSTOM,
          fullnode: MOVEMENT_NETWORK_CONFIG[network].fullnode,
        })
      );
      elizaLogger.info(
        "Created Aptos client with network:",
        MOVEMENT_NETWORK_CONFIG[network].fullnode
      );

      // Initialize or update state
      let currentState: State;
      if (!state) {
        currentState = (await runtime.composeState(message)) as State;
      } else {
        currentState = await runtime.updateRecentMessageState(state);
      }

      // Compose transfer context
      const viewContractContext = composeContext({
        state: currentState,
        template: viewContractTemplate,
      });

      // Generate transfer content
      const content = await generateObjectDeprecated({
        runtime,
        context: viewContractContext,
        modelClass: ModelClass.SMALL,
      });

      // Validate content
      if (!isViewContractContent(content)) {
        console.error("Invalid content for VIEW CONTRACT action.");
        if (callback) {
          callback({
            text: "Unable to process view contract request. Invalid content provided.",
            content: { error: "Invalid view contract content" },
          });
        }
        return false;
      }

      const resourceUrl = generateAPIUrl(
        content.contractAddress,
        content.typeName
      );
      elizaLogger.info(`Resource URL: ${resourceUrl}`);

      const response = await fetch(resourceUrl.toString());
      elizaLogger.info(response);

      return true;
    } catch (error) {
      console.error("Error querying contract state:", error);
      if (callback) {
        callback({
          text: `Error querying contract state: ${error.message}`,
          content: { error: error.message },
        });
      }
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "can you show me 0xd7ae4e1e8d4486450936d8fdbb93af0cba8e1ae00c00f82653f76c5d65d76a6f::message::MessageHolder data?",
        },
      },
      {
        user: "{{user2}}",
        content: {
          text: "Fetching the contract state...",
          action: "VIEW_CONTRACT",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "show me the contract state for 0x1234567890abcdef1234567890abcdef12345678::token::TokenHolder",
        },
      },
      {
        user: "{{user2}}",
        content: {
          text: "Looking up the TokenHolder data...",
          action: "VIEW_CONTRACT",
        },
      },
    ],
  ] as ActionExample[][],
} as Action;
