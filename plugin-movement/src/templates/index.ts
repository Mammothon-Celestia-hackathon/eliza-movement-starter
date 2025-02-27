// set-message:
//     @echo "set contract message by interaction move contract...."
//     @movement move run \
//         --function-id 'default::message::set_message' \
//         --args 'string:hello, Jeongseup'

export const setMessageTemplate = `Given the recent messages below:

{{recentMessages}}

Extract the following information about the requested set message:
- Function is function ID. 
    - its format is <CONTRACT_ADDRESS>::<MODULE>::<TYPE> (CONTRACT_ADDRESS should be start with 0x123...
    - here is an example 0xd7ae4e1e8d4486450936d8fdbb93af0cba8e1ae00c00f82653f76c5d65d76a6f::message::set_message
- Function Arguments are inputs for executing fuction. 
    - it depends on function signature. that's why it will be arbitrary strings from user input

Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined:

\`\`\`json
{
    "function": string | null,
    "functionArguments": []string | null,
}
\`\`\`
`;

export const finalizeDebateTemplate = `Given the recent messages below:

{{recentMessages}}

Analyze the discussion and determine the winner based on logical reasoning, persuasive strength, and argument quality.

Rule:
- If my arguments were stronger, more logical, or better supported, I am the winner.
- If the opponent had stronger, more logical, or better-supported arguments, they are the winner.
- If the debate is inconclusive, return 0.


Extract the following information about the requested set message:
- reason: any text for specific reasone about who is winner
- winnerId: the number following by below
    - If I am the winner, set winnerId to 1.
    - If the opponent is the winner, set winnerId to 2
    - If the winner cannot be determined, set winnerId to 0.


Extract the winner's ID:

Return the extracted values in a JSON markdown block:

\`\`\`json
{
    "reason": string | null
    "winnerId": number | null
}
\`\`\`
`;

// create-debate:
// 	@echo "create debate call on contract"
// 	@movement move run \
// 		--profile jeongseup \
// 		--function-id 'jeongseup::ai_debate::create_debate' \
//   		--args \
//         	String:"topic_name" \
//         	String:"0xd7ae4e1e8d4486450936d8fdbb93af0cba8e1ae00c00f82653f76c5d65d76a6f" \
// 			String:"0x123" \
// 			u64:3600

// Finalize the debate with winner and emit event
// public entry fun finalize_debate(
//     caller: &signer,
//     debate_id: u64,
//     winner: u8
// )
// export const finalizeDebateTemplate = `Given the recent messages below:

// {{recentMessages}}

// Extract the following details about the specified debate:
// - winnerId: The winner's ID. (If I am the winner, set the ID to \`1\`; otherwise, set it to \`2\`.)

// Return the extracted values in a JSON markdown block. If any value cannot be determined, use \`null\`:

// \`\`\`json
// {
//     "winnerId": number | null
// }
// \`\`\`
// `;
