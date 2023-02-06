const socket = io('/')
const videoGrid = document.getElementById('video-grid')
const myPeer = new Peer()
let myVideoStream;
const myVideo = document.createElement('video')
myVideo.muted = true;
const peers = {}
let drawing = false;

/*
* 1. expert 가 engineer를 초대한다.
* 2-1. expert가 방에 입장하게 된다면 본인의 video 태그와 canvas가 추가된다
* 2-2. engineer 역시 방에 입장하게 되면 본인의 video 태그와 canvas가 추가된다
* 3. 상대방의 video 태그가 추가 되면서 그 위에 새로운 canvas가 추가 되어야 한다. -> engineer 기준으로 봤을 떄 engineer 캠은 class가 engineer-canvas가 되고 위에 canvas는 expert canvas가 된다
* */


navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
}).then(stream => {
    myVideoStream = stream;
    const canvas = document.createElement('canvas')
    addMyVideo(myVideo, stream,canvas)

    myPeer.on('call', call => {
        call.answer(stream)
        const video = document.createElement('video')
        const canvas = document.createElement('canvas')

        call.on('stream', userVideoStream => {
            addPartnerVideo(video, userVideoStream,canvas)
        })
    })

    socket.on('user-connected', userId => {
        console.log('user Connect!:',userId)
        const canvas = document.createElement('canvas')
        connectToNewUser(userId, stream,canvas)
    })
    // input value
    let text = $("input");
    // when press enter send message
    $('html').keydown(function (e) {
        if (e.which == 13 && text.val().length !== 0) {
            socket.emit('message', text.val());
            text.val('')
        }
    });
    socket.on("createMessage", message => {
        console.log(message)
        $("ul").append(`<li class="message"><b>user</b><br/>${message}</li>`);
        scrollToBottom()
    })
})

socket.on('user-disconnected', userId => {
    if (peers[userId]) peers[userId].close()

})

myPeer.on('open', id => {
    socket.emit('join-room', ROOM_ID, id)
})

function connectToNewUser(userId, stream,canvas) {
    const call = myPeer.call(userId, stream)
    const video = document.createElement('video')

    call.on('stream', userVideoStream => {
        addPartnerVideo(video, userVideoStream,canvas)
    })
    call.on('close', () => {
        video.remove()
        canvas.remove()
    })

    peers[userId] = call
}

function addMyVideo(video,stream,canvas) {
    const userId = get_cookie('userid')
    const partnerId = get_cookie('partnerId')
    video.srcObject = stream

    // video 위에 canvas
    video.classList.add(`${userId}-video`)
    video.classList.add(`my__screen`)
    canvas.id = `${userId}-${partnerId}-canvas`
    canvas.classList.add(`my__canvas`)
    canvas.width = '400';
    canvas.height = '300';

    video.addEventListener('loadedmetadata', () => {
        // videoGrid.append(canvas)
        videoGrid.append(canvas)
        videoGrid.append(video)

        video.play()
    });
}

