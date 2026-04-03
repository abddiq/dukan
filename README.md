
# pcthrone E-commerce Platform

A premium, tech-focused e-commerce system built with React and Firebase for high-end gaming hardware.

## Features
- **Storefront**: Modern dark-themed responsive UI for browsing and buying.
- **Admin Dashboard**: Full management of products, categories, and orders.
- **Firebase Integration**: Authentication, Firestore database, and Storage for images.
- **RTL Support**: Native Arabic interface with Vazirmatn font.

## Technical Setup

### 1. Firebase Configuration
You need to create a project on [Firebase Console](https://console.firebase.google.com/).
1. Enable **Authentication** (Email/Password).
2. Enable **Cloud Firestore** in test mode.
3. Enable **Storage**.
4. Update `firebase.ts` with your config keys.

### 2. Deployment
- **Install dependencies**: `npm install`
- **Run locally**: `npm run dev`
- **Build**: `npm run build`
- **Deploy to Hosting**: `firebase deploy`

### 3. Firestore Security Rules
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /products/{id} {
      allow read: if resource.data.isActive == true;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }
    match /orders/{id} {
      allow create: if true;
      allow read, write: if request.auth != null && (request.auth.uid == resource.data.userId || request.auth.token.admin == true);
    }
    match /categories/{id} {
       allow read: if true;
       allow write: if request.auth != null && request.auth.token.admin == true;
    }
  }
}
```

## Styling
- **Primary Color**: `#7F3F98` (Purple)
- **Deep Accent**: `#5B2C83`
- **Background**: `#0B0F1A` (Deep Night)
- **Framework**: Tailwind CSS

Developed for **pcthrone** - The Ultimate Gaming Throne.
