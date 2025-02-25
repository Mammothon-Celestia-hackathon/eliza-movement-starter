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
