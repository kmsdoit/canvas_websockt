/*
* 1. expert 가 engineer를 초대한다.
* 2-1. expert가 방에 입장하게 된다면 본인의 video 태그와 canvas가 추가된다
* 2-2. engineer 역시 방에 입장하게 되면 본인의 video 태그와 canvas가 추가된다
* 3. 상대방의 video 태그가 추가 되면서 그 위에 새로운 canvas가 추가 되어야 한다. -> engineer 기준으로 봤을 떄 engineer 캠은 class가 engineer-canvas가 되고 위에 canvas는 expert canvas가 된다
* */

const socket = io('/')
const videoGrid = document.getElementById('video-grid')
const myPeer = new Peer()
let myVideoStream;
const myVideo = document.createElement('video')
myVideo.muted = true;
const peers = {}
let drawing = false;
let saveMyCanvas = [];



const get_cookie = (name) =>  {
    let value = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)');
    return value? value[2] : null;
}

myPeer.on('open', id => {
    socket.emit('join-room', ROOM_ID, id)
})

navigator.mediaDevices.getUserMedia({
    video : true,
    audio : false
}).then((stream) => {
    myVideoStream = stream;
    const myVideoCanvas = document.createElement('canvas')
    addVideo(myVideo,myVideoStream,myVideoCanvas,null,null,null)
    let partnerCanvas = document.createElement('video')
    let partnerVideo = document.createElement('canvas')

    myPeer.on('call' , (call) => {
        console.log('call Start')
        call.answer(stream)

        call.on('stream', (partnerVideoStream) => {
            addVideo(null,null,null, partnerCanvas,partnerVideoStream, partnerVideo)
        })
    })

    socket.on('user-connected' , (userId) => {
        console.log('user Connected:', userId)
        connectToNewUser(userId,stream, partnerVideo,partnerCanvas)
    })
})

const connectToNewUser = (userId, partnerStream, partnerVideo, partnerCanvas) => {
    const call = myPeer.call(userId,partnerStream)

    call.on('stream', (partnerVideoStream) => {
        addVideo(null,null,null, partnerCanvas,partnerVideoStream, partnerVideo)
    })

    call.on('close', () => {
        partnerCanvas.remove()
        partnerVideo.remove()
    })

    peers[userId] = call
    console.log(peers)
    console.log('user Connected:', userId)
}

const addVideo = (myVideo,myStream,myCanvas,partnerVideo,partnerStream,partnerCanvas) => {
    const userId = get_cookie('userid')
    const partnerId = get_cookie('partnerId')
    const invite = get_cookie('invite')
    console.log({myVideo,myStream,myCanvas,partnerVideo,partnerStream,partnerCanvas})


    if (partnerCanvas != null) {
        console.log('partnerIn')
        partnerVideo.srcObject = partnerStream;
        partnerVideo.classList.add(`${partnerId}-video`)
        partnerVideo.classList.add(`partner__screen`)
        partnerCanvas.classList.add('partner__canvas')
        partnerCanvas.width = 400;
        partnerCanvas.height = 300;
        partnerCanvas.id = `${partnerId}-canvas`
        const partnerCanvas2 = document.createElement('canvas')
        partnerCanvas2.classList.add('partner__canvas')
        partnerCanvas2.width = 400;
        partnerCanvas2.height = 300;
        partnerCanvas2.id = `${partnerId}-${userId}-canvas`
        partnerVideo.addEventListener('loadedmetadata', () => {
            videoGrid.append(partnerCanvas)
            videoGrid.append(partnerCanvas2)
            videoGrid.append(partnerVideo)

            if(invite === userId) {
                partnerCanvas2.remove()
            }else {
                partnerCanvas.remove()
            }
            partnerVideo.play()
        })
        setTimeout(() => {
            drawingCanvas(userId,partnerId,invite)
        },3000)

    }else{
        myVideo.srcObject = myStream;
        myVideo.classList.add(`${userId}-video`)
        myVideo.classList.add(`my__screen`)
        myCanvas.classList.add('my__canvas')
        myCanvas.width = 400;
        myCanvas.height = 300;
        myCanvas.id = `${userId}-canvas`;
        const userIdCanvas2 = document.createElement('canvas')
        userIdCanvas2.classList.add('my__canvas')
        userIdCanvas2.width = 400;
        userIdCanvas2.height = 300;
        userIdCanvas2.id = `${userId}-${partnerId}-canvas`
        console.log(myCanvas)
        myVideo.addEventListener('loadedmetadata', () => {
            videoGrid.append(myCanvas);
            videoGrid.append(userIdCanvas2)
            videoGrid.append(myVideo);

            if(invite === userId) {
                userIdCanvas2.remove()
            }else {
                myCanvas.remove()
            }
            myVideo.play();
        })
    }
}

