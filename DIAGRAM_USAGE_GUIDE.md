# 📊 Hướng dẫn sử dụng Sơ đồ NLP Workflow

## 🗂️ Import vào Draw.io

### Cách import file XML:

1. **Mở draw.io** (https://app.diagrams.net/)
2. **Create New Diagram** hoặc **Open Existing**
3. **File → Import from → Device**
4. **Chọn file**: `NLP_WORKFLOW_DIAGRAM.xml`
5. **Click Import**

### Alternative method:

1. **Copy nội dung** từ file `NLP_WORKFLOW_DIAGRAM.xml`
2. **Paste vào draw.io** (Ctrl+V)
3. **Diagram sẽ tự động hiển thị**

## 🎨 Giải thích màu sắc và ký hiệu

### **📊 Màu sắc Components:**

| Màu               | Component        | Ý nghĩa               |
| ----------------- | ---------------- | --------------------- |
| 🟢 **Xanh lá**    | Phase Headers    | Các giai đoạn chính   |
| 🟡 **Vàng**       | Processing Boxes | Các bước xử lý        |
| 🔷 **Tím**        | Decision Points  | Điểm quyết định logic |
| 🔴 **Đỏ**         | Fast Mode        | Chế độ tối ưu tốc độ  |
| 🔵 **Xanh dương** | Standard Mode    | Chế độ standard       |
| 🟠 **Cam**        | Cache System     | Hệ thống cache        |
| 🟢 **Xanh nhạt**  | Performance Box  | Thông số hiệu suất    |

### **🔗 Loại đường kẻ:**

| Loại                     | Ý nghĩa                  |
| ------------------------ | ------------------------ |
| **Solid arrows** ➡️      | Luồng chính của workflow |
| **Dashed red lines** ⚡  | Kết nối với Cache System |
| **Decision branches** 🔀 | Các nhánh quyết định     |

## 📋 Giải thích chi tiết các Components

### **Phase 1: Input Processing & Validation**

-   **📥 Input Data**: Dữ liệu đầu vào (CV, Jobs, Skills, Options)
-   **🔍 Validation**: Kiểm tra và chuẩn hóa input
-   **⚙️ Performance Mode Decision**: Quyết định chế độ xử lý
    -   **> 25 jobs** → Fast Mode ⚡
    -   **≤ 25 jobs** → Standard Mode 🐌

### **Phase 2: Preprocessing & Skills Extraction**

-   **📝 CV Processing**: Xử lý CV với cache support
-   **📋 Jobs Processing**: Xử lý jobs với batch processing
-   **🧠 Smart Cache System**: Hệ thống cache thông minh

### **Phase 3: Smart Filtering System**

-   **🎯 Has Required Skills?**: Kiểm tra có skills filter không
    -   **Yes** → Skill-based Filtering 🎯
    -   **No** → General Filtering 🔍

### **Phase 4: Advanced Semantic Matching**

-   **🧠 Embeddings Generation**: Tạo embeddings với cache
-   **🤖 AI Scoring**: Gemini AI scoring với limits
-   **🎯 Hybrid Scoring**: Kết hợp NLP + AI (60% + 40%)

### **Phase 5: Result Processing & Analytics**

-   **📊 Results Compilation**: Tổng hợp kết quả
-   **📈 Performance Analytics**: Phân tích hiệu suất

## 🔧 Thông số hiệu suất trong sơ đồ

### **🚀 Performance Achievements Box:**

-   ⏱️ **Time**: 14s → 2s (86% faster)
-   🧠 **Memory**: 1GB → 25MB (95% less)
-   🎯 **Accuracy**: Improved with AI hybrid
-   ⚡ **Cache**: 60-80% speedup on repeats
-   📊 **Batch**: Prevents memory spikes
-   🔧 **Auto-scale**: Dynamic optimization

### **🧠 Memory Optimizations Box:**

-   **Cache Management**: MAX_SIZE 1000, Auto cleanup 10%
-   **Batch Processing**: Dynamic sizes, Memory spike prevention

## 🎯 Cách đọc luồng workflow

### **Luồng chính (Main Flow):**

```
INPUT → VALIDATE → MODE_DECISION → PREPROCESS → FILTER → SEMANTIC_MATCH → RESULTS
```

### **Cache Integration:**

-   Cache System kết nối với **CV Processing**, **Jobs Processing**, và **Embeddings**
-   Đường kẻ đỏ đứt nét thể hiện cache connections

### **Decision Points:**

1. **Performance Mode**: Fast vs Standard based on dataset size
2. **Filtering Strategy**: Skills-based vs General based on input

## 📈 Monitoring workflow performance

### **Metrics tracked** (hiển thị trong Analytics box):

-   Processing time per stage
-   Memory usage patterns
-   Cache hit/miss rates
-   AI quota utilization
-   Score distributions

### **Real-time optimization:**

-   Auto-adjust parameters
-   Dynamic cache management
-   Adaptive batch sizing
-   Smart quota management

## 🔄 Workflow Scenarios

### **Scenario 1: Large Dataset (> 25 jobs)**

```
INPUT → VALIDATE → FAST_MODE → PREPROCESS(cached) → SKILL_FILTER → SEMANTIC(batch) → AI(limited) → RESULTS
```

### **Scenario 2: Small Dataset (≤ 25 jobs)**

```
INPUT → VALIDATE → STANDARD_MODE → PREPROCESS(cached) → GENERAL_FILTER → SEMANTIC(full) → AI(enhanced) → RESULTS
```

### **Scenario 3: Cached Request**

```
INPUT → VALIDATE → MODE → PREPROCESS(cache_hit) → FILTER(cache_hit) → SEMANTIC(cache_hit) → RESULTS
```

## 🎨 Customizing the diagram

### **Để chỉnh sửa diagram trong draw.io:**

1. **Double-click** vào component để edit text
2. **Right-click** để thay đổi colors/styles
3. **Drag** để move components
4. **Resize** bằng cách drag corners
5. **Add new components** từ sidebar
6. **Connect** components với arrows

### **Export options:**

-   **PNG/JPG**: Cho presentations
-   **PDF**: Cho documentation
-   **SVG**: Cho web
-   **XML**: Để backup/share

## 📁 Files liên quan

-   📋 `NLP_WORKFLOW_DOCUMENTATION.md` - Chi tiết technical
-   🗂️ `NLP_WORKFLOW_DIAGRAM.xml` - Sơ đồ gốc
-   📊 `OPTIMIZATION_SUMMARY.md` - Tóm tắt optimization
-   ⚙️ `src/lib/matchJobNLP.js` - Code implementation

---

**Tip**: Sơ đồ này giúp visualize toàn bộ workflow và hiểu rõ các optimization points trong hệ thống NLP! 🚀
