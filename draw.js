export function runDraw(participants, exclusions) {
    const names = participants.map(p => p.name);
    let shuffled = shuffle([...names]);

    let attempts = 0;
    while (!isValid(shuffled, participants, exclusions) && attempts < 1000) {
        shuffled = shuffle([...names]);
        attempts++;
    }

    if (attempts === 1000) return null;

    return participants.map((p, i) => ({
        from: p,
        to: participants.find(x => x.name === shuffled[i]),
    }));
}

function isValid(shuffled, participants, exclusions) {
    return exclusions.every(rule => {
        const fromIndex = participants.findIndex(p => p.name === rule.from);
        return shuffled[fromIndex] !== rule.to;
    });
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
