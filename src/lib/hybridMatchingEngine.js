const natural = require("natural");
const { matchJobsNLP } = require("./matchJobNLP");

/**
 * Hybrid Job Matching Engine
 * Combines TF-IDF + Logistic Regression approach with Transformer-based semantic matching
 */
class HybridMatchingEngine {
    constructor() {
        this.tfidf = new natural.TfIdf();
        this.isInitialized = false;
        this.jobClassifier = null;
        this.skillLabels = [
            // 🎯 Core Programming Languages (IT)
            "javascript",
            "typescript",
            "python",
            "java",
            "php",
            "nodejs",

            // 🎯 Frontend Frameworks (IT)
            "react",
            "angular",
            "vue",
            "html",
            "css",

            // 🎯 Databases (IT)
            "mysql",
            "mongodb",
            "postgresql",
            "redis",

            // 🎯 Cloud & DevOps (IT)
            "aws",
            "docker",
            "kubernetes",
            "git",
            "linux",

            // 🎯 IT Categories
            "frontend",
            "backend",
            "fullstack",
            "mobile",
            "devops",
            "ai_ml",
            "testing",

            // 🎯 Additional IT Technologies
            "elasticsearch",
            "graphql",
            "microservices",
            "agile",

            // 💼 BUSINESS & MANAGEMENT
            "management",
            "leadership",
            "project_management",
            "team_management",
            "strategic_planning",
            "business_analysis",
            "process_improvement",
            "change_management",
            "risk_management",

            // 💰 FINANCE & ACCOUNTING
            "accounting",
            "financial_analysis",
            "budgeting",
            "auditing",
            "tax",
            "investment",
            "financial_reporting",
            "cost_accounting",
            "treasury",
            "compliance",

            // 📈 MARKETING & SALES
            "marketing",
            "digital_marketing",
            "social_media",
            "seo",
            "content_marketing",
            "sales",
            "customer_service",
            "crm",
            "market_research",
            "brand_management",

            // 🏥 HEALTHCARE
            "nursing",
            "medical",
            "healthcare",
            "patient_care",
            "clinical",
            "pharmacy",
            "radiology",
            "surgery",
            "emergency_care",
            "health_administration",

            // 🎓 EDUCATION
            "teaching",
            "education",
            "curriculum",
            "training",
            "academic",
            "research",
            "student_support",
            "educational_technology",
            "assessment",
            "pedagogy",

            // 🏗️ ENGINEERING & CONSTRUCTION
            "civil_engineering",
            "mechanical_engineering",
            "electrical_engineering",
            "construction",
            "project_engineering",
            "quality_control",
            "safety",
            "cad",
            "autocad",

            // 🎨 DESIGN & CREATIVE
            "graphic_design",
            "ui_ux_design",
            "creative",
            "photography",
            "video_editing",
            "adobe",
            "photoshop",
            "illustrator",
            "branding",
            "visual_design",

            // 👩‍💼 HR & ADMINISTRATION
            "human_resources",
            "recruitment",
            "hr",
            "payroll",
            "employee_relations",
            "administrative",
            "office_management",
            "data_entry",
            "documentation",

            // 🚚 LOGISTICS & OPERATIONS
            "logistics",
            "supply_chain",
            "operations",
            "warehouse",
            "inventory",
            "transportation",
            "distribution",
            "procurement",
            "vendor_management",

            // 🔬 SCIENCE & RESEARCH
            "research",
            "laboratory",
            "data_analysis",
            "statistics",
            "quality_assurance",
            "scientific",
            "analysis",
            "testing",
            "validation",
            "documentation",

            // 🏪 RETAIL & HOSPITALITY
            "retail",
            "customer_service",
            "hospitality",
            "food_service",
            "restaurant",
            "hotel",
            "tourism",
            "event_management",
            "guest_relations",

            // 💬 COMMUNICATION & LANGUAGES
            "communication",
            "writing",
            "translation",
            "interpretation",
            "public_relations",
            "english",
            "vietnamese",
            "presentation",
            "negotiation",
            "interpersonal",

            // 🔧 TECHNICAL & SKILLED TRADES
            "maintenance",
            "repair",
            "technical_support",
            "troubleshooting",
            "installation",
            "mechanical",
            "electrical",
            "plumbing",
            "hvac",
            "automotive",
        ];
    }

