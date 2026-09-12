const fs = require('node:fs');
const path = require('node:path');

// =========================
// FILE LOCATION
// =========================

const dataDirectory =
    path.join(
        __dirname,
        '..',
        'data'
    );

const dataFile =
    path.join(
        dataDirectory,
        'stickies.json'
    );

// =========================
// CREATE DATA DIRECTORY
// =========================

if (!fs.existsSync(dataDirectory)) {

    fs.mkdirSync(
        dataDirectory,
        {
            recursive: true
        }
    );
}

// =========================
// CREATE DATA FILE
// =========================

if (!fs.existsSync(dataFile)) {

    fs.writeFileSync(
        dataFile,
        '{}',
        'utf8'
    );
}

// =========================
// LOAD STICKIES
// =========================

function loadStickies() {

    try {

        const data =
            fs.readFileSync(
                dataFile,
                'utf8'
            );

        return JSON.parse(data);

    } catch (error) {

        console.error(
            '❌ Could not load sticky data:',
            error
        );

        return {};
    }
}

// =========================
// SAVE STICKIES
// =========================

function saveStickies(
    stickies
) {

    try {

        fs.writeFileSync(
            dataFile,
            JSON.stringify(
                stickies,
                null,
                4
            ),
            'utf8'
        );

        return true;

    } catch (error) {

        console.error(
            '❌ Could not save sticky data:',
            error
        );

        return false;
    }
}

// =========================
// GET STICKY
// =========================

function getSticky(
    channelId
) {

    const stickies =
        loadStickies();

    return stickies[channelId] || null;
}

// =========================
// SET STICKY
// =========================

function setSticky(
    channelId,
    sticky
) {

    const stickies =
        loadStickies();

    stickies[channelId] =
        sticky;

    return saveStickies(
        stickies
    );
}

// =========================
// REMOVE STICKY
// =========================

function removeSticky(
    channelId
) {

    const stickies =
        loadStickies();

    if (
        !stickies[channelId]
    ) {
        return false;
    }

    delete stickies[channelId];

    return saveStickies(
        stickies
    );
}

// =========================
// ALL STICKIES
// =========================

function getAllStickies() {

    return loadStickies();
}

// =========================
// EXPORT
// =========================

module.exports = {
    getSticky,
    setSticky,
    removeSticky,
    getAllStickies
};