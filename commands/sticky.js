const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType
} = require('discord.js');

const {
    getSticky,
    setSticky,
    removeSticky
} = require('../utils/stickyManager');

// =========================
// COMMAND
// =========================

const data =
    new SlashCommandBuilder()
        .setName('sticky')
        .setDescription(
            'Manage a sticky message'
        )

        // =========================
        // SET
        // =========================

        .addSubcommand(
            subcommand =>
                subcommand
                    .setName('set')
                    .setDescription(
                        'Create or update a sticky message'
                    )

                    .addChannelOption(
                        option =>
                            option
                                .setName('channel')
                                .setDescription(
                                    'Channel for the sticky message'
                                )
                                .addChannelTypes(
                                    ChannelType.GuildText,
                                    ChannelType.GuildAnnouncement
                                )
                                .setRequired(true)
                    )

                    .addStringOption(
                        option =>
                            option
                                .setName('message')
                                .setDescription(
                                    'Sticky message'
                                )
                                .setMaxLength(2000)
                                .setRequired(true)
                    )
        )

        // =========================
        // REMOVE
        // =========================

        .addSubcommand(
            subcommand =>
                subcommand
                    .setName('remove')
                    .setDescription(
                        'Remove a sticky message'
                    )

                    .addChannelOption(
                        option =>
                            option
                                .setName('channel')
                                .setDescription(
                                    'Channel whose sticky should be removed'
                                )
                                .addChannelTypes(
                                    ChannelType.GuildText,
                                    ChannelType.GuildAnnouncement
                                )
                                .setRequired(true)
                    )
        )

        // =========================
        // VIEW
        // =========================

        .addSubcommand(
            subcommand =>
                subcommand
                    .setName('view')
                    .setDescription(
                        'View the current sticky message'
                    )

                    .addChannelOption(
                        option =>
                            option
                                .setName('channel')
                                .setDescription(
                                    'Channel to check'
                                )
                                .addChannelTypes(
                                    ChannelType.GuildText,
                                    ChannelType.GuildAnnouncement
                                )
                                .setRequired(true)
                    )
        );

// =========================
// EXECUTE
// =========================

async function execute(
    interaction,
    client
) {

    // =========================
    // SILENT ACKNOWLEDGEMENT
    // =========================

    await interaction.deferReply({
        ephemeral: true
    });

    // =========================
    // PERMISSION
    // =========================

    if (
        !interaction.memberPermissions.has(
            PermissionFlagsBits.ManageMessages
        )
    ) {

        return interaction.editReply({
            content:
                '❌ You do not have permission to manage sticky messages.'
        });
    }

    // =========================
    // SUBCOMMAND
    // =========================

    const subcommand =
        interaction.options.getSubcommand();

    // ==================================================
    // SET
    // ==================================================

    if (
        subcommand === 'set'
    ) {

        const channel =
            interaction.options.getChannel(
                'channel'
            );

        const message =
            interaction.options.getString(
                'message'
            ).trim();

        if (!message) {

            return interaction.editReply({
                content:
                    '❌ Please provide a sticky message.'
            });
        }

        // =========================
        // CHECK OLD STICKY
        // =========================

        const existingSticky =
            getSticky(
                channel.id
            );

        // =========================
        // DELETE OLD STICKY
        // =========================

        if (
            existingSticky &&
            existingSticky.messageId
        ) {

            try {

                const oldMessage =
                    await channel.messages.fetch(
                        existingSticky.messageId
                    );

                await oldMessage.delete();

            } catch (error) {

                // Message may already be deleted.
            }
        }

        // =========================
        // SEND NEW STICKY
        // =========================

        let stickyMessage;

        try {

            stickyMessage =
                await channel.send({
                    content:
                        `📌 ${message}`
                });

        } catch (error) {

            console.error(
                '❌ Could not send sticky:',
                error
            );

            return interaction.editReply({
                content:
                    '❌ I could not send the sticky message. Make sure I have permission to send and manage messages in that channel.'
            });
        }

        // =========================
        // SAVE
        // =========================

        const saved =
            setSticky(
                channel.id,
                {
                    channelId:
                        channel.id,

                    guildId:
                        interaction.guildId,

                    message:
                        message,

                    messageId:
                        stickyMessage.id,

                    createdBy:
                        interaction.user.id,

                    updatedAt:
                        Date.now()
                }
            );

        if (!saved) {

            return interaction.editReply({
                content:
                    '❌ The sticky was sent, but I could not save it permanently.'
            });
        }

        // =========================
        // DELETE COMMAND RESPONSE
        // =========================

        try {

            await interaction.deleteReply();

        } catch (error) {

            console.error(
                '⚠️ Could not delete sticky command response:',
                error
            );
        }

        return;
    }

    // ==================================================
    // REMOVE
    // ==================================================

    if (
        subcommand === 'remove'
    ) {

        const channel =
            interaction.options.getChannel(
                'channel'
            );

        const existingSticky =
            getSticky(
                channel.id
            );

        if (!existingSticky) {

            return interaction.editReply({
                content:
                    '❌ There is no sticky message in that channel.'
            });
        }

        // =========================
        // DELETE MESSAGE
        // =========================

        if (
            existingSticky.messageId
        ) {

            try {

                const stickyMessage =
                    await channel.messages.fetch(
                        existingSticky.messageId
                    );

                await stickyMessage.delete();

            } catch (error) {

                // Message may already be deleted.
            }
        }

        // =========================
        // REMOVE FROM STORAGE
        // =========================

        removeSticky(
            channel.id
        );

        // =========================
        // SILENT
        // =========================

        try {

            await interaction.deleteReply();

        } catch (error) {

            console.error(
                '⚠️ Could not delete sticky command response:',
                error
            );
        }

        return;
    }

    // ==================================================
    // VIEW
    // ==================================================

    if (
        subcommand === 'view'
    ) {

        const channel =
            interaction.options.getChannel(
                'channel'
            );

        const sticky =
            getSticky(
                channel.id
            );

        if (!sticky) {

            return interaction.editReply({
                content:
                    '❌ There is no sticky message configured in that channel.'
            });
        }

        return interaction.editReply({
            content:
                `📌 **Current Sticky**\n\n` +
                `${sticky.message}`
        });
    }
}

// =========================
// EXPORT
// =========================

module.exports = {
    data,
    execute
};