const drawingCanvas = (userId, partnerId,invite) => {

    const myCanvas = document.getElementById(`${userId}-canvas`)
    const partnerCanvas = document.getElementById(`${partnerId}-canvas`)
    const myCanvas2 = document.getElementById(`${userId}-${partnerId}-canvas`)
    const partnerCanvas2 = document.getElementById(`${partnerId}-${userId}-canvas`)

    const beginPath = (x, y, size,origin,target) => {
        const originCanvas = document.getElementById(`${origin}`)
        const targetCanvas = document.getElementById(`${target}`)
        console.log('beginPath originCanvas', originCanvas)
        console.log('beginPath targetCanvas', targetCanvas)
        if (targetCanvas == null) {
            const Octx = originCanvas.getContext('2d')
            Octx.beginPath()
            Octx.moveTo(x,y)
            Octx.lineWidth = 2;
            Octx.strokeStyle = 'blue';
        }else {
            const Tctx = targetCanvas.getContext('2d')
            Tctx.beginPath()
            Tctx.moveTo(x,y)
            Tctx.lineWidth = 2;
            Tctx.strokeStyle = 'red';
        }
    };

    const strokePath = (x,y,color,origin,target) => {
        const originCanvas = document.getElementById(`${origin}`)
        const targetCanvas = document.getElementById(`${target}`)
        console.log('strokePath originCanvas', originCanvas)
        console.log('strokePath targetCanvas', targetCanvas)
        if (targetCanvas == null) {
            const Octx = originCanvas.getContext('2d')
            Octx.lineTo(x, y);
            Octx.stroke();
        }else {
            const Tctx = targetCanvas.getContext('2d')
            Tctx.lineTo(x, y);
            Tctx.stroke();
        }
    }

    const handleBeganPath = ({ x, y, size,origin,target }) => beginPath(x,y,size,origin,target)
    const handleStrokenPath = ({ x, y, color,origin,target}) => strokePath(x, y, color,origin,target);

    socket.on('beganPath', handleBeganPath)
    socket.on('strokedPath', handleStrokenPath)


    if (myCanvas2 == null || partnerCanvas2 == null && invite === userId) {

        console.log('expert')

        const handleMousemove = (e) => {
            const x = e.clientX  // curX
            const y = e.clientY // curY

            if (!drawing) {
                if (e.srcElement.id === `${userId}-canvas`) {
                    beginPath(x, y, 2, `${userId}-canvas`,`${userId}-${partnerId}-canvas`);
                    socket.emit('beginPath', {
                        x: x,
                        y: y,
                        size: 2,
                        origin : `${userId}-canvas`,
                        target: `${userId}-${partnerId}-canvas`
                    })

                }
                else{
                    beginPath(x, y, 2,`${partnerId}-canvas`,`${partnerId}-${userId}-canvas`);
                    socket.emit('beginPath', {
                        x: x,
                        y: y,
                        size: 2,
                        origin : `${partnerId}-canvas`,
                        target: `${partnerId}-${userId}-canvas`
                    })
                }
            } else {
                if(e.srcElement.id === `${partnerId}-canvas`){
                    strokePath(x, y, 'green', `${partnerId}-canvas`,`${partnerId}-${userId}-canvas`);
                    socket.emit('strokePath',{
                        x : x,
                        y : y,
                        color : 'green',
                        origin : `${partnerId}-canvas`,
                        target : `${partnerId}-${userId}-canvas`
                    })
                }else{
                    strokePath(x, y, 'green',`${userId}-canvas`, `${userId}-${partnerId}-canvas`);
                    socket.emit('strokePath',{
                        x : x,
                        y : y,
                        color : 'green',
                        origin : `${userId}-canvas`,
                        target : `${userId}-${partnerId}-canvas`
                    })
                }
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


        myCanvas.addEventListener("mousemove", function(e){ handleMousemove(e) });
        myCanvas.addEventListener("mousedown", function(e){ handleMouseDown(e) });
        myCanvas.addEventListener("mouseup", function(e){ handleMouseUp(e) });
        myCanvas.addEventListener("mouseout", function(e){ handleMouseLeave(e) });

        partnerCanvas.addEventListener("mousemove", function(e){ handleMousemove(e) });
        partnerCanvas.addEventListener("mousedown", function(e){ handleMouseDown(e) });
        partnerCanvas.addEventListener("mouseup", function(e){ handleMouseUp(e) });
        partnerCanvas.addEventListener("mouseout", function(e){ handleMouseLeave(e) });


    }
    else {

        console.log('engineer')

        const handleMousemove = (e) => {
            const x = e.clientX  // curX
            const y = e.clientY // curY

            if (!drawing) {
                if (e.srcElement.id === `${partnerId}-${userId}-canvas`) {
                    beginPath(x, y, 2,`${partnerId}-${userId}-canvas`, `${partnerId}-canvas`);
                    socket.emit('beginPath', {
                        x: x,
                        y: y,
                        size: 2,
                        origin : `${partnerId}-${userId}-canvas`,
                        target: `${partnerId}-canvas`
                    })
                } else {
                    beginPath(x, y,2, `${userId}-${partnerId}-canvas`,`${userId}-canvas`);
                    socket.emit('beginPath', {
                        x: x,
                        y: y,
                        size: 2,
                        origin : `${userId}-${partnerId}-canvas`,
                        target: `${userId}-canvas`
                    })
                }
            } else {
                if (e.srcElement.id === `${partnerId}-${userId}-canvas`) {
                    strokePath(x, y, 'green', `${partnerId}-${userId}-canvas`,`${partnerId}-canvas`);
                    socket.emit('strokePath', {
                        x: x,
                        y: y,
                        color: 'green',
                        origin : `${partnerId}-${userId}-canvas`,
                        target: `${partnerId}-canvas`
                    })
                } else {
                    strokePath(x, y, 'green',`${userId}-${partnerId}-canvas`, `${userId}-canvas`);
                    socket.emit('strokePath', {
                        x: x,
                        y: y,
                        color: 'green',
                        origin : `${userId}-${partnerId}-canvas`,
                        target: `${userId}-canvas`
                    })
                }
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

        myCanvas2.addEventListener("mousemove", function (e) {
            handleMousemove(e)
        });
        myCanvas2.addEventListener("mousedown", function (e) {
            handleMouseDown(e)
        });
        myCanvas2.addEventListener("mouseup", function (e) {
            handleMouseUp(e)
        });
        myCanvas2.addEventListener("mouseout", function (e) {
            handleMouseLeave(e)
        });


        partnerCanvas2.addEventListener("mousemove", function (e) {
            handleMousemove(e)
        });
        partnerCanvas2.addEventListener("mousedown", function (e) {
            handleMouseDown(e)
        });
        partnerCanvas2.addEventListener("mouseup", function (e) {
            handleMouseUp(e)
        });
        partnerCanvas2.addEventListener("mouseout", function (e) {
            handleMouseLeave(e)
        });



    }
}

