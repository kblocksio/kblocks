import extern from "./route53.extern";
import { Route53Client, ChangeResourceRecordSetsCommand } from "@aws-sdk/client-route-53";

const client = new Route53Client();

export const _addARecord: extern["_addARecord"] = async (hostedZoneId, domainName, name, ip) => {
  const command = new ChangeResourceRecordSetsCommand({
    HostedZoneId: hostedZoneId,
    ChangeBatch: {
      Changes: [
        {
          Action: "CREATE",
          ResourceRecordSet: {
            Name: `${name}.${domainName}`,
            Type: "A",
            TTL: 300,
            ResourceRecords: [{ Value: ip }],
          },
        },
      ],
    },  
  });

  const response = await client.send(command);
  console.log("A record added successfully:", response);
} 

export const _removeARecord: extern["_removeARecord"] = async (hostedZoneId, domainName, name, ip) => {
  const command = new ChangeResourceRecordSetsCommand({
    HostedZoneId: hostedZoneId,
    ChangeBatch: {
      Changes: [
        {
          Action: "DELETE",
          ResourceRecordSet: {
            Name: `${name}.${domainName}`,
            Type: "A",
            TTL: 300,
            ResourceRecords: [{ Value: ip }], // Placeholder IP, will be ignored for DELETE action
          },
        },
      ],
    },
  });

  try {
    const response = await client.send(command);
    console.log("A record removed successfully:", response);
  
  } catch (error) {
    if (error.message.includes("but it was not found")) {
      console.log("A record not found, skipping removal");
      return;
    }

    console.log(error);
    console.error("Error removing A record:", error);
    throw error;
  }
};