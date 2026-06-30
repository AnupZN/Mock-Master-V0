# 🎓 Modular Exam Preparation App - Content Management & Deployment Guide

This guide explains how to add new subjects, chapters, and practice questions to the application, documents our latest platform-stability updates, and details how to deploy and configure your app for production.

---

## ⚡ Latest App Updates & Resiliency Patches

We have rolled out several critical stability updates to ensure smooth operation across different browsers, browser extensions, and developer previews:

1. **Robust Service Worker Resolution**: Fixed the `"The string did not match the expected pattern"` error during caching. The service worker now:
   - Filters and intercepts only `http` and `https` protocols, ignoring local data URIs, chrome extension files, and invalid external resource request schemes.
   - Correctly clones request/response streams (`response.clone()`) before writing to the Cache Storage API (`cache.put`) to avoid consuming the stream.
   - Automatically bypasses Supabase authentication and database calls to guarantee smooth login flows.
2. **Case-Insensitive Multi-Path Fallback**: Solved the `"Failed to load chapter files"` error when new subjects (such as the new Geography chapter) are added. The loader now:
   - Attempts multiple prospective paths for both local and cloud JSON matching (e.g., lowercase folder, title-case folder, subject ID matching).
   - Gracefully falls back between Supabase table data and static asset endpoints.
3. **Stale-While-Revalidate Caching**: Caches core application shells and static files, serving them instantaneously for a fast offline-ready experience, while checking for updates in the background.
4. **Focused Native Authentication UI**: Refined the login experience to a lightweight, distraction-free single-card layout. Streamlined the flow by using native email and password authentication with Supabase, optimizing load times, and eliminating complex external OAuth setups.

---

## 📁 Part 1: How to Upload & Manage Questions

You can manage, create, and upload questions in two ways: **via the interactive Admin Dashboard** (the easiest way, which syncs directly to the cloud) or **manually via static JSON files** inside the codebase.

### Method A: Via the Admin Dashboard (Recommended)

The app features a fully featured **Admin Dashboard** allowing you to manage subjects, add chapters, and upload questions in bulk.

#### **Step 1: Open the Admin Panel**
1. Launch the application.
2. Navigate to the **Admin Dashboard** (or click the Settings/Admin tab).
3. If prompted, log in with your administrator credentials.

#### **Step 2: Select or Create a Subject & Chapter**
1. Select a subject from the left panel (or click **"New Subject"** to create a new one).
2. Inside that subject, select an existing chapter or click **"New Chapter"** (e.g., specifying Name: `Geography`, ID: `chapter01`, File: `chapter01.json`).

#### **Step 3: Click "Bulk Import Questions"**
Click the **"Bulk Import"** button inside the question panel. The smart parser supports two powerful formats:

##### **Format 1: Plain Text Blocks (AI Copy-Paste Friendly)**
You can generate multiple questions using tools like ChatGPT or Claude, and copy-paste them directly into the editor. Separate each question block with an empty line:

```text
Question: What is the primary language of the web?
A: Python
B: JavaScript
C: C++
D: Java
Correct: B
Explanation: JavaScript is the standard script for browser clients.
Difficulty: Easy
Tags: web, code, basic

Question_HI: वेब की मुख्य प्रोग्रामिंग भाषा कौन सी है?
A_HI: पायथन
B_HI: जावास्क्रिप्ट
C_HI: सी++
D_HI: जावा
Explanation_HI: ब्राउज़र क्लाइंट के लिए जावास्क्रिप्ट मानक भाषा है।
```

##### **Format 2: Standard JSON Arrays**
If you have structured JSON question files, paste them directly as a JSON array:

```json
[
  {
    "question": "What does CSS stand for?",
    "options": ["Computer Style Sheets", "Cascading Style Sheets", "Creative Style Sheets", "Colorful Style Sheets"],
    "correct": 1,
    "explanation": "CSS stands for Cascading Style Sheets.",
    "difficulty": "Easy",
    "tags": ["css", "styling"]
  }
]
```

