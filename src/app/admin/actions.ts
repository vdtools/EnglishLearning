
'use server';

import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

/**
 * Creates a new user document in the 'userProgress' collection in Firestore.
 * This is triggered right after a new user signs up.
 *
 * @param userId - The unique ID of the user, obtained from Firebase Authentication.
 */
export async function createUserDocument(userId: string) {
  if (!userId) {
    console.error("CREATE DOCUMENT FAILED: No User ID was provided to the server action.");
    return { success: false, error: "User ID is required." };
  }
  
  try {
    console.log(`Attempting to create Firestore document for new user: ${userId}`);
    await adminDb.collection('userProgress').doc(userId).set({
      points: 0,
      level: 1,
      dailyStreak: 0,
      lastCompletedDate: null,
      completedChapters: {},
      completedVideos: []
    });
    console.log(`SUCCESS: Document created for user: ${userId}`);
    return { success: true };
  } catch (error) {
    console.error(`FATAL ERROR creating Firestore document for user ${userId}:`, error);
    return { success: false, error: "Failed to create user document in Firestore." };
  }
}

interface ChapterData {
    path: string;
    chapterId: string;
    title: string;
    description: string;
    content: string;
    questions: Array<{
        question: string;
        options: string; // Comma-separated
        correctAnswer: string;
    }>;
}

/**
 * Saves or updates a syllabus chapter in Firestore. Can handle single chapters or entire nested structures.
 * @param chapterData - The data for the chapter or the entire syllabus object.
 */
export async function saveSyllabusChapter(chapterData: any) {
  const { path, chapterId } = chapterData;

  if (!path) {
    return { success: false, message: 'Error: Path is required.' };
  }

  try {
    const syllabusDocRef = adminDb.collection('syllabus').doc(path);

    // Helper to process quiz data
    const processQuizData = (questions: any) => {
        if (!questions) return [];
        // This handles the format from both ChapterEditor and NestedChapterNode
        return questions.map((q: any) => ({
            question: q.question,
            // Ensure options are always an array of strings
            options: Array.isArray(q.options) 
                ? q.options 
                : (typeof q.options === 'string' ? q.options.split(',').map((opt: string) => opt.trim()) : []),
            correctAnswer: q.correctAnswer,
        }));
    };
    
    // Helper to recursively process chapters for nested structures
    const processNestedChapters = (nodes: any[]) => {
        return nodes.map(node => {
            const processedNode = { ...node };
            if (processedNode.quiz) {
                processedNode.quiz = processQuizData(processedNode.quiz);
            }
            if (processedNode.children) {
                processedNode.children = processNestedChapters(processedNode.children);
            }
            return processedNode;
        });
    }

    let payload;
    // If a chapterId is provided, it's a single flat chapter update.
    if (chapterId) {
        payload = {
            [chapterId]: {
                title: chapterData.title,
                description: chapterData.description,
                content: chapterData.content,
                quiz: processQuizData(chapterData.questions),
            }
        };
        await syllabusDocRef.set(payload, { merge: true });
        console.log(`Successfully saved chapter "${chapterId}" to path "${path}"`);
    } else {
        // If no chapterId, assume it's the entire nested syllabus object.
        const { path: syllabusPath, ...syllabusObject } = chapterData;
        if (syllabusObject.chapters && Array.isArray(syllabusObject.chapters)) {
            syllabusObject.chapters = processNestedChapters(syllabusObject.chapters);
        }
        payload = syllabusObject;
        await syllabusDocRef.set(payload); // Overwrite the whole document
        console.log(`Successfully saved entire syllabus for path "${path}"`);
    }

    return { success: true, message: 'Syllabus saved successfully!' };

  } catch (error) {
    console.error(`Error saving syllabus for path "${path}":`, error);
    return { success: false, message: 'An unexpected error occurred while saving the syllabus.' };
  }
}


/**
 * Fetches all chapters for a given learning path from Firestore.
 * NOTE: This function now correctly flattens nested structures to return lessons in order.
 * @param path - The document ID representing the learning path (e.g., 'beginnerJourney').
 * @returns An array of chapter objects, each including its ID and data, sorted by ID or appearance.
 */
