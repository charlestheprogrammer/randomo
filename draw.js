export function runDraw(participants, exclusions) {
    // Build dictionary to associate each participant to their excluded participants
    const exclusionDict = {};

    // Initialize exclusion dict for all participants
    participants.forEach(p => {
        exclusionDict[p.name] = [];
    });

    // Populate exclusion dict from exclusions array
    exclusions.forEach(exclusion => {
        if (exclusionDict[exclusion.from]) {
            exclusionDict[exclusion.from].push(exclusion.to);
        }
    });

    // Create bipartite graph representation
    const graph = createBipartiteGraph(participants, exclusionDict);

    // Find maximum matching
    const matching = findMaximumMatching(graph, participants);

    // If no perfect matching found, return null
    if (matching.length !== participants.length) {
        return null;
    }

    // Convert matching to result format
    const result = convertMatchingToResult(matching, participants);
    return result;
}

function createBipartiteGraph(participants, exclusionDict) {
    const graph = new Map();

    // Initialize adjacency list for each participant
    participants.forEach(p => {
        graph.set(p.name, []);
    });

    // Add edges for valid assignments
    participants.forEach(giver => {
        participants.forEach(receiver => {
            // Add edge if: not self, not excluded
            if (giver.name !== receiver.name &&
                !exclusionDict[giver.name].includes(receiver.name)) {
                graph.get(giver.name).push(receiver.name);
            }
        });
    });

    return graph;
}

function findMaximumMatching(graph, participants) {
    const matching = new Map(); // receiver -> giver
    const visited = new Set();

    // Try to find augmenting path for each participant
    participants.forEach(participant => {
        visited.clear();
        if (findAugmentingPath(participant.name, graph, matching, visited)) {
            // Augmenting path found, matching updated
        }
    });

    // Convert matching map to array of pairs
    const result = [];
    matching.forEach((giver, receiver) => {
        result.push({ giver, receiver });
    });

    return result;
}

function findAugmentingPath(giver, graph, matching, visited) {
    if (visited.has(giver)) {
        return false;
    }
    visited.add(giver);

    // Try each possible receiver
    for (const receiver of graph.get(giver)) {
        // If receiver is unmatched, create direct match
        if (!matching.has(receiver)) {
            matching.set(receiver, giver);
            return true;
        }

        // If receiver is matched, try to find alternative for current match
        const currentGiver = matching.get(receiver);
        if (findAugmentingPath(currentGiver, graph, matching, visited)) {
            matching.set(receiver, giver);
            return true;
        }
    }

    return false;
}

function convertMatchingToResult(matching, participants) {
    return matching.map(pair => {
        const from = participants.find(p => p.name === pair.giver);
        const to = participants.find(p => p.name === pair.receiver);
        return { from, to };
    });
}
