import {customAlphabet } from 'nanoid'
import {S3Client, PutObjectCommand} from "@aws-sdk/client-s3"
import {getSignedUrl } from "@aws-sdk/s3-request-presigner"

const s3Config = new S3Client({
    region: process.env.AWS_S3_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY!,
    }
}) 

async function uploadFileToS3(file: Buffer, fileName: string, folder: string, type: string) {
	const fileBuffer = file;
    const uniqueCode = customAlphabet("123456789abcdefghijklmnopqrstuvwxyzZA", 10)
	const params = {
		Bucket: process.env.AWS_S3_BUCKET_NAME!,
		Key: `atlaz-lms-v3/b2b/${folder}/${uniqueCode(5)}-${fileName}`,
        Body: fileBuffer,
        ContentDisposition:'inline',
        ContentType: type
        
	}

	const command = new PutObjectCommand(params);
	await s3Config.send(command);
    const signedUrl = await getSignedUrl(s3Config,command, {
        expiresIn: 604800
    })
	return {filename:fileName, url: signedUrl.split("?")[0]};
}

export default uploadFileToS3