export async function getSyllabusChapters(path: string) {
  if (!path) {
    console.error('Error: Path is required to get syllabus chapters.');
    return [];
  }

  try {
    const syllabusDocRef = adminDb.collection('syllabus').doc(path);
    const doc = await syllabusDocRef.get();

    if (!doc.exists) {
      console.log(`No syllabus document found for path: ${path}`);
      return [];
    }

    const data = doc.data();
    if (!data) {
      return [];
    }
    
    // This is the universal logic to flatten any syllabus structure into a sorted list of lessons.
    let allLessons: any[] = [];
    if (data.chapters && Array.isArray(data.chapters)) {
        // Logic for NESTED syllabus (e.g., grammarsDeepDive)
        const flattenLessons = (nodes: any[]): any[] => {
            let lessons: any[] = [];
            for (const node of nodes) {
                // A lesson is a node that does NOT have children.
                if (!node.children || node.children.length === 0) {
                    lessons.push(node);
                } else {
                    // If it has children, recurse into them.
                    lessons = lessons.concat(flattenLessons(node.children));
                }
            }
            return lessons;
        };
        allLessons = flattenLessons(data.chapters);
    } else {
        // Logic for FLAT syllabus (e.g., beginnerJourney)
        allLessons = Object.keys(data)
            .map(chapterId => ({ id: chapterId, ...data[chapterId] }))
            .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));
    }
    
    return allLessons;

  } catch (error) {
    console.error(`Error fetching chapters for path "${path}":`, error);
    return []; // Return an empty array on error to prevent crashes
  }
}

/**
 * Fetches the entire syllabus document for a given path, preserving its structure.
 * @param path - The document ID representing the learning path (e.g., 'grammarsDeepDive').
 * @returns The entire document data object or null if not found.
 */
export async function getSyllabus(path: string) {
  if (!path) {
    console.error('Error: Path is required to get syllabus.');
    return null;
  }
  try {
    const syllabusDocRef = adminDb.collection('syllabus').doc(path);
    const doc = await syllabusDocRef.get();

    if (!doc.exists) {
      console.log(`No syllabus document found for path: ${path}`);
      return null;
    }
    return doc.data();
  } catch (error) {
    console.error(`Error fetching syllabus for path "${path}":`, error);
    return null;
  }
}

/**
 * Deletes a specific chapter from a syllabus document in Firestore.
 * @param path - The document ID representing the learning path (e.g., 'beginnerJourney').
 * @param chapterId - The ID of the chapter to be deleted.
 * @returns An object indicating success or failure.
 */
export async function deleteSyllabusChapter(path: string, chapterId: string) {
    if (!path || !chapterId) {
        return { success: false, message: 'Error: Path and Chapter ID are required.' };
    }

    try {
        const syllabusDocRef = adminDb.collection('syllabus').doc(path);

        // Use updateDoc with FieldValue.delete() to remove the specific chapter field
        await syllabusDocRef.update({
            [chapterId]: FieldValue.delete(),
        });

        console.log(`Successfully deleted chapter "${chapterId}" from path "${path}"`);
        return { success: true, message: 'Chapter deleted successfully!' };

    } catch (error) {
        console.error(`Error deleting chapter "${chapterId}":`, error);
        return { success: false, message: 'An unexpected error occurred while deleting the chapter.' };
    }
}

/**
 * Fetches a learning path's chapters and merges them with the user's progress.
 * This function now handles both flat and nested syllabus structures.
 * @param userId - The ID of the current user.
 * @param path - The learning path to fetch (e.g., 'beginnerJourney', 'grammarsDeepDive').
 * @returns An array of chapter objects, each with an added 'status' field, in the correct learning order.
 */
