# 🎓 Modular Exam Preparation App - Content Management & Deployment Guide

This guide explains how to add new subjects, chapters, and practice questions to the application, and lists the best free platforms to host your app (supporting 1,000+ monthly users) along with step-by-step Vercel deployment instructions.

---

## 📁 Part 1: How to Add Subjects, Chapters & Questions

The application dynamically loads all subjects, chapters, and questions from static JSON files in the `/public/data/` directory. You do not need a database change or code modification to add content; simply update the JSON files!

### 1. The Directory Structure

All question banks and indices reside under `/public/data/`:

```text
public/
└── data/
    ├── manifest.json                 <-- Main index of all subjects and chapters
    ├── History/                       <-- Subject folder
    │   ├── chapter01.json            <-- Chapter file with questions
    │   └── chapter02.json
    ├── Polity/                        <-- Subject folder
    │   └── chapter01.json
    └── Geography/                     <-- Subject folder
        └── chapter01.json
```

---

### 2. Step-by-Step Guide to Adding Content

#### **Step A: Register the Subject and Chapter in `manifest.json`**
Open `/public/data/manifest.json`. This file acts as the router/index. To add a new subject or a new chapter to an existing subject, follow this schema:

```json
{
  "subjects": [
    {
      "id": "history",                // Unique lowercase ID for the subject
      "name": "History",              // Display name in the UI
      "icon": "🏛️",                    // Any emoji to represent the subject
      "folder": "History",            // The directory name inside /public/data/
      "chapters": [
        {
          "id": "chapter01",          // Unique ID for the chapter (within this subject)
          "title": "Indus Valley Civilization", // Display title in the UI
          "file": "chapter01.json"    // File name inside the /public/data/History/ folder
        },
        {
          "id": "chapter02",
          "title": "The Maurya Empire",
          "file": "chapter02.json"
        }
      ]
    }
  ]
}
```

*   **To add a new Chapter:** Append a new object to the `chapters` array of the respective subject.
*   **To add a new Subject:** Append a new subject object to the `subjects` array and create its corresponding subfolder under `/public/data/`.

---

#### **Step B: Create the Chapter JSON File**
Inside your subject folder (e.g., `/public/data/History/`), create the JSON file matching the `file` attribute specified in the manifest (e.g., `chapter01.json`).

Here is the exact schema and property descriptions:

```json
{
  "subject": "History",                // Must match the subject name
  "chapter": "Indus Valley Civilization", // Must match the chapter title
  "timePerQuestion": 30,               // Standard countdown timer per question (seconds)
  "positiveMarks": 2,                  // Score added for correct answers
  "negativeMarks": 0.50,               // Score subtracted for wrong answers (e.g., 0.25, 0.33, 0.50)
  "questions": [
    {
      "id": 1,                         // 1-indexed unique question ID within this chapter
      "question": "Which of the following Indus Valley sites is known for having a unique dockyard?",
      "options": [
        "Harappa",                     // Option 0
        "Mohenjo-daro",                // Option 1
        "Lothal",                      // Option 2
        "Kalibangan"                   // Option 3
      ],
      "correct": 2,                    // 0-indexed index of correct answer (Lothal is options[2])
      "explanation": "Lothal in Gujarat, India, had a massive tidal dockyard connected to the ancient course of the Sabarmati river, demonstrating advanced maritime and engineering knowledge.",
      "difficulty": "Easy",            // "Easy", "Medium", or "Hard"
      "tags": ["Lothal", "Trade"],     // Keywords for search indexing
      
      // OPTIONAL: Hindi translations for dual-language support
      "question_hi": "निम्नलिखित में से कौन सा सिंधु घाटी स्थल एक अनोखे गोदी बाड़े (dockyard) के लिए जाना जाता है?",
      "options_hi": [
        "हड़प्पा",
        "मोहनजोदड़ो",
        "लोथल",
        "कालीबंगन"
      ],
      "explanation_hi": "गुजरात, भारत में लोथल में साबरमती नदी के प्राचीन मार्ग से जुड़ा एक विशाल ज्वारीय गोदी बाड़ा था, जो उन्नत समुद्री और इंजीनियरिंग ज्ञान को दर्शाता है।"
    }
  ]
}
```

