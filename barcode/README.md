# Generating bar codes and inserting into an S-Docs document


## Background

Many a times there are scnearios where cusotmers need to generate barcodes or QRCodes and include them as part of the documents generated via S-Docs. Currently customers are having to generate the bar code and then upload them manually.


## Use cases

- Loan applications
- Claim applications
- Any kind of forms that need the ability for easy OCR or scanning

## Design

Because S-Docs is native to salesforce, we want to continue to have the same principle for supporting this use case. Modern browsers are capable of rendering SVG images and also have the capability to convert SVG images into PNG images. 

The high level approach for this solution is:

### 1. Use a open source JavaScript library to create the barcode. 

This example uses [`JSBarcode`](https://github.com/lindell/JsBarcode)

The `barCodeGenerator` lightning web component wraps `JSBarcode` and generates a bar code from a value that is passed into that component. The value being passed can be pull from the corresponding salesforce record. 

For demonstration purposes, this component is developed as visual component with a button to generate the bar code. This can be modified to be a component that has no UI and checks if a barcode was previously generated and based on that generate the barcode. 

Below is the code snippet that does the barcode generation

```
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
    
    ...

```

### 2. Save the barcode to salesforce as a file associated to the record.

Once the barcode is generated, you can use standard JavaScript browser methods to convert the SVG element to a PNG image. Once a PNG image is available, this can be saved to salesforce as a file. Below is the code snippet that gets does the SVG-to-PNG conversion and save to salesforce.

```

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
```

### 3. Invoke the `SDOC.DocumentSDK` to generate the document using an `SDOC.SDTemplate`

Once the image is stored in salesforce, you can invoke the `generateDoc` or the `DocumentSDK` methods avaialble [here](https://kb.sdocs.com/knowledge-base/sdocs/generating-documents/s-docs-software-development-kit-documentsdk/) to generate a document using the appropriate template. Below is the code snippet that invokes the SDK.

```
let resultJson = await generateDocument({
    "recordId": this.recordId,
    "templateId" : 'a03Dn00000HxTNCIA3'
});
```

*Note:*: You should make sure the SDocs template is referring to the image that has the barcode. Refer to (https://kb.sdocs.com/knowledge-base/sdocs/images/embed-static-images/) for examples.

### 4. [OPTIONAL] Refresh the SDocs Documents Lightning web component with the generated document

If you are using the standard `Documents` lightning web component on your record page you can refresh the list by sending an event with specific details. Below snippet of code does that eventing.

```
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
```

### Assumptions

A browser is needed in order to generate the barcode and save to salesforce.  The recommendation is that you make the `barcodeGenerator` a non visual component so that the user doesn't know that a barcode is being generated. 

Once the image is saved, the document can be generated via the `DocumentSDK` or other automation methods that S-Docs supports.