export async function getLearningPathWithProgress(userId: string, path: string) {
  // 1. Input Validation: Ensure we have the necessary inputs.
  if (!userId || !path) {
    console.error("getLearningPathWithProgress called with invalid parameters.");
    return [];
  }

  try {
    // 2. Fetch Syllabus: Get the sorted list of chapters for the path.
    console.log(`Fetching syllabus for path: ${path}`);
    const chapters = await getSyllabusChapters(path);
    if (!chapters || chapters.length === 0) {
      console.log(`No chapters found for syllabus path: ${path}`);
      return []; // Return empty if no chapters exist for this path.
    }

    // 3. Fetch User Progress: Get the user's specific progress document.
    console.log(`Fetching progress for user: ${userId}`);
    const userProgressRef = adminDb.collection('userProgress').doc(userId);
    const userProgressDoc = await userProgressRef.get();
    
    let completedChaptersForPath: string[] = [];
    if (userProgressDoc.exists) {
      const userProgressData = userProgressDoc.data();
      // Safely access the completed chapters for the specific path.
      if (userProgressData?.completedChapters?.[path]) {
        completedChaptersForPath = userProgressData.completedChapters[path];
      }
    }
    console.log(`Found ${completedChaptersForPath.length} completed chapters for this path.`);

    // 4. Merge Logic: Determine the status for each chapter.
    let inProgressSet = false; // A flag to ensure only one chapter is 'in_progress'.
    const chaptersWithStatus = chapters.map(chapter => {
      // Default status is locked.
      let status = 'locked'; 

      if (completedChaptersForPath.includes(chapter.id)) {
        status = 'completed';
      } else if (!inProgressSet) {
        // This is the first chapter that is NOT completed. Mark it as 'in_progress'.
        status = 'in_progress';
        inProgressSet = true; // Set the flag so no other chapter gets this status.
      }
      
      return { ...chapter, status };
    });

    // 5. Edge Case for New Users: If the user has completed nothing, the first chapter
    // should be 'in_progress'. The logic above already handles this automatically.
    // If completedChaptersForPath is empty, the very first chapter in the map
    // will be set to 'in_progress'.

    return chaptersWithStatus;

  } catch (error) {
    console.error(`FATAL ERROR in getLearningPathWithProgress for user ${userId} and path ${path}:`, error);
    return []; // Return an empty array on any failure to prevent the app from crashing.
  }
}


/**
 * Fetches the content for a single lesson from Firestore.
 * @param path - The document ID representing the learning path (e.g., 'beginnerJourney').
 * @param chapterId - The ID of the chapter to fetch.
 * @returns The chapter data (title, content, quiz) or null if not found.
 */
export async function getLessonContent(path: string, chapterId: string) {
  if (!path || !chapterId) {
    console.error('Error: Path and Chapter ID are required.');
    return null;
  }

  try {
    const syllabusDocRef = adminDb.collection('syllabus').doc(path);
    const doc = await syllabusDocRef.get();

    if (!doc.exists) {
      console.log(`No syllabus document found for path: ${path}`);
      return null;
    }

    const data = doc.data();
    if (!data) {
      console.log(`Chapter data is empty for path: ${path}`);
      return null;
    }

    // For nested syllabus, we need to find the chapter by ID recursively
    const findChapter = (nodes: any[], id: string): any => {
        for (const node of nodes) {
            if (node.id === id) return node;
            if (node.children) {
                const found = findChapter(node.children, id);
                if (found) return found;
            }
        }
        return null;
    };
    
    // Check if data is an array (nested) or object (flat)
    if (Array.isArray(data.chapters)) {
        const lesson = findChapter(data.chapters, chapterId);
        if (!lesson) {
             console.log(`Chapter "${chapterId}" not found in nested path "${path}"`);
             return null;
        }
        return lesson;
    } else {
        // Fallback for flat structure like beginnerJourney
        if (!data[chapterId]) {
            console.log(`Chapter "${chapterId}" not found in flat path "${path}"`);
            return null;
        }
        return data[chapterId];
    }

  } catch (error) {
    console.error(`Error fetching lesson content for chapter "${chapterId}":`, error);
    return null; // Return null on error
  }
}

/**
 * Updates user progress after successfully completing a chapter quiz.
 * This function uses a Firestore transaction to ensure atomic updates.
 * @param userId - The ID of the user.
 * @param path - The learning path ID (e.g., 'beginnerJourney').
 * @param chapterId - The ID of the chapter just completed.
 * @returns An object indicating success or failure.
 */
