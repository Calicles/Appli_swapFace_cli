import React from 'react';
import Loading from '../loading.js';
import Fader from '../fader.js';
import CardPane from './cardPane.js';
import TransfertGestioner from './transfertGestioner.js';
import CameraGestioner from './cameraGestioner.js';
import CamRenderer from './camRenderer.js';

/**
 * Class of the swap face application.
 * Determinist Automaton.
 * 
 * 3 scenarii:
 * - Nominal: the user swap his face with a photo that he can choose.
 * - Alternative: no cam available, the user can choose two images to swap their faces.
 * - Exception: No API response, end of the App.
 * 
 * Use with React framework.
 * Refresh the view by the state's transition in React system, by calling "setState".
 * Handle and dispatch all the events from the view.
 */
export default class App extends React.Component {
    constructor(props) {
        super(props);
        // The states of the automaton, in order respect the nominal use-case scenario
        this.state = {
                    detectingCam: true,             // 1 detecting if a camera is avalaible
                    showingMsg: false,              // 2 show the detection's result or show error after step 8 (in alternative use-case scenario)
                    imagesLoading: false,           // 3 display loading
                    waitingImageUserChoice: false,  // 4 display all the images
                    showingWebcam: false,           // 5 display the cam
                    showingUserPhoto: false,        // 6 display the user's photo
                    userPhotoTook: false,           // 7 photo send to API
                    waitingAPIResponse: false,      // 8 display loading
                    APIResponseReceived: false,     // 9 response received from API 
                    userFaceDetected: false,        // during step 5 display a red square around user face if detected
                    elementVisible: true            // used for display or fade out Fader element with callback in fadeOut
                    };
        this.camOk = false;
        this.APIRunning = true;

        this.APIErrorResponseCount = 0;
        this.APIFaceDectionError = 0;
        this.API_ERROR_MAX = 2;

        this.camGestioner = new CameraGestioner(this.webcamCanvasId);
        this.transfertGestioner = new TransfertGestioner();

        this.imagesUrl = [];
        this.imageResultUrl = null;
        this.imagesUrlIndex = [];
        this.webcamCanvasId = "videoOutput";
        this.userPhotoCanvasId = "userPhotoOutput";
        this.APIErrorMsg = "";
        
        this.initFunctionBinding();
    }

    /**
     * Initialize the binding for use in callback system.
     */
    initFunctionBinding() {
        this.handleCamDetectionOver = this.handleCamDetectionOver.bind(this);
        this.handleImagesLoaded = this.handleImagesLoaded.bind(this);
        this.onReset = this.onReset.bind(this);
        this.onAPIResponse = this.onAPIResponse.bind(this);
        this.onCameraStarted = this.onCameraStarted.bind(this);
        this.handleClickPhotoTaken = this.handleClickPhotoTaken.bind(this);
        this.onUserFaceDetected = this.onUserFaceDetected.bind(this);
        this.onDetectCamLoadFadeOut = this.onDetectCamLoadFadeOut.bind(this);
        this.onResultCamFadeOut = this.onResultCamFadeOut.bind(this);
        this.onImagesLoadFadeOut = this.onImagesLoadFadeOut.bind(this);
        this.renderImage = this.renderImage.bind(this);
        this.handleErazeImageChoosen = this.handleErazeImageChoosen.bind(this);
    }

    /**
     * The component is mounted in the DOM.
     */
    componentDidMount() {
        //alert(self.location.host);
        setTimeout(
            () => this.camGestioner.detectCam(this.handleCamDetectionOver),
            2000
        );
    }

    /**
     * The component will be exited of the DOM.
     * Prepare to free all resources.
     */
    componentWillUnmount() {
        if (this.camOk) {
            this.camGestioner.stopCamera();
            this.camGestioner.free();
        }
        if (this.imagesUrl) {
            this.imagesUrl.forEach(imageURL => this.transfertGestioner.free(imageURL));
        }
        this.transfertGestioner.free(this.imageResultUrl);
        this.transfertGestioner.abortTransfert();
    }

