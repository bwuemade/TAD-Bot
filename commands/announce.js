const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    EmbedBuilder
} = require('discord.js');


// =========================
// ALLOWED IMAGE TYPES
// =========================

const allowedImageTypes = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp'
];


// =========================
// COMMAND
// =========================

const data =
    new SlashCommandBuilder()

        .setName('announce')

        .setDescription(
            'Create an announcement embed'
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
                    .setMaxLength(256)
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
                    .setMaxLength(4000)
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
                        'Channel where the announcement will be sent'
                    )
                    .addChannelTypes(
                        ChannelType.GuildText,
                        ChannelType.GuildAnnouncement
                    )
                    .setRequired(true)
        )

        // =========================
        // MENTION
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
        // MAIN IMAGE
        // =========================

        .addAttachmentOption(
            option =>
                option
                    .setName('image')
                    .setDescription(
                        'Optional large image'
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
                    .setMaxLength(2048)
                    .setRequired(false)
        )

        // =========================
        // FOOTER IMAGE
        // =========================

        .addAttachmentOption(
            option =>
                option
                    .setName('footer_image')
                    .setDescription(
                        'Optional footer icon image'
                    )
                    .setRequired(false)
        );


// =========================
// EXECUTE
// =========================

async function execute(interaction) {

    // =========================
    // SILENT RESPONSE
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
                'You do not have permission to use this command.'
        });
    }


    // =========================
    // GET OPTIONS
    // =========================

    const title =
        interaction.options.getString(
            'title'
        );

    const message =
        interaction.options.getString(
            'message'
        );

    const channel =
        interaction.options.getChannel(
            'channel'
        );

    const role =
        interaction.options.getRole(
            'mention'
        );

    const image =
        interaction.options.getAttachment(
            'image'
        );

    const footer =
        interaction.options.getString(
            'footer'
        );

    const footerImage =
        interaction.options.getAttachment(
            'footer_image'
        );


    // =========================
    // BASIC VALIDATION
    // =========================

    if (
        !title ||
        !message ||
        !channel
    ) {

        return interaction.editReply({
            content:
                'Please provide a title, message, and channel.'
        });
    }


    // =========================
    // IMAGE VALIDATION
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
                    'The main image must be PNG, JPG, GIF, or WEBP.'
            });
        }
    }


    // =========================
    // FOOTER IMAGE VALIDATION
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
                    'The footer image must be PNG, JPG, GIF, or WEBP.'
            });
        }
    }


    // =========================
    // AUTOMATIC HEADER
    // =========================

    const header =
        '━━━━━━━━━━━━━━━━━━━━\n' +
        '           ANNOUNCEMENT\n' +
        '━━━━━━━━━━━━━━━━━━━━\n\n';


    // =========================
    // EMBED
    // =========================

    const embed =
        new EmbedBuilder()

            .setColor('#87CEFA')

            .setTitle(title)

            .setDescription(
                header +
                message
            )

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

    if (
        footer ||
        footerImage
    ) {

        const footerData = {

            text:
                footer ||
                '\u200B'
        };


        if (footerImage) {

            footerData.iconURL =
                `attachment://${footerImage.name}`;
        }


        embed.setFooter(
            footerData
        );
    }


    // =========================
    // FILES
    // =========================

    const files = [];


    if (image) {

        files.push({

            attachment:
                image.url,

            name:
                image.name
        });
    }


    if (footerImage) {

        files.push({

            attachment:
                footerImage.url,

            name:
                footerImage.name
        });
    }


    // =========================
    // SEND ANNOUNCEMENT
    // =========================

    try {

        await channel.send({

            content:
                role
                    ? `${role}`
                    : undefined,

            embeds: [
                embed
            ],

            files,

            allowedMentions: {

                roles:
                    role
                        ? [role.id]
                        : []

            }

        });

    } catch (error) {

        console.error(
            'Could not send announcement:',
            error
        );

        return interaction.editReply({
            content:
                'I could not send the announcement. Make sure I have permission to send messages and embeds in that channel.'
        });
    }


    // =========================
    // DELETE COMMAND RESPONSE
    // =========================

    try {

        await interaction.deleteReply();

    } catch (error) {

        console.error(
            'Could not delete announcement command response:',
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