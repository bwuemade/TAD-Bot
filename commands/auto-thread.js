const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType
} = require('discord.js');

const {
    getAutoThread,
    setAutoThread,
    removeAutoThread,
    getAllAutoThreads
} = require('../utils/autoThreadManager');

const data =
    new SlashCommandBuilder()

        .setName('auto-thread')

        .setDescription(
            'Automatically create threads from messages'
        )

        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageThreads
        )

        // =========================
        // ENABLE
        // =========================

        .addSubcommand(
            subcommand =>
                subcommand

                    .setName('enable')

                    .setDescription(
                        'Enable automatic threads in a channel'
                    )

                    .addChannelOption(
                        option =>
                            option

                                .setName('channel')

                                .setDescription(
                                    'Channel where auto threads will be enabled'
                                )

                                .addChannelTypes(
                                    ChannelType.GuildText,
                                    ChannelType.GuildAnnouncement
                                )

                                .setRequired(true)
                    )

                    .addIntegerOption(
                        option =>
                            option

                                .setName('archive')

                                .setDescription(
                                    'How long inactive threads stay open'
                                )

                                .addChoices(
                                    {
                                        name: '1 hour',
                                        value: 60
                                    },
                                    {
                                        name: '1 day',
                                        value: 1440
                                    },
                                    {
                                        name: '3 days',
                                        value: 4320
                                    },
                                    {
                                        name: '7 days',
                                        value: 10080
                                    }
                                )

                                .setRequired(false)
                    )
        )

        // =========================
        // DISABLE
        // =========================

        .addSubcommand(
            subcommand =>
                subcommand

                    .setName('disable')

                    .setDescription(
                        'Disable automatic threads in a channel'
                    )

                    .addChannelOption(
                        option =>
                            option

                                .setName('channel')

                                .setDescription(
                                    'Channel where auto threads will be disabled'
                                )

                                .addChannelTypes(
                                    ChannelType.GuildText,
                                    ChannelType.GuildAnnouncement
                                )

                                .setRequired(true)
                    )
        )

        // =========================
        // STATUS
        // =========================

        .addSubcommand(
            subcommand =>
                subcommand

                    .setName('status')

                    .setDescription(
                        'View auto-thread settings'
                    )
        );


async function execute(interaction) {

    // =========================
    // PERMISSION
    // =========================

    if (
        !interaction.memberPermissions.has(
            PermissionFlagsBits.ManageThreads
        )
    ) {

        return interaction.reply({
            content:
                'You do not have permission to manage auto threads.',
            ephemeral: true
        });
    }

    // =========================
    // SUBCOMMAND
    // =========================

    const subcommand =
        interaction.options.getSubcommand();

    // =========================
    // ENABLE
    // =========================

    if (
        subcommand === 'enable'
    ) {

        const channel =
            interaction.options.getChannel(
                'channel'
            );

        const archive =
            interaction.options.getInteger(
                'archive'
            ) || 1440;

        if (!channel) {

            return interaction.reply({
                content:
                    'Please select a channel.',
                ephemeral: true
            });
        }

        const botPermissions =
            channel.permissionsFor(
                interaction.client.user
            );

        if (
            !botPermissions ||
            !botPermissions.has(
                PermissionFlagsBits.SendMessages
            ) ||
            !botPermissions.has(
                PermissionFlagsBits.CreatePublicThreads
            )
        ) {

            return interaction.reply({
                content:
                    `I need **Send Messages** and **Create Public Threads** permissions in ${channel}.`,
                ephemeral: true
            });
        }

        const saved =
            setAutoThread(
                channel.id,
                {
                    enabled: true,
                    autoArchiveDuration:
                        archive
                }
            );

        if (!saved) {

            return interaction.reply({
                content:
                    'I could not save the auto-thread settings.',
                ephemeral: true
            });
        }

        try {

            await interaction.reply({
                content:
                    `Auto threads are now enabled in ${channel}.`,
                ephemeral: true
            });

            await interaction.deleteReply();

        } catch (error) {

            console.error(
                'Could not remove auto-thread response:',
                error
            );
        }

        return;
    }

    // =========================
    // DISABLE
    // =========================

    if (
        subcommand === 'disable'
    ) {

        const channel =
            interaction.options.getChannel(
                'channel'
            );

        if (!channel) {

            return interaction.reply({
                content:
                    'Please select a channel.',
                ephemeral: true
            });
        }

        const removed =
            removeAutoThread(
                channel.id
            );

        if (!removed) {

            return interaction.reply({
                content:
                    `Auto threads are not enabled in ${channel}.`,
                ephemeral: true
            });
        }

        try {

            await interaction.reply({
                content:
                    `Auto threads have been disabled in ${channel}.`,
                ephemeral: true
            });

            await interaction.deleteReply();

        } catch (error) {

            console.error(
                'Could not remove auto-thread response:',
                error
            );
        }

        return;
    }

    // =========================
    // STATUS
    // =========================

    if (
        subcommand === 'status'
    ) {

        const autoThreads =
            getAllAutoThreads();

        const entries =
            Object.entries(
                autoThreads
            );

        if (entries.length === 0) {

            return interaction.reply({
                content:
                    'Auto threads are not enabled in any channel.',
                ephemeral: true
            });
        }

        const lines =
            [];

        for (
            const [
                channelId,
                config
            ]
            of entries
        ) {

            const channel =
                interaction.guild.channels.cache.get(
                    channelId
                );

            const channelName =
                channel
                    ? channel.toString()
                    : `Unknown channel (${channelId})`;

            const archiveMinutes =
                config.autoArchiveDuration ||
                1440;

            let archiveText;

            if (
                archiveMinutes === 60
            ) {

                archiveText =
                    '1 hour';

            } else if (
                archiveMinutes === 1440
            ) {

                archiveText =
                    '1 day';

            } else if (
                archiveMinutes === 4320
            ) {

                archiveText =
                    '3 days';

            } else if (
                archiveMinutes === 10080
            ) {

                archiveText =
                    '7 days';

            } else {

                archiveText =
                    `${archiveMinutes} minutes`;
            }

            lines.push(
                `${channelName} — ${archiveText}`
            );
        }

        return interaction.reply({
            content:
                `**Auto Thread Settings**\n\n` +
                lines.join('\n'),
            ephemeral: true
        });
    }
}

module.exports = {
    data,
    execute
};