require('dotenv').config();

const {
    REST,
    Routes
} = require('discord.js');

const fs = require('node:fs');
const path = require('node:path');

// =========================
// COMMANDS
// =========================

const commands = [];

const commandsPath =
    path.join(
        __dirname,
        'commands'
    );

const commandFiles =
    fs
        .readdirSync(
            commandsPath
        )
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

        commands.push(
            command.data.toJSON()
        );
    }
}

// =========================
// REST
// =========================

const rest =
    new REST({
        version: '10'
    }).setToken(
        process.env.DISCORD_TOKEN
    );

// =========================
// DEPLOY
// =========================

async function deploy() {

    try {

        console.log(
            `🔄 Registering ${commands.length} slash command(s)...`
        );

        await rest.put(

            Routes.applicationGuildCommands(
                process.env.CLIENT_ID,
                process.env.GUILD_ID
            ),

            {
                body: commands
            }
        );

        console.log(
            '✅ Slash commands registered successfully.'
        );

    } catch (error) {

        console.error(
            '❌ Failed to register slash commands:',
            error
        );
    }
}

deploy();