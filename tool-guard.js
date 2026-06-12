document.documentElement.classList.add('guard-wait');

let auth, db;
try {
  firebase.initializeApp(_firebaseConfig);
  auth = firebase.auth();
  db   = firebase.firestore();

  function getDeviceId() {
    const k = 'deviceId_v1';
    let id = localStorage.getItem(k);
    if (!id) { id = 'dev_' + crypto.getRandomValues(new Uint32Array(4)).join('-'); localStorage.setItem(k, id); }
    return id;
  }

  async function registerSession(user) {
    const did = getDeviceId();
    const col = db.collection('users').doc(user.uid).collection('sessions');
    await col.doc(did).set({ active: true, deviceId: did, userAgent: navigator.userAgent,
      lastSeenAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
  }

  async function canEnterTool(user) {
    try {
      const did = getDeviceId();
      const col = db.collection('users').doc(user.uid).collection('sessions');
      const snap = await col.where('active', '==', true).get();
      const threshold = new Date(Date.now() - 15 * 60 * 1000);
      let other = false;
      snap.forEach(d => {
        if (d.data().deviceId !== did) {
          const lastSeen = d.data().lastSeenAt?.toDate();
          if (!lastSeen || lastSeen > threshold) other = true;
        }
      });
      if (other) return false;
      await registerSession(user);
      return true;
    } catch (e) { console.error(e); return true; }
  }

  async function forceLogin(user) {
    try {
      const did = getDeviceId();
      const col = db.collection('users').doc(user.uid).collection('sessions');
      const snap = await col.where('active', '==', true).get();
      const batch = db.batch();
      snap.forEach(d => {
        if (d.data().deviceId !== did) batch.update(d.ref, { active: false });
      });
      await batch.commit();
      await registerSession(user);
    } catch (e) { console.error(e); }
  }

  function showMultiLoginModal(user) {
    return new Promise(resolve => {
      const overlay = document.getElementById('mlOverlay');
      const btnForce = document.getElementById('mlBtnForce');
      const btnLogout = document.getElementById('mlBtnLogout');
      overlay.classList.add('visible');

      btnForce.onclick = async () => {
        btnForce.disabled = true;
        btnLogout.disabled = true;
        btnForce.textContent = '処理中…';
        await forceLogin(user);
        overlay.classList.remove('visible');
        resolve('force');
      };

      btnLogout.onclick = async () => {
        btnForce.disabled = true;
        btnLogout.disabled = true;
        overlay.classList.remove('visible');
        resolve('logout');
      };
    });
  }

  window.signOutEverywhere = async function () {
    try {
      const user = auth.currentUser;
      const did = getDeviceId();
      if (user) await db.collection('users').doc(user.uid).collection('sessions').doc(did)
        .update({ active: false, lastSeenAt: firebase.firestore.FieldValue.serverTimestamp() });
      await auth.signOut();
    } finally { location.href = 'index.html'; }
  };

  auth.onAuthStateChanged(async user => {
    if (!user) { location.href = 'index.html'; return; }
    const ok = await canEnterTool(user);
    if (!ok) {
      const choice = await showMultiLoginModal(user);
      if (choice === 'logout') {
        await auth.signOut();
        location.href = 'index.html';
        return;
      }
    }

    const el = document.getElementById('userEmail');
    if (el) el.textContent = user.email;
    document.documentElement.classList.remove('guard-wait');

    setInterval(async () => {
      try {
        await db.collection('users').doc(user.uid).collection('sessions').doc(getDeviceId())
          .update({ active: true, lastSeenAt: firebase.firestore.FieldValue.serverTimestamp() });
      } catch (e) { console.warn('Heartbeat:', e); }
    }, 60000);
  });
} catch (e) {
  console.error('Firebase初期化エラー:', e);
  location.href = 'index.html';
}
