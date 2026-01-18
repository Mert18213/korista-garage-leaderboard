let currentRaceId = null;

// 🔄 SAYFA YÜKLENDİĞİNDE ÇALIŞAN ANA DÖNGÜ
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = "index.html";
        return;
    }

    try {
        // 1. KULLANICI BİLGİLERİNİ ÇEK VE EKRANI GÜNCELLE
        const userRef = db.collection("users").doc(user.uid);
        const userSnapshot = await userRef.get();

        if (userSnapshot.exists) {
            const userData = userSnapshot.data();
            const points = userData.points || 0;

            // Kullanıcı adı ve puanı üst bara yazdır
            document.getElementById("userInfo").innerText = 
                `${userData.username} | ${points} Points`;

            // Mesaj Gönderme Butonunun Durumunu Kontrol Et
            const buyBtn = document.getElementById("buyBtn");
            const purchaseInfo = document.getElementById("purchaseInfo");
            
            if (buyBtn && purchaseInfo) {
                if (points >= 1500) {
                    buyBtn.disabled = false;
                    buyBtn.style.opacity = "1";
                    purchaseInfo.innerHTML = "✅ You can send a message for <b>1500 points</b>.";
                } else {
                    buyBtn.disabled = true;
                    buyBtn.style.opacity = "0.5";
                    purchaseInfo.innerHTML = `🔒 You need <b>1500 points</b> to send a message.`;
                }
            }
        }

        // 2. AKTİF YARIŞI VE KULLANICININ GEÇMİŞİNİ YÜKLE
        await loadActiveRace();
        await loadMyBets();

    } catch (error) {
        console.error("Başlatma hatası:", error);
    }
});

// 🔍 AKTİF YARIŞI BULAN FONKSİYON
async function loadActiveRace() {
    try {
        const racesSnapshot = await db
            .collection("races")
            .where("status", "==", "open")
            .limit(1)
            .get();

        const betButton = document.getElementById("betBtn");

        if (racesSnapshot.empty) {
            if (betButton) betButton.disabled = true;
            console.log("Aktif yarış bulunamadı.");
            return;
        }

        currentRaceId = racesSnapshot.docs[0].id;
        if (betButton) betButton.disabled = false;
        console.log("Aktif Yarış Tanımlandı:", currentRaceId);
    } catch (error) {
        console.error("Yarış yükleme hatası:", error);
    }
}

// 🎰 BAHİS OYNAMA FONKSİYONU
async function placeBet() {
    const user = auth.currentUser;
    const car = document.getElementById("car").value;
    const stake = Number(document.getElementById("stake").value);

    if (!user || !currentRaceId) {
        alert("Aktif bir yarış bulunamadı.");
        return;
    }

    if (!car || stake <= 0) {
        alert("Lütfen bir araç seçin ve geçerli bir miktar girin.");
        return;
    }

    const userRef = db.collection("users").doc(user.uid);
    const betRaceRef = db.collection("bets").doc(currentRaceId);
    const betRef = betRaceRef.collection("players").doc(user.uid);

    try {
        const userSnap = await userRef.get();
        if (userSnap.data().points < stake) {
            alert("Yetersiz puan!");
            return;
        }

        const existingBet = await betRef.get();
        if (existingBet.exists) {
            alert("Bu yarışa zaten bahis yaptınız.");
            return;
        }

        // Puan düş ve bahisi kaydet
        await userRef.update({
            points: firebase.firestore.FieldValue.increment(-stake)
        });

        await betRef.set({
            uid: user.uid,
            car: car,
            stake: stake,
            paid: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert("Bahis başarıyla oynandı!");
        location.reload(); // Bilgilerin tazelenmesi için sayfayı yenile
    } catch (error) {
        alert("Hata: " + error.message);
    }
}

// 📜 BAHİS GEÇMİŞİNİ LİSTELEME
async function loadMyBets() {
    const user = auth.currentUser;
    const betsDiv = document.getElementById("myBets");
    if (!user || !betsDiv) return;

    try {
        const betsSnapshot = await db.collectionGroup("players")
            .where("uid", "==", user.uid)
            .get();

        if (betsSnapshot.empty) {
            betsDiv.innerHTML = "You haven't placed any bets yet.";
            return;
        }

        betsDiv.innerHTML = ""; 
        betsSnapshot.forEach((doc) => {
            const bet = doc.data();
            const raceId = doc.ref.parent.parent.id;
            betsDiv.innerHTML += `
                <div class="bet-item" style="border-bottom: 1px solid #444; padding: 10px; margin-bottom: 5px;">
                    <span style="float: left;">
                        <b style="color: #ffcc00;">Race: ${raceId}</b><br>
                        🚗 ${formatCar(bet.car)}
                    </span>
                    <span style="float: right; text-align: right;">
                        <b>${bet.stake} Points</b><br>
                        ${bet.paid ? "✅ Paid" : "⏳ Pending"}
                    </span>
                    <div style="clear: both;"></div>
                </div>`;
        });
    } catch (error) {
        console.error("Geçmiş hatası:", error);
        betsDiv.innerHTML = "Error loading history.";
    }
}

// 🛒 MESAJ GÖNDERME FONKSİYONU
async function makePurchase() {
    const user = auth.currentUser;
    const message = document.getElementById("purchaseName").value.trim();
    const COST = 1500;

    if (!user || !message) {
        alert("Lütfen bir mesaj yazın.");
        return;
    }

    const userRef = db.collection("users").doc(user.uid);

    try {
        const userSnap = await userRef.get();
        if (userSnap.data().points < COST) {
            alert("Puanınız yetersiz.");
            return;
        }

        await userRef.update({
            points: firebase.firestore.FieldValue.increment(-COST)
        });

        await db.collection("purchases").add({
            userId: user.uid,
            username: userSnap.data().username,
            message: message,
            cost: COST,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        document.getElementById("purchaseName").value = "";
        alert("Mesaj başarıyla gönderildi!");
        location.reload();
    } catch (error) {
        alert("Mesaj hatası: " + error.message);
    }
}

// 🛠️ YARDIMCI FONKSİYONLAR
function formatCar(carId) {
    if (!carId) return "Unknown Car";
    return carId.replaceAll("_", " ").replace("P80C", "P80/C");
}

function goBack() { window.location.href = "index.html"; }

async function logout() {
    await auth.signOut();
    window.location.href = "index.html";
}
