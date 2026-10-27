// app.js
// Import Firebase module (Versi 10.x.x Modular)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, getDoc, doc, updateDoc, deleteDoc, setDoc, query, where } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// 1. Inisialisasi Firebase menggunakan data dari config.js
const app = initializeApp(CONFIG.FIREBASE);
const db = getFirestore(app);

console.log("🔥 Firebase berhasil diinisialisasi!");

// ==========================================
// FUNGSI UNTUK FIREBASE FIRESTORE
// ==========================================

// Fungsi untuk menyimpan data ke Firestore
async function saveToFirestore(collectionName, dataObj) {
    try {
        const docRef = await addDoc(collection(db, collectionName), dataObj);
        console.log(`✅ Data berhasil disimpan ke Firestore (${collectionName}) dengan ID:`, docRef.id);
        
        // Hapus cache terkait agar data diperbarui saat diambil berikutnya
        localStorage.removeItem(`afkab_cache_${collectionName}`);
        
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error("❌ Error menyimpan ke Firestore:", error);
        return { success: false, error: error };
    }
}

// FUNGSI DIOPTIMASI: Mengambil data dengan sistem Caching (LocalStorage) untuk menghemat Reads
async function getFromFirestore(collectionName, forceRefresh = false) {
    try {
        const cacheKey = `afkab_cache_${collectionName}`;
        
        // Jika tidak dipaksa refresh, cek dulu di localStorage browser
        if (!forceRefresh) {
            const cachedData = localStorage.getItem(cacheKey);
            if (cachedData) {
                console.log(`⚡ Mengambil data ${collectionName} dari Cache Lokal (0 Reads Firestore)`);
                return JSON.parse(cachedData);
            }
        }

        // Jika belum ada atau dipaksa refresh, ambil dari Firestore
        const querySnapshot = await getDocs(collection(db, collectionName));
        let dataList = [];
        querySnapshot.forEach((docSnap) => {
            dataList.push({ docId: docSnap.id, ...docSnap.data() });
        });
        
        // Simpan ke localStorage untuk digunakan selanjutnya
        localStorage.setItem(cacheKey, JSON.stringify(dataList));
        
        console.log(`📥 Berhasil mengambil ${dataList.length} data dari Firestore (${collectionName}) dan memperbarui cache`);
        return dataList;
    } catch (error) {
        console.error("❌ Error mengambil data dari Firestore:", error);
        return [];
    }
}

// Fungsi untuk memperbarui data di Firestore berdasarkan custom field 'id'
async function updateInFirestore(collectionName, teamId, dataObj) {
    try {
        const q = query(collection(db, collectionName), where("id", "==", teamId));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            const docRef = doc(db, collectionName, querySnapshot.docs[0].id);
            await updateDoc(docRef, dataObj);
            console.log(`✅ Data dengan ID ${teamId} berhasil diperbarui di Firestore.`);
            
            // Hapus cache terkait
            localStorage.removeItem(`afkab_cache_${collectionName}`);
            
            return { success: true };
        }
        return { success: false, message: "Dokumen tidak ditemukan di Firestore" };
    } catch (error) {
        console.error("❌ Error update Firestore:", error);
        return { success: false, error: error };
    }
}

// Fungsi untuk upsert data ke Firestore (Otomatis membuat dokumen baru jika belum ada, atau update jika sudah ada menggunakan custom ID)
async function upsertToFirestore(collectionName, customId, dataObj) {
    try {
        const docRef = doc(db, collectionName, String(customId));
        await setDoc(docRef, dataObj, { merge: true });
        console.log(`✅ Data dengan ID ${customId} berhasil disimpan/diperbarui di Firestore (${collectionName}).`);
        
        // Hapus cache terkait
        localStorage.removeItem(`afkab_cache_${collectionName}`);
        
        return { success: true };
    } catch (error) {
        console.error("❌ Error upsert Firestore:", error);
        return { success: false, error: error };
    }
}

// Fungsi untuk menghapus data di Firestore berdasarkan custom field 'id'[cite: 33]
async function deleteFromFirestore(collectionName, teamId) {
    try {
        const targetId = String(teamId);
        const q = query(collection(db, collectionName), where("id", "==", teamId));
        const querySnapshot = await getDocs(q);
        const documentIds = new Set(querySnapshot.docs.map((item) => item.id));

        // Dukungan dokumen legacy dengan ID Firestore otomatis dan dokumen dengan custom document ID.
        const directRef = doc(db, collectionName, targetId);
        const directSnapshot = await getDoc(directRef);
        if (directSnapshot.exists()) documentIds.add(directSnapshot.id);

        if (documentIds.size === 0) {
            return { success: false, message: "Dokumen tidak ditemukan di Firestore" };
        }

        // Hapus semua duplikat yang memiliki field id sama agar data lama tidak muncul lagi.
        for (const documentId of documentIds) {
            await deleteDoc(doc(db, collectionName, documentId));
        }

        console.log(`🗑️ ${documentIds.size} dokumen dengan ID ${targetId} berhasil dihapus dari Firestore (${collectionName}).`);
        localStorage.removeItem(`afkab_cache_${collectionName}`);
        return { success: true };
    } catch (error) {
        console.error("❌ Error hapus Firestore:", error);
        return { success: false, error: error, message: error?.message || "Gagal menghapus dokumen Firestore" };
    }
}


// ==========================================
// FUNGSI UNTUK GOOGLE SPREADSHEET (APPS SCRIPT)
// ==========================================

// Fungsi untuk sinkronisasi/backup data ke Google Sheets (Mendukung insert, update, delete)[cite: 33]
async function syncToSheets(sheetName, dataObj, actionType = "insert") {
    try {
        const response = await fetch(CONFIG.GAS_URL, {
            method: "POST",
            redirect: "follow", // Agar browser mengikuti internal redirect dari Google Apps Script[cite: 33]
            headers: {
                "Content-Type": "text/plain;charset=utf-8", 
            },
            body: JSON.stringify({
                action: actionType,
                sheet: sheetName,
                data: dataObj
            })
        });
        
        const result = await response.json();
        console.log(`📊 Sinkronisasi ke Sheet '${sheetName}' (${actionType}):`, result);
        return result;
    } catch (error) {
        console.error("❌ Error sinkronisasi ke Sheets:", error);
        return { status: "error", message: error };
    }
}

// ==========================================
// EKSPOR FUNGSI KE WINDOW (Agar bisa dipanggil dari HTML)
// ==========================================
window.db = db;
window.saveToFirestore = saveToFirestore;
window.getFromFirestore = getFromFirestore;
window.updateInFirestore = updateInFirestore;
window.upsertToFirestore = upsertToFirestore;
window.deleteFromFirestore = deleteFromFirestore;
window.syncToSheets = syncToSheets;