const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
    ChannelType
} = require('discord.js');

// =========================
// SLASH COMMAND
// =========================

const data =
    new SlashCommandBuilder()
        .setName('announce')
        .setDescription(
            'Create an announcement'
        )

        // =========================
        // TITLE
        // =========================

        .addStringOption(
            option =>
                option
                    .setName('title')
                    .setDescription(
                        'Announcement title'
                    )
                    .setRequired(true)
        )

        // =========================
        // MESSAGE
        // =========================

        .addStringOption(
            option =>
                option
                    .setName('message')
                    .setDescription(
                        'Announcement message'
                    )
                    .setRequired(true)
        )

        // =========================
        // CHANNEL
        // =========================

        .addChannelOption(
            option =>
                option
                    .setName('channel')
                    .setDescription(
                        'Channel where the announcement will be posted'
                    )
                    .addChannelTypes(
                        ChannelType.GuildText,
                        ChannelType.GuildAnnouncement
                    )
                    .setRequired(true)
        )

        // =========================
        // ROLE MENTION
        // =========================

        .addRoleOption(
            option =>
                option
                    .setName('mention')
                    .setDescription(
                        'Optional role to mention'
                    )
                    .setRequired(false)
        )

        // =========================
        // IMAGE
        // =========================

        .addStringOption(
            option =>
                option
                    .setName('image')
                    .setDescription(
                        'Optional image URL'
                    )
                    .setRequired(false)
        )

        // =========================
        // FOOTER
        // =========================

        .addStringOption(
            option =>
                option
                    .setName('footer')
                    .setDescription(
                        'Optional footer text'
                    )
                    .setRequired(false)
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
    // PERMISSION CHECK
    // =========================

    if (
        !interaction.memberPermissions.has(
            PermissionFlagsBits.ManageMessages
        )
    ) {

        return interaction.editReply({
            content:
                '❌ You do not have permission to create announcements.'
        });
    }

    // =========================
    // GET OPTIONS
    // =========================

    const title =
        interaction.options
            .getString('title')
            .trim();

    const message =
        interaction.options
            .getString('message')
            .trim();

    const channel =
        interaction.options
            .getChannel('channel');

    const mentionRole =
        interaction.options
            .getRole('mention');

    const image =
        interaction.options
            .getString('image');

    const footer =
        interaction.options
            .getString('footer');

    // =========================
    // VALIDATION
    // =========================

    if (!title) {

        return interaction.editReply({
            content:
                '❌ Please provide an announcement title.'
        });
    }

    if (!message) {

        return interaction.editReply({
            content:
                '❌ Please provide an announcement message.'
        });
    }

    if (!channel) {

        return interaction.editReply({
            content:
                '❌ Please select a channel.'
        });
    }

    // =========================
    // IMAGE URL VALIDATION
    // =========================

    if (image) {

        try {

            new URL(image);

        } catch {

            return interaction.editReply({
                content:
                    '❌ The image must be a valid URL.'
            });
        }
    }

    // =========================
    // CREATE EMBED
    // =========================

    const embed =
        new EmbedBuilder()
            .setTitle(title)
            .setDescription(message)
            .setColor('#87CEFA')
            .setTimestamp();

    // =========================
    // IMAGE
    // =========================

    if (image) {

        embed.setImage(image);
    }

    // =========================
    // FOOTER
    // =========================

    if (footer) {

        embed.setFooter({
            text: footer
        });
    }

    // =========================
    // MENTION
    // =========================

    const content =
        mentionRole
            ? `<@&${mentionRole.id}>`
            : undefined;

    // =========================
    // SEND ANNOUNCEMENT
    // =========================

    try {

        await channel.send({

            content,

            embeds: [
                embed
            ],

            allowedMentions:
                mentionRole
                    ? {
                        roles: [
                            mentionRole.id
                        ]
                    }
                    : {
                        parse: []
                    }
        });

    } catch (error) {

        console.error(
            '❌ Could not send announcement:',
            error
        );

        return interaction.editReply({
            content:
                '❌ I could not send the announcement. Make sure the bot can send messages and embeds in that channel.'
        });
    }

    // =========================
    // DELETE COMMAND RESPONSE
    // =========================

    try {

        await interaction.deleteReply();

    } catch (error) {

        console.error(
            '⚠️ Could not delete announcement command response:',
            error
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