#### **Step 4: Publish to Supabase**
After reviewing or bulk-importing the questions:
1. Click **"Save Chapter"** to save your modifications.
2. Click the green **"Publish to Supabase"** button at the top of the Admin Panel. 
3. This uploads and syncs all subjects, chapters, and question pools to your live cloud database instantly!

---

### Method B: Via Static JSON Files (Local Backup / Offline Use)

If you prefer keeping static assets inside your codebase without a database, you can manage files under `/public/data/`.

#### **Step A: Register the Subject in `manifest.json`**
Open `/public/data/manifest.json` and append your subject and chapters:

```json
{
  "subjects": [
    {
      "id": "geography",
      "name": "Geography",
      "icon": "🌍",
      "folder": "Geography",
      "chapters": [
        {
          "id": "chapter01",
          "title": "Physical Geography",
          "file": "chapter01.json"
        }
      ]
    }
  ]
}
```

#### **Step B: Create the Chapter JSON File**
Create a new file under `/public/data/Geography/chapter01.json` with the following format. You can include optional Hindi translation fields (`question_hi`, `options_hi`, and `explanation_hi`) alongside the English ones for bilingual support:

```json
{
  "subject": "Geography",
  "chapter": "Physical Geography",
  "timePerQuestion": 30,
  "positiveMarks": 2,
  "negativeMarks": 0.50,
  "questions": [
    {
      "id": 1,
      "question": "Which layer of the atmosphere contains the ozone layer?",
      "options": [
        "Troposphere",
        "Stratosphere",
        "Mesosphere",
        "Thermosphere"
      ],
      "correct": 1,
      "explanation": "The stratosphere contains the ozone layer, which absorbs and scatters solar ultraviolet radiation.",
      "difficulty": "Easy",
      "tags": ["Atmosphere", "Ozone"],
      "question_hi": "वायुमंडल की किस परत में ओजोन परत पाई जाती है?",
      "options_hi": [
        "क्षोभमंडल",
        "समतापमंडल",
        "मध्यमंडल",
        "बाह्य वायुमंडल"
      ],
      "explanation_hi": "समतापमंडल में ओजोन परत पाई जाती है, जो हानिकारक पराबैंगनी किरणों को अवशोषित करती है।"
    }
  ]
}
```

#### **Step C: Hindi Tables Support (Optional)**
If your questions contain tables, you can also define translated headers and rows using the `table_hi` field:

```json
{
  "id": 2,
  "question": "Match the mountain peaks with their continents.",
  "options": ["A-3, B-1, C-2", "A-1, B-2, C-3", "A-2, B-3, C-1"],
  "correct": 0,
  "explanation": "Everest is in Asia, Kilimanjaro in Africa, and Aconcagua in South America.",
  "difficulty": "Medium",
  "tags": ["Mountains"],
  "question_hi": "पर्वत शिखरों का उनके महाद्वीपों के साथ मिलान करें।",
  "options_hi": ["A-3, B-1, C-2", "A-1, B-2, C-3", "A-2, B-3, C-1"],
  "explanation_hi": "एवरेस्ट एशिया में है, किलिमंजारो अफ्रीका में और अकोंकागुआ दक्षिण अमेरिका में है।",
  "table": {
    "headers": ["Peak", "Continent"],
    "rows": [
      ["Everest", "Asia"],
      ["Kilimanjaro", "Africa"],
      ["Aconcagua", "South America"]
    ]
  },
  "table_hi": {
    "headers": ["शिखर", "महाद्वीप"],
    "rows": [
      ["एवरेस्ट", "एशिया"],
      ["किलिमंजारो", "अफ्रीका"],
      ["अकोंकागुआ", "दक्षिण अमेरिका"]
    ]
  }
}
```

---

## 📊 How to Add Tables to Questions

The application renders clean, fully responsive tabular data. You can declare tables in **two ways**:

1. **Structured JSON (Recommended)**:
   Add a `table` (English) and/or `table_hi` (Hindi) block inside your question object:
   ```json
   "table": {
     "headers": ["Country", "Capital"],
     "rows": [
       ["India", "New Delhi"],
       ["Japan", "Tokyo"]
     ]
   }
   ```
