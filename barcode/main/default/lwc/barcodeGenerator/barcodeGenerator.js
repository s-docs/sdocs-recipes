import { LightningElement, api, track,wire } from 'lwc';
import { loadScript } from 'lightning/platformResourceLoader';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import saveBarcode from '@salesforce/apex/BarcodeController.saveBarcode';
import JSBARCODE from '@salesforce/resourceUrl/JsBarcode';
import generateDocument from '@salesforce/apex/BarcodeController.generateDocumentFromTemplate';
import { publish, MessageContext } from 'lightning/messageService';
import DocGenResultMC  from '@salesforce/messageChannel/SDOC__Doc_Gen_Result__c';

export default class BarcodeGenerator extends LightningElement {
    @api recordId;
    @api barcodeValue = '';
    @api barcodeFormat = 'CODE128';
    @api title = 'Barcode Generator';

    @track isLoading = false;
    @track errorMessage = '';
    @track barcodeGenerated = false;
    @track formats = [
        { label: 'CODE128', value: 'CODE128' },
        { label: 'EAN-13', value: 'EAN13' },
        { label: 'UPC-A', value: 'UPC' },
        { label: 'CODE39', value: 'CODE39' },
        { label: 'ITF-14', value: 'ITF14' },
        { label: 'QR Code', value: 'QR' }
    ];

    @wire(MessageContext)
    messageContext;

    renderedCallback() {
        if (this.jsBarcodeInitialized) {
            return;
        }
        this.jsBarcodeInitialized = true;

        loadScript(this, JSBARCODE)
            .then(() => {
                console.log('JsBarcode loaded successfully');
            })
            .catch(error => {
                this.errorMessage = 'Error loading JsBarcode library: ' + error.message;
                this.dispatchToast('Error', this.errorMessage, 'error');
            });
    }

    handleValueChange(event) {
        this.barcodeValue = event.target.value;
    }

    handleFormatChange(event) {
        this.barcodeFormat = event.target.value;
    }

    async generateBarcode() {
        if (!this.barcodeValue) {
            this.errorMessage = 'Please enter a value for the barcode';
            this.dispatchToast('Error', this.errorMessage, 'error');
            return;
        }

        this.isLoading = true;
        this.errorMessage = '';
        
        // Clear any previous barcode
        const barcodeContainer = this.template.querySelector('.barcode-container');
        barcodeContainer.innerHTML = '';
        
        // Create SVG element
        const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svgElement.id = 'barcode';
        barcodeContainer.appendChild(svgElement);
        
        try {
            // Generate barcode
            JsBarcode('#barcode', this.barcodeValue, {
                format: this.barcodeFormat,
                lineColor: '#000',
                width: 2,
                height: 100,
                displayValue: true
            });
            
            this.barcodeGenerated = true;
            this.dispatchToast('Success', 'Barcode generated successfully', 'success');
            this.saveToSalesforce();
            
        } catch (error) {
            this.errorMessage = 'Error generating barcode: ' + error.message;
            this.dispatchToast('Error', this.errorMessage, 'error');
        } finally {
            this.isLoading = false;
        }

    }

    async saveToSalesforce() {
        if (!this.barcodeGenerated) {
            this.errorMessage = 'Please generate a barcode first';
            this.dispatchToast('Error', this.errorMessage, 'error');
            return;
        }

        this.isLoading = true;
        
        // Get the SVG element
        const svgElement = this.template.querySelector('#barcode');
        
        // Convert SVG to data URL
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const encodedData = window.btoa(svgData);
        const dataURL = 'data:image/svg+xml;base64,' + encodedData;
        
        // Create a canvas element
        const canvas = document.createElement('canvas');
        const svgSize = svgElement.getBoundingClientRect();
        canvas.width = svgSize.width;
        canvas.height = svgSize.height;
        const ctx = canvas.getContext('2d');
        
        // Create an image from the SVG
        const img = new Image();
        img.onload = async () => {
            // Draw the image on the canvas
            ctx.drawImage(img, 0, 0);
            
            // Convert canvas to PNG data URL
            const pngDataUrl = canvas.toDataURL('image/png');
            
            // Save to Salesforce
            await saveBarcode({
                recordId: this.recordId,
                barcodeData: pngDataUrl,
                barcodeText: this.barcodeValue,
                barcodeType: this.barcodeFormat
            });
            
            this.dispatchToast('Success', 'Barcode saved to Salesforce', 'success');
            let resultJson = await generateDocument({
                "recordId": this.recordId,
                "templateId" : 'a03Dn00000HxTNCIA3'
            });

            let result = JSON.parse(resultJson);
            let payload = {};
            payload.recordId = this.recordId;
            payload.fileName = result.attachmentName;
            payload.contentDocumentId = result.contentDocumentId;
            payload.sdocId = result.id;
            payload.createdDate = result.createdDate;
            payload.templateId = result.templateId;
            payload.allowEdit = false;
            payload.ssignEnabled = false;
            payload.numTemplates = 1;
            payload.status='COMPLETED';
            publish(this.messageContext, DocGenResultMC, payload);
            this.dispatchToast('Success', 'Document generated !!!! ', 'success');
            this.isLoading = false;
        };
        
        img.src = dataURL;
    }

    dispatchToast(title, message, variant) {
        const toastEvent = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant
        });
        this.dispatchEvent(toastEvent);
    }

}