let currentRaceId = null;

// 🔄 SAYFA YÜKLENDİĞİNDE
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        alert("Giriş yapmadan bahis oynayamazsınız.");
        window.location.href = "index.html";
        return;
    }

    // 1. KULLANICI VERİLERİNİ GERÇEK ZAMANLI TAKİP ET (onSnapshot)
    // Bu sayede puan harcandığında butonlar ve üst bar anında güncellenir.
    db.collection("users").doc(user.uid).onSnapshot((doc) => {
        if (doc.exists) {
            const userData = doc.data();
            const points = userData.points || 0;

            // Üst barı güncelle
            document.getElementById("userInfo").innerText = 
                `${userData.username} | ${points} Puan`;

            // MESAJ GÖNDERME BUTON KONTROLÜ
            const buyBtn = document.getElementById("buyBtn");
            const purchaseInfo = document.getElementById("purchaseInfo");
            
            if (buyBtn && purchaseInfo) {
                if (points >= 1500) {
                    buyBtn.disabled = false;
                    buyBtn.style.opacity = "1";
                    purchaseInfo.innerHTML = "✅ **1500 puan** karşılığında mesaj gönderebilirsiniz.";
                } else {
                    buyBtn.disabled = true;
                    buyBtn.style.opacity = "0.5";
                    purchaseInfo.innerHTML = `🔒 Mesaj göndermek için **${1500 - points} puan** daha gerekiyor.`;
                }
            }
        }
    });

    // 2. AKTİF YARIŞI VE GEÇMİŞİ YÜKLE
    await loadActiveRace();
    await loadMyBets();
});


// 🔍 AKTİF YARIŞI BUL
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
    } catch (error) {
        console.error("Yarış yükleme hatası:", error);
    }
}


// 🎰 BAHİS YAP
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

        // PUAN DÜŞ VE BAHİS KAYDET
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
        loadMyBets();
    } catch (error) {
        alert("Hata oluştu: " + error.message);
    }
}


// 📜 BAHİS GEÇMİŞİ
async function loadMyBets() {
    const user = auth.currentUser;
    const betsDiv = document.getElementById("myBets");
    if (!user || !betsDiv) return;

    betsDiv.innerHTML = "Yükleniyor...";

    try {
        // NOT: Firestore'da 'collectionGroup' kullanmak için Index oluşturmanız gerekebilir.
        const betsSnapshot = await db.collectionGroup("players")
            .where("uid", "==", user.uid)
            .get();

        if (betsSnapshot.empty) {
            betsDiv.innerHTML = "Henüz bir bahis yapmadınız.";
            return;
        }

        betsDiv.innerHTML = ""; 
        betsSnapshot.forEach((doc) => {
            const bet = doc.data();
            const raceId = doc.ref.parent.parent.id; // Üst döküman ID'sini (yarış adı) al

            betsDiv.innerHTML += `
                <div class="bet-item" style="border-bottom: 1px solid #444; padding: 10px; margin-bottom: 5px;">
                    <span style="float: left;">
                        <b style="color: #ffcc00;">Yarış: ${raceId}</b><br>
                        🚗 ${formatCar(bet.car)}
                    </span>
                    <span style="float: right; text-align: right;">
                        <b>${bet.stake} Puan</b><br>
                        ${bet.paid ? "✅ Ödendi" : "⏳ Bekliyor"}
                    </span>
                    <div style="clear: both;"></div>
                </div>
            `;
        });
    } catch (error) {
        console.error("Geçmiş yükleme hatası:", error);
        betsDiv.innerHTML = "Geçmiş yüklenirken hata oluştu.";
    }
}

// 🛒 MESAJ SATIN AL
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

        // PUAN DÜŞ VE MESAJI KAYDET
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
    } catch (error) {
        alert("Satın alma hatası: " + error.message);
    }
}

// 🚗 ARAÇ ADINI FORMATLA
function formatCar(carId) {
    if (!carId) return "Bilinmeyen Araç";
    return carId.replaceAll("_", " ").replace("P80C", "P80/C");
}

function goBack() { window.location.href = "index.html"; }

async function logout() {
    await auth.signOut();
    window.location.href = "index.html";
}
