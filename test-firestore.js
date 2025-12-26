document.addEventListener('DOMContentLoaded', async () => {
    console.log("Firestore Connection Test Initializing...");

    if (!window.firebaseConfig) {
        console.error("Firebase config not found. Make sure config.js is loaded correctly.");
        return;
    }

    try {
        // 1. Initialize Firebase
        firebase.initializeApp(window.firebaseConfig);
        const db = firebase.firestore();
        console.log("Firebase Initialized.");

        // 2. Try to write a document to a test collection
        console.log("Attempting to write to Firestore...");
        const testCollection = db.collection("test-connection");
        const docRef = await testCollection.add({
            timestamp: new Date(),
            test: "success"
        });
        
        // 3. Log success
        console.log("======================================================");
        console.log("✅ SUCCESS! Firestore connection is working.");
        console.log("A document was successfully written with ID:", docRef.id);
        console.log("======================================================");

    } catch (error) {
        // 4. Log failure
        console.log("======================================================");
        console.error("❌ FAILED! Could not connect to or write to Firestore.");
        console.error("The error object is:", error);
        console.log("This strongly suggests an issue with your network, firewall, or a browser extension (like an ad blocker) that is blocking the connection to 'firestore.googleapis.com'.");
        console.log("======================================================");
    }
});
