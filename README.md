# AWS CodePipeline Time Windows

The resources in this repository will help you setup required AWS resources
for building time window and black days based approvals in AWS CodePipeline.

## Prerequisites

1. Create an AWS CodeCommit repository with any name of your preference using AWS console or CLI. This document assumes
that the name you chose is `aws-codepipeline-time-windows`. 
2. Clone the content of this repository to AWS CodeCommit repository created in the above step.
3. Download AWS CodeDeploy sample application for Linux using this [link](https://s3.amazonaws.com/aws-codedeploy-us-east-1/samples/latest/SampleApp_Linux.zip).
4. Upload this application in a version enabled Amazon S3 bucket you own. Note down both the bucket name and object key. 
You will need in later steps.
 
## Steps 
1. Clone this GitHub repository or AWS CodeCommit repository created above in your local workspace.
2. If you chose a different AWS CodeCommit repository name, replace `ParameterValue` in `setup-timewindow-resources-stack-parameters.json` file with the name you chose.
3. Update `time-window-demo-resources-parameters.json` file to replace parameter values:
    * `CodeDeploySampleAppS3BucketName`: Amazon S3 bucket name from step 4 in Prerequisites section.
    * `CodeDeploySampleAppS3ObjectKey` : The object key from step 4 in Prerequisites section.
    * `TimeWindowConfiguration` : Time window configuration which specifies window opening and closing times (UTC), and black day dates in JSON string format. Both `window` and `blackDayDates` parameters are optional.
    * `KeyPairName`: Amazon EC2 key pair name.
4. Create a new CloudFormation stack using AWS CloudFormation template `setup-time-window-resources-stack.yml` 
and parameter file `setup-timewindow-resources-stack-parameters.json`. 
    * See this [article](https://aws.amazon.com/blogs/devops/passing-parameters-to-cloudformation-stacks-with-the-aws-cli-and-powershell/) for the details on how to pass parameters file using CLI.
5. Step 4 will create an AWS CodePipeline named `SetupTimeWindowsDemoResources-Pipeline`. This pipeline will use AWS CloudFormation integration with AWS CodePipeline to publish AWS Lambda functions to Amazon S3 and create a new stack using template `time-window-demo-resources.yml` that contains actual AWS resources used in demo including a new AWS CodePipeline named `TimeWindowsDemoPipeline`. 
6. Above step will set up following things:
    * A new AWS CodePipeline named `TimeWindowsDemoPipeline` with a stage that contains Approval and AWS CodeDeploy actions. Approval action specifies an Amazon SNS topic to which notifications are sent when this action runs. 
    * An AWS Lambda function (`register-time-window.js`) is subscribed to this topic which registers this request in an Amazon DynamoDB table.
    * AWS Lambda function (`process-time-windows.js`) that runs periodically and scans the table for open approval requests. If the current time is open as per time window configuration specified in `TimeWindowsDemoPipeline` pipeline, it approves the request using AWS CodePipeline API `PutApprovalResult` which allows the pipeline run to proceed to the next AWS CodeDeploy stage.

## License
This plugin is open sourced and licensed under Apache 2.0. See the LICENSE file for more information.
