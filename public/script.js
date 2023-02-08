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
const brush = document.getElementById("brush")
const erase = document.getElementById("erase")
const MODE_BUTTON = [brush,erase]
let mode = brush;
let drawing = false;
myVideo.muted = true;
const peers = {}
let saveMyCanvas = [];
let startX = 0;
let startY = 0;




document.querySelector('body').onload = (e) =>{
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
    })
        .then((stream) => {
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

    /** @param {string} myVideo
     * @param {stream} myStream
     * @param {canvasObject} myCanvas
     * @param {string} partnerVideo
     * @param {stream} partnerStream
     * @param {canvasObject} partnerCanvas
     * */
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
    /** @param {string} userId
     * @param {string} partnerId
     * @param {string} invite
     * */
    const drawingCanvas = (userId, partnerId,invite) => {

        const myCanvas = document.getElementById(`${userId}-canvas`)
        const partnerCanvas = document.getElementById(`${partnerId}-canvas`)
        const myCanvas2 = document.getElementById(`${userId}-${partnerId}-canvas`)
        const partnerCanvas2 = document.getElementById(`${partnerId}-${userId}-canvas`)

        console.log("myCanvas:", myCanvas)
        console.log("partnerCanvas:", partnerCanvas)
        console.log("myCanvas2:", myCanvas2)
        console.log("partnerCanvas2:", partnerCanvas2)

        // const beginPath = (x, y, size,origin,target) => {
        //     const originCanvas = document.getElementById(origin)
        //     const targetCanvas = document.getElementById(target)
        //
        //     console.log('beginPath originCanvas', originCanvas)
        //     console.log('beginPath targetCanvas', targetCanvas)
        //     if (targetCanvas == null) {
        //         const Octx = originCanvas.getContext('2d')
        //         Octx.beginPath()
        //         Octx.moveTo(x,y)
        //         Octx.lineWidth = size;
        //     }
        //     if(originCanvas == null){
        //         const Tctx = targetCanvas.getContext('2d')
        //         Tctx.beginPath()
        //         Tctx.moveTo(x,y)
        //         Tctx.lineWidth = size;
        //     }
        // };

        const strokePath = (x,y,color,origin,target,mouseX,mouseY) => {
            const originCanvas = document.getElementById(origin)
            const targetCanvas = document.getElementById(target)
            console.log({x,y,color,origin,target,mouseX,mouseY})
            if (targetCanvas == null) {
                const oCtx = originCanvas.getContext('2d')
                oCtx.beginPath()
                oCtx.moveTo(mouseX,mouseY)
                oCtx.lineTo(x, y);
                oCtx.strokeStyle = 'red';
                oCtx.stroke();
            }else {
                const tCtx = targetCanvas.getContext('2d')
                tCtx.beginPath()
                tCtx.moveTo(mouseX,mouseY)
                tCtx.lineTo(x, y);
                tCtx.strokeStyle = color;
                tCtx.stroke();
            }
        }

        const erasePath = (x, y,origin,target) => {
            const originCanvas = document.getElementById(origin)
            const targetCanvas = document.getElementById(target)
            console.log({x,y,origin,target})
            if (targetCanvas == null) {
                const oCtx = originCanvas.getContext('2d')
                oCtx.clearRect(x-oCtx.lineWidth/2,y-oCtx.lineWidth/2,originCanvas.width,originCanvas.height)
            }else {
                const tCtx = targetCanvas.getContext('2d')
                tCtx.clearRect(x-tCtx.lineWidth/2,y-tCtx.lineWidth/2,targetCanvas.width, targetCanvas.height)
            }
        }

        // const handleBeganPath = ({ x, y, size,origin,target }) => beginPath(x,y,size,origin,target)
        const handleStrokenPath = ({ x, y, color,origin,target,mouseX,mouseY}) => strokePath(x, y, color,origin,target,mouseX,mouseY);
        const handleErasePath = ({ x, y,origin,target,mouseX,mouseY}) => erasePath(x, y,origin,target,mouseX,mouseY);

        // socket.on('beganPath', handleBeganPath)
        socket.on('strokedPath', handleStrokenPath)
        socket.on('erasedPath', handleErasePath)


        if (myCanvas2 == null || partnerCanvas2 == null && invite === userId) {

            console.log('expert')

            const handleMousemove = (e) => {
                const x = e.offsetX  // curX
                const y = e.offsetY // curY

                if (!drawing) {
                    return
                }
                if(mode === brush) {
                    if(e.srcElement.id === `${partnerId}-canvas`){
                        strokePath(x, y, 'green', `${partnerId}-canvas`,`${partnerId}-${userId}-canvas`);
                        socket.emit('strokePath',{
                            x : x,
                            y : y,
                            color : 'green',
                            origin : `${partnerId}-canvas`,
                            target : `${partnerId}-${userId}-canvas`,
                            mouseX : startX,
                            mouseY : startY
                        })
                        startX = x;
                        startY = y;

                    }else{
                        strokePath(x, y, 'green',`${userId}-canvas`, `${userId}-${partnerId}-canvas`);
                        socket.emit('strokePath',{
                            x : x,
                            y : y,
                            color : 'green',
                            origin : `${userId}-canvas`,
                            target : `${userId}-${partnerId}-canvas`,
                            mouseX : startX,
                            mouseY : startY
                        })
                        startX = x;
                        startY = y;
                    }
                }
                else if(mode === erase) {
                    if(e.srcElement.id === `${partnerId}-canvas`){
                        erasePath(x, y,  `${partnerId}-canvas`,`${partnerId}-${userId}-canvas`);
                        socket.emit('erasePath',{
                            x : x,
                            y : y,
                            origin : `${partnerId}-canvas`,
                            target : `${partnerId}-${userId}-canvas`,
                        })
                    }else{
                        erasePath(x, y, `${userId}-canvas`, `${userId}-${partnerId}-canvas`);
                        socket.emit('erasePath',{
                            x : x,
                            y : y,
                            origin : `${userId}-canvas`,
                            target : `${userId}-${partnerId}-canvas`,
                        })
                    }
                }

            }
            const startPaint = () => {
                drawing = true;
            };

            const stopPaint = () => {
                drawing = false;
            };

            const handleMouseDown = (e) => {
                startX = e.offsetX
                startY = e.offsetY
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
                const x = e.offsetX  // curX
                const y = e.offsetY // curY

                if (!drawing) {
                    return;
                }
                if(mode === brush) {
                    if (e.srcElement.id === `${partnerId}-${userId}-canvas`) {
                        strokePath(x, y, 'green', `${partnerId}-${userId}-canvas`,`${partnerId}-canvas`);
                        socket.emit('strokePath', {
                            x: x,
                            y: y,
                            color: 'green',
                            origin : `${partnerId}-${userId}-canvas`,
                            target: `${partnerId}-canvas`,
                            mouseX : startX,
                            mouseY : startY
                        })
                        startX = x;
                        startY = y;
                    } else {
                        strokePath(x, y, 'green',`${userId}-${partnerId}-canvas`, `${userId}-canvas`,startX,startY);
                        socket.emit('strokePath', {
                            x: x,
                            y: y,
                            color: 'green',
                            origin : `${userId}-${partnerId}-canvas`,
                            target: `${userId}-canvas`,
                            mouseX : startX,
                            mouseY : startY
                        })
                        startX = x;
                        startY = y;
                    }
                }
                else if(mode === erase) {
                    if (e.srcElement.id === `${partnerId}-${userId}-canvas`) {
                        erasePath(x, y,  `${partnerId}-${userId}-canvas`,`${partnerId}-canvas`);
                        socket.emit('erasePath', {
                            x: x,
                            y: y,
                            origin : `${partnerId}-${userId}-canvas`,
                            target: `${partnerId}-canvas`,
                        })
                    } else {
                        erasePath(x, y,`${userId}-${partnerId}-canvas`, `${userId}-canvas`);
                        socket.emit('erasePath', {
                            x: x,
                            y: y,
                            origin : `${userId}-${partnerId}-canvas`,
                            target: `${userId}-canvas`,
                        })
                    }
                }
            }


            const startPaint = () => {
                drawing = true;
            };

            const stopPaint = () => {
                drawing = false;
            };

            const handleMouseDown = (e) => {
                startX = e.offsetX;
                startY = e.offsetY
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
};
function handleModeChange(event) {
    mode = event.target;
    // Button Highlight
    for(let i = 0 ; i < MODE_BUTTON.length ; i++){
        let button = MODE_BUTTON[i];
        if(button === mode){
            button.style.backgroundColor = "skyblue";
        }
        else {
            button.style.backgroundColor = "white";
        }
    }
}
MODE_BUTTON.forEach((mode) => {
        console.log(mode)
        mode.addEventListener("click", handleModeChange)
    }
);