function addPartnerVideo(video, stream,canvas) {
    const partnerId = get_cookie('partnerId')
    const userId = get_cookie('userid')
    video.srcObject = stream


    // video 위에 canvas
    video.classList.add(`${partnerId}-video`)
    video.classList.add(`partner__screen`)
    canvas.id = `${partnerId}-${userId}-canvas`
    canvas.classList.add(`partner__canvas`)
    canvas.width = '400';
    canvas.height = '300';

    const myCanvas = document.getElementById(`${userId}-${partnerId}-canvas`)

    const myCtx = myCanvas.getContext('2d')
    myCtx.lineWidth = 2;
    myCtx.strokeStyle = "red";

    video.addEventListener('loadedmetadata', () => {

        videoGrid.append(canvas)
        videoGrid.append(video)
        video.play()

        const pCanvas = document.getElementById(`${partnerId}-${userId}-canvas`)
        const partnerCtx = pCanvas.getContext('2d')

        partnerCtx.lineWidth = 2;
        partnerCtx.strokeStyle = "red";

        const beginPath = (x, y, size) => {
            myCtx.beginPath()
            partnerCtx.beginPath();
            partnerCtx.moveTo(x, y);
            partnerCtx.lineWidth = size;
        };

        const strokePath = (x, y, color,partner) => {
            console.log("strokeXY:",{x,y})

            if (partner == userId){
                // let currentColor = myCtx.strokeStyle;
                // if (color !== null) currentColor = color;
                // myCtx.strokeStyle = currentColor;
                myCtx.lineTo(x, y);
                myCtx.stroke();
            }else {

                // let currentColor = partnerCtx.strokeStyle;
                // if (color !== null) currentColor = color;
                // partnerCtx.strokeStyle = currentColor;
                partnerCtx.lineTo(x, y);
                partnerCtx.stroke();
            }
        };

        const handleBeganPath = ({ x, y, size }) => beginPath(x, y, size);
        const handleStrokenPath = ({ x, y, color ,partner}) => strokePath(x, y, color,partner);

        socket.on('beganPath', handleBeganPath)
        socket.on('strokenPath', handleStrokenPath)


        const handleMousemove = (e) => {
            const x = e.clientX  // curX
            const y = e.clientY // curY


            if (!drawing) {
                beginPath(x, y, partnerCtx.lineWidth, partnerId);
                socket.emit('beginPath',{
                    x : x,
                    y : y,
                    size : partnerCtx.lineWidth,
                })
            } else {
                strokePath(x,y,myCtx.strokeStyle,partnerId);
                socket.emit('strokePath',{
                    x : x,
                    y : y,
                    color : partnerCtx.strokeStyle,
                    partner: partnerId
                })
            }
        };

        const startPaint = () => {
            drawing = true;
        };

        const stopPaint = () => {
            drawing = false;
        };

        const handleMouseDown = () => {
            startPaint();
        };

        const handleMouseUp = () => {
            stopPaint();
        };

        const handleMouseLeave = () => {
            stopPaint();
        };


        canvas.addEventListener("mousemove", function(e){ handleMousemove(e) });
        canvas.addEventListener("mousedown", function(e){ handleMouseDown(e) });
        canvas.addEventListener("mouseup", function(e){ handleMouseUp(e) });
        canvas.addEventListener("mouseout", function(e){ handleMouseLeave(e) });

    })




}

function get_cookie(name) {
    let value = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)');
    return value? value[2] : null;
}


const scrollToBottom = () => {
    var d = $('.main__chat_window');
    d.scrollTop(d.prop("scrollHeight"));
}


const muteUnmute = () => {
    const enabled = myVideoStream.getAudioTracks()[0].enabled;
    if (enabled) {
        myVideoStream.getAudioTracks()[0].enabled = false;
        setUnmuteButton();
    } else {
        setMuteButton();
        myVideoStream.getAudioTracks()[0].enabled = true;
    }
}

const playStop = () => {
    console.log('object')
    let enabled = myVideoStream.getVideoTracks()[0].enabled;
    if (enabled) {
        myVideoStream.getVideoTracks()[0].enabled = false;
        setPlayVideo()
    } else {
        setStopVideo()
        myVideoStream.getVideoTracks()[0].enabled = true;
    }
}

const setMuteButton = () => {
    const html = `
    <i class="fas fa-microphone"></i>
    <span>Mute</span>
  `
    document.querySelector('.main__mute_button').innerHTML = html;
}

const setUnmuteButton = () => {
    const html = `
    <i class="unmute fas fa-microphone-slash"></i>
    <span>Unmute</span>
  `
    document.querySelector('.main__mute_button').innerHTML = html;
}

const setStopVideo = () => {
    const html = `
    <i class="fas fa-video"></i>
    <span>Stop Video</span>
  `
    document.querySelector('.main__video_button').innerHTML = html;
}

const setPlayVideo = () => {
    const html = `
  <i class="stop fas fa-video-slash"></i>
    <span>Play Video</span>
  `
    document.querySelector('.main__video_button').innerHTML = html;
}

