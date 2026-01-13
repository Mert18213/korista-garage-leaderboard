/**
 * Calculates race results and distributes points to winners.
 * @param {string} raceId - The ID of the race to be calculated.
 */
async function calculateRace(raceId) {
    const raceRef = db.collection("races").doc(raceId);
    const raceSnapshot = await raceRef.get();

    // Check if the race exists
    if (!raceSnapshot.exists) {
        alert("Race not found.");
        return;
    }

    const raceData = raceSnapshot.data();

    // Check if the race has already been processed
    if (raceData.isCalculated === true) {
        alert("This week has already been calculated.");
        return;
    }

    // Ensure the race is actually finished
    if (raceData.status !== "finished") {
        alert("Cannot calculate results before the race is finished.");
        return;
    }

    const { winner, second, third } = raceData;

    // Validate if podium positions are filled
    if (!winner || !second || !third) {
        alert("Winner / 2nd / 3rd place information is missing.");
        return;
    }

    const betsRef = db
        .collection("bets")
        .doc(raceId)
        .collection("players");

    const betsSnapshot = await betsRef.get();

    // Process each bet
    for (const betDoc of betsSnapshot.docs) {
        const betData = betDoc.data();
        const userId = betDoc.id;

        // Skip if the user has already been paid
        if (betData.isPaid) continue;

        let multiplier = 0;

        // Reward logic based on position
        if (betData.car === winner) multiplier = 2;          // Winner gets 2x
        else if (betData.car === second) multiplier = 1.4;   // 2nd place gets 1.4x
        else if (betData.car === third) multiplier = 1.2;    // 3rd place gets 1.2x

        if (multiplier > 0) {
            const winAmount = Math.floor(betData.stake * multiplier);

            // Update user points
            await db.collection("users").doc(userId).update({
                points: firebase.firestore.FieldValue.increment(winAmount)
            });
        }

        // Mark this specific bet as paid
        await betDoc.ref.update({ isPaid: true });
    }

    // Finalize the race document
    await raceRef.update({
        isCalculated: true,
        calculatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    alert("✅ Week has been calculated successfully.");
}