    /**
     * Initialize TF-IDF model with job dataset
     */
    async initializeTfIdf(jobTexts) {
        if (this.isInitialized) return;

        console.log("🏗️ Initializing TF-IDF model...");

        // Clear existing documents
        this.tfidf = new natural.TfIdf();

        // Add all job texts to TF-IDF
        jobTexts.forEach((jobText, index) => {
            const cleanText = this.preprocessText(jobText);
            this.tfidf.addDocument(cleanText);
        });

        this.isInitialized = true;
        console.log(`✅ TF-IDF initialized with ${jobTexts.length} jobs`);
    }

    /**
     * Preprocess text for TF-IDF (lighter than semantic preprocessing)
     */
    preprocessText(text) {
        return text
            .toLowerCase()
            .replace(/<[^>]*>/g, " ") // Remove HTML
            .replace(/[^\w\sÀ-ỹ]/g, " ") // Keep alphanumeric and Vietnamese chars
            .replace(/\s+/g, " ")
            .trim();
    }

    /**
     * TF-IDF based job matching (fast, keyword-focused)
     */
    getTfIdfScores(cvText, jobTexts) {
        const cleanCvText = this.preprocessText(cvText);
        const scores = [];

        // Calculate TF-IDF similarity for each job
        this.tfidf.tfidfs(cleanCvText, (i, measure) => {
            // 🚀 ULTRA-STRICT: Even more conservative TF-IDF scaling to prevent score inflation
            const normalizedScore = Math.min(measure * 2, 45); // Reduced from *3 to *2, max 45% instead of 60%
            scores.push({
                jobIndex: i,
                tfidfScore: normalizedScore,
                method: "tfidf",
            });
        });

        return scores.sort((a, b) => b.tfidfScore - a.tfidfScore);
    }

    /**
     * Multi-label skill classification using simple keyword matching
     * (Simplified version of Logistic Regression approach)
     */
    classifySkills(text) {
        const cleanText = this.preprocessText(text);
        const foundSkills = [];

        // Simple keyword-based classification
        this.skillLabels.forEach((skill) => {
            const skillVariants = this.getSkillVariants(skill);
            const hasSkill = skillVariants.some((variant) => cleanText.includes(variant.toLowerCase()));

            if (hasSkill) {
                foundSkills.push({
                    skill,
                    confidence: this.calculateSkillConfidence(cleanText, skillVariants),
                });
            }
        });

        return foundSkills.sort((a, b) => b.confidence - a.confidence);
    }

