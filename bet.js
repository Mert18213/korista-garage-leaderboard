let CURRENT_RACE_ID = null;

// SAYFA AÇILINCA
auth.onAuthStateChanged(async user => {
    if (!user) {
        alert("Giriş yapmadan iddaa oynayamazsın");
        window.location.href = "index.html";
        return;
    }

    // USER INFO
    const snap = await db.collection("users").doc(user.uid).get();
    if (snap.exists) {
        document.getElementById("userInfo").innerText =
            snap.data().username + " | " + snap.data().points + " Puan";
    }

    await loadActiveRace();
    await loadMyBets();
});


// 🔍 AKTİF RACE BUL (SADECE RACES'TEN)
async function loadActiveRace() {
    const racesSnap = await db
        .collection("races")
        .where("status", "==", "open")
        .limit(1)
        .get();

    if (racesSnap.empty) {
        alert("Şu an açık yarış yok");
        return;
    }

    CURRENT_RACE_ID = racesSnap.docs[0].id;
    console.log("AKTİF RACE:", CURRENT_RACE_ID);

    // 🔓 BUTONU AÇ
    const betBtn = document.getElementById("betBtn");
    if (betBtn) betBtn.disabled = false;
}


// GERİ DÖN
function goBack() {
    window.location.href = "index.html";
}


// 🎰 BAHİS YAP
async function placeBet() {
    const user = auth.currentUser;
    if (!user || !CURRENT_RACE_ID) {
        alert("Aktif yarış yok");
        return;
    }

    const car = document.getElementById("car").value;
    const stake = Number(document.getElementById("stake").value);

    if (!car || stake <= 0) {
        alert("Araba ve puan gir");
        return;
    }

    const userRef = db.collection("users").doc(user.uid);
    const betRaceRef = db.collection("bets").doc(CURRENT_RACE_ID);
    const betRef = betRaceRef.collection("players").doc(user.uid);

    // 🔑 SADECE BETS DURUMU KONTROL
    const betRaceSnap = await betRaceRef.get();
    if (!betRaceSnap.exists || betRaceSnap.data().status !== "open") {
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

    // PUAN DÜŞ
    await userRef.update({
        points: firebase.firestore.FieldValue.increment(-stake)
    });

    // BAHİS KAYDET
    await betRef.set({
        car,
        stake,
        paid: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    alert("İddaa başarıyla alındı!");
    loadMyBets();
}


// 📜 İDDAA GEÇMİŞİ (🔥 DÜZELTİLMİŞ – KİLİTLENME YOK)
async function loadMyBets() {
    const user = auth.currentUser;
    if (!user) return;

    const betsDiv = document.getElementById("myBets");
    betsDiv.innerHTML = "";

    const betsSnap = await db.collection("bets").get();
    let found = false;

    for (const raceDoc of betsSnap.docs) {
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



// 🚗 FORMAT
function formatCar(carId) {
    return carId
        .replaceAll("_", " ")
        .replace("P80C", "P80/C");
}
