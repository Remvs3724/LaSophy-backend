const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");


const serviceAccount = require("./lasophy-4e0ff-firebase-adminsdk-fbsvc-eb75eff8a1.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: "lasophy-4e0ff",
  storageBucket: "lasophy-4e0ff.firebasestorage.app" 
});

const bucket = admin.storage().bucket();
console.log("Uploading to bucket:", bucket.name);

const localFolder = path.join(__dirname, "upload");

function uploadFolder(folderPath, remotePath = "") {
  fs.readdirSync(folderPath).forEach((file) => {
    const fullPath = path.join(folderPath, file);
    const cloudPath = path.join(remotePath, file);

    if (fs.lstatSync(fullPath).isDirectory()) {
      uploadFolder(fullPath, cloudPath); 
    } else {
      bucket.upload(fullPath, {
        destination: cloudPath,
        public: true,
        metadata: {
          cacheControl: "public,max-age=31536000"
        }
      }).then(() => {
        console.log(`Uploaded: ${cloudPath}`);
      }).catch((err) => {
        console.error(` Failed to upload ${cloudPath}`, err);
      });
    }
  });
}

uploadFolder(localFolder);