    /**
     * Get skill variants for better matching (multi-industry support)
     */
    getSkillVariants(skill) {
        const variants = {
            // 🎯 IT & Programming Skills
            javascript: ["javascript", "js", "java script", "node js", "vanilla js"],
            react: ["react", "reactjs", "react js", "react.js", "react native"],
            nodejs: ["node", "nodejs", "node js", "node.js", "backend node"],
            python: ["python", "py", "python3", "django", "flask"],
            java: ["java", "spring", "spring boot", "java ee"],
            php: ["php", "laravel", "symfony", "php7", "php8"],
            angular: ["angular", "angularjs", "angular js", "angular2+"],
            vue: ["vue", "vuejs", "vue js", "vue.js", "nuxt"],
            mysql: ["mysql", "sql", "database", "db", "mariadb"],
            mongodb: ["mongodb", "mongo", "nosql", "mongoose"],
            postgresql: ["postgresql", "postgres", "psql"],
            aws: ["aws", "amazon web services", "cloud", "ec2", "s3"],
            docker: ["docker", "container", "containerization", "docker-compose"],
            kubernetes: ["kubernetes", "k8s", "container orchestration"],
            frontend: ["frontend", "front end", "front-end", "giao diện", "ui/ux", "client side"],
            backend: ["backend", "back end", "back-end", "máy chủ", "server", "api", "server side"],
            fullstack: ["fullstack", "full stack", "full-stack", "toàn stack", "end to end"],
            mobile: ["mobile", "di động", "app", "android", "ios", "flutter", "react native"],
            devops: ["devops", "dev ops", "ci/cd", "deployment", "infrastructure"],
            ai_ml: ["ai", "ml", "machine learning", "artificial intelligence", "deep learning", "tensorflow", "pytorch"],
            typescript: ["typescript", "ts", "typed javascript"],
            css: ["css", "css3", "scss", "sass", "less", "stylesheets"],
            html: ["html", "html5", "markup", "web markup"],
            git: ["git", "github", "gitlab", "version control", "source control"],
            linux: ["linux", "ubuntu", "centos", "unix", "shell"],
            redis: ["redis", "cache", "in-memory", "key-value"],
            elasticsearch: ["elasticsearch", "elastic", "search engine", "elk"],
            graphql: ["graphql", "apollo", "api query language"],
            microservices: ["microservices", "micro services", "service oriented"],
            agile: ["agile", "scrum", "kanban", "sprint"],
            testing: ["testing", "unit test", "integration test", "jest", "cypress", "kiểm thử"],

            // 💼 BUSINESS & MANAGEMENT
            management: ["management", "quản lý", "manager", "lead", "supervisor", "giám sát"],
            leadership: ["leadership", "lãnh đạo", "team lead", "leader", "chỉ đạo"],
            project_management: ["project management", "quản lý dự án", "pm", "project manager", "scrum master"],
            team_management: ["team management", "quản lý nhóm", "team lead", "nhóm trưởng"],
            strategic_planning: ["strategic planning", "lập kế hoạch chiến lược", "strategy", "chiến lược"],
            business_analysis: ["business analysis", "phân tích kinh doanh", "ba", "business analyst"],
            process_improvement: ["process improvement", "cải tiến quy trình", "lean", "six sigma"],
            change_management: ["change management", "quản lý thay đổi", "organizational change"],
            risk_management: ["risk management", "quản lý rủi ro", "risk assessment", "đánh giá rủi ro"],

            // 💰 FINANCE & ACCOUNTING
            accounting: ["accounting", "kế toán", "accountant", "bookkeeping", "sổ sách"],
            financial_analysis: ["financial analysis", "phân tích tài chính", "financial analyst"],
            budgeting: ["budgeting", "lập ngân sách", "budget planning", "dự toán"],
            auditing: ["auditing", "kiểm toán", "audit", "internal audit", "external audit"],
            tax: ["tax", "thuế", "taxation", "tax planning", "kê khai thuế"],
            investment: ["investment", "đầu tư", "portfolio", "securities", "chứng khoán"],
            financial_reporting: ["financial reporting", "báo cáo tài chính", "financial statements"],
            cost_accounting: ["cost accounting", "kế toán chi phí", "cost analysis"],
            treasury: ["treasury", "quỹ", "cash management", "quản lý tiền mặt"],
            compliance: ["compliance", "tuân thủ", "regulatory", "quy định"],

            // 📈 MARKETING & SALES
            marketing: ["marketing", "tiếp thị", "digital marketing", "online marketing"],
            digital_marketing: ["digital marketing", "tiếp thị số", "online marketing", "internet marketing"],
            social_media: ["social media", "mạng xã hội", "facebook", "instagram", "tiktok", "linkedin"],
            seo: ["seo", "search engine optimization", "tối ưu hóa công cụ tìm kiếm"],
            content_marketing: ["content marketing", "tiếp thị nội dung", "content creation"],
            sales: ["sales", "bán hàng", "selling", "revenue", "doanh thu"],
            customer_service: ["customer service", "chăm sóc khách hàng", "support", "hỗ trợ"],
            crm: ["crm", "customer relationship management", "quản lý khách hàng"],
            market_research: ["market research", "nghiên cứu thị trường", "market analysis"],
            brand_management: ["brand management", "quản lý thương hiệu", "branding"],

            // 🏥 HEALTHCARE
            nursing: ["nursing", "điều dưỡng", "nurse", "y tá", "chăm sóc"],
            medical: ["medical", "y tế", "healthcare", "clinical", "lâm sàng"],
            healthcare: ["healthcare", "chăm sóc sức khỏe", "y tế", "medical care"],
            patient_care: ["patient care", "chăm sóc bệnh nhân", "nursing care"],
            clinical: ["clinical", "lâm sàng", "clinic", "phòng khám"],
            pharmacy: ["pharmacy", "dược", "pharmacist", "dược sĩ", "medication"],
            radiology: ["radiology", "chẩn đoán hình ảnh", "x-ray", "mri", "ct scan"],
            surgery: ["surgery", "phẫu thuật", "surgical", "operation", "ca mổ"],
            emergency_care: ["emergency care", "cấp cứu", "emergency", "first aid"],
            health_administration: ["health administration", "quản lý y tế", "hospital management"],

            // 🎓 EDUCATION
            teaching: ["teaching", "giảng dạy", "teacher", "giáo viên", "instructor"],
            education: ["education", "giáo dục", "academic", "học thuật", "pedagogy"],
            curriculum: ["curriculum", "chương trình học", "course design", "syllabus"],
            training: ["training", "đào tạo", "workplace training", "skill development"],
            academic: ["academic", "học thuật", "university", "research", "nghiên cứu"],
            research: ["research", "nghiên cứu", "thesis", "luận văn", "publication"],
            student_support: ["student support", "hỗ trợ học sinh", "counseling", "tư vấn"],
            educational_technology: ["educational technology", "công nghệ giáo dục", "e-learning"],
            assessment: ["assessment", "đánh giá", "evaluation", "testing", "kiểm tra"],
            pedagogy: ["pedagogy", "sư phạm", "teaching methods", "phương pháp giảng dạy"],

            // 🏗️ ENGINEERING & CONSTRUCTION
            civil_engineering: ["civil engineering", "kỹ thuật xây dựng", "construction engineering"],
            mechanical_engineering: ["mechanical engineering", "kỹ thuật cơ khí", "mechanical design"],
            electrical_engineering: ["electrical engineering", "kỹ thuật điện", "electronics"],
            construction: ["construction", "xây dựng", "building", "thi công"],
            project_engineering: ["project engineering", "kỹ thuật dự án", "engineering management"],
            quality_control: ["quality control", "kiểm soát chất lượng", "qc", "quality assurance"],
            safety: ["safety", "an toàn", "workplace safety", "an toàn lao động"],
            cad: ["cad", "computer aided design", "thiết kế hỗ trợ máy tính"],
            autocad: ["autocad", "auto cad", "technical drawing", "bản vẽ kỹ thuật"],

            // 🎨 DESIGN & CREATIVE
            graphic_design: ["graphic design", "thiết kế đồ họa", "visual design"],
            ui_ux_design: ["ui ux design", "thiết kế giao diện", "user experience", "user interface"],
            creative: ["creative", "sáng tạo", "creativity", "artistic", "nghệ thuật"],
            photography: ["photography", "nhiếp ảnh", "photo editing", "chỉnh sửa ảnh"],
            video_editing: ["video editing", "chỉnh sửa video", "video production"],
            adobe: ["adobe", "photoshop", "illustrator", "after effects", "premiere"],
            photoshop: ["photoshop", "ps", "photo editing", "image editing"],
            illustrator: ["illustrator", "ai", "vector design", "illustration"],
            branding: ["branding", "xây dựng thương hiệu", "brand identity"],
            visual_design: ["visual design", "thiết kế hình ảnh", "graphic arts"],

            // 👩‍💼 HR & ADMINISTRATION
            human_resources: ["human resources", "nhân sự", "hr", "people management"],
            recruitment: ["recruitment", "tuyển dụng", "hiring", "talent acquisition"],
            hr: ["hr", "human resources", "nhân sự", "people operations"],
            payroll: ["payroll", "lương bổng", "salary", "compensation"],
            employee_relations: ["employee relations", "quan hệ nhân viên", "labor relations"],
            administrative: ["administrative", "hành chính", "admin", "office work"],
            office_management: ["office management", "quản lý văn phòng", "administrative support"],
            data_entry: ["data entry", "nhập liệu", "data processing", "xử lý dữ liệu"],
            documentation: ["documentation", "tài liệu", "record keeping", "lưu trữ"],

            // 🚚 LOGISTICS & OPERATIONS
            logistics: ["logistics", "logistics", "supply chain", "chuỗi cung ứng"],
            supply_chain: ["supply chain", "chuỗi cung ứng", "procurement", "mua sắm"],
            operations: ["operations", "vận hành", "operational management"],
            warehouse: ["warehouse", "kho bãi", "storage", "inventory management"],
            inventory: ["inventory", "hàng tồn kho", "stock management", "quản lý tồn kho"],
            transportation: ["transportation", "vận chuyển", "shipping", "delivery"],
            distribution: ["distribution", "phân phối", "logistics", "supply chain"],
            procurement: ["procurement", "mua sắm", "purchasing", "vendor management"],
            vendor_management: ["vendor management", "quản lý nhà cung cấp", "supplier relations"],

            // 🔬 SCIENCE & RESEARCH
            laboratory: ["laboratory", "phòng thí nghiệm", "lab", "research lab"],
            data_analysis: ["data analysis", "phân tích dữ liệu", "statistics", "thống kê"],
            statistics: ["statistics", "thống kê", "statistical analysis", "data science"],
            quality_assurance: ["quality assurance", "đảm bảo chất lượng", "qa", "testing"],
            scientific: ["scientific", "khoa học", "science", "research methodology"],
            analysis: ["analysis", "phân tích", "analytical", "investigation"],
            validation: ["validation", "xác thực", "verification", "kiểm tra"],

            // 🏪 RETAIL & HOSPITALITY
            retail: ["retail", "bán lẻ", "store", "shop", "cửa hàng"],
            hospitality: ["hospitality", "khách sạn", "hotel", "restaurant", "nhà hàng"],
            food_service: ["food service", "dịch vụ ăn uống", "restaurant", "catering"],
            restaurant: ["restaurant", "nhà hàng", "food service", "dining"],
            hotel: ["hotel", "khách sạn", "hospitality", "accommodation"],
            tourism: ["tourism", "du lịch", "travel", "tour guide", "hướng dẫn viên"],
            event_management: ["event management", "quản lý sự kiện", "event planning"],
            guest_relations: ["guest relations", "quan hệ khách hàng", "customer relations"],

            // 💬 COMMUNICATION & LANGUAGES
            communication: ["communication", "giao tiếp", "interpersonal", "presentation"],
            writing: ["writing", "viết", "content writing", "copywriting"],
            translation: ["translation", "dịch thuật", "interpreter", "phiên dịch"],
            interpretation: ["interpretation", "phiên dịch", "translator", "language"],
            public_relations: ["public relations", "quan hệ công chúng", "pr", "media relations"],
            english: ["english", "tiếng anh", "english language", "english communication"],
            vietnamese: ["vietnamese", "tiếng việt", "vietnamese language"],
            presentation: ["presentation", "thuyết trình", "public speaking", "nói trước đám đông"],
            negotiation: ["negotiation", "đàm phán", "bargaining", "deal making"],
            interpersonal: ["interpersonal", "kỹ năng giao tiếp", "social skills"],

            // 🔧 TECHNICAL & SKILLED TRADES
            maintenance: ["maintenance", "bảo trì", "repair", "sửa chữa"],
            repair: ["repair", "sửa chữa", "fix", "troubleshooting"],
            technical_support: ["technical support", "hỗ trợ kỹ thuật", "it support"],
            troubleshooting: ["troubleshooting", "khắc phục sự cố", "problem solving"],
            installation: ["installation", "lắp đặt", "setup", "thiết lập"],
            mechanical: ["mechanical", "cơ khí", "machinery", "equipment"],
            electrical: ["electrical", "điện", "electronics", "điện tử"],
            plumbing: ["plumbing", "ống nước", "pipe", "water system"],
            hvac: ["hvac", "điều hòa", "air conditioning", "heating", "ventilation"],
            automotive: ["automotive", "ô tô", "car", "vehicle", "xe cộ"],
        };

        return variants[skill] || [skill];
    }

