async function calculateRace(raceId) {
    const raceRef = db.collection("races").doc(raceId);
    const raceSnap = await raceRef.get();

    if (!raceSnap.exists) {
        alert("Race bulunamadı");
        return;
    }

    const race = raceSnap.data();

    if (race.calculated === true) {
        alert("Bu hafta zaten hesaplandı");
        return;
    }

    if (race.status !== "finished") {
        alert("Yarış bitmeden hesaplanamaz");
        return;
    }

    const { winner, second, third } = race;

    if (!winner || !second || !third) {
        alert("Kazanan / 2. / 3. eksik");
        return;
    }

    const betsRef = db
        .collection("bets")
        .doc(raceId)
        .collection("players");

    const betsSnap = await betsRef.get();

    for (const betDoc of betsSnap.docs) {
        const bet = betDoc.data();
        const userId = betDoc.id;

        if (bet.paid) continue;

        let multiplier = 0;

        if (bet.car === winner) multiplier = 2;
        else if (bet.car === second) multiplier = 1.4;
        else if (bet.car === third) multiplier = 1.2;

        if (multiplier > 0) {
            const winAmount = Math.floor(bet.stake * multiplier);

            await db.collection("users").doc(userId).update({
                points: firebase.firestore.FieldValue.increment(winAmount)
            });
        }

        await betDoc.ref.update({ paid: true });
    }

    await raceRef.update({
        calculated: true,
        calculatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    alert("✅ Hafta başarıyla hesaplandı");
}
