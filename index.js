firebase.initializeApp(_firebaseConfig);
const auth = firebase.auth();
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});

const $ = s => document.querySelector(s);
const msg = $('#message');
const emailInput = $('#email');
const passwordInput = $('#password');
const rememberChk = $('#rememberEmail');

window.addEventListener('load', () => {
  const saved = localStorage.getItem('savedEmail');
  if (saved) {
    emailInput.value = saved;
    rememberChk.checked = true;
  }
});

$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  msg.textContent = '';
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (rememberChk.checked) {
    localStorage.setItem('savedEmail', email);
  } else {
    localStorage.removeItem('savedEmail');
  }

  try {
    await auth.signInWithEmailAndPassword(email, password);
    msg.textContent = 'ログイン成功。ツールへ移動します…';
    msg.className = 'msg ok';
    location.href = 'tool.html';
  } catch (err) {
    msg.textContent = 'ログインできませんでした。メールまたはパスワードを確認してください。';
    msg.className = 'msg error';
  }
});

$('#resetBtn').addEventListener('click', async () => {
  msg.textContent = '';
  const email = emailInput.value.trim();
  if (!email) {
    msg.textContent = 'まずメールアドレスを入力してください。';
    msg.className = 'msg error';
    emailInput.focus();
    return;
  }
  try {
    await auth.sendPasswordResetEmail(email);
    msg.textContent = '再設定メールを送信しました。受信ボックスを確認してください。';
    msg.className = 'msg ok';
  } catch (err) {
    msg.textContent = '送信に失敗しました。メールアドレスを確認してください。';
    msg.className = 'msg error';
  }
});

// ── パスワード変更モーダル ──
const modal        = $('#changePwModal');
const modalMsg     = $('#modalMsg');
const modalCurrentPw = $('#modalCurrentPw');
const modalNewPw   = $('#modalNewPw');
const modalNewPw2  = $('#modalNewPw2');

function openChangePwModal() {
  const inputEmail = emailInput.value.trim();
  if (!inputEmail && !auth.currentUser) {
    msg.textContent = 'メールアドレスを入力してください。';
    msg.className = 'msg error';
    emailInput.focus();
    return;
  }
  modalCurrentPw.value = '';
  modalNewPw.value = '';
  modalNewPw2.value = '';
  modalMsg.textContent = '';
  modal.classList.add('open');
  modalCurrentPw.focus();
}

function closeChangePwModal() {
  modal.classList.remove('open');
  modalCurrentPw.value = '';
  modalNewPw.value = '';
  modalNewPw2.value = '';
  modalMsg.textContent = '';
}

$('#changePwBtn').addEventListener('click', openChangePwModal);
$('#modalCancelBtn').addEventListener('click', closeChangePwModal);

modal.addEventListener('click', e => {
  if (e.target === modal) closeChangePwModal();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && modal.classList.contains('open')) closeChangePwModal();
});

$('#modalSubmitBtn').addEventListener('click', async () => {
  modalMsg.textContent = '';
  const currentPw = modalCurrentPw.value;
  const newPw     = modalNewPw.value;
  const newPw2    = modalNewPw2.value;

  if (!currentPw) {
    modalMsg.textContent = '現在のパスワードを入力してください。';
    modalCurrentPw.focus();
    return;
  }
  if (newPw.length < 8) {
    modalMsg.textContent = '新しいパスワードは8文字以上にしてください。';
    modalNewPw.focus();
    return;
  }
  if (newPw !== newPw2) {
    modalMsg.textContent = '新しいパスワードが一致しません。';
    modalNewPw2.focus();
    return;
  }

  try {
    const inputEmail = emailInput.value.trim();
    if (!auth.currentUser) {
      await auth.signInWithEmailAndPassword(inputEmail, currentPw);
    } else {
      const emailForReauth = inputEmail || auth.currentUser.email;
      const cred = firebase.auth.EmailAuthProvider.credential(emailForReauth, currentPw);
      await auth.currentUser.reauthenticateWithCredential(cred);
    }
    await auth.currentUser.updatePassword(newPw);
    closeChangePwModal();
    passwordInput.value = '';
    msg.textContent = 'パスワードを変更しました。';
    msg.className = 'msg ok';
  } catch (err) {
    modalMsg.textContent = 'パスワード変更に失敗しました。現在のパスワードを確認してください。';
  }
});

auth.onAuthStateChanged(user => {
  if (user) location.href = 'tool.html';
});
