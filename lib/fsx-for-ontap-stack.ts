import {
  Stack,
  StackProps,
  CfnDynamicReference,
  CfnDynamicReferenceService,
  aws_ec2 as ec2,
  aws_secretsmanager as secretsmanager,
  aws_fsx as fsx,
  aws_iam as iam,
} from "aws-cdk-lib";
import { Construct } from "constructs";

export class FsxForOntapStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Context
    const vpcId = this.node.tryGetContext("vpcID");
    const dnsIps = this.node.tryGetContext("dnsIPs");
    const serviceAccountSecretName = this.node.tryGetContext(
      "serviceAccountSecretName"
    );

    // VPC
    const vpc = ec2.Vpc.fromLookup(this, "VPC", {
      vpcId,
    });

    // ID of the isolated subnet where the FSx for ONTAP file system is to be deployed
    const isolatedSubnetIds = vpc.selectSubnets({
      subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
    }).subnetIds;
    if (isolatedSubnetIds.length < 2) return;

    // ID of Route Table used in VPC
    const routeTableIds = [
      ...new Set(
        [
          ...vpc.publicSubnets,
          ...vpc.privateSubnets,
          ...vpc.isolatedSubnets,
        ].map((subnet) => {
          return subnet.routeTable.routeTableId;
        })
      ),
    ];

    // Security Group used by FSx for ONTAP file system
    const fileSystemSecurityGroup = new ec2.SecurityGroup(
      this,
      "Security Group of FSx for ONTAP file system",
      {
        vpc,
      }
    );

    const allowCidrBlock = "10.0.0.0/8";

    // Ref : https://docs.aws.amazon.com/fsx/latest/ONTAPGuide/limit-access-security-groups.html
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(allowCidrBlock),
      ec2.Port.icmpPing(),
      "Pinging the instance"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(allowCidrBlock),
      ec2.Port.tcp(22),
      "SSH access to the IP address of the cluster management LIF or a node management LIF"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(allowCidrBlock),
      ec2.Port.tcp(111),
      "Remote procedure call for NFS"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(allowCidrBlock),
      ec2.Port.tcp(135),
      "Remote procedure call for CIFS"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(allowCidrBlock),
      ec2.Port.tcp(139),
      "NetBIOS service session for CIFS"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(allowCidrBlock),
      ec2.Port.tcpRange(161, 162),
      "Simple network management protocol (SNMP)"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(allowCidrBlock),
      ec2.Port.tcp(443),
      "ONTAP REST API access to the IP address of the cluster management LIF or an SVM management LIF"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(allowCidrBlock),
      ec2.Port.tcp(445),
      "Microsoft SMB/CIFS over TCP with NetBIOS framing"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(allowCidrBlock),
      ec2.Port.tcp(635),
      "NFS mount"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(allowCidrBlock),
      ec2.Port.tcp(749),
      "Kerberos"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(allowCidrBlock),
      ec2.Port.tcp(2049),
      "NFS server daemon"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(allowCidrBlock),
      ec2.Port.tcp(3260),
      "iSCSI access through the iSCSI data LIF"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(allowCidrBlock),
      ec2.Port.tcp(4045),
      "NFS lock daemon"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(allowCidrBlock),
      ec2.Port.tcp(4046),
      "Network status monitor for NFS"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(allowCidrBlock),
      ec2.Port.tcp(10000),
      "Network data management protocol (NDMP) and NetApp SnapMirror intercluster communication"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(allowCidrBlock),
      ec2.Port.tcp(11104),
      "Management of NetApp SnapMirror intercluster communication"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(allowCidrBlock),
      ec2.Port.tcp(11105),
      "SnapMirror data transfer using intercluster LIFs"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(allowCidrBlock),
      ec2.Port.udp(111),
      "Remote procedure call for NFS"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(allowCidrBlock),
      ec2.Port.udp(135),
      "Remote procedure call for CIFS"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(allowCidrBlock),
      ec2.Port.udp(137),
      "NetBIOS name resolution for CIFS"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(allowCidrBlock),
      ec2.Port.udp(139),
      "NetBIOS service session for CIFS"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(allowCidrBlock),
      ec2.Port.udpRange(161, 162),
      "Simple network management protocol (SNMP)"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(allowCidrBlock),
      ec2.Port.udp(635),
      "NFS mount"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(allowCidrBlock),
      ec2.Port.udp(2049),
      "NFS server daemon"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(allowCidrBlock),
      ec2.Port.udp(4045),
      "NFS lock daemon"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(allowCidrBlock),
      ec2.Port.udp(4046),
      "Network status monitor for NFS"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(allowCidrBlock),
      ec2.Port.udp(4049),
      "NFS quota protocol"
    );

    // Secret of FSx for ONTAP file system
    const fileSystemSecret = new secretsmanager.Secret(
      this,
      "Secret of FSx for ONTAP file system",
      {
        secretName: "/fsx-for-ontap/file-system",
        generateSecretString: {
          generateStringKey: "password",
          passwordLength: 32,
          requireEachIncludedType: true,
          secretStringTemplate: '{"userName": "fsxadmin"}',
        },
      }
    );

    // Secret of FSx for ONTAP SVM
    const svmSecret = new secretsmanager.Secret(
      this,
      "Secret of FSx for ONTAP SVM",
      {
        secretName: "/fsx-for-ontap/svm",
        generateSecretString: {
          generateStringKey: "password",
          passwordLength: 32,
          requireEachIncludedType: true,
          secretStringTemplate: '{"userName": "vsadmin"}',
        },
      }
    );

    // FSx for ONTAP file system
    const fsxForOntapFileSystem = new fsx.CfnFileSystem(
      this,
      "FSx for ONTAP file system",
      {
        fileSystemType: "ONTAP",
        subnetIds: isolatedSubnetIds,
        ontapConfiguration: {
          deploymentType: "MULTI_AZ_1",
          automaticBackupRetentionDays: 7,
          dailyAutomaticBackupStartTime: "16:00",
          diskIopsConfiguration: {
            mode: "AUTOMATIC",
          },
          endpointIpAddressRange: "172.31.255.0/24",
          fsxAdminPassword: new CfnDynamicReference(
            CfnDynamicReferenceService.SECRETS_MANAGER,
            `${fileSystemSecret.secretArn}:SecretString:password`
          ).toString(),
          preferredSubnetId: isolatedSubnetIds[0],
          routeTableIds: routeTableIds,
          throughputCapacity: 128,
          weeklyMaintenanceStartTime: "6:17:00",
        },
        securityGroupIds: [fileSystemSecurityGroup.securityGroupId],
        storageCapacity: 1024,
        storageType: "SSD",
        tags: [
          {
            key: "Name",
            value: "fsx-for-ontap-file-system-multi-az",
          },
        ],
      }
    );

    // FSx for ONTAP SVM
    const svmName = "fsx-for-ontap-svm-001";
    const svm = new fsx.CfnStorageVirtualMachine(this, "SVM", {
      fileSystemId: fsxForOntapFileSystem.ref,
      name: svmName,
      activeDirectoryConfiguration: {
        netBiosName: "SVM-001",
        selfManagedActiveDirectoryConfiguration: {
          dnsIps,
          domainName: new CfnDynamicReference(
            CfnDynamicReferenceService.SECRETS_MANAGER,
            `${serviceAccountSecretName}:SecretString:domainName`
          ).toString(),
          fileSystemAdministratorsGroup: new CfnDynamicReference(
            CfnDynamicReferenceService.SECRETS_MANAGER,
            `${serviceAccountSecretName}:SecretString:fileSystemAdministratorsGroup`
          ).toString(),
          organizationalUnitDistinguishedName: new CfnDynamicReference(
            CfnDynamicReferenceService.SECRETS_MANAGER,
            `${serviceAccountSecretName}:SecretString:organizationalUnitDistinguishedName`
          ).toString(),
          userName: new CfnDynamicReference(
            CfnDynamicReferenceService.SECRETS_MANAGER,
            `${serviceAccountSecretName}:SecretString:userName`
          ).toString(),
          password: new CfnDynamicReference(
            CfnDynamicReferenceService.SECRETS_MANAGER,
            `${serviceAccountSecretName}:SecretString:password`
          ).toString(),
        },
      },
      rootVolumeSecurityStyle: "MIXED",
      svmAdminPassword: new CfnDynamicReference(
        CfnDynamicReferenceService.SECRETS_MANAGER,
        `${svmSecret.secretArn}:SecretString:password`
      ).toString(),
      tags: [
        {
          key: "Name",
          value: svmName,
        },
      ],
    });

    // FSX for ONTAP volume
    const volumePrefix = "fsx_for_ontap_volume_";
    new fsx.CfnVolume(this, "NFS Volume", {
      name: `${volumePrefix}nfs`,
      ontapConfiguration: {
        junctionPath: "/nfs",
        sizeInMegabytes: "1024",
        storageEfficiencyEnabled: "true",
        storageVirtualMachineId: svm.ref,
        securityStyle: "UNIX",
        tieringPolicy: {
          coolingPeriod: 31,
          name: "AUTO",
        },
      },
      tags: [
        {
          key: "Name",
          value: `${volumePrefix}nfs`,
        },
      ],
      volumeType: "ONTAP",
    });

    new fsx.CfnVolume(this, "SMB Volume", {
      name: `${volumePrefix}smb`,
      ontapConfiguration: {
        junctionPath: "/smb",
        sizeInMegabytes: "1024",
        storageEfficiencyEnabled: "true",
        storageVirtualMachineId: svm.ref,
        securityStyle: "NTFS",
        tieringPolicy: {
          coolingPeriod: 31,
          name: "AUTO",
        },
      },
      tags: [
        {
          key: "Name",
          value: `${volumePrefix}smb`,
        },
      ],
      volumeType: "ONTAP",
    });

    // IAM Role
    const ssmIamRole = new iam.Role(this, "SSM IAM Role", {
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "AmazonSSMManagedInstanceCore"
        ),
      ],
    });

    // VPC
    const consumerVPC = new ec2.Vpc(this, "Consumer VPC", {
      cidr: "10.10.0.0/24",
      enableDnsHostnames: true,
      enableDnsSupport: true,
      natGateways: 0,
      maxAzs: 2,
      subnetConfiguration: [
        { name: "Public", subnetType: ec2.SubnetType.PUBLIC, cidrMask: 28 },
      ],
    });

    // VPC Peering
    const vpcPeeringConnection = new ec2.CfnVPCPeeringConnection(
      this,
      "VPC Peering connection",
      {
        peerVpcId: vpcId,
        vpcId: consumerVPC.vpcId,
      }
    );

    // Route to VPC Peering connection
    vpc.isolatedSubnets.map((iSubnet: ec2.ISubnet, index: number) => {
      new ec2.CfnRoute(this, `VPC Route to VPC Peering connection${index}`, {
        routeTableId: iSubnet.routeTable.routeTableId,
        destinationCidrBlock: consumerVPC.vpcCidrBlock,
        vpcPeeringConnectionId: vpcPeeringConnection.ref,
      });
    });
    consumerVPC.publicSubnets.map((iSubnet: ec2.ISubnet, index: number) => {
      new ec2.CfnRoute(
        this,
        `Consumer VPC Route to VPC Peering connection${index}`,
        {
          routeTableId: iSubnet.routeTable.routeTableId,
          destinationCidrBlock: vpc.vpcCidrBlock,
          vpcPeeringConnectionId: vpcPeeringConnection.ref,
        }
      );
    });

    // EC2 Instance
    new ec2.Instance(this, "Consumer EC2 Instance Amazon Linux 2", {
      instanceType: new ec2.InstanceType("t3.micro"),
      machineImage: ec2.MachineImage.latestAmazonLinux({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      }),
      vpc: consumerVPC,
      blockDevices: [
        {
          deviceName: "/dev/xvda",
          volume: ec2.BlockDeviceVolume.ebs(8, {
            volumeType: ec2.EbsDeviceVolumeType.GP3,
          }),
        },
      ],
      propagateTagsToVolumeOnCreation: true,
      vpcSubnets: consumerVPC.selectSubnets({
        subnetType: ec2.SubnetType.PUBLIC,
      }),
      role: ssmIamRole,
    });

    new ec2.Instance(this, "Consumer EC2 Instance Windows Server 2022", {
      instanceType: new ec2.InstanceType("t3.micro"),
      machineImage: ec2.MachineImage.latestWindows(
        ec2.WindowsVersion.WINDOWS_SERVER_2022_JAPANESE_FULL_BASE
      ),
      vpc: consumerVPC,
      blockDevices: [
        {
          deviceName: "/dev/xvda",
          volume: ec2.BlockDeviceVolume.ebs(8, {
            volumeType: ec2.EbsDeviceVolumeType.GP3,
          }),
        },
      ],
      propagateTagsToVolumeOnCreation: true,
      vpcSubnets: consumerVPC.selectSubnets({
        subnetType: ec2.SubnetType.PUBLIC,
      }),
      role: ssmIamRole,
    });
  }
}
