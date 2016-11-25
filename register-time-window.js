var aws = require("aws-sdk");
var ddb = new aws.DynamoDB.DocumentClient();
const PIPELINE_APPROVAL_DDB_TABLE = "TimeWindowDemo-PipelineApprovals";

exports.handler = (event, context, callback) => {

  if (event.Records[0]) {
    var notificationData = JSON.parse(event.Records[0].Sns.Message);
    ddb.put({
      TableName: PIPELINE_APPROVAL_DDB_TABLE,
      Item: {
        ApprovalToken: notificationData.approval.token,
        ApprovalContent: notificationData.approval
      }
    }, function(err, data) {
      if (err) {
        var message = "Unable to register pipeline approval request. Error JSON:" + JSON.stringify(err);
        console.error(message);
        callback(error, message);
      } else {
        var message = "Successfully registered pipeline approval request: " + JSON.stringify(notificationData.approval);
        console.log(message);
        callback(null, message);
      }
    });
  } else {
    callback(null);
  }
};