    /**
     * Calculate skill confidence based on frequency (ultra-strict scoring)
     */
    calculateSkillConfidence(text, skillVariants) {
        let totalMatches = 0;
        let distinctMatches = 0; // Count distinct skill mentions

        skillVariants.forEach((variant) => {
            const regex = new RegExp(`\\b${variant}\\b`, "gi");
            const matches = text.match(regex);
            if (matches && matches.length > 0) {
                totalMatches += matches.length;
                distinctMatches++;
            }
        });

        // 🎯 ULTRA-STRICT: Much more conservative confidence calculation
        // Base score from distinct mentions (prevents spam)
        const baseScore = Math.min(distinctMatches * 20, 40); // Max 40% from distinct mentions (reduced from 60%)

        // Frequency bonus (much more diminishing returns)
        const frequencyBonus = Math.min(Math.log(totalMatches + 1) * 8, 15); // Max 15% bonus (reduced from 30%)

        // 🆕 NEW: Context penalty - single mention gets penalty
        const contextPenalty = totalMatches === 1 ? 5 : 0; // -5% for single mention

        // Final confidence with much more realistic scaling
        const confidence = Math.min(baseScore + frequencyBonus - contextPenalty, 70); // Cap at 70% (reduced from 85%)

        return confidence;
    }

