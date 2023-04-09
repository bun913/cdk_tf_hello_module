import { Construct } from "constructs";
import { IamRole } from "@cdktf/provider-aws/lib/iam-role";
import { DataAwsIamPolicyDocument } from "@cdktf/provider-aws/lib/data-aws-iam-policy-document";
import { Instance } from "@cdktf/provider-aws/lib/instance";
import { DataAwsAmi } from "@cdktf/provider-aws/lib/data-aws-ami";
import { Vpc } from "../.gen/modules/vpc";
import { SecurityGroup } from "@cdktf/provider-aws/lib/security-group";
import { IamInstanceProfile } from "@cdktf/provider-aws/lib/iam-instance-profile";

export class ConnectableInstance {
  private scope: Construct;
  private vpc: Vpc;
  private subnetId: string;

  constructor(scope: Construct, vpc: Vpc, subnetId: string) {
    this.scope = scope;
    this.vpc = vpc;
    this.subnetId = subnetId;
  }

  public createResources(): Instance {
    const role = this.createRole();
    const instance = this.createInstance(role);
    return instance;
  }

  private createRole(): IamRole {
    const role = new IamRole(this.scope, "connectableInstanceRole", {
      name: "connectableInstanceRole",
      assumeRolePolicy: this.getAssumeRolePolicyDocument().json,
      managedPolicyArns: [
        "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore",
      ],
    });
    return role;
  }

  private createInstance(role: IamRole): Instance {
    // get latest amazon linux 2 ami
    const ami = new DataAwsAmi(this.scope, "connectableInstanceAmi", {
      mostRecent: true,
      owners: ["amazon"],
      filter: [
        {
          name: "name",
          values: ["amzn2-ami-hvm-*-x86_64-gp2"],
        },
      ],
    });
    const sg = this.createEgreeSG();
    const instanceProfile = new IamInstanceProfile(
      this.scope,
      "connectableInstanceProfile",
      {
        name: "connectableInstanceProfile",
        role: role.name,
      }
    );
    const instance = new Instance(this.scope, "connectableInstance", {
      ami: ami.id,
      instanceType: "t2.micro",
      iamInstanceProfile: instanceProfile.name,
      vpcSecurityGroupIds: [sg.id],
      subnetId: this.subnetId,
      tags: {
        Name: "connectableInstance",
      },
    });
    return instance;
  }

  private getAssumeRolePolicyDocument(): DataAwsIamPolicyDocument {
    return new DataAwsIamPolicyDocument(
      this.scope,
      "connectableInstanceAssumeRolePolicyDocument",
      {
        statement: [
          {
            actions: ["sts:AssumeRole"],
            principals: [
              {
                identifiers: ["ec2.amazonaws.com"],
                type: "Service",
              },
            ],
          },
        ],
      }
    );
  }

  private createEgreeSG(): SecurityGroup {
    const egress = new SecurityGroup(this.scope, "connectableInstanceEgress", {
      name: "connectableInstanceEgress",
      vpcId: this.vpc.vpcIdOutput,
      ingress: [],
      egress: [
        {
          fromPort: 0,
          toPort: 0,
          protocol: "-1",
          cidrBlocks: ["0.0.0.0/0"],
        },
      ],
      tags: {
        Name: "connectableInstanceEgress",
      },
    });
    return egress;
  }
}
