# Admin Blog API Documentation

## Base URL

```
/admin/blogs
```

## Authentication

Tất cả các endpoints đều yêu cầu admin authentication thông qua middleware `adminAuth`.

Headers:

```
Authorization: Bearer <admin_token>
```

## Endpoints

### 1. Get All Blogs

**GET** `/admin/blogs`

Query Parameters:

-   `page` (number, optional): Số trang (default: 1)
-   `perPage` (number, optional): Số blog mỗi trang (default: 10)
-   `search` (string, optional): Tìm kiếm theo title hoặc tags

Response:

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "currentPage": 1,
    "perPage": 10,
    "totalPages": 5,
    "totalBlogs": 50
  }
}
```

### 2. Get Blog by ID

**GET** `/admin/blogs/:id`

Response:

```json
{
  "success": true,
  "data": {
    "_id": "...",
    "title": "...",
    "content": "...",
    "authorUid": "...",
    "tags": [...],
    "savedBy": [...],
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

### 3. Create Blog

**POST** `/admin/blogs`

Body:

```json
{
    "title": "Blog Title",
    "content": "Blog content...",
    "authorUid": "author_id",
    "tags": ["tag1", "tag2"],
    "savedBy": []
}
```

Response:

```json
{
  "success": true,
  "message": "Tạo blog thành công",
  "data": {...}
}
```

### 4. Update Blog

**PUT** `/admin/blogs/:id`

Body:

```json
{
    "title": "Updated Title",
    "content": "Updated content...",
    "tags": ["new_tag1", "new_tag2"]
}
```

Response:

```json
{
  "success": true,
  "message": "Cập nhật blog thành công!",
  "data": {...}
}
```

### 5. Delete Blog

**DELETE** `/admin/blogs/:id`

Response:

```json
{
  "success": true,
  "message": "Xóa blog thành công!",
  "data": {...}
}
```

### 6. Upload Image

**POST** `/admin/blogs/upload`

Body: FormData with `image` field

Response:

```json
{
    "success": true,
    "url": "https://res.cloudinary.com/...",
    "publicId": "admin_blogs/image_id"
}
```

### 7. Get Blog Statistics

**GET** `/admin/blogs/stats`

Response:

```json
{
  "success": true,
  "data": {
    "totalBlogs": 100,
    "recentBlogs": 25,
    "authorStats": [...],
    "tagStats": [...]
  }
}
```

### 8. Bulk Delete Blogs

**DELETE** `/admin/blogs/bulk`

Body:

```json
{
    "blogIds": ["id1", "id2", "id3"]
}
```

Response:

```json
{
    "success": true,
    "message": "Đã xóa 3 blog thành công",
    "deletedCount": 3
}
```

## Error Responses

### 400 Bad Request

```json
{
    "success": false,
    "message": "Validation error message"
}
```

### 401 Unauthorized

```json
{
    "success": false,
    "message": "Token không được cung cấp hoặc không đúng định dạng"
}
```

### 403 Forbidden

```json
{
    "success": false,
    "message": "Không có quyền truy cập"
}
```

### 404 Not Found

```json
{
    "success": false,
    "message": "Không tìm thấy blog"
}
```

### 500 Internal Server Error

```json
{
    "success": false,
    "message": "Lỗi server",
    "error": "Error details"
}
```