export async function updateUserProgress(userId: string, path: string, chapterId: string) {
  console.log(`\n--- UPDATE PROGRESS STARTED for User: ${userId}, Chapter: ${chapterId} ---`);
  if (!userId || !path || !chapterId) {
    console.error("FATAL ERROR: updateUserProgress called with invalid parameters.");
    return { success: false, message: "User ID, path, and chapter ID are required." };
  }

  const userProgressRef = adminDb.collection('userProgress').doc(userId);

  try {
    await adminDb.runTransaction(async (transaction) => {
      console.log("Transaction Started: Reading user document...");
      const userProgressDoc = await transaction.get(userProgressRef);

      if (!userProgressDoc.exists) {
        throw new Error(`User progress document not found for user: ${userId}`);
      }
      
      const currentData = userProgressDoc.data()!;
      
      // Get the current array of completed chapters for the specific path
      const completedForPath = currentData.completedChapters?.[path] || [];

      // Check if the chapter is already completed to avoid duplicate operations
      if (completedForPath.includes(chapterId)) {
        console.log(`Chapter ${chapterId} is already completed for user ${userId}. No update needed.`);
        return; // Stop the transaction if already completed
      }

      // Add the new chapter ID to the array
      const newCompletedForPath = [...completedForPath, chapterId];

      const newPoints = (currentData.points || 0) + 10;
      const newLevel = Math.floor(newPoints / 100) + 1;
      
      // Streak logic (can be a separate helper function)
      let newDailyStreak = currentData.dailyStreak || 0;
      const lastCompleted = (currentData.lastCompletedDate as Timestamp | null)?.toDate();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (lastCompleted) {
        const lastCompletedDate = new Date(lastCompleted);
        lastCompletedDate.setHours(0, 0, 0, 0);
        if (lastCompletedDate.getTime() === yesterday.getTime()) {
          newDailyStreak += 1; // Streak continued
        } else if (lastCompletedDate.getTime() < yesterday.getTime()) {
          newDailyStreak = 1; // Streak broken
        }
      } else {
        newDailyStreak = 1; // First completion
      }

      // Prepare the complete update payload
      const updatePayload = {
        points: newPoints,
        level: newLevel,
        dailyStreak: newDailyStreak,
        lastCompletedDate: Timestamp.now(),
        completedChapters: {
          ...currentData.completedChapters,
          [path]: newCompletedForPath,
        }
      };
      
      console.log("Committing transaction to update document...");
      transaction.update(userProgressRef, updatePayload);
    });

    console.log("--- UPDATE PROGRESS FINISHED SUCCESSFULLY ---");
    return { success: true, message: 'Progress updated successfully!' };

  } catch (error) {
    console.error("--- FATAL ERROR in updateUserProgress transaction ---", error);
    return { success: false, message: (error as Error).message };
  }
}


/**
 * Fetches a user's statistics (points, level, streak) from Firestore.
 * @param userId - The ID of the user.
 * @returns An object with the user's stats or default values if not found.
 */
export async function getUserStats(userId: string) {
  if (!userId) {
    return { points: 0, level: 1, dailyStreak: 0, completedVideos: [] };
  }

  try {
    const userProgressRef = adminDb.collection('userProgress').doc(userId);
    const doc = await userProgressRef.get();

    if (!doc.exists) {
      console.log(`No progress document found for user: ${userId}`);
      return { points: 0, level: 1, dailyStreak: 0, completedVideos: [] };
    }

    const data = doc.data();
    return {
      points: data?.points || 0,
      level: data?.level || 1,
      dailyStreak: data?.dailyStreak || 0,
      completedVideos: data?.completedVideos || [],
    };

  } catch (error) {
    console.error(`Error fetching stats for user "${userId}":`, error);
    // Return default values on error to prevent crashes
    return { points: 0, level: 1, dailyStreak: 0, completedVideos: [] };
  }
}


/**
 * Adds a new video to the 'videos' collection in Firestore.
 * @param videoData - An object containing the video's title and youtubeUrl.
 * @returns An object indicating success or failure.
 */
export async function addVideo(videoData: { title: string, youtubeUrl: string }) {
  const { title, youtubeUrl } = videoData;
  if (!title || !youtubeUrl) {
    return { success: false, message: 'Title and YouTube URL are required.' };
  }

  try {
    const docRef = await adminDb.collection('videos').add({
      title,
      youtubeUrl,
      createdAt: FieldValue.serverTimestamp(),
    });
    console.log(`Successfully added video with ID: ${docRef.id}`);
    return { success: true, message: 'Video added successfully!', id: docRef.id };
  } catch (error) {
    console.error('Error adding video:', error);
    return { success: false, message: 'An unexpected error occurred while adding the video.' };
  }
}

/**
 * Fetches all videos from the 'videos' collection in Firestore.
 * @returns An array of video objects, each including its ID, sorted by creation date.
 */
