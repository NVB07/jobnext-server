# 🚀 Hybrid Job Matching System

## 📋 Overview

Hệ thống matching mới kết hợp 3 approaches khác nhau để tối ưu hóa độ chính xác và performance:

1. **TF-IDF + Logistic Regression** (như tài liệu đề xuất)
2. **Transformer-based Semantic Matching** (hệ thống hiện tại)
3. **Multi-label Skill Classification**

## 🔧 API Endpoints

### 1. Hybrid Search (Khuyến nghị)

```
POST /api/jobs/hybrid-search
```

**Request Body:**

```json
{
    "review": "CV content text",
    "skill": "react,javascript",
    "location": "Ho Chi Minh",
    "jobLevel": "junior",
    "uid": "user_id",
    "method": "hybrid" // "hybrid" | "tfidf" | "transformer"
}
```

**Query Parameters:**

```
?page=1&perPage=20
```

## 🎯 Matching Methods

### Method 1: `hybrid` (Recommended)

-   **Weight**: 55% Semantic + 25% TF-IDF + 20% Skills
-   **Best for**: Cân bằng giữa accuracy và performance
-   **Auto fast-mode**: Khi >50 jobs

```javascript
// Usage
{
  "method": "hybrid",
  "tfIdfWeight": 0.25,
  "semanticWeight": 0.55,
  "skillWeight": 0.20
}
```

### Method 2: `tfidf`

-   **Speed**: Cực nhanh (~2ms)
-   **Best for**: Large datasets (>100 jobs)
-   **Approach**: Keyword frequency matching

### Method 3: `transformer`

-   **Accuracy**: Cao nhất
-   **Best for**: High-quality matching
-   **Includes**: Gemini AI scoring

## 📊 Performance Comparison

| Method          | Speed  | Accuracy   | Best Use Case                   |
| --------------- | ------ | ---------- | ------------------------------- |
| **TF-IDF**      | ⚡⚡⚡ | ⭐⭐⭐     | Large datasets, quick filtering |
| **Transformer** | ⚡     | ⭐⭐⭐⭐⭐ | High-quality matching           |
| **Hybrid**      | ⚡⚡   | ⭐⭐⭐⭐   | Balanced approach               |

## 🔄 Migration từ hệ thống cũ

### Current endpoint:

```javascript
POST / api / jobs / search; // Transformer-based
```

### New endpoints:

```javascript
POST /api/jobs/hybrid-search?method=hybrid     // Recommended
POST /api/jobs/hybrid-search?method=tfidf      // Fast mode
POST /api/jobs/hybrid-search?method=transformer // Same as old
```

## 📈 Score Breakdown

### Response format:

```json
{
    "success": true,
    "data": [
        {
            "_id": "job_id",
            "title": "Job title",
            "semanticScore": 96.0,
            "matchData": {
                "method": "hybrid",
                "hybridScore": "96.00",
                "breakdown": {
                    "semantic": "94.00",
                    "tfidf": "100.00",
                    "skillMatch": "95.00"
                },
                "detectedSkills": ["javascript", "react", "frontend"]
            }
        }
    ],
    "searchInfo": {
        "method": "hybrid",
        "maxScore": "96.0",
        "totalMatched": 25,
        "requiredSkills": ["react", "javascript"]
    }
}
```

## ⚙️ Configuration

### Adaptive Fast Mode

```javascript
// Auto-enable fast mode for large datasets
const options = {
    enableFastMode: allJobs.length > 50, // TF-IDF pre-filtering
    tfIdfWeight: 0.25, // 25% keyword matching
    semanticWeight: 0.55, // 55% semantic similarity
    skillWeight: 0.2, // 20% skill classification
};
```

### Skill Detection

```javascript
// Supported skills with variants
const skills = ["javascript", "react", "nodejs", "python", "java", "frontend", "backend", "fullstack", "mobile", "devops"];

// Vietnamese support
const variants = {
    frontend: ["frontend", "front end", "giao diện"],
    backend: ["backend", "back end", "máy chủ"],
    mobile: ["mobile", "di động", "app"],
};
```

## 🚀 Implementation Examples

### Frontend Integration

```javascript
// React example
const searchJobs = async (searchData, method = "hybrid") => {
    const response = await fetch("/api/jobs/hybrid-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            ...searchData,
            method: method,
        }),
    });

    const result = await response.json();

    // Handle different score types
    result.data.forEach((job) => {
        if (job.matchData.method === "hybrid") {
            console.log(`Hybrid Score: ${job.matchData.hybridScore}%`);
            console.log(`Breakdown:`, job.matchData.breakdown);
        } else {
            console.log(`${job.matchData.method} Score: ${job.semanticScore}%`);
        }
    });
};

// Quick search for large datasets
await searchJobs(data, "tfidf");

// High-quality search
await searchJobs(data, "hybrid");
```

### Backend Customization

```javascript
// Custom weights for specific use cases
app.post("/custom-search", async (req, res) => {
    const hybridEngine = new HybridMatchingEngine();

    const result = await hybridEngine.hybridMatch(cvText, jobTexts, requiredSkills, {
        tfIdfWeight: 0.4, // More keyword focus
        semanticWeight: 0.4, // Less semantic
        skillWeight: 0.2, // Same skill weight
        enableFastMode: true,
    });

    res.json(result);
});
```

## 🎯 Best Practices

### 1. Choose the right method:

-   **Large datasets (>100 jobs)**: `tfidf` hoặc `hybrid` với fast mode
-   **High accuracy needed**: `hybrid` hoặc `transformer`
-   **Quick filtering**: `tfidf`

### 2. Optimize for your use case:

-   **Skill-heavy matching**: Tăng `skillWeight`
-   **Semantic understanding**: Tăng `semanticWeight`
-   **Keyword precision**: Tăng `tfIdfWeight`

### 3. Performance monitoring:

```javascript
// Track performance
console.log(`Method: ${result.searchInfo.method}`);
console.log(`Max Score: ${result.searchInfo.maxScore}`);
console.log(`Total Matched: ${result.searchInfo.totalMatched}`);
```

## 🔮 Future Enhancements

1. **Machine Learning Pipeline**: Train actual Logistic Regression model
2. **A/B Testing**: Compare approaches in production
3. **User Feedback**: Incorporate click-through rates
4. **Real-time Learning**: Update weights based on user behavior

---

## 📞 Support

Nếu có vấn đề với hybrid matching system, check:

1. TF-IDF scores có normalize không (0-100%)
2. Gemini quota status
3. Method parameter đúng format
4. Required skills array format