    /**
     * Hybrid matching: Combine TF-IDF and Transformer approaches
     */
    async hybridMatch(cvText, jobTexts, requiredSkills = [], options = {}) {
        const {
            tfIdfWeight = 0.3, // 30% TF-IDF
            semanticWeight = 0.5, // 50% Semantic (Transformer)
            skillWeight = 0.2, // 20% Skill classification
            enableFastMode = false, // Quick TF-IDF only for large datasets
        } = options;

        console.log("🔥 Starting Hybrid Job Matching...");
        console.time("Hybrid matching");

        // Initialize TF-IDF if needed
        await this.initializeTfIdf(jobTexts);

        // Step 1: Fast TF-IDF filtering for large datasets
        let filteredIndices = null;
        if (enableFastMode || jobTexts.length > 50) {
            console.log("⚡ Fast mode: Using TF-IDF pre-filtering...");
            const tfidfScores = this.getTfIdfScores(cvText, jobTexts);

            // Take top 30 jobs for semantic processing
            filteredIndices = tfidfScores.slice(0, 30).map((score) => score.jobIndex);

            console.log(`📊 TF-IDF filtered: ${jobTexts.length} → ${filteredIndices.length} jobs`);
        }

        // Step 2: Get semantic scores (using existing transformer system)
        const semanticResult = await matchJobsNLP(cvText, filteredIndices ? filteredIndices.map((i) => jobTexts[i]) : jobTexts, requiredSkills);

        // Step 3: Classify skills for both CV and jobs
        const cvSkills = this.classifySkills(cvText);
        console.log(`🎯 CV Skills detected: ${cvSkills.map((s) => s.skill).join(", ")}`);

        // Step 4: Combine all scores
        const hybridResults = semanticResult.jobMatches.map((match, index) => {
            const actualJobIndex = filteredIndices ? filteredIndices[index] : index;
            const jobText = jobTexts[actualJobIndex];

            // Get individual scores
            const semanticScore = parseFloat(match.matchScore);
            const tfidfScores = this.getTfIdfScores(cvText, [jobText]);
            const tfidfScore = tfidfScores[0]?.tfidfScore || 0;

            // Skill matching score
            const jobSkills = this.classifySkills(jobText);
            const skillMatchScore = this.calculateSkillMatchScore(cvSkills, jobSkills);

            // Normalize scores to ensure fair weighting
            const normalizedSemantic = Math.min(semanticScore, 100);
            const normalizedTfIdf = Math.min(tfidfScore, 100);
            const normalizedSkills = Math.min(skillMatchScore, 100);

            // Calculate hybrid score with proper weighting
            const hybridScore = normalizedSemantic * semanticWeight + normalizedTfIdf * tfIdfWeight + normalizedSkills * skillWeight;

            return {
                ...match,
                jobIndex: actualJobIndex,
                hybridScore: Math.min(hybridScore, 100).toFixed(2),
                scores: {
                    semantic: normalizedSemantic.toFixed(2),
                    tfidf: normalizedTfIdf.toFixed(2),
                    skillMatch: normalizedSkills.toFixed(2),
                },
                detectedSkills: jobSkills.map((s) => s.skill),
                method: "hybrid",
            };
        });

        // Sort by hybrid score
        hybridResults.sort((a, b) => parseFloat(b.hybridScore) - parseFloat(a.hybridScore));

        console.timeEnd("Hybrid matching");

        // 📊 ENHANCED: Score distribution analysis
        const scores = hybridResults.map((r) => parseFloat(r.hybridScore));
        const maxScore = Math.max(...scores);
        const minScore = Math.min(...scores);
        const avgScore = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);

