auth.onAuthStateChanged(async user => {
    if (!user) {
        alert("Giriş yapmadan iddaa oynayamazsın");
        window.location.href = "index.html";
        return;
    }

    const snap = await db.collection("users").doc(user.uid).get();
    document.getElementById("userInfo").innerText =
        snap.data().username + " | " + snap.data().points + " Puan";
});

// GERİ DÖN
function goBack() {
    window.location.href = "index.html";
}

// BAHİS YAP
async function placeBet() {
    const user = auth.currentUser;
    if (!user) return;

    const car = document.getElementById("car").value;
    const stake = Number(document.getElementById("stake").value);
    const raceId = "race1";

    if (!car || stake <= 0) {
        alert("Araba ve puan gir");
        return;
    }

    const userRef = db.collection("users").doc(user.uid);
    const raceRef = db.collection("races").doc(raceId);
    const betRef = db.collection("bets")
        .doc(raceId)
        .collection("players")
        .doc(user.uid);

    const raceSnap = await raceRef.get();
    if (!raceSnap.exists || raceSnap.data().status !== "open") {
        alert("Bu yarışa şu an bahis yapılamaz");
        return;
    }

    const userSnap = await userRef.get();
    if (userSnap.data().points < stake) {
        alert("Yetersiz puan");
        return;
    }

    const existingBet = await betRef.get();
    if (existingBet.exists) {
        alert("Bu yarışa zaten bahis yaptın");
        return;
    }

    // PUANI DÜŞ
    await userRef.update({
        points: userSnap.data().points - stake
    });

    // BAHİS KAYDET
    await betRef.set({
        car: car,
        stake: stake,
        paid: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    alert("İddaa başarıyla alındı!");
    goBack();

    async function loadMyBets() {
    const user = auth.currentUser;
    if (!user) return;

    const betsDiv = document.getElementById("myBets");
    betsDiv.innerHTML = "";

    const racesSnap = await db.collection("bets").get();

    let found = false;

    for (const raceDoc of racesSnap.docs) {
        const betSnap = await db
            .collection("bets")
            .doc(raceDoc.id)
            .collection("players")
            .doc(user.uid)
            .get();

        if (betSnap.exists) {
            found = true;
            const bet = betSnap.data();

            betsDiv.innerHTML += `
                <div class="bet-item">
                    <span>
                        <b>${raceDoc.id}</b><br>
                        ${formatCar(bet.car)}
                    </span>
                    <span>
                        ${bet.stake} puan<br>
                        ${bet.paid ? "✅ Ödendi" : "⏳ Beklemede"}
                    </span>
                </div>
            `;
        }
    }

    if (!found) {
        betsDiv.innerHTML = "Henüz iddaa yapmadın.";
    }
}

}
