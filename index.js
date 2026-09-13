require('dotenv').config();

const {
    Client,
    GatewayIntentBits,
    PermissionFlagsBits
} = require('discord.js');

const {
    updatePollLog
} = require('./utils/pollLogger');

const {
    getSticky,
    setSticky
} = require('./utils/stickyManager');

const {
    getAutoThread
} = require('./utils/autoThreadManager');

const fs = require('node:fs');
const path = require('node:path');


// =========================
// CLIENT
// =========================

const client =
    new Client({

        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages
        ]

    });


// =========================
// STORAGE
// =========================

client.polls =
    new Map();

client.stickyQueues =
    new Map();

client.autoThreadQueues =
    new Map();

client.commands =
    new Map();


// =========================
// LOAD COMMANDS
// =========================

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
    const file
    of commandFiles
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
            `Logged in as ${client.user.tag}`
        );

        console.log(
            `Active polls: ${client.polls.size}`
        );

        console.log(
            'Sticky system loaded.'
        );

        console.log(
            'Auto-thread system loaded.'
        );
    }
);


// =========================
// AUTO THREAD
// =========================

client.on(
    'messageCreate',
    async message => {

        // Ignore bots
        if (
            message.author.bot
        ) {
            return;
        }

        // Ignore DMs
        if (
            !message.guild
        ) {
            return;
        }

        // Ignore messages inside threads
        if (
            message.channel.isThread()
        ) {
            return;
        }

        const config =
            getAutoThread(
                message.channel.id
            );

        if (
            !config ||
            !config.enabled
        ) {
            return;
        }

        // =========================
        // CHECK BOT PERMISSIONS
        // =========================

        const permissions =
            message.channel.permissionsFor(
                client.user
            );

        if (
            !permissions ||
            !permissions.has(
                PermissionFlagsBits.CreatePublicThreads
            )
        ) {

            console.log(
                `Missing Create Public Threads permission in #${message.channel.name}`
            );

            return;
        }

        // =========================
        // PREVENT DUPLICATE PROCESSING
        // =========================

        if (
            message.hasThread
        ) {
            return;
        }

        // =========================
        // QUEUE PER CHANNEL
        // =========================

        if (
            !client.autoThreadQueues.has(
                message.channel.id
            )
        ) {

            client.autoThreadQueues.set(
                message.channel.id,
                Promise.resolve()
            );
        }

        const previousTask =
            client.autoThreadQueues.get(
                message.channel.id
            );

        const nextTask =
            previousTask
                .then(
                    async () => {

                        // =========================
                        // CHECK AGAIN
                        // =========================

                        const currentConfig =
                            getAutoThread(
                                message.channel.id
                            );

                        if (
                            !currentConfig ||
                            !currentConfig.enabled
                        ) {
                            return;
                        }

                        if (
                            message.hasThread
                        ) {
                            return;
                        }

                        // =========================
                        // THREAD NAME
                        // =========================

                        let threadName =
                            message.content
                                .trim()
                                .replace(
                                    /\s+/g,
                                    ' '
                                );

                        if (
                            !threadName
                        ) {

                            threadName =
                                `Thread by ${message.author.username}`;

                        } else {

                            threadName =
                                `${message.author.username}: ${threadName}`;
                        }

                        // Discord thread names
                        // cannot exceed 100 characters.

                        threadName =
                            threadName.substring(
                                0,
                                100
                            );

                        // =========================
                        // CREATE THREAD
                        // =========================

                        try {

                            const thread =
                                await message.startThread({

                                    name:
                                        threadName,

                                    autoArchiveDuration:
                                        currentConfig.autoArchiveDuration ||
                                        1440,

                                    reason:
                                        'Automatic thread creation'
                                });

                            // =========================
                            // ADD MESSAGE AUTHOR
                            // =========================

                            try {

                                await thread.members.add(
                                    message.author.id
                                );

                            } catch (error) {

                                console.log(
                                    `Could not add ${message.author.tag} to auto thread.`
                                );
                            }

                            console.log(
                                `Created auto thread "${thread.name}" in #${message.channel.name}`
                            );

                        } catch (error) {

                            console.error(
                                `Could not create auto thread in #${message.channel.name}:`,
                                error
                            );
                        }
                    }
                )
                .catch(
                    error => {

                        console.error(
                            'Auto-thread queue error:',
                            error
                        );
                    }
                );

        client.autoThreadQueues.set(
            message.channel.id,
            nextTask
        );
    }
);


// =========================
// STICKY SYSTEM
// =========================

client.on(
    'messageCreate',
    async message => {

        if (
            message.author.bot
        ) {
            return;
        }

        if (
            !message.guild
        ) {
            return;
        }

        const sticky =
            getSticky(
                message.channel.id
            );

        if (
            !sticky
        ) {
            return;
        }

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

        const previousTask =
            client.stickyQueues.get(
                message.channel.id
            );

        const nextTask =
            previousTask
                .then(
                    async () => {

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

                                // Sticky may already be deleted.
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
                                `Could not move sticky in #${message.channel.name}:`,
                                error
                            );
                        }
                    }
                )
                .catch(
                    error => {

                        console.error(
                            'Sticky queue error:',
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


// =========================
// INTERACTIONS
// =========================

client.on(
    'interactionCreate',
    async interaction => {

        // =========================
        // SLASH COMMANDS
        // =========================

        if (
            interaction.isChatInputCommand()
        ) {

            const command =
                client.commands.get(
                    interaction.commandName
                );

            if (
                !command
            ) {
                return;
            }

            try {

                await command.execute(
                    interaction,
                    client
                );

            } catch (error) {

                console.error(
                    'Command error:',
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
                                'Something went wrong.',

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
                .slice(
                    1,
                    -1
                )
                .join('_');

        const poll =
            client.polls.get(
                pollId
            );

        if (
            !poll
        ) {

            return interaction.reply({

                content:
                    'This poll is no longer available.',

                ephemeral: true

            });
        }

        if (
            poll.ended
        ) {

            return interaction.reply({

                content:
                    'This poll has already ended.',

                ephemeral: true

            });
        }

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
                    'Invalid poll option.',

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

        try {

            await interaction.deferUpdate();

        } catch (error) {

            console.error(
                'Could not acknowledge poll button:',
                error
            );

            return;
        }

        // =========================
        // UPDATE MOD LOG
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