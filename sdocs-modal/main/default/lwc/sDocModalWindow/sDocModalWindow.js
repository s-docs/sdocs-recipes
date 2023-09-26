import { LightningElement,api } from 'lwc';
import fetchVersionsForDocument from "@salesforce/apex/SDocModalController.getVersionsForDocument";

export default class SDocModalWindow extends LightningElement {

    @api displayMode;
    @api contentDocumentId;
    isModalClosed=false;
    modalStyleCss = 'slds-modal slds-fade-in-open slds-modal_large';
    backdropCss = 'slds-backdrop slds-backdrop_open';
    documentVersions;
    currentSelectedVersion=null;

    async connectedCallback(){
        if(this.contentDocumentId){
            this.documentVersions = await fetchVersionsForDocument({
                "contentDocumentId":this.contentDocumentId
            });
            this.currentSelectedVersion=this.documentVersions[0].contentVersionId;
            this.template.querySelector("c-pdf-viewer").updateContentVersionId (this.currentSelectedVersion);
            console.log(`Fetched ${this.documentVersions.length} versions`);
        }
    }
    closeOrCancelModal(){
        this.isModalClosed=true;
        if(this.isModalClosed){
            this.modalStyleCss='slds-modal';
            this.backdropCss='slds-backdrop'
        }
    }

    loadVersionInPdfViewer(event){
        let cVerId = event.detail.contentVersionId;
        this.currentSelectedVersion=cVerId;
        this.template.querySelector("c-pdf-viewer").updateContentVersionId (cVerId);
    }
    
    isVersionMode(){
        return this.displayMode && this.displayMode === 'versions';
    }

    showPdfViewer(){
        return this.currentSelectedVersion!=null;
    }
}