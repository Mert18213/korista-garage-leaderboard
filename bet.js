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
// 📜 İDDAA GEÇMİŞİ (🔥 PERFORMANSLI VE KESİN ÇÖZÜM)
async function loadMyBets() {
    // onAuthStateChanged'den gelen user'ı kullanmak en güvenlisidir
    const user = auth.currentUser;
    if (!user) return;

    const betsDiv = document.getElementById("myBets");
    if (!betsDiv) return;

    betsDiv.innerHTML = "Yükleniyor...";

    try {
        /* 🚀 COLLECTION GROUP: 
           Tüm 'players' alt koleksiyonlarını tarar ve doküman adı 
           senin User ID'n olanları bulur.
        */
        const betsSnap = await db.collectionGroup("players")
            .where(firebase.firestore.FieldPath.documentId(), "==", user.uid)
            .get();

        if (betsSnap.empty) {
            betsDiv.innerHTML = "Henüz iddaa yapmadın.";
            return;
        }

        betsDiv.innerHTML = ""; // Temizle
        
        // Gelen her bir bahis dokümanını işle
        betsSnap.forEach((doc) => {
            const bet = doc.data();
            // raceId'yi almak için dokümanın bir üstündeki dokümanın (yarışın) ID'sini alıyoruz
            const raceId = doc.ref.parent.parent.id;

            betsDiv.innerHTML += `
                <div class="bet-item" style="border-bottom: 1px solid #444; padding: 10px; margin-bottom: 5px;">
                    <span>
                        <b style="color: #ffcc00;">Yarış: ${raceId}</b><br>
                        🚗 ${formatCar(bet.car)}
                    </span>
                    <span style="float: right; text-align: right;">
                        <b>${bet.stake} Puan</b><br>
                        ${bet.paid ? "✅ Ödendi" : "⏳ Beklemede"}
                    </span>
                    <div style="clear: both;"></div>
                </div>
            `;
        });

    } catch (error) {
        console.error("Geçmiş yüklenirken hata oluştu:", error);
        betsDiv.innerHTML = "Geçmiş yüklenemedi.";
    }
}



// 🚗 FORMAT
function formatCar(carId) {
    return carId
        .replaceAll("_", " ")
        .replace("P80C", "P80/C");
}
