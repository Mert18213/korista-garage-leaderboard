function register(email, password, username) {
  auth.createUserWithEmailAndPassword(email, password)
    .then((cred) => {
      return db.collection("users").doc(cred.user.uid).set({
        username: username,
        points: 500,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastLogin: null
      });
    })
    .then(() => {
      alert("Kayıt başarılı! 500 puan verildi.");
    })
    .catch(err => alert(err.message));
}
