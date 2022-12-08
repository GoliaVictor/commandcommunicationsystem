let uid;
let uref;

let allPlayersRef;
let allGamesRef;

let gid;
let gref;

let friend = {}
let fref;
let fid;


// Initialize Firebase
firebase.initializeApp(firebaseConfig);

firebase.auth().onAuthStateChanged(user => {
    if (user) {
        // Logged in        
        uid = user.uid
        uref = firebase.database().ref(`players/${uid}`)
        uref.update(userData)

        allPlayersRef = firebase.database().ref(`players`)
        allGamesRef = firebase.database().ref(`games`)

        uref.onDisconnect().remove()

        onLogin()
    }
    else {
        // Logged out
        onLogout()
    }
})

firebase.auth().signInAnonymously().catch(error => {
    console.error(error.code, error.message)
})

function handleCommand(data) {
    // When a change in players occurs
    if (data["command"] != "") {
        if (data["command"].split(" ")[0] != uid) {
            decodeCommand(data["command"])
            gref.update({"command": ""})
        }
    }
}

function hostGame() {
    uref.update(userData)
    leaveGame()
    gref = firebase.database().ref(`games/${uid}`);
    gid = uid;
    gref.set({
        "name": `${userData["username"]}'s game`,
        "command": "",
        "player2": "",
    })
    gref.onDisconnect().remove()

    gref.on('value', (snapshot) => {
        if (snapshot.val()["player2"] == "") {
            onPlayerDisconnected()
            friend = {};
            if (fref) fref.off("value")
            fref = undefined;
            fid = undefined;
        }
        else if (snapshot.val()["player2"] != fid) {
            fid = snapshot.val()["player2"]
            
            allPlayersRef.child(snapshot.val()["player2"]).get().then((snapshot) => {
                friend = snapshot.val()
                onPlayerConnected()
            })
            fref = allPlayersRef.child(snapshot.val()["player2"])
            fref.on('value', (snapshot) => {
                friend = snapshot.val()
            })
        }
        handleCommand(snapshot.val())
    });

    onHostGame()
}

function joinGame(id) {
    if (gid !== id) {
        // check if game exists
        allGamesRef.get().then((gamesSnap) => {
            let gameIDs = Object.keys(gamesSnap.val() ?? {})
            for (const gameID of gameIDs) {
                if (gameID == id) {
                    // game exists

                    leaveGame()
                    uref.update(userData)

                    gid = id;
                    fid = id;
                    gref = firebase.database().ref(`games/${id}`);

                    gref.update({"player2": uid})

                    allPlayersRef.child(gid).get().then((snapshot) => {
                        friend = snapshot.val()
                        onJoinGame()
                    })
                    fref = allPlayersRef.child(gid)
                    fref.on('value', (snapshot) => {
                        friend = snapshot.val()
                    })
                    
                    gref.onDisconnect().update({"player2": ""})
                    gref.on('value', (snapshot) => {
                        if (snapshot.exists()) {
                            handleCommand(snapshot.val())
                        }
                        else {
                            leave(false)
                            onHostDisconnected()
                        }
                    });

                    break;
                }
            }
        })
    }
}

// say goodbye is a boolean to determine whether or not to set player2 to "" upon leaving
function leaveGame(sayGoodbye = true) {
    if (gid) {
        if (fid) fref.off("value");
        gref.off("value");
        if (gid == uid) {
            // you are the host
            gref.remove()
        }
        else {
            // you joined
            if (sayGoodbye) gref.update({"player2": ""})
        }
        gid = undefined;
        gref = undefined;
        friend = {};
        fref = undefined;
        fid = undefined;

        onLeaveGame()
    }
}

function command(str) {
    if (gid) {
        gref.update({"command": `${uid} ${str}`})
    }
}

function generateUsername() {
    const adj = [
        "Ancient",
        "Bumpy",
        "Busy",
        "Combative",
        "Cotton",
        "Dangerous",
        "Dusty",
        "Elderly",
        "Expensive",
        "Graceful",
        "Granite",
        "Handsome",
        "Hollow",
        "Lazy",
        "Low",
        "Massive",
        "Melodic",
        "New",
        "Octagonal",
        "Oval",
        "Rainy",
        "Right",
        "Safe",
        "Sane",
        "Shrill",
        "Shy",
        "Sore",
        "Superior",
        "Swift",
        "Teak",
        "Terrible",
        "Tremendous",
        "Weary",
        "Wild",
    ];
    const animal = [
        "Ape",
        "Bear",
        "Camel",
        "Dingo",
        "Dog",
        "Elephant",
        "Fox",
        "Gorilla",
        "Hawk",
        "Jaguar",
        "Koala",
        "Leopard",
        "Magpie",
        "Narwhal",
        "Octopus",
        "Peacock",
        "Quagga",
        "Rhino",
        "Snake",
        "Tapir",
        "Unicorn",
        "Viper",
        "Wombat",
        "Xenops",
        "Yak",
        "Zebra",
    ];
    return `${adj[Math.round(Math.random()*(adj.length-1))]} ${animal[Math.round(Math.random()*(animal.length-1))]}`
}