    /**
     * The camera detection is over.
     * @param {*} camOk boolean, true if the cam can be use, false if not.
     */
    handleCamDetectionOver(camOk) {
        if (camOk) {
            this.camOk = true;
        }
        this.setState({elementVisible: false});
    }

    /**
     * All the images are lodaed from API.
     * @param {*} imageArray an array of URLObject can be use in src attr. of img tag.
     */
    handleImagesLoaded(imageArray) {
        if (imageArray == null) {
            this.APIRunning = false;
        }
        else {
            this.imagesUrl = imageArray;
        }
        this.setState({elementVisible: false});
    }

    /**
     * Send the user Photo and the index of the image to swap with to the API.
     */
    handleClickSendPhoto() {
        this.transfertGestioner.sendUserPhoto(
            this.userPhotoCanvasId,
            this.imagesUrlIndex[0],
            this.onAPIResponse
        );
        this.setState({
            showingWebcam: false, 
            showingUserPhoto: false, 
            userPhotoTook: true, 
            waitingAPIResponse: true
        });
    }

    /**
     * State's transition to render the user's photo.
     */
    handleClickPhotoTaken() {
        this.camGestioner.takePhoto(this.userPhotoCanvasId);
        this.setState({showingUserPhoto: true});
    }

    /**
     * State's transition to eraze the photo on screen.
     */
    handleClickRemoveUserPhoto() {
        this.setState({showingUserPhoto: false});
    }

    /**
     * State's transition to render the cam
     */
    onCameraStarted() {
        this.setState({detectingCam: false, imagesLoading: true});
    }

    /**
     * For refresh the view and draw the red square arround the user's face if detected.
     */
    onUserFaceDetected() {
        this.setState({userFaceDetected: true});
    }

    /**
     * User click on an image.
     * Keep the index in memory to send to API.
     * 
     * @param {*} index the index of the image where the click is.
     */
    handleClickImage(index) {
        let showWebcam = false;
        let waitingUserChoice = false;
        let waitingAPI = false;
        // Save the index
        this.imagesUrlIndex.push(index + 1);
        // if the cam available or user click on two picture (in alternative scenario)
        if (this.camOk || this.imagesUrlIndex.length === 2) {
            if (this.camOk) {
                waitingUserChoice = false;
                showWebcam = true;
            }
            // No cam available, alternative scanario is playing (user choose 2 images)
            else {
                this.transfertGestioner.sendPhotosIndexes(
                    this.imagesUrlIndex[1],
                    this.imagesUrlIndex[0],
                    this.onAPIResponse
                );
                waitingAPI = true;
            }
        } else {
            waitingUserChoice = true;
        }
        this.setState({
            waitingImageUserChoice: waitingUserChoice, 
            waitingAPIResponse: waitingAPI,
            showingWebcam: showWebcam});
    }

    /**
     * Click on image choosen.
     * Eraze its index of the memory,
     * if the request started, abort it.
     * 
     * @param {*} imageIndex index of the image to eraze.
     */
    handleErazeImageChoosen(imageIndex) {
        this.imagesUrlIndex.splice(imageIndex, 1);
        // abort if requesting
        if (this.state.waitingAPIResponse) {
            if (this.camOk) {
                this.camGestioner.pauseCamera();
            }
            this.transfertGestioner.abortTransfert();
            this.transfertGestioner.rearm();
        }
        this.setState({
            waitingImageUserChoice: true, 
            userPhotoTook: false, 
            showingWebcam: false,
            showingUserPhoto: false, 
            waitingAPIResponse: false
        });
    }

