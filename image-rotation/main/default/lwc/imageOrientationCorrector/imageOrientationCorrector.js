import { LightningElement, api, track } from 'lwc';
import getBase64ImagesForRecord from '@salesforce/apex/ImageOrientationController.getBase64ImagesForRecord';
import saveCorrectedImage from '@salesforce/apex/ImageOrientationController.saveCorrectedImage';
import exif_js from "@salesforce/resourceUrl/exif_js";
import {  loadScript } from 'lightning/platformResourceLoader';
import { ShowToastEvent } from "lightning/platformShowToastEvent";

export default class ImageOrientationCorrector extends LightningElement {
    @api recordId;
    
    @track images = [];
    @track correctedImages = [];
    @track isLoading = false;
    @track error = null;

    // EXIF library can be loaded via static resource in Salesforce
    exifLibraryLoaded = false;

    async connectedCallback() {
        try{
            await loadScript(this,exif_js);
            this.exifLibraryLoaded = true;
            console.log(`exif_js loaded`);
        }catch(error){
            console.log(`exif_js not laoded: ${error.message}`);
        }
        await this.fetchImages();
    }


    async fetchImages() {
        this.isLoading = true;
        this.error = null;

        try {
            this.images = await getBase64ImagesForRecord({ recordId: this.recordId });
        } catch (error) {
            this.error = error;
            console.error('Error fetching images:', error);
        } finally {
            this.isLoading = false;
        }
        console.log(`this.images.length = ${this.images.length}`);
    }

    async handleCorrectImages() {
        this.isLoading = true;
        this.error = null;

        try {
            this.isLoading = true;
            for(let i=0; i<this.images.length; i++){
                let correctedImage = await this.correctSingleImageOrientation(this.images[i]);
                console.log(`${correctedImage}`);
                await saveCorrectedImage({
                    "recordId": this.recordId,
                    "base64Image": correctedImage
                });
                
            }
        } catch (error) {
            this.error = error;
            console.error('Error correcting images:', error);
        } finally {
            this.isLoading = false;
            const evt = new ShowToastEvent({
                title: 'Automatic Image roation Complete !!!',
                variant: 'success',
              });
              this.dispatchEvent(evt);
        }
    }

    correctSingleImageOrientation(base64Image) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                console.log('Image loaded, dimensions:', img.width, 'x', img.height);
                
                // Let's check if EXIF is available
                console.log('EXIF library available:', !!window.EXIF);
                
                // Get all EXIF data
                EXIF.getData(img, function() {
                    console.log('Raw EXIF data:', this.exifdata);
                    
                    
                    // Create a canvas to manipulate the image
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    const orientation = EXIF.getTag(this, "Orientation");
                    console.log('Orientation value:', JSON.stringify(orientation));
                    
                    /*resolve({
                        orientation: orientation,
                        width: img.width,
                        height: img.height,
                        exifdata: this.exifdata
                    });*/
                    // Determine canvas dimensions and rotation
                    let width = img.width;
                    let height = img.height;
                    
                    // Reset canvas transformation
                    ctx.setTransform(1, 0, 0, 1, 0, 0);
                    
                    switch(orientation) {
                        case 3: // 180 degrees rotation
                            canvas.width = width;
                            canvas.height = height;
                            ctx.translate(width, height);
                            ctx.rotate(Math.PI);
                            break;
                        case 6: // 90 degrees rotation (clockwise)
                            canvas.width = height;
                            canvas.height = width;
                            //ctx.translate(height, 0);
                            //ctx.rotate(0.5 * Math.PI);
                            break;
                        case 8: // 270 degrees rotation (counterclockwise)
                            canvas.width = height;
                            canvas.height = width;
                            ctx.translate(0, width);
                            ctx.rotate(-0.5 * Math.PI);
                            break;
                        default: // No rotation needed
                            canvas.width = width;
                            canvas.height = height;
                    }
                    
                    // Draw the image
                    ctx.drawImage(img, 0, 0);
                    
                    // Convert canvas back to base64
                    let correctedBase64 = canvas.toDataURL('image/jpeg');
                    correctedBase64 = correctedBase64.substring(23);
                    resolve(correctedBase64);
                });
            };
            
            img.onerror = (e) => {
                console.error('Image load error:', e);
                reject(new Error('Image load failed'));
            };
            
            // Make sure we're preserving EXIF data when loading
            img.setAttribute('exif-data', 'preserve');
            img.src = base64Image; 
               
           /*        
            img.onload = () => {
                try {
                    // Create a canvas to manipulate the image
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Read EXIF metadata
                    const orientation = window.EXIF.getTag(img, "Orientation");
                    
                    // Determine canvas dimensions and rotation
                    let width = img.width;
                    let height = img.height;
                    
                    // Reset canvas transformation
                    ctx.setTransform(1, 0, 0, 1, 0, 0);
                    
                    switch(orientation) {
                        case 3: // 180 degrees rotation
                            canvas.width = width;
                            canvas.height = height;
                            ctx.translate(width, height);
                            ctx.rotate(Math.PI);
                            break;
                        case 6: // 90 degrees rotation (clockwise)
                            canvas.width = height;
                            canvas.height = width;
                            ctx.translate(height, 0);
                            ctx.rotate(0.5 * Math.PI);
                            break;
                        case 8: // 270 degrees rotation (counterclockwise)
                            canvas.width = height;
                            canvas.height = width;
                            ctx.translate(0, width);
                            ctx.rotate(-0.5 * Math.PI);
                            break;
                        default: // No rotation needed
                            canvas.width = width;
                            canvas.height = height;
                    }
                    
                    // Draw the image
                    ctx.drawImage(img, 0, 0);
                    
                    // Convert canvas back to base64
                    const correctedBase64 = canvas.toDataURL('image/jpeg');
                    
                    resolve(correctedBase64);
                } catch (error) {
                    reject(error);
                }
            };
            
            img.onerror = () => reject(new Error('Image load failed'));
            
            // Set the image source to the input base64 string
            img.src = base64Image;
            */
        });
    }
}