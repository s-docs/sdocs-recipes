public with sharing class SDocModalController {
    @AuraEnabled(cacheable=false)
    public static List<DocumentVersion> getVersionsForDocument(String contentDocumentId) {
        List<DocumentVersion> versionList = new List<DocumentVersion>();
        for(ContentVersion cVer: [  select Id,VersionData,LastModifiedDate,LastModifiedBy.Name,VersionNumber 
                                    from ContentVersion 
                                    where ContentDocumentId=:contentDocumentId
                                    order by VersionNumber desc])
        {
            versionList.add(new DocumentVersion(cVer.VersionNumber, cVer.Id, cVer.LastModifiedDate, cVer.LastModifiedBy.Name));
        }
        return versionList;
        
    }

    public class DocumentVersion{

        @AuraEnabled
        public String version {get; set;}

        @AuraEnabled
        public String contentVersionId {get; set;}

        @AuraEnabled
        public Datetime lastModifiedDate {get; set;}

        @AuraEnabled
        public String lastModifiedBy {get; set;}

        public DocumentVersion(String version, String versionId, Datetime modifiedDate, String modifiedBy){
            this.version=version;
            this.contentVersionId=versionId;
            this.lastModifiedDate=modifiedDate;
            this.lastModifiedBy=modifiedBy;
        }

    }
}