# 📡 ProctorVision — Full Backend API Documentation
> **Version:** 1.0.0 (Hackathon Edition)  
> **Base URL:** `http://localhost:5000/api/v1`  
> **Static Video/Snapshot URL:** `http://localhost:5000/video/:studentId/allvideo/:filename`  
> **Socket.IO Telemetry:** `http://localhost:5000`

---

## 📌 Index / Table of Contents
1. [General Setup & Headers](#-general-setup--headers)
2. [Standard API Response Format](#-standard-api-response-format)
3. [Test Accounts (Seed Data)](#-test-accounts-seed-data)
4. [1. Health Check Endpoint](#1-health-check-endpoint)
5. [2. Authentication Routes (`/auth`)](#2-authentication-routes-auth)
6. [3. Exam Routes (`/exams`)](#3-exam-routes-exams)
7. [4. Consent Routes (`/exams/:id/consent`)](#4-consent-routes-examsidconsent)
8. [5. Attempt & Quiz Room Routes (`/attempts`)](#5-attempt--quiz-room-routes-attempts)
9. [6. Monitoring Telemetry & Snapshot Events (`/attempts/:id/events`)](#6-monitoring-telemetry--snapshot-events-attemptsidevents)
10. [7. Teacher Review & Incident Actions (`/events/:id/reviews`)](#7-teacher-review--incident-actions-eventsidreviews)
11. [8. Teacher Portal Routes (`/teacher`)](#8-teacher-portal-routes-teacher)
12. [9. Claude 3.5 Sonnet AI Proctor Analysis](#9-claude-35-sonnet-ai-proctor-analysis)
13. [10. Static Snapshot Evidence Storage](#10-static-snapshot-evidence-storage)
14. [11. Real-Time Socket.IO Telemetry Events](#11-real-time-socketio-telemetry-events)

---

## 🔐 General Setup & Headers

### Request Headers
Sabhi protected routes me JWT token bhejna zaroori hai:
```http
Authorization: Bearer <your_jwt_token_here>
Content-Type: application/json
```
*(Token login ya register ke response me `data.token` ke roop me milta hai. Isko `localStorage.getItem("proctor_token")` me store karke har request ke header me lagayein).*

---

## 📦 Standard API Response Format

### Success Response (Status 200 / 201)
```json
{
  "success": true,
  "message": "Action performed successfully",
  "data": { ... }
}
```

### Error Response (Status 400 / 401 / 403 / 404 / 500)
```json
{
  "success": false,
  "message": "Specific error message explaining what failed",
  "errors": []
}
```

---

## 👥 Test Accounts (Seed Data)
Database seed karne ke liye backend me run karein: `npm run seed`

| Role | Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **Teacher** | `teacher@proctorvision.com` | `Teacher@123` | Department: Computer Science |
| **Student** | `rahul@proctorvision.com` | `Student@123` | Roll No: `CS2026-001`, Institution: IIT Delhi |

---

## 1. Health Check Endpoint

### `GET /health`
- **Kaam:** Server, MongoDB Database aur Claude AI status check karne ke liye.
- **Access:** Public (No token needed)
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "ProctorVision Backend is healthy and running smoothly 🚀",
  "data": {
    "status": "ok",
    "database": "connected",
    "claudeAI": "active",
    "uptime": "1420 seconds",
    "timestamp": "2026-10-17T13:40:00.000Z"
  }
}
```

---

## 2. Authentication Routes (`/auth`)

### `POST /auth/register`
- **Kaam:** Naye Student ya Teacher ka account banana.
- **Access:** Public
- **Request Body (Student Example):**
```json
{
  "name": "Rahul Sharma",
  "email": "rahul@example.com",
  "password": "Password@123",
  "role": "student",
  "institution": "IIT Delhi",
  "studentId": "CS-2026-089"
}
```
- **Request Body (Teacher Example):**
```json
{
  "name": "Prof. Arvind Mehta",
  "email": "arvind@example.com",
  "password": "Password@123",
  "role": "teacher",
  "institution": "IIT Delhi",
  "department": "Computer Science"
}
```
- **Response (201 Created):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "6ad3238efc5e5182055921f1",
      "name": "Rahul Sharma",
      "email": "rahul@example.com",
      "role": "student",
      "institution": "IIT Delhi",
      "studentId": "CS-2026-089"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### `POST /auth/login`
- **Kaam:** Existing user ko login karana aur JWT token return karna.
- **Access:** Public
- **Request Body:**
```json
{
  "email": "rahul@example.com",
  "password": "Password@123"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "6ad3238efc5e5182055921f1",
      "name": "Rahul Sharma",
      "email": "rahul@example.com",
      "role": "student",
      "institution": "IIT Delhi",
      "studentId": "CS-2026-089"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### `GET /auth/me`
- **Kaam:** Currently logged-in user ki details fetch karna (Session verify karne ke liye).
- **Access:** Private (Requires Token)
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "User profile fetched",
  "data": {
    "user": {
      "_id": "6ad3238efc5e5182055921f1",
      "name": "Rahul Sharma",
      "email": "rahul@example.com",
      "role": "student"
    }
  }
}
```

---

### `POST /auth/logout`
- **Kaam:** User session logout karna.
- **Access:** Private (Requires Token)
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## 3. Exam Routes (`/exams`)

### `GET /exams`
- **Kaam:** Available exams ki list lena. Teacher ko uske banaye exams dikhte hain; student ko published exams dikhte hain. *(Student ke liye answer keys `correctOptionIndex` automatically strip ho jati hain security ke liye)*.
- **Access:** Private
- **Query Params (Optional):**
  - `?status=published` (draft, published, archived)
  - `?subject=Computer+Science`
  - `?search=Algorithms`
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Exams fetched successfully",
  "data": [
    {
      "_id": "6ad329954b922221f2c80b78",
      "title": "Data Structures & Algorithms Midterm",
      "description": "Midterm proctored exam covering Trees, Graphs, and Hashmaps.",
      "subject": "Computer Science",
      "durationMinutes": 60,
      "totalMarks": 100,
      "passingMarks": 40,
      "status": "published",
      "questions": [
        {
          "_id": "6ad329954b922221f2c80b79",
          "questionText": "What is the worst-case time complexity of QuickSort?",
          "options": ["O(n log n)", "O(n^2)", "O(n)", "O(log n)"],
          "marks": 5
        }
      ],
      "settings": {
        "faceDetection": true,
        "gazeTracking": true,
        "audioMonitoring": false,
        "tabSwitchLimit": 3,
        "lockdownBrowser": true
      }
    }
  ]
}
```

---

### `POST /exams`
- **Kaam:** Naya exam create karna (Single question add karke ya CSV upload karke).
- **Access:** Private (Teacher / Admin only)
- **Request Body:**
```json
{
  "title": "Data Structures & Algorithms Midterm",
  "description": "Mandatory online proctored examination.",
  "subject": "Computer Science",
  "durationMinutes": 45,
  "totalMarks": 20,
  "passingMarks": 8,
  "scheduledStartTime": "2026-10-20T10:00:00Z",
  "scheduledEndTime": "2026-10-20T12:00:00Z",
  "questions": [
    {
      "questionText": "What is the time complexity of searching in a Balanced Binary Search Tree?",
      "options": ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
      "correctOptionIndex": 1,
      "marks": 5,
      "explanation": "Balanced BSTs maintain height of log n."
    },
    {
      "questionText": "Which data structure operates on LIFO principle?",
      "options": ["Queue", "Stack", "Array", "Linked List"],
      "correctOptionIndex": 1,
      "marks": 5,
      "explanation": "Stack is Last-In-First-Out."
    }
  ],
  "settings": {
    "faceDetection": true,
    "gazeTracking": true,
    "tabSwitchLimit": 3,
    "audioMonitoring": false,
    "lockdownBrowser": true
  }
}
```
- **Response (201 Created):**
```json
{
  "success": true,
  "message": "Exam created successfully as draft",
  "data": {
    "exam": {
      "_id": "6ad329954b922221f2c80b78",
      "title": "Data Structures & Algorithms Midterm",
      "status": "draft",
      "totalMarks": 20
    }
  }
}
```

---

### `GET /exams/:id`
- **Kaam:** Kisi specific exam ki complete details lena.
- **Access:** Private
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Exam details fetched",
  "data": {
    "exam": {
      "_id": "6ad329954b922221f2c80b78",
      "title": "Data Structures & Algorithms Midterm",
      "questions": [ ... ]
    }
  }
}
```

---

### `POST /exams/:id/publish`
- **Kaam:** Draft exam ko publish karna jisse students use dekh aur de sakein.
- **Access:** Private (Teacher / Admin only)
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Exam published successfully",
  "data": {
    "exam": {
      "_id": "6ad329954b922221f2c80b78",
      "status": "published"
    }
  }
}
```

---

### `POST /exams/:id/archive`
- **Kaam:** Finished exam ko archive karna.
- **Access:** Private (Teacher / Admin only)
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Exam archived successfully"
}
```

---

### `DELETE /exams/:id`
- **Kaam:** Exam ko permanently delete karna.
- **Access:** Private (Teacher / Admin only)
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Exam deleted successfully"
}
```

---

## 4. Consent Routes (`/exams/:id/consent`)

### `POST /exams/:id/consent`
- **Kaam:** Student ka webcam monitoring aur tab tracking agreement record karna exam shuru karne se pehle.
- **Access:** Private (Student)
- **Request Body:**
```json
{
  "cameraAllowed": true,
  "tabTrackingAllowed": true,
  "dataStorageConsent": true
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Proctoring consent recorded successfully",
  "data": {
    "consent": {
      "examId": "6ad329954b922221f2c80b78",
      "studentId": "6ad3238efc5e5182055921f1",
      "cameraAllowed": true,
      "tabTrackingAllowed": true,
      "dataStorageConsent": true,
      "agreedAt": "2026-10-17T13:40:00.000Z"
    }
  }
}
```

---

### `GET /exams/:id/consent`
- **Kaam:** Check karna ki student ne pehle consent diya hai ya nahi.
- **Access:** Private (Student)
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "isConsentGiven": true,
    "consent": { ... }
  }
}
```

---

## 5. Attempt & Quiz Room Routes (`/attempts`)

### `POST /exams/:id/start`
- **Kaam:** Exam room session initiate karna. Timer shuru hota hai aur teacher ko live socket event bhejta hai.
- **Access:** Private (Student)
- **Request Body:** `{}` (Khali body bhej sakte hain)
- **Response (201 Created):**
```json
{
  "success": true,
  "message": "Exam session started successfully",
  "data": {
    "attempt": {
      "_id": "6ad329be4b922221f2c80bcb",
      "examId": "6ad329954b922221f2c80b78",
      "studentId": "6ad3238efc5e5182055921f1",
      "status": "in_progress",
      "startedAt": "2026-10-17T13:40:00.000Z",
      "deadlineAt": "2026-10-17T14:40:00.000Z",
      "answers": [],
      "riskScore": 0
    },
    "exam": {
      "_id": "6ad329954b922221f2c80b78",
      "title": "Data Structures & Algorithms Midterm",
      "questions": [ ... ]
    },
    "remainingSeconds": 3600
  }
}
```

---

### `GET /attempts/:id`
- **Kaam:** Current ongoing test ki details, saved answers aur remaining server time lena.
- **Access:** Private (Student / Teacher)
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "attempt": {
      "_id": "6ad329be4b922221f2c80bcb",
      "status": "in_progress",
      "answers": [
        {
          "questionId": "6ad329954b922221f2c80b79",
          "selectedOptionIndex": 1
        }
      ],
      "riskScore": 15
    },
    "exam": { ... },
    "remainingSeconds": 3410
  }
}
```

---

### `PUT /attempts/:id/answers/:questionId`
- **Kaam:** Har option select hone par answer auto-save karna (Student click karte hi ye call hota hai).
- **Access:** Private (Student)
- **Request Body:**
```json
{
  "selectedOptionIndex": 1
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Answer saved",
  "data": {
    "savedCount": 3,
    "questionId": "6ad329954b922221f2c80b79"
  }
}
```

---

### `POST /attempts/:id/submit`
- **Kaam:** Exam submit karna (Manually finish button se ya 3-alert limit exceed hone par automatically).
- **Access:** Private (Student)
- **Request Body (Manual Submission):**
```json
{
  "autoSubmitted": false,
  "reason": "normal"
}
```
- **Request Body (Auto-Submitted on 3rd Violation):**
```json
{
  "autoSubmitted": true,
  "reason": "violation_limit_exceeded"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Exam submitted successfully",
  "data": {
    "attemptId": "6ad329be4b922221f2c80bcb",
    "score": 15,
    "totalMarks": 20,
    "status": "auto_submitted",
    "submittedAt": "2026-10-17T13:45:00.000Z"
  }
}
```

---

## 6. Monitoring Telemetry & Snapshot Events (`/attempts/:id/events`)

### `POST /attempts/:id/events`
- **Kaam:** **MOST CRITICAL PROCTORING ENDPOINT.** Jab bhi student tab switch kare, camera se mooh ghuma le, phone dikhe ya 3 alerts me se koi bhi violation ho — ye call hota hai. Base64 snapshot ko backend disk par `/video/:studentId/allvideo/` me save karta hai aur teachers ko Socket.IO par live notify karta hai.
- **Access:** Private (Student)
- **Allowed Event Types (`type`):**
  - `TAB_HIDDEN` *(Tab switch ya window blur / Alt+Tab hone par)*
  - `PHONE_DETECTED` *(Mobile phone camera me aane par)*
  - `LOOKING_AWAY` *(Screen se bahar dekhne par)*
  - `MULTIPLE_FACES` *(Ek se zyada log aane par)*
  - `NO_FACE` *(Camera me face na dikhne par)*
  - `CAMERA_INTERRUPTED` *(Camera band ya black cover hone par)*
  - `KEY_RESTRICTION` *(Ctrl+C, Ctrl+V, F12 block hone par)*
  - `PROHIBITED_ACTION` *(Right-click ya DevTools block hone par)*

- **Request Body:**
```json
{
  "type": "PHONE_DETECTED",
  "occurredAt": "2026-10-17T13:42:00.000Z",
  "durationMs": 2500,
  "confidence": 0.92,
  "severity": "high",
  "metadata": {
    "violationNumber": 1,
    "isAutoSubmitTrigger": false
  },
  "snapshotBase64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD..."
}
```
- **Response (201 Created):**
```json
{
  "success": true,
  "message": "Monitoring event recorded",
  "data": {
    "event": {
      "_id": "6ad32a104b922221f2c80bd5",
      "attemptId": "6ad329be4b922221f2c80bcb",
      "studentId": "6ad3238efc5e5182055921f1",
      "examId": "6ad329954b922221f2c80b78",
      "type": "PHONE_DETECTED",
      "severity": "high",
      "confidence": 0.92,
      "evidenceUrl": "/video/6ad3238efc5e5182055921f1/allvideo/1792224120000-phone_detected.jpg",
      "isReviewed": false,
      "reviewDecision": "pending"
    },
    "newRiskScore": 25
  }
}
```

---

### `GET /attempts/:id/events`
- **Kaam:** Kisi attempt ke saare violation events fetch karna timeline view ke liye.
- **Access:** Private
- **Query Params (Optional):**
  - `?type=PHONE_DETECTED`
  - `?severity=high`
- **Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "6ad32a104b922221f2c80bd5",
      "type": "PHONE_DETECTED",
      "occurredAt": "2026-10-17T13:42:00.000Z",
      "evidenceUrl": "/video/6ad3238efc5e5182055921f1/allvideo/1792224120000-phone_detected.jpg",
      "reviewDecision": "pending"
    }
  ]
}
```

---

## 7. Teacher Review & Incident Actions (`/events/:id/reviews`)

### `POST /events/:id/reviews`
- **Kaam:** Teacher kisi violation snapshot frame ko dekh kar use **"valid"** (Confirmed Cheating) ya **"false_alarm"** (Ignored) mark karta hai.
- **Access:** Private (Teacher / Admin only)
- **Request Body:**
```json
{
  "decision": "valid",
  "notes": "Clear smartphone screen visible in student's hand."
}
```
*(Ya false alarm ke liye: `{ "decision": "false_alarm", "notes": "Student sneezed and adjusted glasses" }`)*

- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Review recorded successfully",
  "data": {
    "review": {
      "eventId": "6ad32a104b922221f2c80bd5",
      "reviewerId": "6ad3238efc5e5182055921f0",
      "decision": "valid",
      "notes": "Clear smartphone screen visible in student's hand.",
      "reviewedAt": "2026-10-17T13:45:00.000Z"
    }
  }
}
```

---

## 8. Teacher Portal Routes (`/teacher`)

### `GET /teacher/dashboard`
- **Kaam:** Teacher ke main dashboard ke live metrics, recent violation feed aur active exams summary lena.
- **Access:** Private (Teacher / Admin only)
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "metrics": {
      "totalExams": 4,
      "activeAttempts": 2,
      "pendingReviews": 5,
      "highRiskCount": 1
    },
    "recentEvents": [
      {
        "_id": "6ad32a104b922221f2c80bd5",
        "type": "PHONE_DETECTED",
        "studentId": { "name": "Rahul Sharma", "studentId": "CS-2026-089" },
        "evidenceUrl": "/video/6ad3238efc5e5182055921f1/allvideo/1792224120000-phone_detected.jpg",
        "reviewDecision": "pending"
      }
    ],
    "liveAttempts": [ ... ]
  }
}
```

---

### `GET /teacher/attempts`
- **Kaam:** All student attempts ki table list lena (Search, exam filter aur status filter ke sath).
- **Access:** Private (Teacher / Admin only)
- **Query Params (Optional):**
  - `?examId=6ad329954b922221f2c80b78`
  - `?status=in_progress` *(in_progress, submitted, auto_submitted)*
  - `?riskLevel=high` *(low, medium, high)*
  - `?search=Rahul`
- **Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "6ad329be4b922221f2c80bcb",
      "examId": { "title": "DSA Midterm", "_id": "..." },
      "studentId": { "name": "Rahul Sharma", "email": "rahul@proctorvision.com", "studentId": "CS-001" },
      "status": "auto_submitted",
      "score": 15,
      "totalMarks": 20,
      "riskScore": 65,
      "aiAnalysis": {
        "riskLevel": "high",
        "summary": "3 unauthorized activities flagged (phone detected, tab switch)."
      }
    }
  ]
}
```

---

### `GET /teacher/reviews`
- **Kaam:** **Snapshot Evidence Review Queue** me display karne ke liye saare flagged events aur unki captured images lana.
- **Access:** Private (Teacher / Admin only)
- **Query Params (Optional):**
  - `?status=all` (Default: Sabhi events)
  - `?status=pending` (Sirf jinka decision pending hai)
  - `?status=valid` (Confirmed cheating incidents)
  - `?status=false_alarm` (Dismissed events)
- **Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "6ad32a104b922221f2c80bd5",
      "type": "PHONE_DETECTED",
      "occurredAt": "2026-10-17T13:42:00.000Z",
      "confidence": 0.92,
      "severity": "high",
      "evidenceUrl": "/video/6ad3238efc5e5182055921f1/allvideo/1792224120000-phone_detected.jpg",
      "studentId": {
        "name": "Rahul Sharma",
        "studentId": "CS-2026-089",
        "email": "rahul@proctorvision.com"
      },
      "examId": {
        "title": "DSA Midterm"
      },
      "isReviewed": false,
      "reviewDecision": "pending"
    }
  ]
}
```

---

### `GET /teacher/monitoring-settings`
- **Kaam:** Default AI sensitivity aur proctoring configuration read karna.
- **Access:** Private (Teacher / Admin only)
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "settings": {
      "gazeDeviationSeconds": 4,
      "tabSwitchLimit": 3,
      "confidenceThreshold": 0.75,
      "phoneDetectionEnabled": true,
      "faceVerificationEnabled": true
    }
  }
}
```

---

### `PATCH /teacher/monitoring-settings`
- **Kaam:** Proctoring sensitivity thresholds update karna.
- **Access:** Private (Teacher / Admin only)
- **Request Body:**
```json
{
  "tabSwitchLimit": 3,
  "gazeDeviationSeconds": 5,
  "confidenceThreshold": 0.8
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Monitoring settings updated",
  "data": { "settings": { ... } }
}
```

---

## 9. Claude 3.5 Sonnet AI Proctor Analysis

### `POST /attempts/:id/ai-analysis`
- **Kaam:** Claude 3.5 Sonnet AI engine ko call karke kisi student ke saare telemetry events aur violations ka comprehensive human-like audit report generate karna.
- **Access:** Private (Teacher / Admin only)
- **Request Body:** `{}` (Khali body)
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "AI proctor analysis complete",
  "data": {
    "aiAnalysis": {
      "riskLevel": "high",
      "summary": "Student exhibited 3 distinct proctoring anomalies including an unauthorized electronic device detected in frame at 13:42 and 2 rapid browser tab un-focus events.",
      "recommendation": "Manual review strongly recommended. Verify the saved snapshot frame at /video/... before certifying final score.",
      "keyConcerns": [
        "Unauthorized mobile device captured in webcam frame (92% confidence)",
        "Tab visibility lost twice during critical MCQ section",
        "Examination terminated via 3-alert violation threshold"
      ],
      "confidence": 0.94,
      "analyzedAt": "2026-10-17T13:46:00.000Z"
    }
  }
}
```

---

## 10. Static Snapshot Evidence Storage

### Snapshot Image URL Format
Backend static router `express.static` ke through serve karta hai:
- **Direct Image Path:** `http://localhost:5000/video/:studentId/allvideo/:filename.jpg`

