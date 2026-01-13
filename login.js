// GÜNLÜK GİRİŞ BONUSU (25 PUAN)
if (snap.exists) {
    const data = snap.data();

    const lastLogin = data.lastLogin?.toDate?.();
    const today = new Date();

    let giveDailyBonus = true;

    if (lastLogin) {
        giveDailyBonus =
            lastLogin.toDateString() !== today.toDateString();
    }

    if (giveDailyBonus) {
        await userRef.update({
            points: firebase.firestore.FieldValue.increment(25),
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
}