    /**
     * Triggered by the API response.
     * Display its response, the image result, or the error message.
     * 
     * @param {*} imageResultUrl the URLObject of the swap result
     * @param {*} msgError the error message if an error occured
     */
    onAPIResponse(imageResultUrl, msgError = null) {
        let haveToShowError = false;

        if (imageResultUrl === null) {
            if (msgError === "error reading user photo") {
                if (this.APIFaceDectionError === this.API_ERROR_MAX) {
                    this.APIFaceDectionError = 0;
                    this.APIErrorMsg = "Trop d'erreurs de detection, veuillez patienter, redirection."
                    this.camOk = false;
                }else {
                    this.APIFaceDectionError++;
                    if (this.APIFaceDectionError === 1) {
                        this.APIErrorMsg = "Votre visage n'a pas été détécté par le serveur, veuillez patienter.";
                    } else {
                        this.APIErrorMsg = "Visage non détécté, veuillez essayer avec davantage de luminosité.";
                    }
                }
            }else {
                this.APIErrorMsg = "Une erreur est survenue, veuillez patienter.";
                this.APIErrorResponseCount++;
            }
            if (this.APIErrorResponseCount === this.API_ERROR_MAX) {
                this.APIRunning = false;
            }else {
                // To eraze error message
                setTimeout(()=>{
                    this.setState({elementVisible: false});
                }, 4000);
            }
            haveToShowError = true;
        }
        else {
            this.APIErrorResponseCount = 0;
            this.imageResultUrl = imageResultUrl;
        }
        this.setState({waitingAPIResponse: haveToShowError, APIResponseReceived: true, showingMsg: haveToShowError});
    }

    /**
     * Have to prepare the automaton's state to the step 4 of the Nominal.
     */
    onReset() {
        // eraze the previous result image.
        this.imageResultUrl = null;
        // Eraze the user's choices
        this.imagesUrlIndex = [];
        this.setState({
                    detectingCam: false,
                    showingMsg: false,
                    imagesLoading: false,
                    waitingImageUserChoice: true, // step 4
                    showingWebcam: false,
                    showingUserPhoto: false,
                    userPhotoTook: false,
                    waitingAPIResponse: false,
                    userFaceDetected: false,
                    APIResponseReceived: false,
                    elementVisible: true
                    }
        );
    }

    /**
     * Triggered when the component fade out of the screen.
     * Set another state of the automaton to display the result message of detection.
     */
    onDetectCamLoadFadeOut() {
        this.setState({showingMsg: true, elementVisible: true});
        setTimeout(()=>this.setState({elementVisible: false}), 3000);
    }

    /**
     * The result message fade out.
     * Prepare to display the images loading message.
     */
    onResultCamFadeOut() {
        this.setState({detectingCam: false, showingMsg: false, imagesLoading: true, elementVisible: true});
        this.transfertGestioner.fetchImages(this.handleImagesLoaded);
    }

    /**
     * The loading message faded out.
     * Prepare to display the images or API error if no images.
     */
    onImagesLoadFadeOut() {
        this.setState({imagesLoading: false, waitingImageUserChoice: true, elementVisible: true});
    }

    //====================   Render zone  ================

    /**
     * Render an Element can be fade in and fade out of the screen.
     * 
     * @param {*} element the element to fade.
     * @param {*} callback to call on the element faded out.
     */
    renderFader(element, callback) {
        return (
            <div>
                <Fader
                    visible={this.state.elementVisible}
                    element={element}
                    callback={callback}
                />
            </div>
        )
    }

    /**
     * Display a message on the screen in fader element.
     * 
     * @param {*} message the message to display
     * @param {*} callback to call on faded out.
     */
    showMessage(message, callback) {
        const element = (
            <div className="d-flex justify-content-center">
                <h3>{message}</h3>
            </div>
        );
        return (
            <div>
                {this.renderFader(element, callback)}
            </div>
        )
    }

    /**
     * Render a loading component with its waiting message.
     * @param {*} message the message under the loading icon.
     * @param {*} callback to call when the loadint is over
     */
    renderLoading(message, callback) {
        const element = (
            <div>
                <div className="d-flex justify-content-center">
                    <Loading />
                </div>
                <div className="d-flex justify-content-center">
                    <p>{message}</p>
                </div>
            </div>
        );
        return (
            <div>
                {this.renderFader(element, callback)}
            </div>
        );
    }

