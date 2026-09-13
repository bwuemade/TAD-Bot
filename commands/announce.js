const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    EmbedBuilder
} = require('discord.js');

const data =
    new SlashCommandBuilder()
        .setName('announce')
        .setDescription('Create an announcement embed')

        .addStringOption(
            option =>
                option
                    .setName('title')
                    .setDescription('Announcement title')
                    .setMaxLength(256)
                    .setRequired(true)
        )

        .addStringOption(
            option =>
                option
                    .setName('message')
                    .setDescription('Announcement message')
                    .setMaxLength(4000)
                    .setRequired(true)
        )

        .addChannelOption(
            option =>
                option
                    .setName('channel')
                    .setDescription('Channel where the announcement will be sent')
                    .addChannelTypes(
                        ChannelType.GuildText,
                        ChannelType.GuildAnnouncement
                    )
                    .setRequired(true)
        )

        .addRoleOption(
            option =>
                option
                    .setName('mention')
                    .setDescription('Optional role to mention')
                    .setRequired(false)
        )

        .addAttachmentOption(
            option =>
                option
                    .setName('image')
                    .setDescription('Optional image for the announcement')
                    .setRequired(false)
        )

        .addStringOption(
            option =>
                option
                    .setName('footer')
                    .setDescription('Optional footer text')
                    .setMaxLength(2048)
                    .setRequired(false)
        );

async function execute(interaction) {

    await interaction.deferReply({
        ephemeral: true
    });

    // ==============================
    // MODERATOR CHECK
    // ==============================

    if (
        !interaction.memberPermissions.has(
            PermissionFlagsBits.ManageMessages
        )
    ) {
        return interaction.editReply({
            content:
                '❌ You do not have permission to use this command.'
        });
    }

    // ==============================
    // GET OPTIONS
    // ==============================

    const title =
        interaction.options.getString('title');

    const message =
        interaction.options.getString('message');

    const channel =
        interaction.options.getChannel('channel');

    const role =
        interaction.options.getRole('mention');

    const attachment =
        interaction.options.getAttachment('image');

    const footer =
        interaction.options.getString('footer');

    // ==============================
    // BASIC VALIDATION
    // ==============================

    if (!title || !message || !channel) {
        return interaction.editReply({
            content:
                '❌ Please provide a title, message, and channel.'
        });
    }

    // ==============================
    // IMAGE VALIDATION
    // ==============================

    if (attachment) {

        const allowedTypes = [
            'image/png',
            'image/jpeg',
            'image/jpg',
            'image/gif',
            'image/webp'
        ];

        if (
            attachment.contentType &&
            !allowedTypes.includes(
                attachment.contentType
            )
        ) {
            return interaction.editReply({
                content:
                    '❌ Please upload a valid image file (PNG, JPG, GIF, or WEBP).'
            });
        }
    }

    // ==============================
    // CREATE EMBED
    // ==============================

    const embed =
        new EmbedBuilder()
            .setColor('#87CEFA')
            .setTitle(title)
            .setDescription(message)
            .setTimestamp();

    // ==============================
    // ADD IMAGE TO EMBED
    // ==============================

    if (attachment) {
        embed.setImage(attachment.url);
    }

    // ==============================
    // ADD FOOTER
    // ==============================

    if (footer) {
        embed.setFooter({
            text: footer
        });
    }

    // ==============================
    // SEND ANNOUNCEMENT
    // ==============================

    try {

        await channel.send({
            content: role
                ? `${role}`
                : undefined,

            embeds: [
                embed
            ],

            allowedMentions: {
                roles: role
                    ? [role.id]
                    : []
            }
        });

    } catch (error) {

        console.error(
            '❌ Could not send announcement:',
            error
        );

        return interaction.editReply({
            content:
                '❌ I could not send the announcement. Make sure I have permission to send messages and embeds in that channel.'
        });
    }

    // ==============================
    // SILENT COMMAND
    // ==============================

    try {

        await interaction.deleteReply();

    } catch (error) {

        console.error(
            '⚠️ Could not delete announcement command response:',
            error
        );
    }
}

module.exports = {
    data,
    execute
};