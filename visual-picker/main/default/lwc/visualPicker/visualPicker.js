import { LightningElement,api} from 'lwc';
import getTemplatesForObject   from '@salesforce/apex/GetSDocsForObject.getTemplatesForObject';

export default class VisualPicker extends LightningElement {
    
    @api
    recordId;
    
    @api
    objectApiName;

    templateList;

    selectedTemplates;

    connectedCallback(){
        if(this.recordId){
            getTemplatesForObject({
                "objectApiName":this.objectApiName
            })
            .then(data => {
                if (data) {
                    this.templateList=data;
                    this.selectedTemplates=new Array();
                }
            })
            .catch(error => {
                console.log(error);
            });
        }

    }

}