export async function getVideos() {
  console.log("Attempting to fetch videos from Firestore...");
  try {
    const videosCollection = adminDb.collection('videos').orderBy('createdAt', 'desc');
    const snapshot = await videosCollection.get();

    if (snapshot.empty) {
      return [];
    }

    const videos = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            title: data.title,
            youtubeUrl: data.youtubeUrl,
        };
    });
    
    console.log(`Successfully fetched ${videos.length} videos.`);
    return videos;
  } catch (error) {
    console.error("FATAL ERROR in getVideos:", error);
    return [];
  }
}

/**
 * Deletes a video from the 'videos' collection in Firestore.
 * @param videoId - The ID of the video to be deleted.
 * @returns An object indicating success or failure.
 */
export async function deleteVideo(videoId: string) {
  if (!videoId) {
    return { success: false, message: 'Video ID is required.' };
  }

  try {
    await adminDb.collection('videos').doc(videoId).delete();
    console.log(`Successfully deleted video with ID: ${videoId}`);
    return { success: true, message: 'Video deleted successfully!' };
  } catch (error) {
    console.error(`Error deleting video ${videoId}:`, error);
    return { success: false, message: 'An unexpected error occurred while deleting the video.' };
  }
}

/**
 * Marks a video as complete, awards points, and updates the daily streak.
 * @param userId The ID of the user.
 * @param videoId The ID of the video completed.
 * @returns An object indicating success or failure.
 */
export async function markVideoAsComplete(userId: string, videoId: string) {
  if (!userId || !videoId) {
    return { success: false, message: 'User ID and Video ID are required.' };
  }

  const userProgressRef = adminDb.collection('userProgress').doc(userId);

  try {
    await adminDb.runTransaction(async (transaction) => {
      const userProgressDoc = await transaction.get(userProgressRef);

      if (!userProgressDoc.exists) {
        throw new Error('User progress document not found.');
      }

      const currentData = userProgressDoc.data()!;
      
      // Check if video has already been completed
      if (currentData.completedVideos && currentData.completedVideos.includes(videoId)) {
        // We throw an error here to stop the transaction and send a specific message back.
        // The catch block will then handle this.
        throw new Error('Video already completed.');
      }

      // Calculate new points and level
      const newPoints = (currentData.points || 0) + 20; // 20 points for a video
      const newLevel = Math.floor(newPoints / 100) + 1;

      // Daily Streak Logic
      let newDailyStreak = currentData.dailyStreak || 0;
      const lastCompleted = (currentData.lastCompletedDate as Timestamp | null)?.toDate();
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (lastCompleted) {
        const lastCompletedDate = new Date(lastCompleted);
        lastCompletedDate.setHours(0, 0, 0, 0);

        if (lastCompletedDate.getTime() === yesterday.getTime()) {
          newDailyStreak += 1;
        } else if (lastCompletedDate.getTime() < yesterday.getTime()) {
          newDailyStreak = 1;
        }
      } else {
        newDailyStreak = 1;
      }
      
      const updatePayload = {
        points: newPoints,
        level: newLevel,
        dailyStreak: newDailyStreak,
        lastCompletedDate: Timestamp.now(),
        completedVideos: FieldValue.arrayUnion(videoId),
      };

      await transaction.update(userProgressRef, updatePayload);
    });

    console.log(`Successfully marked video ${videoId} as complete for user ${userId}.`);
    return { success: true, message: 'Video marked as complete! +20 points.' };

  } catch (error: any) {
    console.error(`Failed to mark video as complete for user ${userId}:`, error);
    // Specific check for our custom error message
    if (error.message === 'Video already completed.') {
        return { success: false, message: 'You have already earned points for this video.' };
    }
    return { success: false, message: 'An unexpected error occurred.' };
  }
}

/**
 * Saves user's API keys to a secure collection in Firestore.
 * @param userId - The ID of the user.
 * @param keys - An object containing the API keys.
 * @returns An object indicating success or failure.
 */
export async function saveApiKeys(userId: string, keys: { [key: string]: string }) {
  if (!userId) {
    return { success: false, message: 'User ID is required.' };
  }

  try {
    const secureDataRef = adminDb.collection('user_secure_data').doc(userId);
    await secureDataRef.set(keys, { merge: true });
    console.log(`Successfully saved API keys for user ${userId}.`);
    return { success: true, message: 'API keys saved successfully!' };
  } catch (error) {
    console.error(`Error saving API keys for user ${userId}:`, error);
    return { success: false, message: 'An unexpected error occurred while saving keys.' };
  }
}