2. **Markdown Pipe Tables**:
   Write standard markdown table syntax directly within the `"question"` or `"question_hi"` strings. The parser will automatically render them beautifully:
   ```text
   "question": "Match the following capitals:\n\n| Country | Capital |\n|---|---|\n| India | New Delhi |\n| Japan | Tokyo |"
   ```

---

## 🧭 Part 2: Professional Last Question Navigation

When completing a practice chapter, the application displays an **Exam Submission Flow** on clicking **"Save & Next"** for the last question:
- Displays a clean breakdown showing **Answered** versus **Unanswered** questions.
- **Three core pathways**:
  - **Submit Exam**: Calculates final positive and negative scores, updating your local history dashboard.
  - **Go to 1st Question**: Wraps back to the start so you can audit your answers.
  - **Keep Reviewing (Stay)**: Closes the modal so you can focus on the current page.

---

## 🌐 Part 3: Best Free Platforms for ~1,000 Monthly Users

Since this application compiles to a static Client-Side SPA, heavy processing occurs on the client and syncs directly to Supabase. This means your hosting platform only serves lightweight static files (HTML, JS, CSS, and fallback JSONs).

For **1,000 monthly users**, these hosts are **100% free**, secure, and offer global CDNs:

| Platform | Free Bandwidth Limit | Build/Deploy Ease | Unique Pros |
| :--- | :--- | :--- | :--- |
| **Vercel** | **100 GB/month** (~50,000 users) | 🟢 Instant (Git sync) | Seamless Vite detection, preview branches, fast deployment. |
| **Cloudflare Pages** | **Unlimited** bandwidth / requests | 🟢 Instant (Git sync) | Ultimate global performance, free advanced DDoS protection. |
| **Netlify** | **100 GB/month** (~50,000 users) | 🟢 Instant (Git sync) | Very user-friendly dashboard, built-in forms. |
| **GitHub Pages** | **100 GB/month** soft limit | 🟡 Needs custom workflow | Directly integrated into your source repository. |

---

## 🚀 Part 4: Deploying the App to Vercel

