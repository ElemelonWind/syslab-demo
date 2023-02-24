const APP_ID = "a9a73ee6ce364c91891aa82a782b76e7"
const APP_CERTIFICATE = "b74dccab337640168c82ed4a70bf3c7c"

let uid = sessionStorage.getItem("uid")
if(!uid) {
    uid = String(Math.floor(Math.random() * 10000))
    sessionStorage.setItem("uid", uid)
}

let token = null
let client
let roomId = "demo"

let localTracks = []
let remoteUsers = {} // uid: {track}

let getToken = async () => {
    return new Promise(function(resolve) {
        fetch(`https://api.allorigins.win/get?url=https://agora-token-service-production-68fd.up.railway.app/rtc/${roomId}/1/uid/${uid}/?expiry=300`)
        .then(response => {
            if (response.ok) {
                return response.json()
            } else {
                throw new Error('Something went wrong');
            }
        })
        .then(response => {
            console.log(JSON.parse(response.contents).rtcToken)
            resolve(JSON.parse(response.contents).rtcToken)
        })
        .catch(error => {
            console.log(error)
        })
    })
}


let joinRoomInit = async () => {
    client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8"})
    token = await getToken()
    await client.join(APP_ID, roomId, token, uid)

    client.on('user-published', handleUserPublished)
    client.on('user-left', handleUserLeft)

    joinStream()
}

let joinStream = async () => {
    localTracks = await AgoraRTC.createMicrophoneAndCameraTracks()

    let player = `<div class="video__container" id="user-container-${uid}">
                    <div class="video-player" id="user-${uid}">
                </div>`
    document.getElementById("streams__container").insertAdjacentHTML("beforeend", player)

    localTracks[1].play(`user-${uid}`)
    await client.publish([localTracks[0], localTracks[1]])
}

let handleUserPublished = async (user, mediaType) => {
    remoteUsers[user.uid] = user

    await client.subscribe(user, mediaType)

    let player = document.getElementById(`user-container-${user.uid}`)
    if (!player) {
        player = `<div class="video__container" id="user-container-${user.uid}">
                        <div class="video-player" id="user-${user.uid}">
                    </div>`
        document.getElementById("streams__container").insertAdjacentHTML("beforeend", player)
    }

    if (mediaType === "video") {
        user.videoTrack.play(`user-${user.uid}`)
    }

    if (mediaType === "audio") {
        user.audioTrack.play()
    }
}

let handleUserLeft = async (user) => {
    delete remoteUsers[user.uid]
    document.getElementById(`user-container-${user.uid}`).remove()
}

joinRoomInit()