        // Count score ranges
        const scoreRanges = {
            perfect: scores.filter((s) => s >= 95).length,
            excellent: scores.filter((s) => s >= 85 && s < 95).length,
            good: scores.filter((s) => s >= 70 && s < 85).length,
            fair: scores.filter((s) => s >= 50 && s < 70).length,
            poor: scores.filter((s) => s < 50).length,
        };

        console.log(`📈 Hybrid Results: ${hybridResults.length} jobs | Max: ${maxScore.toFixed(1)}% | Avg: ${avgScore}% | Min: ${minScore.toFixed(1)}%`);
        console.log(
            `📊 Score Distribution: Perfect(95-100%): ${scoreRanges.perfect}, Excellent(85-94%): ${scoreRanges.excellent}, Good(70-84%): ${scoreRanges.good}, Fair(50-69%): ${scoreRanges.fair}, Poor(<50%): ${scoreRanges.poor}`
        );

        // 🚨 WARNING: Alert if too many high scores (indicates potential scoring issue)
        if (scoreRanges.perfect > hybridResults.length * 0.3) {
            console.warn(
                `⚠️  HIGH SCORE ALERT: ${scoreRanges.perfect}/${hybridResults.length} jobs (${((scoreRanges.perfect / hybridResults.length) * 100).toFixed(
                    1
                )}%) have 95%+ scores. Consider tuning scoring algorithm.`
            );
        }

        console.log(`📈 Hybrid Results: ${hybridResults.length} jobs, max score: ${maxScore.toFixed(1)}%`);

