import cv from './opencv.js';

// to check if the file exist in file system.
let haarcascadeFileExist = false;

/**
 * Class to control the user's webcam.
 * Process the initialization,
 * the video capture, to take photo
 * and render the cam and the user photo.
 */
export default class CameraGestioner {
    constructor() {
        this.userPhoto = null;
        this.video = null;
        this.stream = null;
        this.videoOutput = null;
        this.onVideoCanPlay = null;
        this.onFaceDetected = null;
		this.nbrFacesOnCam = 0;
		this.cascadeFrontalFace = 'haarcascade_frontalface_default.xml';
        this.haarcascadesURL = '/resources/computerVision/haarcascades/';
        this.onPause = false;

        this.FPS = 30;
        this.src = null;
        this.dst = null;
        this.gray = null;
        this.cap = null;
        this.faces = null;
        this.frontalFaceClassifier = null;

        this.play = this.play.bind(this);
        this.processVideo = this.processVideo.bind(this);
        this.createFileFromUrl = this.createFileFromUrl.bind(this);
    }

    /**
     * Free all the resources.
     */
    free() {
        if (this.src) {
            this.src.delete();
            this.dst.delete();
            this.gray.delete();
            this.faces.delete();
            this.frontalFaceClassifier.delete();
        }
    }

    /**
     * Create the haarcascade file.
     * 
     * @param {*} path 
     * @param {*} url 
     * @param {*} callback 
     */
    createFileFromUrl(path, url, callback) {
        let request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.responseType = 'arraybuffer';
        request.onload = function(ev) {
            if (request.readyState === 4) {
                if (request.status === 200) {
                    let data = new Uint8Array(request.response);
                    cv.FS_createDataFile('/', path, data, true, false, false);
                    callback();
                } else {
                    console.log("Erreur de chargement du fichier haarcascade");
                }
            }
        };
        request.send();
    }

    /**
     * Detect if the webcam can be used
     * and keep a ref of the media.
     * 
     * @param {*} callback 
     */
    detectCam(callback) {
		// Take Care off mediaDevices issues
		if (navigator.mediaDevices === undefined) {
			navigator.mediaDevices = {};
		}
		
		if (navigator.mediaDevices.getUserMedia === undefined) {
			navigator.mediaDevices.getUserMedia = function(constraints) {
                let getUserMedia = navigator.webkitGetUserMedia || 
                    navigator.mozGetUserMedia ||
                    navigator.msGetUserMedia;
				
				if (!getUserMedia) {
					return Promise.reject(new Error('getUserMedia is not implemented in this browser'));
				}
				
				return new Promise(function(resolve, reject) {
					getUserMedia.call(navigator, constraints, resolve, reject);
				});
            }
		}
		
		navigator.mediaDevices
		  .getUserMedia({ video: true, audio: false })
		  .then((stream)=>{
              this.stream = stream;
              callback(true);
		  })
        .catch(e => {
            console.log("error detecting cam with getUserMedia: " + e.name + e.message);
            callback(false)
        });
    }

    /**
     * Process the video capture and render it.
     */
    processVideo() {
            let begin = Date.now();
            if (this.onPause) {
                return;
            }
            try {
                // start processing.
                this.cap.read(this.src);
                this.src.copyTo(this.dst);
				cv.cvtColor(this.dst, this.gray, cv.COLOR_RGBA2GRAY, 0);
                // detect faces.
				this.frontalFaceClassifier.detectMultiScale(this.gray, this.faces, 1.1, 3, 0);
                this.nbrFacesOnCam = this.faces.size();
                this.onFaceDetected();
                // draw faces.
                for (let i = 0; i < this.nbrFacesOnCam; ++i) {
                    let face = this.faces.get(i);
                    let point1 = new cv.Point(face.x, face.y);
                    let point2 = new cv.Point(face.x + face.width, face.y + face.height);
                    cv.rectangle(this.dst, point1, point2, [255, 0, 0, 255]);
                }
                cv.imshow(this.videoOutput, this.dst);
                // schedule the next one.
                let delay = 1000/this.FPS - (Date.now() - begin);
                setTimeout(this.processVideo, delay);
            } catch (err) {
		            console.log("error in play() " + err.message);
                    return;
            }
        }

    /**
     * play the webcam capture.
     */
    play() {
        this.nbrFacesOnCam = 0;
        this.onPause = false;
        this.video.play();
        setTimeout(this.processVideo, 0);
		// schedule the first one.
    }


    /**
     * start the webcam capture and initialize it.
     * 
     * @param {*} canvasOutputId id of the canvas to render the webcam
     * @param {*} callback 
     * @param {*} onFaceDetected 
     */
    startCamera(canvasOutputId, callback, onFaceDetected) {
        this.video = document.createElement('video'); 
        this.video.width = 299;
        this.video.height = 275;
        this.video.addEventListener('canplay', this.onVideoCanPlay);

        this.videoOutput = canvasOutputId;
        this.onVideoCanPlay = callback;
        this.onFaceDetected = onFaceDetected;

        this.src = new cv.Mat(this.video.height, this.video.width, cv.CV_8UC4);
        this.dst = new cv.Mat(this.video.height, this.video.width, cv.CV_8UC4);
        this.gray = new cv.Mat();
        this.cap = new cv.VideoCapture(this.video);
        this.faces = new cv.RectVector();
        this.frontalFaceClassifier = new cv.CascadeClassifier();

        this.video.srcObject = this.stream;
        if (!haarcascadeFileExist) {
		    this.createFileFromUrl(this.cascadeFrontalFace, `${this.haarcascadesURL}${this.cascadeFrontalFace}`, () => {
			    if (!this.frontalFaceClassifier.load(this.cascadeFrontalFace)) {
			    	// TODO traiter erreur de chargement haarcascade
                }
                haarcascadeFileExist = true;
                this.play();
            });
        }else {
            this.frontalFaceClassifier.load(this.cascadeFrontalFace);
            this.play();
        }
    }

    /**
     * Stop the capture.
     */
    stopCamera() {
        this.onPause = true;
        if (this.video) {
            this.video.pause();
            this.video.srcObject.getTracks().forEach(function(track) {
                track.stop();
            });
            this.video.srcObject = null;
            this.video.removeEventListener('canplay', this.onVideoCanPlay);
        }
        this.stream = null;
    }

    /**
     * Put the process capture on pause.
     */
    pauseCamera() {
        if (this.video) {
            this.video.pause();
        }
        this.onPause = true;
    }

    /**
     * Capture one image in webcam.
     * 
     * @param {*} canvasPhotoOutputId the id of the canvas to render the image
     */
    takePhoto(canvasPhotoOutputId) {
        try  {
            let cap = new cv.VideoCapture(this.video);
            this.userPhoto = new cv.Mat(this.video.height, this.video.width, cv.CV_8UC4);
            cap.read(this.userPhoto);
            //cv.imshow(canvasPhotoOutputId, this.userPhoto);
        } catch (e) {
            console.log("error in take photo");
        }
    }

    /**
     * Render the user's photo.
     * 
     * @param {*} canvasPhotoOutputId id of the canvas that render it.
     */
    showUserPhoto(canvasPhotoOutputId) {
        cv.imshow(canvasPhotoOutputId, this.userPhoto);
    }
}