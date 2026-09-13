const {
    EmbedBuilder
} = require('discord.js');

// =========================
// UPDATE POLL LOG
// =========================

async function updatePollLog(
    client,
    poll
) {

    const channelId =
        process.env.POLL_LOG_CHANNEL_ID;

    if (!channelId) {

        console.log(
            'POLL_LOG_CHANNEL_ID is not set.'
        );

        return;
    }

    try {

        const channel =
            await client.channels.fetch(
                channelId
            );

        if (
            !channel ||
            !channel.isTextBased()
        ) {

            console.log(
                'Poll log channel could not be found.'
            );

            return;
        }

        // =========================
        // COUNT VOTES
        // =========================

        const counts =
            new Array(
                poll.options.length
            ).fill(0);

        for (
            const optionIndex
            of poll.votes.values()
        ) {

            if (
                Number.isInteger(
                    optionIndex
                ) &&
                optionIndex >= 0 &&
                optionIndex < counts.length
            ) {

                counts[optionIndex]++;
            }
        }

        const totalVotes =
            poll.votes.size;

        // =========================
        // RESULTS
        // =========================

        const results =
            poll.options
                .map(
                    (
                        option,
                        index
                    ) => {

                        const votes =
                            counts[index];

                        const percentage =
                            totalVotes > 0
                                ? Math.round(
                                    (
                                        votes /
                                        totalVotes
                                    ) * 100
                                )
                                : 0;

                        return (
                            `**${option}** — ` +
                            `${votes} vote${votes === 1 ? '' : 's'} ` +
                            `(${percentage}%)`
                        );
                    }
                )
                .join('\n');

        // =========================
        // STATUS
        // =========================

        const status =
            poll.ended
                ? '**POLL ENDED**'
                : '**POLL ACTIVE**';

        // =========================
        // EMBED
        // =========================

        const embed =
            new EmbedBuilder()

                .setTitle(
                    poll.ended
                        ? 'Poll — Final Results'
                        : 'Poll — Live Results'
                )

                .setDescription(
                    `### ${poll.question}\n\n` +
                    `${results}\n\n` +
                    `**Total votes:** ${totalVotes}\n\n` +
                    `${status}`
                )

                .setFooter({
                    text:
                        `Poll ID: ${poll.id}`
                })

                .setTimestamp(
                    new Date(
                        poll.createdAt
                    )
                );

        // =========================
        // CREATE LOG
        // =========================

        if (!poll.logMessageId) {

            const logMessage =
                await channel.send({

                    content:
                        `**Poll Created**\n` +
                        `Created by <@${poll.createdBy}>`,

                    embeds: [
                        embed
                    ]
                });

            poll.logMessageId =
                logMessage.id;

            return;
        }

        // =========================
        // FETCH EXISTING LOG
        // =========================

        let logMessage;

        try {

            logMessage =
                await channel.messages.fetch(
                    poll.logMessageId
                );

        } catch (error) {

            console.log(
                'Existing poll log could not be found. Creating a new one.'
            );

            const newLogMessage =
                await channel.send({

                    content:
                        poll.ended
                            ? '**Poll Ended**'
                            : '**Poll Live Update**',

                    embeds: [
                        embed
                    ]
                });

            poll.logMessageId =
                newLogMessage.id;

            return;
        }

        // =========================
        // UPDATE LOG
        // =========================

        await logMessage.edit({

            content:
                poll.ended
                    ? '**Poll Ended**'
                    : '**Poll Live Update**',

            embeds: [
                embed
            ]
        });
    }

    catch (error) {

        console.error(
            'Error updating poll log:',
            error
        );
    }
}

// =========================
// EXPORT
// =========================

module.exports = {
    updatePollLog
};