        return {
            ...semanticResult,
            jobMatches: hybridResults,
            hybridInfo: {
                method: enableFastMode ? "fast_hybrid" : "full_hybrid",
                weights: { tfIdfWeight, semanticWeight, skillWeight },
                cvSkills: cvSkills.map((s) => s.skill),
                totalJobsProcessed: hybridResults.length,
            },
        };
    }

    /**
     * Calculate skill match score between CV and job (ultra-strict scoring)
     */
    calculateSkillMatchScore(cvSkills, jobSkills) {
        // 🎯 ULTRA-STRICT: Much lower neutral score for jobs with no skills
        if (jobSkills.length === 0) return 25; // Reduced from 45% to 25%

        const cvSkillNames = new Set(cvSkills.map((s) => s.skill));
        const jobSkillNames = new Set(jobSkills.map((s) => s.skill));

        const commonSkills = [...cvSkillNames].filter((skill) => jobSkillNames.has(skill));

        // 🎯 NEW: More sophisticated matching logic
        const totalJobSkills = jobSkillNames.size;
        const totalCvSkills = cvSkillNames.size;
        const matchedSkills = commonSkills.length;

        // 🚫 STRICT: If no skills match at all, very low score
        if (matchedSkills === 0) return 15; // Very low score for no skill match

        // Calculate different match ratios
        const jobCoverageRatio = matchedSkills / totalJobSkills; // How much of job requirements are covered
        const cvUtilizationRatio = matchedSkills / Math.max(totalCvSkills, 1); // How much of CV skills are relevant

        // 🎯 ULTRA-STRICT: Much more conservative scoring
        // Base score from job requirements coverage (very strict)
        const baseScore = jobCoverageRatio * 35; // Max 35% from job coverage (reduced from 50%)

        // Bonus for skill relevance (much smaller bonuses)
        let relevanceBonus = 0;
        if (matchedSkills > 0) {
            // Much smaller bonus, more realistic
            relevanceBonus = Math.min(matchedSkills * 5, 15); // Max 15% bonus (reduced from 25%)

            // Smaller bonuses for coverage
            if (jobCoverageRatio >= 0.9) {
                relevanceBonus += 8; // +8% for covering 90%+ of job requirements
            } else if (jobCoverageRatio >= 0.7) {
                relevanceBonus += 5; // +5% for covering 70%+ of job requirements
            } else if (jobCoverageRatio >= 0.5) {
                relevanceBonus += 3; // +3% for covering 50%+ of job requirements
            }
        }

        // 🎯 INCREASED: Stronger penalty for skill mismatch
        const mismatchPenalty = Math.min((totalJobSkills - matchedSkills) * 5, 25); // Up to -25% penalty (increased from -15%)

        // 🆕 NEW: Additional penalty for low CV skill relevance
        const irrelevancePenalty = cvUtilizationRatio < 0.3 ? 10 : 0; // -10% if less than 30% of CV skills are relevant

        // Final score calculation
        let finalScore = baseScore + relevanceBonus - mismatchPenalty - irrelevancePenalty;

        // 🎯 CRITICAL: Much lower maximum scores to prevent score inflation
        let maxAllowedScore;
        if (matchedSkills === totalJobSkills && jobCoverageRatio >= 0.9) {
            maxAllowedScore = 75; // Perfect match only gets 75% (reduced from 90%)
        } else if (jobCoverageRatio >= 0.8) {
            maxAllowedScore = 65; // 80%+ coverage gets max 65%
        } else if (jobCoverageRatio >= 0.6) {
            maxAllowedScore = 55; // 60%+ coverage gets max 55%
        } else {
            maxAllowedScore = 45; // Lower coverage gets max 45%
        }

        return Math.max(Math.min(finalScore, maxAllowedScore), 0);
    }

    /**
     * Calculate industry domain mismatch penalty
     */
    calculateIndustryMismatchPenalty(cvSkills, jobSkills) {
        // Define industry domains
        const industryDomains = {
            tech_development: [
                "javascript",
                "typescript",
                "python",
                "java",
                "php",
                "nodejs",
                "react",
                "angular",
                "vue",
                "html",
                "css",
                "frontend",
                "backend",
                "fullstack",
                "mobile",
                "devops",
                "ai_ml",
                "testing",
            ],
            business_management: [
                "management",
                "leadership",
                "project_management",
                "team_management",
                "strategic_planning",
                "business_analysis",
                "process_improvement",
                "change_management",
                "risk_management",
            ],
            finance_banking: [
                "accounting",
                "financial_analysis",
                "budgeting",
                "auditing",
                "tax",
                "investment",
                "financial_reporting",
                "cost_accounting",
                "treasury",
                "compliance",
            ],
            marketing_sales: [
                "marketing",
                "digital_marketing",
                "social_media",
                "seo",
                "content_marketing",
                "sales",
                "customer_service",
                "crm",
                "market_research",
                "brand_management",
            ],
            healthcare: ["nursing", "medical", "healthcare", "patient_care", "clinical", "pharmacy", "radiology", "surgery", "emergency_care", "health_administration"],
            education: ["teaching", "education", "curriculum", "training", "academic", "research", "student_support", "educational_technology", "assessment", "pedagogy"],
            engineering: [
                "civil_engineering",
                "mechanical_engineering",
                "electrical_engineering",
                "construction",
                "project_engineering",
                "quality_control",
                "safety",
                "cad",
                "autocad",
            ],
            design_creative: [
                "graphic_design",
                "ui_ux_design",
                "creative",
                "photography",
                "video_editing",
                "adobe",
                "photoshop",
                "illustrator",
                "branding",
                "visual_design",
            ],
            hr_admin: ["human_resources", "recruitment", "hr", "payroll", "employee_relations", "administrative", "office_management", "data_entry", "documentation"],
            logistics_ops: ["logistics", "supply_chain", "operations", "warehouse", "inventory", "transportation", "distribution", "procurement", "vendor_management"],
            science_research: ["research", "laboratory", "data_analysis", "statistics", "quality_assurance", "scientific", "analysis", "testing", "validation"],
            hospitality: ["retail", "hospitality", "food_service", "restaurant", "hotel", "tourism", "event_management", "guest_relations"],
            communication: [
                "communication",
                "writing",
                "translation",
                "interpretation",
                "public_relations",
                "english",
                "vietnamese",
                "presentation",
                "negotiation",
                "interpersonal",
            ],
            technical_trades: [
                "maintenance",
                "repair",
                "technical_support",
                "troubleshooting",
                "installation",
                "mechanical",
                "electrical",
                "plumbing",
                "hvac",
                "automotive",
            ],
        };

        // Identify CV and job domains
        const cvDomains = this.identifyDomains(cvSkills, industryDomains);
        const jobDomains = this.identifyDomains(jobSkills, industryDomains);

        // Calculate domain overlap
        const commonDomains = cvDomains.filter((domain) => jobDomains.includes(domain));
        const domainOverlap = commonDomains.length;

        // 🚨 CRITICAL: Industry mismatch penalties
        if (domainOverlap === 0 && cvDomains.length > 0 && jobDomains.length > 0) {
            // Complete industry mismatch (e.g., Frontend Dev vs Banking)
            console.log(`🚨 COMPLETE INDUSTRY MISMATCH: CV domains [${cvDomains.join(", ")}] vs Job domains [${jobDomains.join(", ")}]`);
            return 30; // -30% penalty for complete mismatch
        } else if (domainOverlap === 1 && (cvDomains.length > 2 || jobDomains.length > 2)) {
            // Partial mismatch with minimal overlap
            console.log(`⚠️  PARTIAL INDUSTRY MISMATCH: CV domains [${cvDomains.join(", ")}] vs Job domains [${jobDomains.join(", ")}]`);
            return 15; // -15% penalty for partial mismatch
        } else if (domainOverlap < Math.min(cvDomains.length, jobDomains.length) / 2) {
            // Low domain overlap
            console.log(`🔶 LOW DOMAIN OVERLAP: CV domains [${cvDomains.join(", ")}] vs Job domains [${jobDomains.join(", ")}]`);
            return 10; // -10% penalty for low overlap
        }

        console.log(`✅ GOOD DOMAIN MATCH: CV domains [${cvDomains.join(", ")}] vs Job domains [${jobDomains.join(", ")}]`);
        return 0; // No penalty for good domain match
    }

    /**
     * Identify industry domains from skills
     */
    identifyDomains(skills, industryDomains) {
        const identifiedDomains = new Set();

        for (const skill of skills) {
            for (const [domain, domainSkills] of Object.entries(industryDomains)) {
                if (domainSkills.includes(skill)) {
                    identifiedDomains.add(domain);
                }
            }
        }

        return Array.from(identifiedDomains);
    }

    /**
     * Quick TF-IDF only matching for very large datasets
     */
    async quickMatch(cvText, jobTexts) {
        await this.initializeTfIdf(jobTexts);

        const tfidfScores = this.getTfIdfScores(cvText, jobTexts);
        const cvSkills = this.classifySkills(cvText);

        return {
            jobMatches: tfidfScores.slice(0, 20).map((score, index) => ({
                jobId: `job_${score.jobIndex + 1}`,
                matchScore: score.tfidfScore.toFixed(2),
                method: "tfidf_only",
                detectedSkills: this.classifySkills(jobTexts[score.jobIndex]).map((s) => s.skill),
            })),
            cvInfo: {
                detectedSkills: cvSkills.map((s) => s.skill),
                method: "quick_tfidf",
            },
        };
    }
}

module.exports = { HybridMatchingEngine };
