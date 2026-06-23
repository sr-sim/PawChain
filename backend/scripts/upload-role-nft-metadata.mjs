import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const pinataJwt = process.env.PINATA_JWT;

if (!pinataJwt) {
  throw new Error("PINATA_JWT is required.");
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const metadataDir = path.resolve(__dirname, "../metadata/role-nfts");
const envNamesByFile = {
  "donor.json": "DONOR_METADATA_CID",
  "shelter.json": "SHELTER_METADATA_CID",
  "bronze-donor.json": "BRONZE_DONOR_METADATA_CID",
  "silver-donor.json": "SILVER_DONOR_METADATA_CID",
  "gold-donor.json": "GOLD_DONOR_METADATA_CID",
  "hero-donor.json": "HERO_DONOR_METADATA_CID",
};

async function uploadMetadataFile(filename) {
  const filePath = path.join(metadataDir, filename);
  const fileBuffer = await readFile(filePath);
  const formData = new FormData();
  const file = new Blob([fileBuffer], { type: "application/json" });

  formData.append("file", file, filename);
  formData.append(
    "pinataMetadata",
    JSON.stringify({
      name: `pawchain-${filename}`,
    }),
  );

  const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${pinataJwt}`,
    },
    body: formData,
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      `Failed to upload ${filename}: ${result.error?.details ?? result.error ?? response.statusText}`,
    );
  }

  return result.IpfsHash;
}

const files = (await readdir(metadataDir))
  .filter((filename) => filename.endsWith(".json"))
  .sort((a, b) => {
    const order = Object.keys(envNamesByFile);
    return order.indexOf(a) - order.indexOf(b);
  });

const unknownFile = files.find((filename) => !envNamesByFile[filename]);

if (unknownFile) {
  throw new Error(`No env variable mapping configured for ${unknownFile}.`);
}

console.log("Uploading PawChain RoleNFT metadata to Pinata...");

for (const filename of files) {
  const cid = await uploadMetadataFile(filename);
  console.log(`${envNamesByFile[filename]}=${cid}`);
}
