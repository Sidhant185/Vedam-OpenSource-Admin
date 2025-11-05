// Firebase SDK (ESM via CDN) - compatible with plain index.html using type="module"
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js";
import { 
	getAuth,
	onAuthStateChanged,
	signInWithEmailAndPassword,
	signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
	getFirestore,
	collection,
	getDocs,
	doc,
	getDoc,
	setDoc,
	updateDoc,
	deleteDoc,
	query,
	where,
	orderBy,
	limit
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
	apiKey: "AIzaSyBO0PAmNKXjTJGH1aRsEc2vJJnR1Y-Tum8",
	authDomain: "vedamopensource007.firebaseapp.com",
	projectId: "vedamopensource007",
	storageBucket: "vedamopensource007.firebasestorage.app",
	messagingSenderId: "1097939608119",
	appId: "1:1097939608119:web:90e2923b4c3ed3fd1515b2",
	measurementId: "G-G8V5WT7S5V"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics (best-effort; may be unavailable in some environments)
let analytics = null;
try {
	analytics = getAnalytics(app);
} catch (e) {
	// Analytics not supported (e.g., non-HTTPS or unsupported environment)
}

// Initialize core services
const auth = getAuth(app);
const db = getFirestore(app);

// Export instances and commonly used functions for the rest of the app
export {
	auth,
	db,
	analytics,
	// Auth
	signInWithEmailAndPassword,
	onAuthStateChanged,
	signOut,
	// Firestore
	collection,
	getDocs,
	doc,
	getDoc,
	setDoc,
	updateDoc,
	deleteDoc,
	query,
	where,
	orderBy,
	limit
};


