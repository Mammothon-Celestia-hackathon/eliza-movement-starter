export * from "./actions/set-message";
export * from "./actions/finalize-debate";
export * from "./actions/transfer";
export * from "./providers/wallet";

import type { Plugin } from "@elizaos/core";
import transferToken from "./actions/transfer";
import { setMessaageAction } from "./actions/set-message";
import { finalizeDebateAction } from "./actions/finalize-debate";
import { walletProvider } from "./providers/wallet";

export const movementPlugin: Plugin = {
  name: "movement",
  description: "Movement Network Plugin for Eliza",
  providers: [walletProvider],
  evaluators: [],
  services: [],
  actions: [finalizeDebateAction, setMessaageAction, transferToken],
};

export default movementPlugin;
