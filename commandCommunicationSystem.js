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
        console.log("Logged in")
        
        uid = user.uid
        uref = firebase.database().ref(`players/${uid}`)
        console.log(uid)
        uref.update(userData)

        allPlayersRef = firebase.database().ref(`players`)
        allGamesRef = firebase.database().ref(`games`)

        uref.onDisconnect().remove()
    }
    else {
        // Logged out
        console.log("Logged out")
    }
})

firebase.auth().signInAnonymously().catch(error => {
    console.error(error.code, error.message)
})

function host() {
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
            })
            fref = allPlayersRef.child(snapshot.val()["player2"])
            fref.on('value', (snapshot) => {
                friend = snapshot.val()
            })

            onPlayerConnected()
        }
        handleCommand(snapshot.val())
    });
}

function join(id) {
    if (gid !== id) {
        // check if game exists
        allGamesRef.get().then((gamesSnap) => {
            let gameIDs = Object.keys(gamesSnap.val() ?? {})
            for (const gameID of gameIDs) {
                if (gameID == id) {
                    // game exists

                    leave()

                    gid = id;
                    fid = id;
                    gref = firebase.database().ref(`games/${id}`);

                    gref.update({"player2": uid})

                    allPlayersRef.child(gid).get().then((snapshot) => {
                        friend = snapshot.val()
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
function leave(sayGoodbye = true) {
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
    }
}

function command(str) {
    if (gid) {
        gref.update({"command": `${uid} ${str}`})
    }
}

function handleCommand(data) {
    // When a change in players occurs
    if (data["command"] !== "") {
        if (data["command"].split(" ")[0] != uid) {
            decodeCommand(data["command"])
            gref.update({"command": ""})
        }
    }
}

// function join() {
//     allGamesRef = firebase.database().ref(`games`)

//     allGamesRef.on("value", snapshot => {
//         // When a change in players occurs
//         updatedPlayers = snapshot.val()
//         Object.keys(updatedPlayers).forEach(key => {
//             if (key != uid) {
//                 Object.keys(updatedPlayers[key]).forEach(attribute => {
//                     players[key][attribute] = updatedPlayers[key][attribute]
//                 })
//             }
//         })
//     })

//     allPlayersRef.on("child_added", snapshot => {
//         // When a new player is added
//         const addedPlayer = snapshot.val()
//         if (addedPlayer.uid != uid) players[addedPlayer.uid] = convertToGettersAndSetters(addedPlayer)
//     })

//     allPlayersRef.on("child_removed", snapshot => {
//         // When a player is deleted
//         const deletedPlayer = snapshot.val()
//         delete players[deletedPlayer.uid]
//     })
// }