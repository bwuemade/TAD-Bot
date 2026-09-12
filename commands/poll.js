const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits
} = require('discord.js');

const {
    updatePollLog
} = require('../utils/pollLogger');

// =========================
// SLASH COMMAND
// =========================

const data =
    new SlashCommandBuilder()
        .setName('poll')
        .setDescription(
            'Create a poll'
        )

        .addStringOption(
            option =>
                option
                    .setName('question')
                    .setDescription(
                        'What do you want to ask?'
                    )
                    .setRequired(true)
        )

        .addStringOption(
            option =>
                option
                    .setName('options')
                    .setDescription(
                        'Separate choices with commas'
                    )
                    .setRequired(true)
        )

        .addIntegerOption(
            option =>
                option
                    .setName('duration')
                    .setDescription(
                        'Duration in minutes'
                    )
                    .setRequired(false)
                    .setMinValue(1)
        );

// =========================
// EXECUTE
// =========================

async function execute(
    interaction,
    client
) {

    // ==================================
    // ACKNOWLEDGE IMMEDIATELY
    // ==================================
    // This prevents Discord from showing
    // "This interaction failed" if creation
    // takes more than a few seconds.
    //
    // It is ephemeral and will be deleted
    // before the command finishes.
    // ==================================

    await interaction.deferReply({
        ephemeral: true
    });

    // =========================
    // MODERATOR CHECK
    // =========================

    if (
        !interaction.memberPermissions.has(
            PermissionFlagsBits.ManageMessages
        )
    ) {

        return interaction.editReply({
            content:
                '❌ You do not have permission to create polls.'
        });
    }

    // =========================
    // GET OPTIONS
    // =========================

    const question =
        interaction.options
            .getString('question')
            .trim();

    const optionsText =
        interaction.options
            .getString('options');

    const duration =
        interaction.options
            .getInteger('duration');

    // =========================
    // QUESTION VALIDATION
    // =========================

    if (!question) {

        return interaction.editReply({
            content:
                '❌ Please provide a poll question.'
        });
    }

    // =========================
    // PARSE OPTIONS
    // =========================

    const options =
        optionsText
            .split(',')
            .map(option => option.trim())
            .filter(
                option =>
                    option.length > 0
            );

    // =========================
    // MINIMUM OPTIONS
    // =========================

    if (options.length < 2) {

        return interaction.editReply({
            content:
                '❌ You need at least 2 poll options.'
        });
    }

    // =========================
    // MAXIMUM OPTIONS
    // =========================

    if (options.length > 25) {

        return interaction.editReply({
            content:
                '❌ You can have a maximum of 25 poll options.'
        });
    }

    // =========================
    // OPTION LENGTH
    // =========================

    const tooLongOption =
        options.find(
            option =>
                option.length > 80
        );

    if (tooLongOption) {

        return interaction.editReply({
            content:
                '❌ Each poll option must be 80 characters or less.'
        });
    }

    // =========================
    // POLL ID
    // =========================

    const pollId =
        `${interaction.id}_${Date.now()}`;

    // =========================
    // CREATE BUTTONS
    // =========================

    const buttons =
        options.map(
            (option, index) => {

                return new ButtonBuilder()
                    .setCustomId(
                        `poll_${pollId}_${index}`
                    )
                    .setLabel(option)
                    .setStyle(
                        ButtonStyle.Primary
                    );
            }
        );

    // =========================
    // CREATE ROWS
    // =========================

    const rows = [];

    for (
        let i = 0;
        i < buttons.length;
        i += 5
    ) {

        rows.push(
            new ActionRowBuilder()
                .addComponents(
                    buttons.slice(
                        i,
                        i + 5
                    )
                )
        );
    }

    // =========================
    // CREATE POLL OBJECT
    // =========================

    const poll = {

        id: pollId,

        question: question,

        options: options,

        createdBy:
            interaction.user.id,

        createdAt:
            Date.now(),

        votes:
            new Map(),

        ended: false,

        logMessageId:
            null,

        channelId:
            interaction.channelId,

        messageId:
            null
    };

    client.polls.set(
        pollId,
        poll
    );

    // =========================
    // POLL MESSAGE
    // =========================

    let content =
        `**${question}**\n\n` +
        `Select one of the choices below to vote.`;

    if (duration) {

        content +=
            `\n\n⏰ This poll will close in **${duration} minute${duration === 1 ? '' : 's'}**.`;
    }

    // =========================
    // SEND POLL
    // =========================

    try {

        const pollMessage =
            await interaction.channel.send({
                content: content,
                components: rows
            });

        poll.messageId =
            pollMessage.id;

    } catch (error) {

        console.error(
            '❌ Could not send poll:',
            error
        );

        client.polls.delete(
            pollId
        );

        return interaction.editReply({
            content:
                '❌ I could not create the poll.'
        });
    }

    // =========================
    // CREATE MOD LOG
    // =========================

    await updatePollLog(
        client,
        poll
    );

    // =========================
    // DELETE COMMAND RESPONSE
    // =========================
    //
    // This is what makes the command
    // effectively invisible.
    //
    // No:
    // "Used /poll"
    //
    // No:
    // blank ephemeral message
    //
    // No:
    // "Poll created"
    //
    // =========================

    try {

        await interaction.deleteReply();

    } catch (error) {

        console.error(
            '⚠️ Could not delete command response:',
            error
        );
    }

    // =========================
    // POLL TIMER
    // =========================

    if (duration) {

        setTimeout(
            async () => {

                const currentPoll =
                    client.polls.get(
                        pollId
                    );

                if (!currentPoll) {
                    return;
                }

                if (currentPoll.ended) {
                    return;
                }

                // =========================
                // END POLL
                // =========================

                currentPoll.ended =
                    true;

                // =========================
                // DISABLE BUTTONS
                // =========================

                const disabledRows =
                    rows.map(
                        row => {

                            const disabledButtons =
                                row.components.map(
                                    button =>
                                        ButtonBuilder
                                            .from(button)
                                            .setDisabled(true)
                                );

                            return new ActionRowBuilder()
                                .addComponents(
                                    disabledButtons
                                );
                        }
                    );

                // =========================
                // UPDATE POLL MESSAGE
                // =========================

                try {

                    const channel =
                        await client.channels.fetch(
                            currentPoll.channelId
                        );

                    const pollMessage =
                        await channel.messages.fetch(
                            currentPoll.messageId
                        );

                    await pollMessage.edit({

                        content:
                            `**${currentPoll.question}**\n\n` +
                            `⏰ **This poll has ended.**`,

                        components:
                            disabledRows
                    });

                } catch (error) {

                    console.error(
                        '❌ Could not update ended poll:',
                        error
                    );
                }

                // =========================
                // FINAL MOD LOG
                // =========================

                await updatePollLog(
                    client,
                    currentPoll
                );

            },

            duration * 60 * 1000
        );
    }
}

// =========================
// EXPORT
// =========================

module.exports = {
    data,
    execute
};