---

## 🌐 Part 2: Best Free Platforms for ~1,000 Monthly Users

Since this application compiles to a static Client-Side Single Page Application (SPA), all heavy processing runs inside the user's browser, and data is synced directly to Firebase. As a result, the web server only serves static files (HTML, JS, CSS, and JSONs). 

For **1,000 monthly users**, any of the following platforms are **100% free**, reliable, and offer lightning-fast load times:

| Platform | Free Bandwidth Limit | Build/Deploy Ease | Unique Pros |
| :--- | :--- | :--- | :--- |
| **Vercel** | **100 GB/month** (supports ~50k users) | 🟢 Instant (Git sync) | Best developer experience, automated preview branches. |
| **Cloudflare Pages** | **Unlimited** bandwidth / requests | 🟢 Instant (Git sync) | Worldwide CDN edges, absolute best security and speed. |
| **Netlify** | **100 GB/month** (supports ~50k users) | 🟢 Instant (Git sync) | Very user-friendly, excellent custom form integrations. |
| **GitHub Pages** | **100 GB/month** soft limit | 🟡 Needs a simple workflow | Built right into your GitHub repository for convenience. |

---

## 🚀 Part 3: Deploying the App to Vercel

Vercel is the recommended choice because of its seamless integration with Vite and automatic deployments on pushing updates.

### Step-by-Step Vercel Deployment

#### **Step 1: Push Your Code to GitHub, GitLab, or Bitbucket**
Make sure your project code is stored in a Git repository.
```bash
git init
git add .
git commit -m "Initialize modular exam preparation app"
git remote add origin <your-git-repo-url>
git branch -M main
git push -u origin main
```

#### **Step 2: Sign Up or Log In to Vercel**
Go to [Vercel](https://vercel.com/) and log in using your GitHub account.

#### **Step 3: Import Your Project**
1. Click the **Add New...** button in your Vercel Dashboard and select **Project**.
2. Find your Git repository from the list and click **Import**.

#### **Step 4: Configure Project Settings**
Vercel automatically detects that your project is a **Vite** app. Verify that the settings match the following:
*   **Framework Preset:** `Vite`
*   **Root Directory:** `./`
*   **Build Command:** `npm run build`
*   **Output Directory:** `dist`

#### **Step 5: Click Deploy!**
Vercel will download the code, install dependencies, compile the Vite bundle, and deploy it to a high-speed global CDN. Within 1 minute, you will receive your live production URL (e.g., `https://your-app-name.vercel.app`).

---

## 🛡️ Part 4: Firebase Configuration on Vercel

Your Firebase client configuration details (database endpoints, app ID) are read from `/firebase-applet-config.json` at build time. Since these client parameters are not server secrets, keeping this file in your Git repository is **fully safe** and standard practice.

To restrict unauthorized databases requests, ensure your Firebase Security Rules are active:
*   Security rules are configured in your project's `firestore.rules`.
*   These rules allow logged-in users to modify only their own data:
    ```javascript
    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        match /users/{userId} {
          allow read, write: if request.auth != null && request.auth.uid == userId;
          
          match /history/{itemId} {
            allow read, write: if request.auth != null && request.auth.uid == userId;
          }
          match /bookmarks/{bookmarkId} {
            allow read, write: if request.auth != null && request.auth.uid == userId;
          }
          match /wrongQuestions/{wrongId} {
            allow read, write: if request.auth != null && request.auth.uid == userId;
          }
        }
      }
    }
    ```

Enjoy managing your exam portal and adding unlimited subjects, chapters, and study questions! 🎓
