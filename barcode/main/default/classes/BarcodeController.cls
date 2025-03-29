/**
 * BarcodeController
 * Apex controller for saving barcode images to Salesforce
 */
public with sharing class BarcodeController {
    
    /**
     * Saves a barcode image as a ContentVersion record in Salesforce
     * 
     * @param recordId - The ID of the record to associate the barcode with
     * @param barcodeData - The base64 encoded PNG data for the barcode
     * @param barcodeText - The text/value encoded in the barcode
     * @param barcodeType - The type/format of the barcode (CODE128, QR, etc.)
     * @return The ID of the created ContentVersion record
     */
    @AuraEnabled
    public static Id saveBarcode(Id recordId, String barcodeData, String barcodeText, String barcodeType) {
            // Input validation
            if (String.isBlank(barcodeData)) {
                throw new AuraHandledException('Barcode data cannot be empty');
            }
            
            if (!barcodeData.startsWith('data:image/png;base64,')) {
                throw new AuraHandledException('Invalid image data format');
            }
            
            // Extract the base64 part (remove the data URL prefix)
            String base64Data = barcodeData.substring(barcodeData.indexOf(',') + 1);
            
            // Create a ContentVersion record
            ContentVersion cv = new ContentVersion();
            cv.VersionData = EncodingUtil.base64Decode(base64Data);
            cv.Title = 'Barcode_' + barcodeType + '_' + DateTime.now().format('yyyyMMdd_HHmmss');
            cv.PathOnClient = cv.Title + '.png';
            cv.Description = 'Generated barcode: ' + barcodeText + ' (' + barcodeType + ')';
            cv.IsMajorVersion = true;
            
            // Insert the ContentVersion
            insert cv;
            
            // Get the ContentDocumentId
            cv = [SELECT Id, ContentDocumentId FROM ContentVersion WHERE Id = :cv.Id LIMIT 1];
            
            // Create a ContentDocumentLink to associate with the record
            if (recordId != null) {
                ContentDocumentLink cdl = new ContentDocumentLink();
                cdl.ContentDocumentId = cv.ContentDocumentId;
                cdl.LinkedEntityId = recordId;
                cdl.ShareType = 'V'; // V = Viewer, C = Collaborator, I = Inferred
                cdl.Visibility = 'AllUsers';
                
                insert cdl;
            }
            
            return cv.Id;
    }


    @AuraEnabled
    public static String generateDocumentFromTemplate(String recordId, String templateId) {
        String jsonResp = SDOC.DocumentSDK.generateDoc(templateId,recordId);
        System.debug('>>>>>>> theDoc: '+jsonResp);   
        return jsonResp;
    }
}