/**
 * Fetches a user's API keys from Firestore.
 * @param userId - The ID of the user.
 * @returns The user's API keys or null if not found.
 */
export async function getApiKeys(userId: string) {
  if (!userId) {
    return null;
  }

  try {
    const secureDataRef = adminDb.collection('user_secure_data').doc(userId);
    const doc = await secureDataRef.get();

    if (!doc.exists) {
      console.log(`No API keys found for user: ${userId}`);
      return null;
    }

    return doc.data();
  } catch (error) {
    console.error(`Error fetching API keys for user ${userId}:`, error);
    return null;
  }
}
    
/**
 * A universal server action to handle AI calls to different providers.
 * @param {object} params - The parameters for the AI call.
 * @param {'gemini' | 'openrouter'} params.provider - The AI provider.
 * @param {string} params.apiKey - The API key for the provider.
 * @param {string} params.prompt - The prompt to send to the AI.
 * @param {string} params.model - The model to use.
 * @returns {Promise<{success: boolean, response?: string, error?: string}>} - The AI's response or an error.
 */
export async function generateAiResponse(params: {
  provider: 'gemini' | 'openrouter';
  apiKey: string;
  prompt: string;
  model: string;
}) {
  const { provider, apiKey, prompt, model } = params;
  console.log("generateAiResponse called with provider:", provider);

  if (!apiKey) {
    return { success: false, error: 'API key is missing.' };
  }

  try {
    if (provider === 'gemini') {
      const genAI = new GoogleGenerativeAI(apiKey);
      const geminiModel = genAI.getGenerativeModel({ model });
      console.log("Calling AI with prompt:", prompt);
      const result = await geminiModel.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      return { success: true, response: text };

    } else if (provider === 'openrouter') {
      const openai = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: apiKey,
      });
      
      console.log("Calling AI with prompt:", prompt);
      const completion = await openai.chat.completions.create({
        model: model,
        messages: [{ role: 'user', content: prompt }],
      });
      
      const text = completion.choices[0]?.message?.content;
      if (text) {
        return { success: true, response: text };
      } else {
        return { success: false, error: 'Failed to get a valid response from OpenRouter.' };
      }

    } else {
      return { success: false, error: 'Invalid AI provider specified.' };
    }
  } catch (error: any) {
    console.error(`FATAL ERROR calling ${provider} AI:`, error);
    // Return a more user-friendly error message
    return { success: false, error: `An error occurred with the ${provider} API: ${error.message}` };
  }
}
    
/**
 * Fetches all registered users along with their progress from Firestore.
 * @returns An array of user objects with combined auth and progress data.
 */
export async function getAllUsersWithProgress() {
  try {
    const listUsersResult = await adminAuth.listUsers();
    const users = listUsersResult.users;

    const usersWithProgress = await Promise.all(
      users.map(async (userRecord) => {
        const userProgressRef = adminDb.collection('userProgress').doc(userRecord.uid);
        const userProgressDoc = await userProgressRef.get();

        let progressData = {
          points: 0,
          level: 1,
          dailyStreak: 0,
        };

        if (userProgressDoc.exists) {
          const data = userProgressDoc.data();
          progressData = {
            points: data?.points || 0,
            level: data?.level || 1,
            dailyStreak: data?.dailyStreak || 0,
          };
        }

        return {
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName,
          ...progressData,
        };
      })
    );

    return usersWithProgress.sort((a, b) => b.points - a.points); // Sort by points descending

  } catch (error) {
    console.error('Error fetching all users with progress:', error);
    return []; // Return empty array on error
  }
}

/**
 * Fetches all AI prompts from the 'system_config/prompts' document.
 * @returns An object containing all the AI prompts or a default object if not found.
 */
