# Siirt University Web Scraper API

A comprehensive NestJS-based API for retrieving information from Siirt University's website and related services. This application provides easy access to academic staff information, announcements, events, news, bus schedules, and cafeteria menus.

## 📋 Features

- **Academic Staff Information**: Retrieve details about academic staff members for various departments
- **Department Announcements**: Fetch the latest announcements from specific departments
- **University Announcements**: Get general university-wide announcements
- **University Events**: Access upcoming events from the events calendar
- **University News**: Get the latest news articles with details
- **Bus Schedules**: Access bus timetables for university routes (A1 and A2 lines)
- **Cafeteria Menu**: View daily cafeteria menus with nutritional information

## 🛠️ Technology Stack

- **Backend Framework**: [NestJS](https://nestjs.com/)
- **HTTP Client**: [@nestjs/axios](https://www.npmjs.com/package/@nestjs/axios)
- **HTML Parsing**:
  - [jsdom](https://www.npmjs.com/package/jsdom)
  - [cheerio](https://www.npmjs.com/package/cheerio)
- **Reactive Programming**: [RxJS](https://rxjs.dev/)

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn

### Installation

1. Clone the repository

```bash
git clone https://github.com/your-username/siirt-university-api.git
cd siirt-university-api
```

2. Install dependencies

```bash
npm install
# or
yarn install
```

3. Start the development server

```bash
npm run start:dev
# or
yarn start:dev
```

The API will be available at `http://localhost:8080`.

## 📚 API Documentation

### Base API Information

Retrieve information about all available endpoints.

```
GET /
```

Example response:

```json
{
  "name": "Siirt University API",
  "version": "1.0.0",
  "description": "Siirt Üniversitesi veri çekme API'si",
  "endpoints": [
    {
      "path": "/academic-staff/:department",
      "description": "Akademik personel bilgilerini getirir"
    },
    {
      "path": "/announcement/:department",
      "description": "Bölüm duyurularını getirir"
    },
    {
      "path": "/duyuru/uni",
      "description": "Üniversite genel duyurularını getirir"
    },
    {
      "path": "/bus-schedule",
      "description": "Tüm otobüs saatlerini getirir"
    },
    {
      "path": "/bus-schedule/a1",
      "description": "A1 hattı otobüs saatlerini getirir"
    },
    {
      "path": "/bus-schedule/a2",
      "description": "A2 hattı otobüs saatlerini getirir"
    },
    {
      "path": "/yemek",
      "description": "Yemek listesini getirir"
    },
    {
      "path": "/university/notices",
      "description": "Üniversite duyurularını getirir"
    },
    {
      "path": "/university/events",
      "description": "Üniversite etkinliklerini getirir"
    },
    {
      "path": "/university/news",
      "description": "Üniversite haberlerini getirir"
    },
    {
      "path": "/university/clear-cache",
      "description": "Önbelleği temizler"
    }
  ]
}
```

### Health Check

Check if the API is operational.

```
GET /health
```

Example response:

```json
{
  "status": "ok",
  "timestamp": "2025-03-18T12:34:56.789Z"
}
```

### Academic Staff

Retrieve information about academic staff members from different departments.

```
GET /academic-staff/:department
```

Parameters:

- `department`: The department key (see list of available departments below)

Example response:

```json
[
  {
    "name": "Prof. Dr. John Doe",
    "title": "Professor",
    "branch": "Computer Science",
    "email": "johndoe@siirt.edu.tr",
    "phone": "+90 123 456 7890",
    "detailPageUrl": "https://bilgisayar.siirt.edu.tr/staff/johndoe"
  },
  {
    "name": "Assoc. Prof. Jane Smith",
    "title": "Associate Professor",
    "branch": "Software Engineering",
    "email": "janesmith@siirt.edu.tr",
    "phone": "+90 123 456 7891",
    "detailPageUrl": "https://bilgisayar.siirt.edu.tr/staff/janesmith"
  }
]
```

### Department Announcements

Get the latest announcements from a specific department.

```
GET /announcement/:department
```

Parameters:

- `department`: The department key (see list of available departments below)

Example response:

```json
[
  {
    "title": "Final Exam Schedule",
    "url": "https://bilgisayar.siirt.edu.tr/duyuru/final-exam-schedule",
    "content": "The final exam schedule for the Spring semester has been announced. Students are advised to check their exam dates and...",
    "announcement_date": "15 Mayıs"
  },
  {
    "title": "Summer Internship Opportunities",
    "url": "https://bilgisayar.siirt.edu.tr/duyuru/summer-internship",
    "content": "Several companies have opened summer internship positions for our students. Interested candidates should submit their...",
    "announcement_date": "10 Mayıs"
  }
]
```

### University Announcements

Retrieve general announcements from the university's main page.

```
GET /duyuru/uni
```

Example response:

```json
[
  {
    "link": "https://siirt.edu.tr/duyuru/graduation-ceremony",
    "title": "2023-2024 Graduation Ceremony",
    "content": [
      "The graduation ceremony for the 2023-2024 academic year will be held on June 15th at the university sports center..."
    ],
    "announcement_date": "20 Mayıs"
  }
]
```

### University Notices

Get university notices from the main website.

```
GET /university/notices
```

Example response:

```json
[
  {
    "title": "Academic Calendar Updated",
    "url": "https://siirt.edu.tr/notices/academic-calendar",
    "date": "22.03.2025",
    "content": "The academic calendar for the 2025-2026 academic year has been updated..."
  }
]
```

### University Events

Access upcoming events from the university's events calendar.

```
GET /university/events
```

Parameters:

- `url` (optional): Custom URL to scrape (defaults to https://siirt.edu.tr/)

Example response:

```json
[
  {
    "title": "International Conference on Engineering",
    "date": "15.05.2025",
    "url": "https://siirt.edu.tr/event/engineering-conference",
    "location": "Main Campus Conference Hall"
  }
]
```

### University News

Get the latest news articles from the university's website.

```
GET /university/news
```

Parameters:

- `url` (optional): Custom URL to scrape (defaults to https://siirt.edu.tr/)

Example response:

```json
[
  {
    "title": "Siirt University Ranks Among Top 50",
    "url": "https://siirt.edu.tr/news/university-ranking",
    "image": "https://siirt.edu.tr/images/news/ranking.jpg",
    "date": "10.03.2025",
    "content": "Siirt University has been ranked among the top 50 universities in Turkey according to the latest academic performance index..."
  }
]
```

### Clear Cache

Clear the API's cache to fetch fresh data.

```
GET /university/clear-cache
```

Example response:

```json
{
  "success": true,
  "message": "Cache cleared successfully"
}
```

### Bus Schedules

Access bus schedules for university routes.

```
GET /bus-schedule       # Get all routes
GET /bus-schedule/a1    # Get only A1 route
GET /bus-schedule/a2    # Get only A2 route
```

Example response:

```json
{
  "a1-universite-hatti": [
    {
      "carsKalkisSaati": "07:30",
      "universiteKalkis": "08:30"
    },
    {
      "carsKalkisSaati": "08:30",
      "universiteKalkis": "09:30"
    }
  ],
  "a-2-universite-hatti": [
    {
      "carsKalkisSaati": "07:45",
      "universiteKalkis": "08:45"
    },
    {
      "carsKalkisSaati": "08:45",
      "universiteKalkis": "09:45"
    }
  ]
}
```

### Cafeteria Menu

View the daily cafeteria menus.

```
GET /yemek
```

Example response:

```json
[
  {
    "gun": "Bugün",
    "tarih": "4 Mart Pazartesi",
    "menu": [
      {
        "ad": "Mercimek Çorbası",
        "kalori": 120
      },
      {
        "ad": "Etli Nohut",
        "kalori": 320
      },
      {
        "ad": "Pirinç Pilavı",
        "kalori": 220
      },
      {
        "ad": "Salata",
        "kalori": 80
      }
    ]
  },
  {
    "gun": "Yarın",
    "tarih": "5 Mart Salı",
    "menu": [
      {
        "ad": "Ezogelin Çorbası",
        "kalori": 110
      },
      {
        "ad": "Tavuk Sote",
        "kalori": 280
      },
      {
        "ad": "Bulgur Pilavı",
        "kalori": 200
      },
      {
        "ad": "Yoğurt",
        "kalori": 100
      }
    ]
  }
]
```

## 📝 Available Departments

The following department keys can be used with the API:

- `siirtUniversitesi`: Main university page
- `bilgisayarMuhendisligi`: Computer Engineering
- `elektrikElektronikMuhendisligi`: Electrical and Electronics Engineering
- `gidaMuhendisligi`: Food Engineering
- `insaatMuhendisligi`: Civil Engineering
- `kimyaMuhendisligi`: Chemical Engineering
- `makineMuhendisligi`: Mechanical Engineering
- `egitimBilimleri`: Educational Sciences
- `matematikVeFenBilimleri`: Mathematics and Science Education
- `temelEgitim`: Basic Education
- `turkceVeSosyalBilimlerEgitimi`: Turkish and Social Sciences Education
- `yabanciDillerEgitimi`: Foreign Languages Education
- `biyoloji`: Biology
- `cografya`: Geography
- `kimya`: Chemistry
- `matematik`: Mathematics
- `sosyoloji`: Sociology
- `psikoloji`: Psychology
- `tarih`: History
- `turkDiliVeEdebiyati`: Turkish Language and Literature
- `mutercimTercumanlik`: Translation and Interpretation

## 📁 Project Structure

```
src/
├── academic-staff/
│   ├── academic-staff.controller.ts
│   ├── academic-staff.module.ts
│   └── academic-staff.service.ts
├── announcement/
│   ├── announcement.controller.ts
│   ├── announcement.module.ts
│   ├── announcement.service.ts
│   └── departments.config.ts
├── bus-schedule/
│   ├── bus-schedule.controller.ts
│   ├── bus-schedule.module.ts
│   └── bus-schedule.service.ts
├── scraper/
│   ├── interfaces/
│   │   └── scraper.interfaces.ts
│   ├── scraper.module.ts
│   └── scraper.service.ts
├── yemek/
│   ├── yemek.controller.ts
│   ├── yemek.module.ts
│   └── yemek.service.ts
├── app.controller.ts
└── app.module.ts
```

## 🔐 Authentication

The API is secured with a simple API key authentication method:

1. Set your `SECRET_KEY` in the environment variables
2. Include this key in the `Authorization` header with each request:
   - As a Bearer token: `Authorization: Bearer your_secret_key_here`
   - Or directly: `Authorization: your_secret_key_here`

Note: The `/health` endpoint does not require authentication for monitoring purposes.

## 📈 Future Improvements

- Add caching to reduce the number of requests to the university website
- Implement more sophisticated authentication for secure API access
- Add more comprehensive error handling and request validation
- Create a web interface for easier access to the API
- Add rate limiting to prevent abuse
- Extend API to cover additional university services
- Improve data normalization and consistency across endpoints

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/your-username/siirt-university-api/issues).

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgements

- [Siirt University](https://siirt.edu.tr/) for providing the source data
- [NestJS](https://nestjs.com/) for the excellent framework
- All contributors and maintainers
