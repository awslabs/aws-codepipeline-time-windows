var aws = require('aws-sdk');
var codepipeline = new aws.CodePipeline();
var ddb = new aws.DynamoDB.DocumentClient();

const PIPELINE_APPROVAL_DDB_TABLE = "TimeWindowDemo-PipelineApprovals";

exports.handler = (event, context, callback) => {

  var cleanUpFinishedApproval = function(approvalToken) {
    return ddb.delete({
      TableName: PIPELINE_APPROVAL_DDB_TABLE,
      Key: {
        ApprovalToken: approvalToken
      }
    }).promise();
  };

  var approveTimeWindow = function(approval) {
    var approvalResult = {
      pipelineName: approval.pipelineName,
      stageName: approval.stageName,
      actionName: approval.actionName,
      token: approval.token,
      result: {
        status: 'Approved',
        summary: 'Time window open. Action approved at ' + new Date();
      }
    };

    console.log("Approving time window for approval token: " + approvalResult.token);

    return new Promise(function(resolve, reject) {
      codepipeline.putApprovalResult(approvalResult, function(err, data) {
        cleanUpFinishedApproval(approvalResult.token).then(function() {
          if (err) {
            console.log("Error putting approval result: " + JSON.stringify(err));
            reject(err);
          } else {
            resolve(data);
          }
        }, function(err) {
          console.log("Error deleting the record: " + JSON.stringify(err));
          reject(err);
        });
      });
    });
  };

  var evaluateTimeWindow = function(approvalToken, timeWindowConfig) {
    console.log("Evaluating time window configuration: " + JSON.stringify(timeWindowConfig) + " for approval token: " + approvalToken);

    // All dates and time configurations are assumed to be in UTC.
    var now = new Date();
    var isTimeWindowOpen = true;

    // In real world scenarios, this data should be retrieved
    // dynamically from a central service.
    if (timeWindowConfig.blackDayDates) {
      timeWindowConfig.blackDayDates.forEach(function(date) {
        var blackDayDate = new Date(date);
        if (blackDayDate.getUTCFullYear() === now.getUTCFullYear() && blackDayDate.getUTCMonth() === now.getUTCMonth() && blackDayDate.getUTCDate() === now.getUTCDate()) {
          console.log("Time window is closed due to black day: " + date + " for approval token: " + approvalToken);
          isTimeWindowOpen = false;
        }
      });
    } else if (timeWindowConfig.window) {
      if (now.getUTCHours() < timeWindowConfig.window.opens || now.getUTCHours() > timeWindowConfig.window.closes) {
        console.log("Time window is closed because current time falls outside of open window configuration for approval token: " + approvalToken);
        isTimeWindowOpen = false;
      }
    } else {
      console.log("There is no time window configuration specified. Considering current time window as open.");
    }
    return isTimeWindowOpen;
  };

  var processRecord = function(record) {
    var timeWindowConfig = JSON.parse(record.ApprovalContent.customData);
    if (evaluateTimeWindow(record.ApprovalToken, timeWindowConfig)) {
      return approveTimeWindow(record.ApprovalContent);
    } else {
      return Promise.resolve();
    };
  };

  var processRecords = function(data) {
    var processRecordPromises = [];

    data.Items.forEach(function(record) {
      processRecordPromises.push(processRecord(record));
    });

    return new Promise(function(resolve, reject) {
      Promise.all(processRecordPromises)
        .then(function() {
          // continue scanning if we have more records
          if (typeof data.LastEvaluatedKey != "undefined") {
            console.log("Scanning for more...");
            resolve(onScanPromise(ddb.scan({
              TableName: PIPELINE_APPROVAL_DDB_TABLE,
              ExclusiveStartKey: data.LastEvaluatedKey
            }).promise()));
          } else {
            resolve();
          }
        }).catch(function(err) {
          reject(err);
        });
    });
  };

  var onScanPromise = function(scanPromise) {
    return scanPromise.then(function(data) {
      return processRecords(data);
    });
  };

  onScanPromise(ddb.scan({
      TableName: PIPELINE_APPROVAL_DDB_TABLE
    }).promise())
    .then(function() {
      callback(null, "Successfully processed all time window approval requests.");
    }).catch(function(err) {
      callback(err, "Error processing time window approval requests.");
    });
};
