/*!
     * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
     * License: Public
*/ 

//Mutual of Enumclaw 
//
//Matthew Hengl and Jocelyn Borovich - 2019 :) :)
//
//Main file that controls remediation and notifications for all CloudTrail changes. 
//Remediates actions when possible or necessary based on launch type and tagging. Then, notifies the user/security.    

//Make sure to that the master.invalid call does NOT have a ! infront of it
//Make sure to delete or comment out the change in the process.env.environtment

import * as AWS from 'aws-sdk';
AWS.config.update({region: process.env.region});
import {label} from 'epsagon';
import {Master, path} from 'aws-automated-master-class/MasterClass';
const master = new Master();
let s3 = new AWS.S3();

let callRemediate = remediate;
let found = false;

// Only Used for testing purposes
setS3Function = (value, funct) => {
    s3[value] = funct;
};

export const handler = async function handleEvent(event){

     console.log(JSON.stringify(event));
     path.p = 'Path: \nEntered handleEvent';

     try{
          event = master.devTest(event);  
          //check if there is an error in the log
          if(master.errorInLog(event)){
               console.log(path.p);
               return;
          }

          //Checks if the log came from this function, quites the program if it does.
          if(master.selfInvoked(event)){
               console.log(path.p);
               return;
          }

          console.log(`Event action is ${event.detail.eventName}-----------------------`);

          //if(master.checkKeyUser(event, 'bucketName')){
               //change this for when you're not testing in snd.
              if(master.invalid(event)){
                   console.log('Calling remediate');
                   await master.notifyUser(event, await callRemediate(event), 'Group');
              }
          //}
          // delete path.p;
     }catch(e){
          console.log(e);
          path.p += '\nERROR';
          console.log(path.p);
          // delete path.p;
          return e;
     }
     console.log(path.p);
     delete path.p;
};

async function remediate(event){
     path.p += '\nEntered the remediation function';

     const erp = event.detail.requestParameters;
     let results = master.getResults(event, {ResourceName: erp.bucketName});
     let params = { Bucket: erp.bucketName };

     try{
          if (results.Action == 'PutAccountPublicAccessBlock' || results.Action == 'PutBucketPublicAccessBlock'){
               path.p += '\nSettingBlockAcces';
               //let tagCheck = await s3.getBucketTagging(params).promise();
               //console.log(tagCheck);
               //console.log('Looking through the array to find the correct tag');
               //tagCheck.TagSet.forEach((element) => {
               //if(element.Key.toLowerCase() == 'private' && element.Value.toLowerCase() == 'true'){
                    console.log('Calling settingBlockAccess');
                    //found = true;
                    //if(process.env.run == 'false'){
                    await settingBlockAccess(params, results);
                    //if(found == true){
                    //results.Reason = 'Improper Launch';
                    if(results.Response == 'Remediation could not be performed'){
                         delete results.Reason;
                    }
                    path.p += '\nRemediation was finished, notifying user now';
                    await master.notifyUser(event, results, 'S3 Bucket');
               //}
          }
          else{
               console.log('Unexpected Action Found');
               path.p += '\nUnexpected Action Found';
          }
          //results.Response = 'Tags adjusted';
     }catch(e){
          console.log(e);
          path.p += '\nERROR';
          return e;
     };  
     return results;
};

async function settingBlockAccess(params, results){
     params.PublicAccessBlockConfiguration = {
          BlockPublicAcls: true,
          BlockPublicPolicy: true,
          IgnorePublicAcls: true,
          RestrictPublicBuckets: false
     }
     if (results.Action == 'PutAccountPublicAccessBlock'){
          //Override Remediation Control. Only used for testing purposes
          await overrideFunction('PutAccountPublicAccessBlock', params, results);
     //     await s3.PutAccountPublicAccessBlock(params).promise();
     }
     else{ // if (results.Action == 'PutBucketPublicAccessBlock')
          //Override Remediation Control. Only used for testing purposes
          await overrideFunction('PutAccountPublicAccessBlock', params, results);
          params.PublicAccessBlockConfiguration.RestrictPublicBuckets = true;
          await overrideFunction('PutBucketPublicAccessBlock', params, results);
     };
     path.p += '\nBlock accesses set to private';
     delete params.PublicAccessBlockConfiguration;
};

async function overrideFunction(apiFunction, params, results){
     console.log('process.env.run' + process.env.run + ' ' + apiFunction);
     if(process.env.run == 'false'){
          label('remediate','true');
          console.log('About to overide setttingsChange');
       await setS3Function(apiFunction, (params) => {
         console.log(`Overriding ${apiFunction}`);
         return {promise: () => {}};
       });
     }
     await s3[apiFunction](params).promise();
   };
  
 
export { remediate };

export function setS3Function(value, funct){
     s3[value] = funct;
};
//exports.setHandler = (funct) => {
//     callHandler = funct;
//};
export function setRemediate(funct){
callRemediate = funct;
};
 
/*
Triggers for the lambda function:
CreateBucket
PutBucketAcl

After being triggered:
Checks to see if it has the correct tag to change the block to private
Check to see if the block is already private
If not, then change it to private
If so, stop program
*/