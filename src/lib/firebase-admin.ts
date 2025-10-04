import { initializeApp, getApps, cert, getApp, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const serviceAccount: ServiceAccount = {
  type: 'service_account',
  projectId: 'lingualeap-3535f',
  privateKeyId: 'ad8173d5e2b7e19df2fc8ad5d83763264258eb9a',
  privateKey: `-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQD1Z6LzkNX4C2Vg\nmKhhIgv4iCqgkmXyxz7Z0YTpu30H2QXwHmzIIdQ6nYzL4nCQzYZAsfGnMgq+Pg1U\nalAiZAyC3IwmRJK8SMS/byoKxjeQodMaM/1Owkl1t+Gcr5PBPAOl+RT0p8Ybm9fp\nVUfA5bQFo1nf4w4l37kkW0ERj4x3v+HtXVUYgjT9LL9HSKOTzStNK+a1AVnn1Aay\nGjNBbHoVCdm98knM3A/P6nQhyZZHvHOlaXfv7oWFC0BiWMMqMmTfiMp+XrV8Lu69\nIRCoJO8Y4Dbquu2z8p3Y/HqRqUtfgU5fn1Bb8dV5rZjf2AvSJXm3aA2Ze2R4X/1e\nUC80CWk3AgMBAAECggEAX9Ca+uYt5K7uYgy4kVQtwFfJ7O+8BlJs47a+YlPluU6u\n1tXKO0maB1jEREahFKhqJpBTfag4MZcgtTjdGNBfYiiiP76+W+09hFDu5U4HG91T\nAwQRftK0w9WLrRWQZv37nq3l1LA81UK/xkaZwWLuKtVgnd2VBIyZSOyoNycI/SeW\nWNB9xiuKYxFlSbRwG6d3VtexkiasZEYdVoJCP3z2mK15ulBlnrq9MSj1X0O5LiGG\n82PTZNyC5E1+Y1AKA/lRYE+oCtPUEHq5xvmCOYpA16I92Z1jAVOSSFrORKvdNQCZ\nENJ7rFqgBI7L4ALu0QtqcbpbrPqfhLOXPIRwcpDTYQKBgQD/JfHSs5PidZRq2ll0\neLUwDryCDdbp7Pd9rT/LJE3IbyjxCSeWNXESRkRBjOhsQwnKOUapVf9Uab094Tch\nKzMxP6Tp+FwxuWZHZSObaVG6tRoCcnGBXaWZClPx/dFISVDH+dq/Jr8OXikJIF9O\nFV4jL9t0YtqDLZw4lQYuPF3jnQKBgQD2OV1v1sVq6j5S9C4yBrp3uBoRrPdO2tyE\n5AqzptUUHiJbCrsYSZPuK+dc4RB2PEwAu/ITi/f/mGZGNUWELpX6lN/pYf6GHnBZ\nh71WABIhXKj59sDz+TtBHcO4Uztwm/6FV8QKwaQlrhQQgA3IYfQqBGZTll7N2YVC\nkGz4dBNZ4wKBgQCUNsCQ+wwvAspif9BzHiNydTz/93YekS77bIagRMiCZEBONFkw\non66dOL1iRsCuLaZKEhp2bDmoj3yEj/qHqQwOZ5c4476u440bwYOI1H8uXMQdNaG\npZWqnxtAeYb3DM/GOtfdLm7Rs9T2nj1+qF705bn/k+UHSplzLO5YMW0A6QKBgQDu\nW1wTj1LvjDGnNlCeBxtuF9/MqqeCQ6bkUqn1fhSZ9A4IGlxCR8AX+ZJwvEOmYfql\nX0waFg6O9SZU4u8X5c00lfgowr+VcFQMp7XnUgw7FatSx8fEpsnw4HJ+trw86BY9\nWVgjnY9dFqa/zmcJS6IFJts0IcZG+kLhzFRhNGUjRwKBgChpey2YZGklOMWLHpmy\nhDesgzmnqekRH4j78OuRAFpj2QOj0QnRwX3f16BLwbAWgWYvQpAh0HOP36/bQ2Zg\ncSeQtArWImO5oPh2xjqKSf8enuqlq4nik0VenBWe3jYFfIu2aKmnIdbumkoPa69z\nDBaAmEEFxNtPXOawkcnvJECA\n-----END PRIVATE KEY-----`,
  clientEmail: 'firebase-adminsdk-fbsvc@lingualeap-3535f.iam.gserviceaccount.com',
  clientId: '102759450536160582659',
  authUri: 'https://accounts.google.com/o/oauth2/auth',
  tokenUri: 'https://oauth2.googleapis.com/token',
  authProviderX509CertUrl: 'https://www.googleapis.com/oauth2/v1/certs',
  clientC509CertUrl: 'https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40lingualeap-3535f.iam.gserviceaccount.com',
  universeDomain: 'googleapis.com',
};

// Initialize Firebase Admin SDK, but only if it's not already initialized
let adminDb: FirebaseFirestore.Firestore;
let adminAuth: import('firebase-admin/auth').Auth;

if (!getApps().length) {
  const app = initializeApp({
    credential: cert(serviceAccount),
  });
  adminDb = getFirestore(app);
  adminAuth = getAuth(app);
} else {
  // Get the already initialized app
  const app = getApp();
  adminDb = getFirestore(app);
  adminAuth = getAuth(app);
}

export { adminDb, adminAuth };
