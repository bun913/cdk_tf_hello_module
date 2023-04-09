import { Construct } from "constructs";
import { App, TerraformStack, Token, Fn } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { Vpc } from "./.gen/modules/vpc";
import { ConnectableInstance } from "./modules/connectableInstance";

class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);
    const projectName = "HelloCDKTF";
    new AwsProvider(this, "aws", {
      region: "ap-northeast-1",
      defaultTags: [
        {
          tags: {
            project: projectName,
            terraform: "true",
          },
        },
      ],
    });

    // terraform registroyのモジュールを利用してみる
    const vpc = new Vpc(this, "helloVPC", {
      cidr: "10.30.0.0/16",
      name: projectName,
      manageDefaultNetworkAcl: false,
      azs: ["ap-northeast-1a", "ap-northeast-1c"],
      privateSubnets: ["10.30.1.0/24", "10.30.2.0/24"],
      publicSubnets: ["10.30.11.0/24", "10.30.12.0/24"],
      enableDnsHostnames: true,
      enableDnsSupport: true,
      enableNatGateway: true,
    });


    // 分割したファイルを使ってみる
    const subnetIdList = Token.asList(vpc.privateSubnetsOutput);
    const connectableInstance = new ConnectableInstance(
      this,
      vpc,
      // vpc.privateSubnetsOutput[0] ではうまく動作しない
      Fn.element(subnetIdList, 0)
      // もしくは以下の書き方でもOKでした
      // `\${${vpc.privateSubnetsOutput}[0]}`
      // `\${element(${vpc.privateSubnetsOutput}, 0)}`
    );
    connectableInstance.createResources();
  }
}

const app = new App();
new MyStack(app, "hello");
app.synth();
