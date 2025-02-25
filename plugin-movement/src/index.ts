export * from "./actions/set-message";
export * from "./actions/transfer";
export * from "./providers/wallet";

import type { Plugin } from "@elizaos/core";
import transferToken from "./actions/transfer";
import { setMessaageAction } from "./actions/set-message";
import { walletProvider } from "./providers/wallet";

export const movementPlugin: Plugin = {
  name: "movement",
  description: "Movement Network Plugin for Eliza",
  providers: [walletProvider],
  evaluators: [],
  services: [],
  actions: [setMessaageAction, transferToken],
};

export default movementPlugin;
