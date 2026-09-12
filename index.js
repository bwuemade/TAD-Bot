require('dotenv').config();

const {
    Client,
    GatewayIntentBits
} = require('discord.js');

const {
    updatePollLog
} = require('./utils/pollLogger');

const {
    getSticky,
    setSticky
} = require('./utils/stickyManager');

const fs = require('node:fs');
const path = require('node:path');

// =========================
// CLIENT
// =========================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ]
});

// =========================
// POLLS
// =========================

client.polls = new Map();

// =========================
// STICKY QUEUES
// =========================

client.stickyQueues = new Map();

// =========================
// COMMANDS
// =========================

client.commands = new Map();

const commandsPath =
    path.join(
        __dirname,
        'commands'
    );

const commandFiles =
    fs
        .readdirSync(commandsPath)
        .filter(
            file =>
                file.endsWith('.js')
        );

for (
    const file of commandFiles
) {

    const filePath =
        path.join(
            commandsPath,
            file
        );

    const command =
        require(filePath);

    if (
        command.data &&
        command.execute
    ) {

        client.commands.set(
            command.data.name,
            command
        );
    }
}

// =========================
// READY
// =========================

client.once(
    'ready',
    () => {

        console.log(
            `✅ Logged in as ${client.user.tag}`
        );

        console.log(
            `📊 Active polls: ${client.polls.size}`
        );

        console.log(
            `📌 Sticky system loaded.`
        );
    }
);

// ==================================================
// MESSAGE CREATE
// ==================================================

client.on(
    'messageCreate',
    async message => {

        // =========================
        // IGNORE BOTS
        // =========================

        if (
            message.author.bot
        ) {
            return;
        }

        // =========================
        // IGNORE DMs
        // =========================

        if (
            !message.guild
        ) {
            return;
        }

        // =========================
        // GET STICKY
        // =========================

        const sticky =
            getSticky(
                message.channel.id
            );

        if (!sticky) {
            return;
        }

        // =========================
        // CREATE CHANNEL QUEUE
        // =========================

        if (
            !client.stickyQueues.has(
                message.channel.id
            )
        ) {

            client.stickyQueues.set(
                message.channel.id,
                Promise.resolve()
            );
        }

        // =========================
        // QUEUE UPDATE
        // =========================

        const previousTask =
            client.stickyQueues.get(
                message.channel.id
            );

        const nextTask =
            previousTask
                .then(
                    async () => {

                        // =========================
                        // GET CURRENT STICKY
                        // =========================

                        const currentSticky =
                            getSticky(
                                message.channel.id
                            );

                        if (
                            !currentSticky
                        ) {
                            return;
                        }

                        // =========================
                        // DELETE OLD STICKY
                        // =========================

                        if (
                            currentSticky.messageId
                        ) {

                            try {

                                const oldSticky =
                                    await message.channel.messages.fetch(
                                        currentSticky.messageId
                                    );

                                await oldSticky.delete();

                            } catch (error) {

                                // The sticky may already be deleted.
                            }
                        }

                        // =========================
                        // SEND NEW STICKY
                        // =========================

                        try {

                            const newSticky =
                                await message.channel.send({
                                    content:
                                        `📌 ${currentSticky.message}`
                                });

                            // =========================
                            // UPDATE STORAGE
                            // =========================

                            setSticky(
                                message.channel.id,
                                {
                                    ...currentSticky,
                                    messageId:
                                        newSticky.id,
                                    updatedAt:
                                        Date.now()
                                }
                            );

                        } catch (error) {

                            console.error(
                                `❌ Could not move sticky in #${message.channel.name}:`,
                                error
                            );
                        }
                    }
                )
                .catch(
                    error => {

                        console.error(
                            '❌ Sticky queue error:',
                            error
                        );
                    }
                );

        client.stickyQueues.set(
            message.channel.id,
            nextTask
        );
    }
);

// ==================================================
// INTERACTIONS
// ==================================================

client.on(
    'interactionCreate',
    async interaction => {

        // =========================
        // SLASH COMMAND
        // =========================

        if (
            interaction.isChatInputCommand()
        ) {

            const command =
                client.commands.get(
                    interaction.commandName
                );

            if (!command) {
                return;
            }

            try {

                await command.execute(
                    interaction,
                    client
                );

            } catch (error) {

                console.error(
                    '❌ Command error:',
                    error
                );

                try {

                    if (
                        interaction.deferred ||
                        interaction.replied
                    ) {

                        if (
                            interaction.deferred &&
                            !interaction.replied
                        ) {

                            await interaction.deleteReply();
                        }

                    } else {

                        await interaction.reply({
                            content:
                                '❌ Something went wrong.',
                            ephemeral: true
                        });
                    }

                } catch {
                    // Ignore interaction errors.
                }
            }

            return;
        }

        // =========================
        // POLL BUTTONS
        // =========================

        if (
            !interaction.isButton()
        ) {
            return;
        }

        if (
            !interaction.customId.startsWith(
                'poll_'
            )
        ) {
            return;
        }

        const parts =
            interaction.customId.split('_');

        if (
            parts.length < 3
        ) {
            return;
        }

        const optionIndex =
            Number(
                parts[
                    parts.length - 1
                ]
            );

        const pollId =
            parts
                .slice(1, -1)
                .join('_');

        const poll =
            client.polls.get(
                pollId
            );

        // =========================
        // POLL NOT FOUND
        // =========================

        if (!poll) {

            return interaction.reply({
                content:
                    '❌ This poll is no longer available.',
                ephemeral: true
            });
        }

        // =========================
        // POLL ENDED
        // =========================

        if (
            poll.ended
        ) {

            return interaction.reply({
                content:
                    '⏰ This poll has already ended.',
                ephemeral: true
            });
        }

        // =========================
        // INVALID OPTION
        // =========================

        if (
            !Number.isInteger(
                optionIndex
            ) ||
            optionIndex < 0 ||
            optionIndex >=
                poll.options.length
        ) {

            return interaction.reply({
                content:
                    '❌ Invalid poll option.',
                ephemeral: true
            });
        }

        // =========================
        // SAVE VOTE
        // =========================

        poll.votes.set(
            interaction.user.id,
            optionIndex
        );

        // =========================
        // SILENT BUTTON RESPONSE
        // =========================

        try {

            await interaction.deferUpdate();

        } catch (error) {

            console.error(
                '❌ Could not acknowledge poll button:',
                error
            );

            return;
        }

        // =========================
        // UPDATE POLL LOG
        // =========================

        await updatePollLog(
            client,
            poll
        );
    }
);

// =========================
// LOGIN
// =========================

client.login(
    process.env.DISCORD_TOKEN
);