### Frontend Display Helper Function
Frontend me snapshot display karne ke liye ye utility function use karein taaki kisi bhi port par image break na ho:
```javascript
export const getEvidenceUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  return `http://localhost:5000${url.startsWith("/") ? "" : "/"}${url}`;
};

// React Component Example:
<img 
  src={getEvidenceUrl(event.evidenceUrl)} 
  alt="Proctor evidence frame" 
  onError={(e) => { e.target.src = event.evidenceUrl; }} 
/>
```

---

## 11. Real-Time Socket.IO Telemetry Events

Frontend ko `http://localhost:5000` se connect karna hai:

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:5000", {
  transports: ["websocket", "polling"],
  withCredentials: true
});
```

### 1. Client Emits (Teacher / Student Side):
- `socket.emit("join:teacher")` -> Teacher dashboard par aate hi join karein live telemetry pane ke liye.
- `socket.emit("join:exam", examId)` -> Specific exam ke students ke updates ke liye.
- `socket.emit("join:attempt", attemptId)` -> Individual student ke test screen updates ke liye.

### 2. Server Emits (Teacher Real-Time Listeners):
- **`event:flagged`**: Jab bhi kisi student ka naya violation event create ho:
```javascript
socket.on("event:flagged", ({ event, newRiskScore, attemptId }) => {
  console.log("New student violation with evidence:", event.evidenceUrl);
  // Toast show karein ya Review Queue me append karein
});
```

- **`attempt:started`**: Jab koi student exam start kare:
```javascript
socket.on("attempt:started", ({ attemptId, examTitle, student, startedAt }) => {
  console.log(`${student.name} started exam ${examTitle}`);
});
```

- **`attempt:submitted`**: Jab student exam submit kare ya auto-submit ho jaye:
```javascript
socket.on("attempt:submitted", ({ attemptId, student, score, status, reason }) => {
  console.log(`${student.name} exam submitted with status: ${status} (${reason})`);
});
```

---

## 💡 Quick Tips for Your Frontend Teammate:
1. **API Base URL**: Axios instance banate waqt `baseURL: "http://localhost:5000/api/v1"` set karein.
2. **Auth Token**: Har protected request me `headers: { Authorization: \`Bearer \${token}\` }` bhejein.
3. **3-Alert Auto Submit**: Jab student 3rd violation kare to `/attempts/:id/submit` par `{ autoSubmitted: true, reason: "violation_limit_exceeded" }` bhej kar `/student/results` par redirect karein.
4. **CSV Question Upload**: Create Exam page par Teacher CSV upload kare to uske headers hone chahiye:
   `QuestionText,OptionA,OptionB,OptionC,OptionD,CorrectOptionIndex,Marks,Explanation`