    /**
     * Render a new image map with the click of the user.
     */
    renderImagesChoosen() {
        let images = this.imagesUrlIndex.map((val, index) => {
            let img = <img className="down-move circle" src={this.imagesUrl[val - 1]} alt="" decoding="sync"/>
            if (this.imageResultUrl) {
                return (<button className="btn" key={"img-choose" + index} disabled>{img}</button>)
            }
            return (<button className="btn" key={"img-choose" + index} onClick={()=>this.handleErazeImageChoosen(index)}>{img}</button>);
        });
        return (
            <div>
                {images}
            </div>
        );
    }

    /**
     * Render an image which the user can select to swapp with.
     * @param {*} imageUrl urlObject of the image
     * @param {*} index index of the URL object in the array of the URLObject sended by API.
     */
    renderImage(imageUrl, index) {
        let image;
        // if the image already choosen
        if (this.imagesUrlIndex.indexOf(index + 1) !== -1) {
            image =  (
                <button className="btn" disabled>
                    <img className="rounded" src={imageUrl} alt="" decoding="sync" />
                </button>
            );
        } else {
            image = (
                <button className="btn" onClick={()=>this.handleClickImage(index)}>
                    <div className="hover-zoom-bright">
                        <img className="img-fluid rounded hover-content" src={imageUrl} alt="" decoding="sync" />
                    </div>
                </button>
            );
        }
        return (
            <div key={"img-catalog" + index}>
                {image}
            </div>
        );
    }

    /**
     * Render all the images sended by the API wich can be selected by user.
     */
    renderImages() {
        let imgs = this.imagesUrl.map((image, index) => this.renderImage(image, index));
        const consigne = this.camOk ? "choisissez une image pour y placer votre visage" : "Choisissez deux images pour échanger leurs visages";

        const element =  (
            <div className="mw-100">
                <div className="d-flex justify-content-center">
                    <h2>{consigne}</h2>
                </div>
                <div className="d-flex flex-wrap justify-content-center">
                    {imgs}
                </div>
            </div>
        );
        return (
            <div>
                {element}
            </div>
        )
    }

    renderUserCanvas(canvasId, wrapperClassNames, canvasClassNames, width, height, onEnter, onExit) {
        return (
            <div>
                <CamRenderer
                    canvasId={canvasId}
                    canvasWrapperClassNames={wrapperClassNames}
                    canvasClassNames={canvasClassNames}
                    canvasWidth={`${height}`}
                    canvasHeight={`${width}`}
                    onEnter={onEnter}
                    onExit={onExit}
                />
            </div>
        );
    }

    /**
     * Render the component of the user photo that he take.
     */
    renderUserPhoto() {
        const footer = (
            <div>
                <button className="btn btn-dark float-left" onClick={()=>this.handleClickRemoveUserPhoto()}>
                    Annuler
                </button>
                <button className="btn btn-dark float-right" onClick={()=>this.handleClickSendPhoto()}>
                    Swapper les visages
                </button>
            </div>
        );
        return (
            <div>
                {this.renderUserCanvas(this.userPhotoCanvasId, "d-block", "circle", 100, 100, ()=>this.camGestioner.showUserPhoto(this.userPhotoCanvasId))}
                {footer}
            </div>
        )
    }

    /**
     * Render the capture of the webcam.
     */
    renderCamera() {
        let button;
        const onCamRenderMounted = ()=> {
            if (this.camGestioner.onPause) {
                this.camGestioner.play();
            } else {
                // initialize the streaming, wait the render's call
                this.camGestioner.startCamera(this.webcamCanvasId, this.onCameraStarted, this.onUserFaceDetected);
            }
        };
        const camElement = this.renderUserCanvas(
            this.webcamCanvasId, 
            "d-block", 
            "circle", 
            299, 
            175, 
            onCamRenderMounted, 
            ()=>this.camGestioner.pauseCamera());

        // The user's photo is displayed
        if (this.state.showingUserPhoto) {
            button = null;
        }else {
            // A face is detected on cam
            if (this.camGestioner.nbrFacesOnCam === 1) {
                button = <button className="btn btn-dark" onClick={()=>this.handleClickPhotoTaken()}>Prendre une photo</button>
            }
            // No or too much faces on cam
            else {
                button = <button className="btn btn-dark" disabled>Prende une photo</button>
            }
        }
        
        return (
            <div>
                <div className="d-flex justify-content-center align-items-center">
                    <div className="">
                        {this.state.showingUserPhoto ? this.renderUserPhoto() : camElement}
                    </div>
                </div>
                <div className="d-flex justify-content-center mt-3">
                    {button}
                </div>
            </div>
        )
    }

