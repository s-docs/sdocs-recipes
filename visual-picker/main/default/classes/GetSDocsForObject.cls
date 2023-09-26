public with sharing class GetSDocsForObject {

    @AuraEnabled
    public static List<ObjectDocument> getDocumentsForRecord(String recordId){
        System.debug('>>>>>>>>> in getDocumentsForRecord');
        Map<Id,ObjectDocument> docList = new Map<Id,ObjectDocument>();
        List<ObjectDocument> finalList = new List<ObjectDocument>();
        Map<Id,Id> contentDocIds = new Map<Id,Id>();
        for(SDOC__SDoc__c theDoc : [    select  Id,  Name, SDOC__File_ID__c, SDOC__Attachment_Name__c,
                                                SDOC__Document_Format__c,CreatedDate
                                        from SDOC__SDoc__c
                                        where   SDoc__ObjectID__c= :recordId])
        {
            ObjectDocument objDoc = new ObjectDocument(theDoc.Id,theDoc.Name,theDoc.SDOC__Document_Format__c,theDoc.CreatedDate);
            docList.put(theDoc.Id,objDoc);
            contentDocIds.put(theDoc.SDOC__File_ID__c,theDoc.Id);
        }
        System.debug('>>>>>>>>> docList.size() = '+ docList.size());
        for(ContentDocument cDoc : [select  Id, LatestPublishedVersionId, ContentSize, Title
                                    from    ContentDocument
                                    where Id in : contentDocIds.keySet()
                                    order by CreatedDate desc]
        )
        {
            ObjectDocument objDoc = docList.get(contentDocIds.get(cDoc.Id));
            objDoc.fileSize=Math.round(cDoc.ContentSize / 1024);
            objDoc.fileVersionId=cDoc.LatestPublishedVersionId;
            objDoc.fileId=cDoc.Id;
            objDoc.name = cDoc.Title;
            objDoc.thumbnailImageUrl=   '/sfc/servlet.shepherd/version/renditionDownload?rendition=thumb120by90&versionId='+
                                        cDoc.LatestPublishedVersionId+
                                        '&operationContext=CHATTER&contentId='+cDoc.Id;
            finalList.add(objDoc);

        }
        System.debug('>>>>>>>>> finalList.size() = '+ finalList.size());
        return finalList;
    }       

    @AuraEnabled
    public static List<Template> getTemplatesForObject(String objectApiName){
        List<Template> finalList = new List<Template>();
        Integer tempCount = 0;
        for(SDOC__SDTemplate__c template : [   select  Id, Name, SDOC__Template_Format__c, SDOC__Description__c,
                                                    SDOC__Base_Object__c ,CreatedDate
                                            from SDOC__SDTemplate__c
                                            where   SDOC__Base_Object__c= :objectApiName])
        {
            tempCount++;
            Template temp = new Template(template.Id,template.Name,template.SDOC__Description__c,template.CreatedDate);
            temp.enabled=(Math.mod(tempCount,2)==0 ?false:true);
            finalList.add(temp);

        }
        System.debug('>>>>>>>>> finalList.size() = '+ finalList.size());
        return finalList;
    } 

    public class Template{

        @AuraEnabled
        public String Id {get; set;}

        @AuraEnabled
        public String name {get; set;}
        
        @AuraEnabled
        public String description {get; set;}
        
        
        @AuraEnabled
        public Datetime createdAt {get; set;}

        @AuraEnabled
        public Boolean enabled {get; set;}

        public Template(String templateId, String name, String description,Datetime createaAt)
        {
            this.Id=templateId;
            this.name=name;
            this.description=description;
            this.createdAt=createaAt;
        }
    }
    public class ObjectDocument{

        @AuraEnabled
        public String sDocId {get; set;}

        @AuraEnabled
        public String name {get; set;}
        
        @AuraEnabled
        public String format {get; set;}
        
        @AuraEnabled
        public Long fileSize {get; set;}
        
        @AuraEnabled
        public Datetime createdAt {get; set;}

        @AuraEnabled
        public String fileVersionId {get; set;}

        @AuraEnabled
        public String fileId {get; set;}

        @AuraEnabled
        public string thumbnailImageUrl;

        public ObjectDocument(String sDocId, String name, String format,Datetime createaAt)
        {
            this.sDocId=sDocId;
            this.name=name;
            this.format=format;
            this.createdAt=createaAt;
        }
    }
}