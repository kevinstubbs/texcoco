'use server'

import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function generateContract(prompt: string) {
    // This is just for testing other things/preserving tokens.
    if (prompt?.length && prompt.length > 0) {
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
        const message = await anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 4000,
            messages: [
                {
                    role: "user",
                    content: `You are an expert blockchain contract writer. Create an Aztec Smart contract in the Noir language given the user's prompt. Your output should be only valid aztec contract code and nothing else.

User's prompt: ${prompt}`
                }
            ],
        });

        return {
            success: true,
            code: message.content[0].type === 'text' ? message.content[0].text : JSON.stringify(message.content[0])
        };
    } catch (error) {
        console.error('Error generating contract:', error);
        return {
            success: false,
            error: 'Failed to generate contract'
        };
    }
} 