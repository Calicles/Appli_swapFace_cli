/**
 * Class to control the requests to the API swapFace.
 * Have to:
 * load the images,
 * send the request for swapping,
 * abort the requests when it is needed.
 */
export default class TransfertGestioner {
    constructor() {
        this.APIUri = "http://localhost:34568/swapFace";
        this.APIimagesCount = "/images_count";
        this.APIswap = "/swap/";
        this.APIimageByIndex = "/images/";
        this.imagesCount = 0;
        this.abortController = new AbortController();
        this.aborted = false;
    }

    /**
     * Create an urlObject from a blob object.
     * 
     * @param {*} blob the blob to decode
     */
    imageURLObject_from_Blob(blob) {
			let urlCreator = window.URL || window.webkitURL;
			return urlCreator.createObjectURL( blob );
    }

    /**
     * Fetch one image ine the API by index.
     * Must be recursive to keep the index in the array result right
     * by the index image in API.
     * @param {*} imageIndex 
     * @param {*} imagesURLArray 
     * @param {*} callback 
     */
    fetchOneImage(imageIndex, imagesURLArray, callback) {
        const { signal } = this.abortController;
        fetch(this.APIUri + this.APIimageByIndex + imageIndex, { signal })
        .then(response => response.blob())
        .then(blob => {
			let imageUrl = this.imageURLObject_from_Blob(blob);
            imagesURLArray.push(imageUrl);
            imageIndex++;
            if (imageIndex <= this.imagesCount) {
                this.fetchOneImage(imageIndex, imagesURLArray, callback);
            }
            else {
                if (!this.aborted)
                    callback(imagesURLArray);
            }
        }).catch(e => {
            if (e.name === "AbortError") {
                console.log("fetch aborted");
            }
            else {
                callback(null);
            }
        });
    }

    /**
     * Fetch all the images in the API.
     * First fetch the count of image.
     * Then image by image.
     * @param {*} callback 
     */
    fetchImages(callback) {
        const { signal } = this.abortController;
        // First fetch the count of the images in API
        fetch (this.APIUri + this.APIimagesCount, { signal })
        .then(response => response.json())
        // then fetch all images
        .then(json => {
            this.imagesCount = json["count"];
            let imagesURL = [];
            if (!this.aborted)
                this.fetchOneImage(1, imagesURL, callback)
        }).catch(e => this.processRequestError(e, callback));
    }

    /**
     * Process the response of the swap request.
     * 
     * @param {*} blob the response, as text if error or as blob.
     * @param {*} callback to trigger when process over.
     */
    processServerResponse(blob, callback) {
        if (typeof blob === "string") {
            console.log(blob);
            if (!this.aborted) {
                callback(null, blob);
            }
        }
        else {
            let imageUrl = this.imageURLObject_from_Blob(blob);

            if(!this.aborted)
                callback(imageUrl);
        }
    }

    /**
     * Process the error in the swap request.
     * 
     * @param {*} error the error catched
     * @param {*} callback to trigger
     */
    processRequestError(error, callback) {
        if (error.name === "AbortError") {
            console.log("Request aborted");
        }
        else {
            console.log("error in fetch: " + error);
            callback(null, error);
        }
    }

    /**
     * Post the user's face's photo to the API
     * and the index of the image to swap with.
     * @param {*} content 
     * @param {*} callback 
     */
    POST_toAPI(content, callback) {
        fetch(this.APIUri, {
            method: "POST",
            body: content,
            mode: 'cors',
            signal: this.abortController.signal	
        })
        .then(response => {
            if (response.ok) {
                return response.blob()
            } else {
                return response.text();
            }
        })
        .then(blob => this.processServerResponse(blob, callback))
        .catch(e => this.processRequestError(e, callback));
    }

    /**
     * Wrap the POST request function to the API.
     * @param {*} canvaPhoto1Id canvas who contains the user's face
     * @param {*} indexPhoto2 index of the photo in API
     * @param {*} callback 
     */
    sendUserPhoto(canvaPhoto1Id, indexPhoto2, callback) {
        let canvas = document.getElementById(canvaPhoto1Id);
        canvas.toBlob(blob => {
            let fileReader = new FileReader();
            fileReader.readAsArrayBuffer(blob);
            fileReader.onloadend = () => {
                let array = Array.from(new Uint8Array(fileReader.result));
                const body = JSON.stringify({image2Index: ""+indexPhoto2, imageWidth: 4, imageHeight: 4, image: array});
                if (!this.aborted) {
                    this.POST_toAPI(body, callback);
                }
            }
        }, 'image/jpeg', 1);
    }

    /**
     * Send by GET request the two indexes of the images to swap.
     * 
     * @param {*} index1 
     * @param {*} index2 
     * @param {*} callback 
     */
    sendPhotosIndexes(index1, index2, callback) {
        const { signal } = this.abortController;
        fetch(this.APIUri + this.APIswap + index1 + "/" + index2, { signal })
        .then(response => {
            if (response.ok) {
                return response.blob();
            }
            else {
                return response.text();
            }
        })
        .then(blob => this.processServerResponse(blob, callback))
        .catch(e => this.processRequestError(e, callback));
    }

    /**
     * Free the ressource created with URL.
     * 
     * @param {*} imageURLObject the object created in the request
     */
    free(imageURLObject) {
        if (imageURLObject) {
            URL.revokeObjectURL(imageURLObject);
        }
    }

    /**
     * Abort all the currents requests.
     */
    abortTransfert() {
        this.abortController.abort();
        this.aborted = true;
    }

    /**
     * After aborted, prepare for other request.
     */
    rearm() {
        this.abortController = new AbortController();
        this.aborted = false;
    }
}