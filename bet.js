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
}
