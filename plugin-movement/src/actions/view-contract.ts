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
  functionName: string;
  functionArgs?: unknown[];
}

function isViewContractContent(
  content: unknown
): content is ViewContractContent {
  elizaLogger.debug("Validating view contract content:", content);
  return (
    typeof (content as ViewContractContent).contractAddress === "string" &&
    typeof (content as ViewContractContent).functionName === "string"
  );
}

const viewContractTemplate = `You are processing a contract state query request. Extract the contract address and function name from the message.

Example request: "get balance of 0x123..."
Example response:
\`\`\`json
{
    "contractAddress": "0x123...",
    "functionName": "balance_of",
    "functionArgs": ["0x123..."]
}
\`\`\`

Rules:
1. The contract address always starts with "0x"
2. The function name must be a valid identifier
3. Return exact values found in the message

Recent messages:
{{recentMessages}}

Extract and return ONLY the following in a JSON block:
- contractAddress: The smart contract address
- functionName: The function to call
- functionArgs: (optional) Any arguments to pass to the function

Return ONLY the JSON block with these fields.`;

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
    elizaLogger.debug("Starting VIEW_CONTRACT_STATE handler...");
    elizaLogger.debug("Message:", {
      text: message.content?.text,
      userId: message.userId,
      action: message.content?.action,
    });

    try {
      const network = runtime.getSetting("MOVEMENT_NETWORK");
      elizaLogger.debug("Network config:", network);

      const aptosClient = new Aptos(
        new AptosConfig({
          network: Network.CUSTOM,
          fullnode: MOVEMENT_NETWORK_CONFIG[network].fullnode,
        })
      );
      elizaLogger.debug(
        "Created Aptos client with network:",
        MOVEMENT_NETWORK_CONFIG[network].fullnode
      );

      const currentState = await runtime.updateRecentMessageState(state);
      const viewContext = composeContext({
        state: currentState,
        template: viewContractTemplate,
      });
      const content = await generateObjectDeprecated({
        runtime,
        context: viewContext,
        modelClass: ModelClass.SMALL,
      });

      if (!isViewContractContent(content)) {
        console.error("Invalid content for VIEW_CONTRACT_STATE action.");
        if (callback) {
          callback({
            text: "Unable to process contract state request. Invalid content provided.",
            content: { error: "Invalid contract query content" },
          });
        }
        return false;
      }

      const response = await aptosClient.view({
        function: `${content.contractAddress}::module::${content.functionName}`,
        arguments: content.functionArgs || [],
      });
      elizaLogger.debug("Contract query response:", response);

      if (callback) {
        callback({
          text: `Contract state retrieved for ${
            content.functionName
          }: ${JSON.stringify(response)}`,
          content: {
            success: true,
            contractAddress: content.contractAddress,
            functionName: content.functionName,
            result: response,
          },
        });
      }

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
        content: { text: "get balance of 0x123..." },
      },
      {
        user: "{{user2}}",
        content: { text: "Fetching balance...", action: "VIEW_CONTRACT_STATE" },
      },
    ],
  ] as ActionExample[][],
} as Action;
