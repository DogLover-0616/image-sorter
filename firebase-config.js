// ここに自分のFirebaseプロジェクト情報を貼り付けてください
export const firebaseConfig = {
  apiKey: "AIzaSyD9D6IE-FdCYOKqVzPpl7E8qK7njnBxqfQ",
  authDomain: "image-sorter-5a77d.firebaseapp.com",
  projectId: "image-sorter-5a77d",
  // 必要に応じて他の設定も
};

  // 追加推奨（必要なサービスの自動解決/初期化に使われます） [web:48]
  databaseURL: "https://image-sorter-5a77d-default-rtdb.firebaseio.com", // Realtime DBを使う場合 [web:48]
  storageBucket: "image-sorter-5a77d.appspot.com",                        // Storageを使う場合（推奨）[web:48]
  messagingSenderId: "xxxxxxxxxxxx",                                      // 必須（Webアプリ識別）[web:48]
  appId: "1:xxxxxxxxxxxx:web:xxxxxxxxxxxxxxxxxxxx",                       // 必須（アプリ識別）[web:48]
  measurementId: "G-XXXXXXXXXX"                                           // Analytics使用時のみ [web:48]

};

//Firestoreのルール追加
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /sessions/{sessionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
