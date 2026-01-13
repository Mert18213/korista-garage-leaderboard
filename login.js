function login(email, password) {
  auth.signInWithEmailAndPassword(email, password)
    .then(async (cred) => {
      const ref = db.collection("users").doc(cred.user.uid);
      const snap = await ref.get();

      const today = new Date().toDateString();
      const lastLogin = snap.data().lastLogin;

      if (lastLogin !== today) {
        await ref.update({
          points: snap.data().points + 25,
          lastLogin: today
        });
      }

      alert("Giriş başarılı!");
    })
    .catch(err => alert(err.message));
}
