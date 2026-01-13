async function settleRace(raceId, winnerCar) {
    const raceRef = db.collection("bets").doc(raceId);
    const playersRef = raceRef.collection("players");

    const raceSnap = await raceRef.get();
    if (!raceSnap.exists) {
        alert("Race bulunamadı");
        return;
    }

    const betsSnap = await playersRef.get();
async function distributePoints(raceId, winnerCar) {
    const betsRef = db
        .collection("bets")
        .doc(raceId)
        .collection("players");

    const betsSnap = await betsRef.get();

    for (const betDoc of betsSnap.docs) {
        const bet = betDoc.data();
        if (bet.paid) continue;

        if (bet.car === winnerCar) {
            const userRef = db.collection("users").doc(betDoc.id);
            await userRef.update({
                points: firebase.firestore.FieldValue.increment(bet.stake)
            });
        }

        await betDoc.ref.update({ paid: true });
    }

    alert("Puanlar dağıtıldı");
}

    for (const doc of betsSnap.docs) {
        const bet = doc.data();
        const userId = doc.id;

        if (bet.paid) continue;

        let multiplier = 0;

        if (bet.car === winnerCar) {
            multiplier = 2; // 1. oldu
        }

        if (multiplier > 0) {
            const winAmount = bet.stake * multiplier;

            await db.collection("users").doc(userId).update({
                points: firebase.firestore.FieldValue.increment(winAmount)
            });
        }

        await playersRef.doc(userId).update({
            paid: true
        });
    }

    await raceRef.update({
        status: "finished",
        finishedAt: firebase.firestore.FieldValue.serverTimestamp(),
        winner: winnerCar
    });

    alert("Race dağıtıldı ✔");
}
