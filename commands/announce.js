const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    EmbedBuilder
} = require('discord.js');

const allowedImageTypes = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp'
];

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
                    .setDescription('Optional large image')
                    .setRequired(false)
        )

        .addStringOption(
            option =>
                option
                    .setName('footer')
                    .setDescription('Optional footer text')
                    .setMaxLength(2048)
                    .setRequired(false)
        )

        .addAttachmentOption(
            option =>
                option
                    .setName('footer_image')
                    .setDescription('Optional footer icon image')
                    .setRequired(false)
        );


async function execute(interaction) {

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
                '❌ You do not have permission to use this command.'
        });
    }


    // =========================
    // GET OPTIONS
    // =========================

    const title =
        interaction.options.getString('title');

    const message =
        interaction.options.getString('message');

    const channel =
        interaction.options.getChannel('channel');

    const role =
        interaction.options.getRole('mention');

    const image =
        interaction.options.getAttachment('image');

    const footer =
        interaction.options.getString('footer');

    const footerImage =
        interaction.options.getAttachment('footer_image');


    // =========================
    // BASIC VALIDATION
    // =========================

    if (!title || !message || !channel) {
        return interaction.editReply({
            content:
                '❌ Please provide a title, message, and channel.'
        });
    }


    // =========================
    // CHECK MAIN IMAGE
    // =========================

    if (image) {

        if (
            image.contentType &&
            !allowedImageTypes.includes(
                image.contentType
            )
        ) {
            return interaction.editReply({
                content:
                    '❌ The main image must be PNG, JPG, GIF, or WEBP.'
            });
        }
    }


    // =========================
    // CHECK FOOTER IMAGE
    // =========================

    if (footerImage) {

        if (
            footerImage.contentType &&
            !allowedImageTypes.includes(
                footerImage.contentType
            )
        ) {
            return interaction.editReply({
                content:
                    '❌ The footer image must be PNG, JPG, GIF, or WEBP.'
            });
        }
    }


    // =========================
    // CREATE EMBED
    // =========================

    const embed =
        new EmbedBuilder()
            .setColor('#87CEFA')
            .setTitle(title)
            .setDescription(message)
            .setTimestamp();


    // =========================
    // MAIN IMAGE
    // =========================

    if (image) {

        embed.setImage(
            `attachment://${image.name}`
        );

    }


    // =========================
    // FOOTER
    // =========================

    if (footer || footerImage) {

        const footerData = {
            text: footer || '\u200B'
        };

        if (footerImage) {

            footerData.iconURL =
                `attachment://${footerImage.name}`;

        }

        embed.setFooter(footerData);
    }


    // =========================
    // FILE ATTACHMENTS
    // =========================

    const files = [];


    if (image) {

        files.push({
            attachment: image.url,
            name: image.name
        });

    }


    if (footerImage) {

        files.push({
            attachment: footerImage.url,
            name: footerImage.name
        });

    }


    // =========================
    // SEND ANNOUNCEMENT
    // =========================

    try {

        await channel.send({

            content: role
                ? `${role}`
                : undefined,

            embeds: [
                embed
            ],

            files,

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


module.exports = {
    data,
    execute
};