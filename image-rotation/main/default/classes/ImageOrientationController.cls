public with sharing class ImageOrientationController {
    @AuraEnabled(cacheable=true)
    public static List<String> getBase64ImagesForRecord(Id recordId) {
        List<String> base64Images = new List<String>();
        
        // Fetch images from ContentDocumentLink
        List<ContentDocumentLink> links = [
            SELECT ContentDocument.Id 
            FROM ContentDocumentLink 
            WHERE LinkedEntityId = :recordId
            AND ContentDocument.LatestPublishedVersion.FileType  in ('PNG','JPG','JPEG')
        ];
        
        List<Id> documentIds = new List<Id>();
        for (ContentDocumentLink link : links) {
            documentIds.add(link.ContentDocument.Id);
        }
        
        List<ContentVersion> versions = [
            SELECT Id, VersionData, FileType 
            FROM ContentVersion 
            WHERE ContentDocumentId IN :documentIds 
            AND IsLatest = true
            AND (FileType = 'JPG' OR FileType = 'PNG' OR FileType = 'JPEG')
            LIMIT 10
        ];
        
        for (ContentVersion version : versions) {
            base64Images.add('data:image/' + version.FileType.toLowerCase() + ';base64,' + 
                             EncodingUtil.base64Encode(version.VersionData));
        }
        
        return base64Images;
    }


    @AuraEnabled
    public static void saveCorrectedImage(Id recordId,String base64Image) {
        List<ContentDocumentLink> links = [
            SELECT  ContentDocumentId
            FROM ContentDocumentLink 
            WHERE LinkedEntityId = :recordId
            AND ContentDocument.LatestPublishedVersion.FileType  in ('PNG','JPG','JPEG')
        ];


        ContentDocumentLink cLink = links[0];
        ContentVersion currCVer = [select Title, PathOnClient 
                                    from ContentVersion 
                                    where ContentDocumentId = :cLink.ContentDocumentId];
        // Decode the base64 image
        String base64ImageString = base64Image.substring(base64Image.indexOf(',') + 1);
        Blob imageBlob = EncodingUtil.base64Decode(base64ImageString);

        // Create a new ContentVersion record
        ContentVersion contentVersion = new ContentVersion();
        contentVersion.VersionData = imageBlob;
        contentVersion.Title = 'Reoriented-'+currCVer.Title;
        contentVersion.PathOnClient = 'Reoriented-'+currCVer.PathOnClient;
        insert contentVersion;

        contentVersion = [SELECT Id,ContentDocumentId FROM ContentVersion WHERE Id = :contentVersion.Id];
        ContentDocumentLink newClink = new ContentDocumentLink(
            LinkedEntityId = recordId, 
            ContentDocumentId = contentVersion.ContentDocumentId
        );

        insert newClink;
    }
}