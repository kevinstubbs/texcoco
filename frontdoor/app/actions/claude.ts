'use server'

import { Anthropic } from '@anthropic-ai/sdk';
import fs from 'fs-extra';
import { join } from 'path';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!
});

export async function generateContract(prompt: string) {
    // This is just for testing other things/preserving tokens.
    if (prompt?.length && prompt.includes("DEBUG")) {
        return {
            success: true,
            code:
                `use dep::aztec::macros::aztec;

#[aztec]
pub contract OneTimeVote {
    use std::ops::Add;

    // Aztec utilities
    use dep::aztec::{
        keys::getters::get_public_keys,
        macros::{functions::{initializer, internal, private, public}, storage::storage},
    };
    use dep::aztec::prelude::{AztecAddress, Map, PublicImmutable, PublicMutable};
    use dep::aztec::protocol_types::traits::{Hash, ToField};

    #[storage]
    struct Storage<Context> {
        /// Number of "yes" votes
        yes_count: PublicMutable<u128, Context>,
        /// Number of "no" votes
        no_count: PublicMutable<u128, Context>,
    }

    /// Initialize both counters to zero.
    #[public]
    #[initializer]
    fn constructor() {
        storage.yes_count.write(0 as u128);
        storage.no_count.write(0 as u128);
    }

    #[private]
    fn cast_vote(choice: u8) {
        // Derive a nullifier so each address can vote exactly once
        let msg_sender_npk_m_hash = get_public_keys(context.msg_sender()).npk_m.hash();
        
        let secret = context.request_nsk_app(msg_sender_npk_m_hash);
        let nullifier =
            std::hash::pedersen_hash([context.msg_sender().to_field(), secret]);
        context.push_nullifier(nullifier);

        // Enqueue internal tally update
        OneTimeVote::at(context.this_address())
            ._add_to_tally(choice)
            .enqueue(&mut context);
    }

    /// Internal function to update the tally.
    #[public]
    #[internal]
    fn _add_to_tally(choice: u8) {
        // Only allow binary choices
        assert(choice < 2, "invalid choice");

        let one: u128 = 1;
        if choice == 1 {
            let new = storage.yes_count.read().add(one);
            storage.yes_count.write(new);
        } else {
            let new = storage.no_count.read().add(one);
            storage.no_count.write(new);
        }
    }

    /// View current "yes" vote count.
    #[public]
    fn get_yes_count() -> pub u128 {
        storage.yes_count.read()
    }

    /// View current "no" vote count.
    #[public]
    fn get_no_count() -> pub u128 {
        storage.no_count.read()
    }
}
`
        }
    }

    try {
        // Read the prompt from the file
        const promptPath = join(process.cwd(), 'app', 'actions', 'prompt.txt');
        const systemPrompt = await fs.readFile(promptPath, 'utf-8');

        const message = await anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 4000,
            messages: [
                {
                    role: "user",
                    content: `${systemPrompt}

User's prompt: ${prompt}`
                }
            ],
        });

        const content = message.content[0].text;

        // Extract the contract code from the response
        const codeMatch = content.match(/```(?:noir)?\n([\s\S]*?)\n```/);
        if (!codeMatch) {
            throw new Error('Failed to extract contract code from response');
        }

        return { success: true, code: codeMatch[1] };
    } catch (error) {
        console.error('Error generating contract:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to generate contract' };
    }
}

export async function generateUIConfig(contractCode: string) {
    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.ANTHROPIC_API_KEY!,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: "claude-sonnet-4-20250514",
                max_tokens: 4000,
                messages: [
                    {
                        role: 'user',
                        content: `Based on this aztec smart contract, identify the different user personas (one could be a governor, another could be a user, etc.) and generate an outline of the UI for each persona based on how they could interact with the contract, what information they could read, etc.

For example, a token contract would probably let users withdraw and read their balance, while the dao controller would be able to call emergency_shutdown.

Only include UI for on-chain interactions with the contract (read and write)

Here's the contract code:
\`\`\`noir
${contractCode}
\`\`\`

Please generate a UI config that follows this TypeScript interface:

\`\`\`typescript
interface UIConfig {
    personas: Array<{
        id: string;
        displayName: string;
        permissions: {
            read: string[];
            write: string[];
        };
        screens: Array<{
            id: string;
            type: 'panel' | 'form' | 'screen' | 'dashboard';
            title?: string;
            props?: {
                prompt?: string;
            };
            components?: Array<{
                type: 'button' | 'numeric_display' | 'toggle' | 'choice_selector' | 'text' | 'tx_details' | 'bar_chart' | 'link_list';
                id: string;
                label?: string;
                content?: string;
                action?: {
                    type: 'deployContract' | 'invokeFunction';
                    function?: string;
                    args?: Record<string, string>;
                };
                dataSource?: {
                    type?: 'functionResults';
                    function?: string;
                    functions?: string[];
                    fetch?: 'lastTransaction';
                };
                options?: Array<{
                    label: string;
                    value: number;
                }>;
                items?: Array<{
                    label: string;
                    urlTemplate: string;
                }>;
                singleSelect?: boolean;
                requiresConfirmation?: boolean;
                confirmationMessage?: string;
                disabledBoundTo?: string;
                statusFlows?: Array<{
                    status: string;
                    label: string;
                    nextScreen?: string;
                }>;
                default?: boolean;
                autoRefreshBoundTo?: string;
            }>;
        }>;
    }>;
}
\`\`\`

The config should be valid TypeScript that can be parsed by JSON.parse().`
                    }
                ],
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to generate UI config');
        }

        const data = await response.json();
        const content = data.content[0].text;

        // Extract the JSON config from the response
        const configMatch = content.match(/```(?:typescript|json)?\n([\s\S]*?)\n```/);
        if (!configMatch) {
            throw new Error('Failed to extract UI config from response');
        }

        const config = JSON.parse(configMatch[1]);
        return { success: true, config };
    } catch (error) {
        console.error('Error generating UI config:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to generate UI config' };
    }
} 