1. Create a GitHub repository and push your project files.
2. Sign up on [Vercel](https://vercel.com/) and click **"Add New... Project"**.
3. Import your Git repository.
4. Set the build parameters (auto-detected):
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Click **Deploy!**

---

## 🛡️ Part 5: Supabase Setup & Environment Variables

This application uses Supabase for user authentication (sign-up, login), saving attempt histories, and bookmark tracking.

### 1. Database Setup
Ensure you execute the database schema setup script inside your Supabase SQL editor:
- Copy the contents of `/SUPABASE_SCHEMA.sql` at the root of this project.
- Paste it into your **Supabase SQL Editor** and click **Run** to provision the necessary tables, triggers, and storage functions.

### 2. Environment Configuration
Define your project credentials inside Vercel's environment variables dashboard or locally in `.env`:

```env
# Supabase Configuration
VITE_SUPABASE_URL="your-supabase-project-url"
VITE_SUPABASE_ANON_KEY="your-supabase-anon-key"
```

Once defined, your application will seamlessly connect to Supabase for secure cloud-synced practice tracking and content syncing!

---

## 🤖 Part 6: AI System Prompt for Question Generation (Verification, Translation & Formatting)

Use the following detailed **System Prompt / Prompt Template** with models like Gemini, Claude, or ChatGPT to turn cluttered, unstructured, or single-language questions into clean, verified, bilingual (English & Hindi) questions formatted perfectly for bulk import.

### 📋 How to use this prompt:
1. Copy the system prompt box below.
2. Paste it into your AI model chat.
3. Paste your raw, cluttered, or English-only questions right after it.
4. Copy the resulting formatted output directly into the **Bulk Import** text area of your Admin Dashboard.

---

### 💬 Copy-Pasteable AI System Prompt

```text
You are an expert curriculum designer and bilingual translator specializing in exam preparation for competitive exams (SSC, UPSC, Banking, etc.). 

Your task is to take my raw, cluttered, disorganized, or English-only exam questions, perform the following verification and translation steps, and output them in the exact target format requested below.

### 🎯 Your Tasks:
1. **Factual Verification & Correction**:
   - Verify the factual correctness of the question, answer keys, and options.
   - If an answer key is incorrect or mismatched in the raw data, correct it.
   - Ensure that the options are clear, non-repetitive, and that exactly one option is correct.
   - Generate or refine a concise, high-quality, and informative explanation explaining why the correct option is right and others are wrong.

2. **High-Quality Bilingual Translation (English ↔ Hindi)**:
   - Check if a Hindi translation is present. If it is missing, inaccurate, or cluttered, generate a standard, grammatically correct Hindi translation.
   - Do NOT use low-quality literal/robotic translations. Use standard Indian exam terminology (e.g., using terms commonly understood by SSC/UPSC aspirants).
   - Translate the Question, Options, and Explanation. 
   - Option letters (A, B, C, D) themselves must remain in English (e.g. A_HI, B_HI, C_HI, D_HI) but the options' contents must be translated into Hindi.

3. **Difficulty Rating & Tags**:
   - Review or assign an appropriate difficulty rating ("Easy", "Medium", "Hard").
   - Extract 2-4 highly relevant tags/topics for categorization.

---

### 📦 Output Format Options:
Choose either **Format A (Plain Text Blocks)** or **Format B (Standard JSON array)** as specified by the user.

#### 📝 FORMAT A: Plain Text Blocks (AI Copy-Paste Friendly)
Ensure questions are separated by exactly one blank line. Use the exact keys shown below:

Question: [English Question Text]
A: [English Option A]
B: [English Option B]
C: [English Option C]
D: [English Option D]
Correct: [A, B, C, or D]
Explanation: [English Explanation]
Difficulty: [Easy/Medium/Hard]
Tags: [tag1, tag2]

Question_HI: [Hindi Question Text]
A_HI: [Hindi Option A]
B_HI: [Hindi Option B]
C_HI: [Hindi Option C]
D_HI: [Hindi Option D]
Explanation_HI: [Hindi Explanation]

---

#### 🗂️ FORMAT B: Standard JSON Array (For JSON Files)
Ensure options are represented as arrays where 0 = A, 1 = B, 2 = C, 3 = D:

[
  {
    "question": "English Question Text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": 1, 
    "explanation": "English Explanation",
    "difficulty": "Easy",
    "tags": ["tag1", "tag2"],
    "question_hi": "Hindi Question Text",
    "options_hi": ["Hindi Option A", "Hindi Option B", "Hindi Option C", "Hindi Option D"],
    "explanation_hi": "Hindi Explanation"
  }
]

### 🚨 Strict Rules:
- Do not output any conversational introduction, notes, or extra markdown blocks. 
- Only return the raw formatted questions.
- **Handling Table-based Questions (Crucial)**: 
  - If a raw question contains tabular data (like matching columns, database tables, or schedules), represent the table using clean **Markdown Pipe Tables** inside the main question text (`question` / `question_hi`) or explanation text.
  - Separate headings and content with standard pipes (`|`) and hyphens (`-`).
  - **Do NOT** output raw HTML tables. Keep tables neat, aligned, and properly bilingual (translate column headers and table cell content into Hindi inside `question_hi` as well).
  - *Example Markdown Table format in Question text:*
    ```markdown
    | Column A (List-I) | Column B (List-II) |
    |-------------------|--------------------|
    | 1. Newton          | A. Theory of Relativity |
    | 2. Einstein        | B. Laws of Motion   |
    ```
  - In Format B (JSON), escape newlines inside the string as `\n` to keep the JSON valid. (e.g., `"question": "Match the following:\n\n| Column A | Column B |\n|---|---|\n..."`).

---
Here are my raw/cluttered questions to process:
[PASTE YOUR CLUTTERED/ENGLISH QUESTIONS HERE]
```