export async function getAiPrompts() {
  try {
    const docRef = adminDb.collection('system_config').doc('prompts');
    const doc = await docRef.get();

    if (!doc.exists) {
      console.log('No prompts document found. Returning default prompts.');
      // Return a default set of prompts if the document doesn't exist.
      // This ensures the app doesn't break on first run.
      return {
        sentenceImprover: "You are an English language expert. Your task is to correct any grammatical errors and improve the user's sentence to make it sound more natural. Provide a brief explanation of the changes you made.\n\nUser's sentence: \"{sentence}\"",
        dailyPractice: "You are a creative writing coach. Generate a single, engaging writing prompt for an English learner. Provide only the topic, nothing else. Do not add any introductory text like 'Here is a writing prompt:'. Just give the topic directly.",
        grammarAssistant: "You are a friendly and helpful English grammar expert. Provide a clear, simple, and accurate explanation for the user's question with examples. User's question: \"{question}\"",
        storyGenerator: "You are a creative storyteller. Write a short, simple story (about 150 words) for an English learner based on the following topic: \"{topic}\"",
        aiVocabulary: "You are an English vocabulary expert for Hindi speakers. Generate {count} vocabulary words for an English learner. Return the result as a valid JSON array of objects. Do not include any text outside of the JSON array. Each object in the array must have these exact keys: \"word\" (string), \"pronunciation\" (string, e.g., 'he-lo'), and \"hindiMeaning\" (a string with a short, simple meaning in Hindi).",
        grammarGym: "You are a language education expert. Generate {count} multiple-choice quiz questions about English grammar on the topic \"{topic}\".\n    Return the result as a valid JSON array of objects. Do not include any text outside of the JSON array.\n    Each object in the array must have these exact keys: \"questionText\" (string), \"options\" (an array of 4 strings), and \"correctAnswer\" (a string that is an exact match of one of the options).",
        pronunciationLab: "You are a language education expert. Generate {count} simple English sentences suitable for pronunciation practice.\n    Return the result as a valid JSON array of strings. Do not include any text outside of the JSON array."
      };
    }

    const data = doc.data();
    const defaultPrompts = {
      sentenceImprover: "You are an English language expert. Your task is to correct any grammatical errors and improve the user's sentence to make it sound more natural. Provide a brief explanation of the changes you made.\n\nUser's sentence: \"{sentence}\"",
      dailyPractice: "You are a creative writing coach. Generate a single, engaging writing prompt for an English learner. Provide only the topic, nothing else. Do not add any introductory text like 'Here is a writing prompt:'. Just give the topic directly.",
      grammarAssistant: "You are a friendly and helpful English grammar expert. Provide a clear, simple, and accurate explanation for the user's question with examples. User's question: \"{question}\"",
      storyGenerator: "You are a creative storyteller. Write a short, simple story (about 150 words) for an English learner based on the following topic: \"{topic}\"",
      aiVocabulary: "You are an English vocabulary expert for Hindi speakers. Generate {count} vocabulary words for an English learner. Return the result as a valid JSON array of objects. Do not include any text outside of the JSON array. Each object in the array must have these exact keys: \"word\" (string), \"pronunciation\" (string, e.g., 'he-lo'), and \"hindiMeaning\" (a string with a short, simple meaning in Hindi).",
      grammarGym: "You are a language education expert. Generate {count} multiple-choice quiz questions about English grammar on the topic \"{topic}\".\n    Return the result as a valid JSON array of objects. Do not include any text outside of the JSON array.\n    Each object in the array must have these exact keys: \"questionText\" (string), \"options\" (an array of 4 strings), and \"correctAnswer\" (a string that is an exact match of one of the options).",
      pronunciationLab: "You are a language education expert. Generate {count} simple English sentences suitable for pronunciation practice.\n    Return the result as a valid JSON array of strings. Do not include any text outside of the JSON array."
    };
    
    // Merge fetched prompts with defaults to ensure all keys exist
    return { ...defaultPrompts, ...data };

  } catch (error) {
    console.error('Error fetching AI prompts:', error);
    return null; // Return null on error
  }
}

/**
 * Updates a specific AI prompt in Firestore.
 * @param promptName - The key of the prompt to update (e.g., 'sentenceImprover').
 * @param newPromptText - The new text for the prompt.
 * @returns An object indicating success or failure.
 */
export async function updateAiPrompt(promptName: string, newPromptText: string) {
  if (!promptName || !newPromptText) {
    return { success: false, message: 'Prompt name and new text are required.' };
  }

  try {
    const docRef = adminDb.collection('system_config').doc('prompts');
    
    // Use set with merge to create the document if it doesn't exist,
    // or update the specific field if it does.
    await docRef.set({
      [promptName]: newPromptText,
    }, { merge: true });
    
    console.log(`Successfully updated prompt: ${promptName}`);
    return { success: true, message: 'Prompt updated successfully!' };

  } catch (error) {
    console.error(`Error updating prompt "${promptName}":`, error);
    return { success: false, message: 'An unexpected error occurred while updating the prompt.' };
  }
}
    

    

    