    /**
     * Call by the React system, when the state (this.setState) of the automaton has changed.
     * Display the right component according to this state.
     */
    render() {
        // Contains the messages for user
        let elementRow1 = null;
        const imagesChoosen = !this.state.APIResponseReceived ? this.renderImagesChoosen() : null;
        let userCanvas = null, restartButton = null;

        // If in the API is not running end of appli
        if (!this.APIRunning) {
            // render Error message
            elementRow1 = (
                <div>
                    <h4>L'API est injoignable, l'application ne peut être lancer.</h4>
                </div>
            );
        }
        // Step One detect Cam
        else if (this.state.detectingCam && !this.state.showingMsg) {
            elementRow1 = this.renderLoading("Detection de la Camera...", this.onDetectCamLoadFadeOut);
        } 
        // Display the message
        else if (this.state.showingMsg) {
            // Step two render detection's cam result
            if (this.state.detectingCam) {
                let msg;
                if (this.camOk) {
                    msg = "Webcam correctement détéctée.";
                }
                else {
                    msg = "Webcame non détéctée, veuillez patienter.";
                }
                elementRow1 = this.showMessage(msg, this.onResultCamFadeOut);
            } 
            // Or display error
            else if (this.state.waitingAPIResponse) {
                elementRow1 = this.showMessage(this.APIErrorMsg, this.onReset);
            }
        }
        // Step three load images from API
        else if (this.state.imagesLoading) {
            elementRow1 = this.renderLoading("chargement des images depuis l'API...", this.onImagesLoadFadeOut);
        }
        // Step four render the images
        else if (this.state.waitingImageUserChoice) {
            elementRow1 = this.renderImages();
        } 
        // Step five and six render the cam and user's photo (seven send to API)
        else if (this.state.showingWebcam) {
            if (this.state.showingUserPhoto) {
                elementRow1 = <h4>Votre photo</h4>
            }
            else if (this.camGestioner.nbrFacesOnCam === 1) {
                elementRow1 = <h4>Votre visage est correctement détécté.</h4>
            } else {
                elementRow1 = <h4>Veuillez placer votre visage de façon à faire apparaître un rectangle rouge.</h4>;
            }
            userCanvas = this.renderCamera();
        }
        // Step eight wait for an API response
        else if (this.state.waitingAPIResponse) {
            elementRow1 = this.renderLoading("Attente du résultat, le processus peut prendre quelques secondes...", null);
            if (this.state.userPhotoTook) {
                userCanvas =  this.renderUserCanvas(this.userPhotoCanvasId, "d-block", "circle", 100, 100, ()=>this.camGestioner.showUserPhoto(this.userPhotoCanvasId));
            }
        }
        // Step nine render the result
        else {
            userCanvas = <img src={this.imageResultUrl} className="circle mx-2" alt="result" decoding="sync" />
            restartButton = (
                <div className="d-flex justify-content-center"><button className="btn btn-dark" onClick={()=>this.onReset()}>Refaire</button></div>
            );
        }
        
        return (
            <div id="main_div" className="container-fluid" ref="main_div">
                <div className="row">
                    <div className="col-12 d-flex justify-content-center">
                        {elementRow1}
                    </div>
                </div>
                <div className="row">
                    <div className="col-12">
                        <div className="d-flex d-wrap justify-content-center aling-items-center">
                            <div>
                                {imagesChoosen}
                            </div>
                            <div>
                                {userCanvas}
                            </div>
                        </div>
                        <div className="d-flex justify-content-center mt-2">
                            {restartButton}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}
