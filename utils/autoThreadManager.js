const fs = require('node:fs');
const path = require('node:path');

const dataDirectory =
    path.join(__dirname, '..', 'data');

const dataFile =
    path.join(dataDirectory, 'autoThreads.json');

if (!fs.existsSync(dataDirectory)) {
    fs.mkdirSync(dataDirectory, {
        recursive: true
    });
}

if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(
        dataFile,
        '{}',
        'utf8'
    );
}

function loadAutoThreads() {
    try {
        const data =
            fs.readFileSync(
                dataFile,
                'utf8'
            );

        return JSON.parse(data);

    } catch (error) {

        console.error(
            'Could not load auto-thread data:',
            error
        );

        return {};
    }
}

function saveAutoThreads(autoThreads) {
    try {

        fs.writeFileSync(
            dataFile,
            JSON.stringify(
                autoThreads,
                null,
                4
            ),
            'utf8'
        );

        return true;

    } catch (error) {

        console.error(
            'Could not save auto-thread data:',
            error
        );

        return false;
    }
}

function getAutoThread(channelId) {

    const autoThreads =
        loadAutoThreads();

    return (
        autoThreads[channelId] ||
        null
    );
}

function setAutoThread(
    channelId,
    config
) {

    const autoThreads =
        loadAutoThreads();

    autoThreads[channelId] = {
        enabled: true,
        autoArchiveDuration:
            config.autoArchiveDuration || 1440
    };

    return saveAutoThreads(
        autoThreads
    );
}

function removeAutoThread(
    channelId
) {

    const autoThreads =
        loadAutoThreads();

    if (!autoThreads[channelId]) {
        return false;
    }

    delete autoThreads[channelId];

    return saveAutoThreads(
        autoThreads
    );
}

function getAllAutoThreads() {
    return loadAutoThreads();
}

module.exports = {
    getAutoThread,
    setAutoThread,
    removeAutoThread,
    getAllAutoThreads
};