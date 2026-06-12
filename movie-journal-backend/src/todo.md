Етап 0. Завершити проєктування домену
Entities
 EntityBase
 User
 Media
 Actor
 UserMedia
 WatchLog
 MediaActor
 MediaLink
Enums
 UserRole
 MediaType
 WatchStatus
 MediaLinkType
Constants
 Genres
 DefaultRoles
 SystemClaims
Етап 1. MongoDB Infrastructure
Mongo Configuration
 MongoDbSettings
 IMongoClient registration
 IMongoDatabase registration
Repositories
 IRepository<TEntity>
 MongoRepository<TEntity>
User
 IUserRepository
 UserRepository
Media
 IMediaRepository
 MediaRepository
Actor
 IActorRepository
 ActorRepository
UserMedia
 IUserMediaRepository
 UserMediaRepository
Mongo Indexes
Users
 Login unique
Media
 NormalizedTitle
 Genres
 Tags
 Cast.FullName
Actors
 FullName unique
UserMedia
 UserId
 MediaId
 UserId + MediaId unique
Етап 2. Authentication
Settings
 JwtSettings
Passwords
 IPasswordService
 PasswordService (bcrypt)
JWT
 IJwtService
 JwtService
Auth
 RegisterRequest
 LoginRequest
 LoginResponse
 IAuthService
 AuthService
Authorization
 JWT Authentication
 Role-based Authorization
Endpoints
 POST /auth/register
 POST /auth/login
 GET /auth/me
Етап 3. Media Catalog
Contracts
 CreateMediaRequest
 UpdateMediaRequest
 MediaResponse
Service
 IMediaService
 MediaService
Business Rules
 перевірка дублікатів
 NormalizedTitle generation
 тільки Admin може видаляти
 автор може редагувати свої записи
 Admin може редагувати будь-який запис
Endpoints
 GET /media/search
 GET /media/{id}
 POST /media
 PUT /media/{id}
 DELETE /media/{id}
Етап 4. Actors
Contracts
 CreateActorRequest
 UpdateActorRequest
Service
 IActorService
 ActorService
Endpoints
 GET /actors/search
 GET /actors/{id}
 POST /actors
 PUT /actors/{id}
 DELETE /actors/{id}
Етап 5. Watch Journal (ядро системи)
Contracts
 AddToJournalRequest
 UpdateStatusRequest
 AddWatchLogRequest
 AddReviewRequest
Services
 IUserMediaService
Business Rules
 один UserMedia на пару User + Media
 багато WatchLog
 підтримка повторних переглядів
 рейтинг кожного перегляду
 окремі нотатки
Endpoints
 POST /journal
 GET /journal
 GET /journal/{mediaId}
 PATCH /journal/status
 POST /journal/log
Етап 6. Reviews

Можливо окрема сутність.

Review
├── UserId
├── MediaId
├── Rating
├── Text
└── CreatedAtUtc

або використовувати останній WatchLog.

Потрібно вирішити.

Якщо окрема сутність
 Review entity
 IReviewRepository
 IReviewService
 Review endpoints
Етап 7. User Profile
Дані профілю
 DisplayName
 AvatarUrl
 About
Endpoints
 GET /users/me
 PUT /users/me
 GET /users/{id}
Етап 8. Statistics
User Stats
 переглянуто фільмів
 переглянуто серіалів
 переглянуто мультфільмів
 середня оцінка
 улюблені жанри
 улюблені актори
Endpoints
 GET /statistics/me
Етап 9. SignalR
Hub
 NotificationHub
Події
Media
 MediaCreated
 MediaUpdated
Journal
 WatchLogAdded
 StatusChanged
Admin
 MediaDeleted
Етап 10. Адміністративна панель
Admin Endpoints
 список користувачів
 блокування користувача
 видалення контенту
 призначення ролей
Roles
 User
 Admin
Етап 11. Пошук
Mongo Text Search
 Title
 OriginalTitle
 Tags
 Actor names
Advanced Search
 жанри
 тип контенту
 актор
 рік
Етап 12. Завантаження файлів
Images
 Posters
 Actor photos
 User avatars
Storage

Вирішити:

 Local Storage
 S3
 Azure Blob
Етап 13. Тестування
Unit Tests
 AuthService
 MediaService
 UserMediaService
Integration Tests
 MongoDB TestContainer
 JWT tests
 Endpoint tests
Етап 14. Docker
Backend
 Dockerfile
Infrastructure
 docker-compose.yml

Сервіси:

 backend
 mongodb
Етап 15. Web Client
Authentication
 Login
 Register
Catalog
 Search
 Media Details
Journal
 My Journal
 Statistics
Admin
 Admin Dashboard
Етап 16. Mobile Client
Android
 Authentication
 Search
 Journal
 Statistics
Етап 17. Desktop Client
Windows
 Authentication
 Search
 Journal
 Statistics
Після MVP

Соціальні функції:

 друзі
 підписки
 стрічка активності
 лайки
 коментарі
 колекції
 списки перегляду
 рекомендації
 імпорт даних з інших сервісів

Якщо дивитися на MVP, то я б зараз сфокусувався лише на:

Authentication
↓
Media Catalog
↓
Actors
↓
Journal
↓
Statistics

Це приблизно 80% цінності продукту і вже дозволить користувачам вести повноцінний журнал перегляду.